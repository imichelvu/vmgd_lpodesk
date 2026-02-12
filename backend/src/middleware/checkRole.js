import pool from '../db/pool.js';
import { ROLE_IDS } from '../constants/roles.js';

/**
 * Check if the user has the required role ID OR has an active delegation
 * to act as the delegator (e.g. Acting PSO/Manager).
 * @param {number|number[]} allowedRoleIds - Single role ID or array of role IDs (e.g. ROLE_IDS.PSO or [ROLE_IDS.PSO, ROLE_IDS.Manager])
 */
export function checkRole(allowedRoleIds) {
  const ids = Array.isArray(allowedRoleIds) ? allowedRoleIds : [allowedRoleIds];

  return async (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoleIds = user.role_ids || [];
    const hasDirectRole = ids.some(rid => userRoleIds.includes(rid));

    if (hasDirectRole) {
      return next();
    }

    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `SELECT delegator_id FROM delegations
       WHERE delegatee_id = $1 AND is_active = true
         AND $2::date BETWEEN start_date AND end_date`,
      [user.id, today]
    );

    const actingAsIds = rows.map(r => r.delegator_id);
    if (actingAsIds.length === 0) {
      return res.status(403).json({ error: 'Insufficient role' });
    }

    const { rows: delegators } = await pool.query(
      `SELECT DISTINCT ur.role_id FROM user_roles ur WHERE ur.user_id = ANY($1::int[])`,
      [actingAsIds]
    );
    const actingRoleIds = delegators.map(r => r.role_id);
    const hasActingRole = ids.some(rid => actingRoleIds.includes(rid));

    if (hasActingRole) {
      req.actingAsDelegate = true;
      return next();
    }

    return res.status(403).json({ error: 'Insufficient role' });
  };
}

export { ROLE_IDS };
