const mysql = require('mysql2/promise');
const fs = require('fs');
async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'kDTKUMRiN_jSM44aOHVkySL8rqJEbDbH',
    ssl: { ca: fs.readFileSync('./config/ca-cert.pem'), rejectUnauthorized: false },
  });
  await c.query("GRANT DELETE ON holcemlk_banker_images.customer_images TO 'app_images_rw'@'%'");
  await c.query('FLUSH PRIVILEGES');
  console.log('GRANT ADDED');
  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });