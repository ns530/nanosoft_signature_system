const mysql = require('mysql2/promise');
const fs = require('fs');
async function main() {
  const c = await mysql.createConnection({host:'127.0.0.1',user:'root',password:'kDTKUMRiN_jSM44aOHVkySL8rqJEbDbH',ssl:{ca:fs.readFileSync('./config/ca-cert.pem'),rejectUnauthorized:false}});
  const [r] = await c.query("SELECT user, host FROM mysql.user WHERE user LIKE 'app_%'");
  console.log(JSON.stringify(r, null, 2));
  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });