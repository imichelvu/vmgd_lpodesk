import '../loadEnv.js';
import pool from './pool.js';

async function testConnection() {
  console.log('Testing PostgreSQL connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? `${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}` : '(not set)');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in backend/.env');
    process.exit(1);
  }

  try {
    const client = await pool.connect();
    const { rows } = await client.query('SELECT current_database(), current_user, version()');
    client.release();
    console.log('OK Connected successfully.');
    console.log('  Database:', rows[0].current_database);
    console.log('  User:', rows[0].current_user);
    console.log('  Version:', rows[0].version.split('\n')[0]);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    if (err.code) console.error('  Code:', err.code);
    process.exit(1);
  }
}

testConnection();
