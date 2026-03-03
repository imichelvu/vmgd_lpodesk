import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import ldap from 'ldapjs';
import pool from '../db/pool.js';
import { ROLE_IDS } from '../constants/roles.js';

/** Active Directory sync: OUs to search (VMGD) and their division names */
const AD_OU_BASES = [
  'OU=Engineering_OU,DC=vmgd,DC=gov,DC=vu',
  'OU=Climate_OU,DC=vmgd,DC=gov,DC=vu',
  'OU=Forecast_OU,DC=vmgd,DC=gov,DC=vu',
  'OU=Geoscience_OU,DC=vmgd,DC=gov,DC=vu',
  'OU=Adiministration_OU,DC=vmgd,DC=gov,DC=vu',
  'OU=Observation_OU,DC=vmgd,DC=gov,DC=vu',
];

/** Map AD OU base DN → division name (must match divisions.name in DB) */
const AD_OU_TO_DIVISION = {
  'OU=Engineering_OU,DC=vmgd,DC=gov,DC=vu': 'ICT_Engineering',
  'OU=Climate_OU,DC=vmgd,DC=gov,DC=vu': 'Climate',
  'OU=Forecast_OU,DC=vmgd,DC=gov,DC=vu': 'Forecast',
  'OU=Geoscience_OU,DC=vmgd,DC=gov,DC=vu': 'Geo-Hazards',
  'OU=Adiministration_OU,DC=vmgd,DC=gov,DC=vu': 'Admin',
  'OU=Observation_OU,DC=vmgd,DC=gov,DC=vu': 'Observations',
};

const AD_IMPORT_DEFAULT_DOMAIN = 'meteo.gov.vu';
const AD_IMPORT_GEO_DOMAIN = 'vanuatu.gov.vu';
const DEFAULT_MINISTRY = 'MOCCA';
const NON_HUMAN_NAME_KEYWORDS = [
  'admin',
  'administrator',
  'service',
  'svc',
  'system',
  'test',
  'backup',
  'sql',
  'mail',
  'printer',
  'scanner',
  'noreply',
  'helpdesk',
  'support',
];

function resolveImportedEmail({ email, username, division_name }) {
  const localPartFromEmail = email && String(email).includes('@')
    ? String(email).split('@')[0].trim().toLowerCase()
    : '';
  const localPartFromUsername = username ? String(username).trim().toLowerCase() : '';
  const localPart = localPartFromEmail || localPartFromUsername;
  if (!localPart) return null;
  const domain = division_name === 'Geo-Hazards' ? AD_IMPORT_GEO_DOMAIN : AD_IMPORT_DEFAULT_DOMAIN;
  return `${localPart}@${domain}`;
}

function isLikelyHumanName(name) {
  if (!name) return false;
  const raw = String(name).trim();
  if (raw.length < 3) return false;
  if (/\d/.test(raw)) return false;

  const lower = raw.toLowerCase();
  if (NON_HUMAN_NAME_KEYWORDS.some((kw) => lower.includes(kw))) return false;

  // Require at least two alphabetic tokens (e.g., "John Doe").
  const tokens = raw.split(/\s+/).map((t) => t.replace(/[^a-zA-Z'-]/g, '')).filter(Boolean);
  const alphaTokens = tokens.filter((t) => /[a-zA-Z]/.test(t));
  return alphaTokens.length >= 2;
}

function getLdapUrl() {
  const url = process.env.AD_LDAP_URL || 'ldap://192.168.60.2:389';
  return url.replace(/^ldaps?:\/\//, '').split('/')[0];
}

function getLdapProtocol() {
  const url = process.env.AD_LDAP_URL || 'ldap://192.168.60.2:389';
  return url.startsWith('ldaps') ? 'ldaps' : 'ldap';
}

/** Promise wrapper: bind then search all OUs and return normalized user list */
function fetchUsersFromLdap(ldapUrl, domain, bindUser, bindPassword) {
  const protocol = getLdapProtocol();
  const fullUrl = `${protocol}://${getLdapUrl()}`;
  const client = ldap.createClient({ url: fullUrl, timeout: 30000, connectTimeout: 10000 });
  const bindDn = domain && bindUser ? `${bindUser}@${domain}` : bindUser;

  function bind() {
    return new Promise((resolve, reject) => {
      client.bind(bindDn, bindPassword, (err) => (err ? reject(err) : resolve()));
    });
  }

  /** Convert ldapjs SearchEntry to plain object { displayName: [...], sAMAccountName: [...], ... } */
  function entryToObject(entry) {
    const obj = {};
    const attrs = entry.pojo?.attributes ?? entry.attributes ?? [];
    for (const a of attrs) {
      const type = (a.type ?? a.json?.type ?? '').toString();
      if (!type) continue;
      let vals = a.values ?? a.buffers ?? [];
      if (!Array.isArray(vals)) vals = vals != null ? [vals] : [];
      obj[type] = vals.map((v) => (Buffer.isBuffer(v) ? v.toString('utf8') : v));
    }
    return obj;
  }

  function searchBase(baseDn) {
    return new Promise((resolve, reject) => {
      const entries = [];
      const opts = {
        // Exclude disabled AD accounts (userAccountControl bit 2 = ACCOUNTDISABLE).
        filter: '(&(objectClass=user)(sAMAccountName=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
        scope: 'sub',
        attributes: ['displayName', 'cn', 'sAMAccountName', 'mail'],
      };
      client.search(baseDn, opts, (err, res) => {
        if (err) return reject(err);
        res.on('searchEntry', (entry) => entries.push(entryToObject(entry)));
        res.on('error', reject);
        res.on('end', (result) => {
          if (result?.status !== 0) reject(new Error('LDAP search ended with status ' + (result?.status ?? 'unknown')));
          else resolve(entries);
        });
      });
    });
  }

  function unbind() {
    return new Promise((resolve) => {
      client.unbind(() => resolve());
    });
  }

  return bind()
    .then(() => Promise.all(AD_OU_BASES.map((base) => searchBase(base))))
    .then((results) => {
      const bySam = new Map();
      for (let i = 0; i < AD_OU_BASES.length; i++) {
        const baseDn = AD_OU_BASES[i];
        const division_name = AD_OU_TO_DIVISION[baseDn] ?? null;
        const list = results[i] ?? [];
        for (const obj of list) {
          const sam = (obj.sAMAccountName && obj.sAMAccountName[0]) ? String(obj.sAMAccountName[0]).trim().toLowerCase() : null;
          if (!sam) continue;
          if (sam.endsWith('$')) continue; // machine/computer account
          const displayName = (obj.displayName && obj.displayName[0]) ? String(obj.displayName[0]).trim() : null;
          const cn = (obj.cn && obj.cn[0]) ? String(obj.cn[0]).trim() : null;
          const mail = (obj.mail && obj.mail[0]) ? String(obj.mail[0]).trim() : null;
          const fullName = displayName || cn;
          if (!isLikelyHumanName(fullName)) continue;
          const email = (mail && mail.includes('@')) ? mail : `${sam}@${domain || 'vmgd.gov.vu'}`;
          if (!bySam.has(sam)) bySam.set(sam, { full_name: fullName, username: sam, email, division_name });
        }
      }
      return Array.from(bySam.values());
    })
    .finally(() => unbind().catch(() => {}));
}

export async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const divisionId = req.query.division_id != null ? parseInt(req.query.division_id, 10) : null;
  const searchRaw = req.query.q != null ? String(req.query.q).trim() : '';
  const filterByDivision = Number.isFinite(divisionId) && divisionId > 0;
  const filterBySearch = searchRaw.length > 0;
  const paginate = page > 0;

  const conditions = [];
  const baseParams = [];
  if (filterByDivision) {
    baseParams.push(divisionId);
    conditions.push(`u.division_id = $${baseParams.length}`);
  }
  if (filterBySearch) {
    baseParams.push(`%${searchRaw}%`);
    conditions.push(`(u.full_name ILIKE $${baseParams.length} OR u.username ILIKE $${baseParams.length} OR u.email ILIKE $${baseParams.length})`);
  }
  const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const baseSql = `
    SELECT u.id, u.full_name, u.username, u.email, u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date, u.division_id, u.reports_to_id,
           d.name as division_name,
           array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) as role_ids
    FROM users u
    LEFT JOIN divisions d ON d.id = u.division_id
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    ${whereClause}
    GROUP BY u.id, d.name
    ORDER BY u.full_name`;

  if (paginate) {
    const offset = (page - 1) * limit;
    const limitParam = baseParams.length + 1;
    const offsetParam = baseParams.length + 2;
    const mainQuery = pool.query(
      `${baseSql} LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...baseParams, limit, offset]
    );
    const countQuery = pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       ${whereClause}`,
      baseParams
    );
    const [{ rows }, { rows: countRows }] = await Promise.all([mainQuery, countQuery]);
    const total = (countRows && countRows[0] && countRows[0].total) || 0;
    res.json({
      users: rows.map(r => ({ ...r, role_ids: r.role_ids || [] })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } else {
    const { rows } = await pool.query(baseSql, baseParams);
    res.json(rows.map(r => ({ ...r, role_ids: r.role_ids || [] })));
  }
}

export async function getById(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.username, u.email, u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date, u.division_id, u.reports_to_id,
            d.name as division_name,
            array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) as role_ids
     FROM users u
     LEFT JOIN divisions d ON d.id = u.division_id
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     WHERE u.id = $1
     GROUP BY u.id, d.name`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  const u = rows[0];
  res.json({ ...u, role_ids: u.role_ids || [] });
}

export async function create(req, res) {
  const { full_name, username, email, password, vnpf_no, post_title, post_no, grade, department, ministry, entry_date, division_id, reports_to_id, role_ids } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'full_name, email, password required' });
  }
  const usernameVal = username ? String(username).trim().toLowerCase() || null : null;
  if (usernameVal) {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [usernameVal]);
    if (existing.length) return res.status(400).json({ error: 'Username already taken' });
  }
  const password_hash = await bcrypt.hash(password, 10);
  const entryDateVal = entry_date && String(entry_date).trim() ? String(entry_date).trim() : null;
  const ministryVal = ministry && String(ministry).trim() ? String(ministry).trim() : DEFAULT_MINISTRY;
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, username, email, password_hash, vnpf_no, post_title, post_no, grade, department, ministry, entry_date, division_id, reports_to_id, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'local')
     RETURNING id, full_name, username, email, vnpf_no, post_title, post_no, grade, department, ministry, entry_date, division_id, reports_to_id, created_at`,
    [full_name, usernameVal, email, password_hash, vnpf_no || null, post_title || null, post_no || null, grade || null, department || null, ministryVal, entryDateVal, division_id || null, reports_to_id || null]
  );
  const user = rows[0];
  const rids = Array.isArray(role_ids) ? role_ids : (role_ids ? [role_ids] : [ROLE_IDS.Staff]);
  for (const rid of rids) {
    await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, rid]);
  }
  const { rows: withRoles } = await pool.query(
    'SELECT role_id FROM user_roles WHERE user_id = $1',
    [user.id]
  );
  user.role_ids = withRoles.map(r => r.role_id);
  res.status(201).json(user);
}

export async function update(req, res) {
  const { id } = req.params;
  const { full_name, username, email, password, vnpf_no, post_title, post_no, grade, department, ministry, entry_date, division_id, reports_to_id, role_ids } = req.body;
  const usernameVal = username !== undefined ? (username ? String(username).trim().toLowerCase() || null : null) : undefined;
  if (usernameVal !== undefined && usernameVal) {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2', [usernameVal, id]);
    if (existing.length) return res.status(400).json({ error: 'Username already taken' });
  }
  const emailVal = email !== undefined ? (email ? String(email).trim() : '') : undefined;
  if (emailVal !== undefined) {
    if (!emailVal) return res.status(400).json({ error: 'Email is required' });
    if (!emailVal.includes('@')) return res.status(400).json({ error: 'Invalid email format' });
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [emailVal, id]);
    if (existing.length) return res.status(400).json({ error: 'Email already in use by another user' });
  }
  const updates = [];
  const values = [];
  let i = 1;
  if (full_name !== undefined) { updates.push(`full_name = $${i++}`); values.push(full_name); }
  if (usernameVal !== undefined) { updates.push(`username = $${i++}`); values.push(usernameVal); }
  if (emailVal !== undefined) { updates.push(`email = $${i++}`); values.push(emailVal); }
  if (password !== undefined) {
    updates.push(`password_hash = $${i++}`);
    values.push(await bcrypt.hash(password, 10));
  }
  if (vnpf_no !== undefined) { updates.push(`vnpf_no = $${i++}`); values.push(vnpf_no); }
  if (post_title !== undefined) { updates.push(`post_title = $${i++}`); values.push(post_title); }
  if (post_no !== undefined) { updates.push(`post_no = $${i++}`); values.push(post_no); }
  if (grade !== undefined) { updates.push(`grade = $${i++}`); values.push(grade); }
  if (department !== undefined) { updates.push(`department = $${i++}`); values.push(department && String(department).trim() ? String(department).trim() : null); }
  if (ministry !== undefined) { updates.push(`ministry = $${i++}`); values.push(ministry && String(ministry).trim() ? String(ministry).trim() : DEFAULT_MINISTRY); }
  if (entry_date !== undefined) { updates.push(`entry_date = $${i++}`); values.push(entry_date && String(entry_date).trim() ? String(entry_date).trim() : null); }
  if (division_id !== undefined) { updates.push(`division_id = $${i++}`); values.push(division_id); }
  if (reports_to_id !== undefined) { updates.push(`reports_to_id = $${i++}`); values.push(reports_to_id); }
  if (updates.length) {
    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i}`, values);
  }
  if (role_ids !== undefined && Array.isArray(role_ids)) {
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
    for (const rid of role_ids) {
      await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [id, rid]);
    }
  }
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.username, u.email, u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date, u.division_id, u.reports_to_id,
            array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) as role_ids
     FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE u.id = $1 GROUP BY u.id`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json({ ...rows[0], role_ids: rows[0].role_ids || [] });
}

async function deleteUserById(client, userId) {
  await client.query('UPDATE users SET reports_to_id = NULL WHERE reports_to_id = $1', [userId]);
  await client.query('UPDATE leave_applications SET approved_by_pso_id = NULL WHERE approved_by_pso_id = $1', [userId]);
  await client.query('UPDATE leave_applications SET approved_by_manager_id = NULL WHERE approved_by_manager_id = $1', [userId]);
  await client.query('UPDATE leave_applications SET approved_by_director_id = NULL WHERE approved_by_director_id = $1', [userId]);
  const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [userId]);
  return rowCount;
}

export async function remove(req, res) {
  const { id } = req.params;
  const userId = parseInt(id, 10);
  if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid user id' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rowCount = await deleteUserById(client, userId);
    await client.query('COMMIT');
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function removeBulk(req, res) {
  const raw = req.body?.ids;
  const ids = Array.isArray(raw) ? raw.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0) : [];
  if (ids.length === 0) return res.status(400).json({ error: 'ids array (non-empty) required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const userId of ids) {
      await deleteUserById(client, userId);
    }
    await client.query('COMMIT');
    res.json({ message: `${ids.length} user(s) deleted` });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listRoles(req, res) {
  const { rows } = await pool.query('SELECT id, role_name FROM roles ORDER BY id');
  res.json(rows);
}

export async function listDivisions(req, res) {
  const { rows } = await pool.query('SELECT id, name FROM divisions ORDER BY name');
  res.json(rows);
}

/** Sync users from Active Directory. Body: { ad_username, ad_password, dry_run? }.
 *  dry_run: true → return list of users from AD without writing to DB.
 *  dry_run: false/omit → import all (legacy); prefer fetch + import-ad-users flow. */
export async function syncFromAd(req, res) {
  const ad_username = (req.body?.ad_username ?? req.body?.username ?? '').trim();
  const ad_password = req.body?.ad_password ?? req.body?.password ?? '';
  const dry_run = req.body?.dry_run === true;
  if (!ad_username || !ad_password) {
    return res.status(400).json({ error: 'ad_username and ad_password required' });
  }
  const domain = process.env.AD_DOMAIN || 'vmgd.gov.vu';
  let adUsers;
  try {
    adUsers = await fetchUsersFromLdap(
      getLdapUrl(),
      domain,
      ad_username,
      ad_password
    );
  } catch (err) {
    const msg = err.message || String(err);
    if (/Invalid Credentials|data 52e|52e/i.test(msg)) {
      return res.status(401).json({ error: 'Invalid AD credentials' });
    }
    if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
      return res.status(502).json({ error: 'Cannot reach AD server. Check network and AD_LDAP_URL.' });
    }
    return res.status(502).json({ error: 'AD error: ' + msg });
  }
  if (dry_run) {
    const transformedUsers = adUsers.map((u) => ({
      ...u,
      email: resolveImportedEmail(u) || u.email || '',
    }));
    const { rows: existing } = await pool.query('SELECT LOWER(email) AS email FROM users');
    const existingEmails = new Set((existing || []).map((r) => r.email));
    const notYetImported = transformedUsers.filter((u) => {
      const email = (u.email && String(u.email).trim()).toLowerCase();
      return email && !existingEmails.has(email);
    });
    return res.json({ users: notYetImported });
  }
  const { rows: divisionRows } = await pool.query('SELECT id, name FROM divisions');
  const divisionIdsByName = Object.fromEntries((divisionRows || []).map((r) => [r.name, r.id]));

  const defaultPasswordHash = await bcrypt.hash('TempSync' + Date.now() + Math.random(), 10);
  let created = 0;
  let updated = 0;
  for (const u of adUsers) {
    const importedEmail = resolveImportedEmail(u);
    if (!importedEmail || !u.full_name) continue;
    const emailNorm = importedEmail.trim().toLowerCase();
    const division_id = (u.division_name && divisionIdsByName[u.division_name]) ? divisionIdsByName[u.division_name] : null;
    const { rows: existing } = await pool.query(
      "SELECT id, COALESCE(source, 'local') AS source FROM users WHERE LOWER(email) = $1",
      [emailNorm]
    );
    if (existing.length) {
      if (existing[0].source === 'local') continue;
      await pool.query(
        'UPDATE users SET full_name = $1, username = $2, division_id = $3, ministry = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
        [u.full_name, u.username, division_id, DEFAULT_MINISTRY, existing[0].id]
      );
      updated += 1;
    } else {
      try {
        const { rows: inserted } = await pool.query(
          `INSERT INTO users (full_name, username, email, password_hash, division_id, ministry, source, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'ad_import', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [u.full_name, u.username, importedEmail, defaultPasswordHash, division_id, DEFAULT_MINISTRY]
        );
        if (inserted.length) {
          await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [inserted[0].id, ROLE_IDS.Staff]);
          created += 1;
        }
      } catch (err) {
        if (err.code === '23505') continue; // unique violation (email or username), skip
        throw err;
      }
    }
  }
  res.json({
    message: 'AD sync complete',
    created,
    updated,
    total: adUsers.length,
    hint: created > 0 ? 'New users have a temporary password; edit each user to set a proper password and details.' : null,
  });
}

/** Import only selected users from an AD fetch. Body: { users: [ { full_name, username, email, division_name } ] }. */
export async function importAdUsers(req, res) {
  const list = req.body?.users;
  if (!Array.isArray(list) || list.length === 0) {
    return res.status(400).json({ error: 'users array (non-empty) required' });
  }
  const { rows: divisionRows } = await pool.query('SELECT id, name FROM divisions');
  const divisionIdsByName = Object.fromEntries((divisionRows || []).map((r) => [r.name, r.id]));
  const defaultPasswordHash = await bcrypt.hash('TempSync' + Date.now() + Math.random(), 10);
  let created = 0;
  let updated = 0;
  for (const u of list) {
    const full_name = u.full_name && String(u.full_name).trim();
    const username = (u.username && String(u.username).trim().toLowerCase()) || null;
    const importedEmail = resolveImportedEmail({ ...u, username });
    if (!full_name || !importedEmail) continue;
    const emailNorm = importedEmail.toLowerCase();
    const division_id = (u.division_name && divisionIdsByName[u.division_name]) ? divisionIdsByName[u.division_name] : null;
    const { rows: existing } = await pool.query(
      "SELECT id, COALESCE(source, 'local') AS source FROM users WHERE LOWER(email) = $1",
      [emailNorm]
    );
    if (existing.length) {
      if (existing[0].source === 'local') continue;
      await pool.query(
        'UPDATE users SET full_name = $1, username = $2, division_id = $3, ministry = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
        [full_name, username, division_id, DEFAULT_MINISTRY, existing[0].id]
      );
      updated += 1;
    } else {
      try {
        const { rows: inserted } = await pool.query(
          `INSERT INTO users (full_name, username, email, password_hash, division_id, ministry, source, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'ad_import', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [full_name, username, importedEmail, defaultPasswordHash, division_id, DEFAULT_MINISTRY]
        );
        if (inserted.length) {
          await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [inserted[0].id, ROLE_IDS.Staff]);
          created += 1;
        }
      } catch (err) {
        if (err.code === '23505') continue;
        throw err;
      }
    }
  }
  res.json({
    message: 'Import complete',
    created,
    updated,
    total: list.length,
    hint: created > 0 ? 'New users have a temporary password; edit each user to set a proper password and details.' : null,
  });
}

export async function testSmtp(req, res) {
  const toEmail = (req.body?.toEmail || req.query?.toEmail || '').trim();
  if (!toEmail || !toEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid toEmail required (e.g. your@email.com)' });
  }
  const host = process.env.SMTP_HOST;
  if (!host) {
    return res.status(503).json({ error: 'SMTP not configured (SMTP_HOST missing in .env)' });
  }
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  try {
    await transporter.verify();
  } catch (err) {
    return res.status(502).json({ error: 'SMTP connection failed: ' + (err.message || String(err)) });
  }
  const fromAddr = process.env.NOTIFICATION_FROM || 'leave@vmgd.gov.vu';
  const fromName = process.env.NOTIFICATION_NAME;
  const from = fromName ? `"${fromName}" <${fromAddr}>` : fromAddr;
  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'VMGD Leave System – SMTP test',
      text: 'This is a test email from the VMGD Leave backend. If you received this, SMTP is working.',
    });
    res.json({ ok: true, message: 'Test email sent to ' + toEmail });
  } catch (err) {
    res.status(500).json({ error: 'Send failed: ' + (err.message || String(err)) });
  }
}

export async function getUserBalances(req, res) {
  const { id: userId } = req.params;
  const year = parseInt(req.query.year || new Date().getFullYear(), 10);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        lb.id,
        lb.leave_type,
        lb.year,
        lb.allocated_days,
        lb.used_days,
        lb.carried_over_days,
        lbp.max_carry_over_days,
        lbp.is_unlimited
      FROM leave_balances lb
      JOIN leave_balance_policies lbp ON lb.leave_type = lbp.leave_type
      WHERE lb.user_id = $1 AND lb.year = $2
      ORDER BY lb.leave_type`,
      [userId, year]
    );
    res.json(rows);
  } catch (error) {
    console.error(`Error fetching balances for user ${userId}, year ${year}:`, error);
    res.status(500).json({ error: 'Failed to fetch user leave balances.' });
  }
}

export async function updateUserBalance(req, res) {
  const { id: userId, balanceId } = req.params;
  const { allocated_days, carried_over_days } = req.body;

  if (isNaN(userId) || isNaN(balanceId)) {
    return res.status(400).json({ error: 'Invalid user ID or balance ID.' });
  }

  if ((allocated_days === undefined && carried_over_days === undefined) || (allocated_days !== undefined && isNaN(allocated_days)) || (carried_over_days !== undefined && isNaN(carried_over_days))) {
    return res.status(400).json({ error: 'Valid allocated_days or carried_over_days are required.' });
  }

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (allocated_days !== undefined) {
    updates.push(`allocated_days = $${paramIndex++}`);
    values.push(allocated_days);
  }
  if (carried_over_days !== undefined) {
    updates.push(`carried_over_days = $${paramIndex++}`);
    values.push(carried_over_days);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No update parameters provided.' });
  }

  values.push(balanceId); // balanceId is the WHERE condition

  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE leave_balances
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Leave balance not found or no changes made.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(`Error updating balance ${balanceId} for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to update user leave balance.' });
  }
}
