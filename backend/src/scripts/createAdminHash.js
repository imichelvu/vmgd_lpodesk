// createAdminHash.js
import bcrypt from 'bcryptjs';

async function main() {
  const password = 'Admin123!';
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash for Admin123!:', hash);
}

main();
