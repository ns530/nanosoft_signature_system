const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'kDTKUMRiN_jSM44aOHVkySL8rqJEbDbH',
    ssl: { ca: fs.readFileSync('./config/ca-cert.pem'), rejectUnauthorized: false },
  });

  console.log('Connected to MySQL as root');

  // 1. Create databases
  await conn.query('CREATE DATABASE IF NOT EXISTS holcemlk_banker_dataentry');
  await conn.query('CREATE DATABASE IF NOT EXISTS holcemlk_banker_images');
  console.log('Databases created');

  // 2. Switch to dataentry DB and create tables + seed
  await conn.query('USE holcemlk_banker_dataentry');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS systemusers (
      UserName VARCHAR(50) PRIMARY KEY,
      UserID VARCHAR(20) NOT NULL UNIQUE,
      MobilePassword VARCHAR(255),
      web_password VARCHAR(255),
      role VARCHAR(50) NOT NULL,
      mobile_no VARCHAR(20),
      mobile_otp VARCHAR(10),
      LogStatus VARCHAR(20)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS customerinformation (
      CustomerID VARCHAR(20) PRIMARY KEY,
      CustomerName VARCHAR(100) NOT NULL
    )
  `);
  console.log('dataentry tables created');

  // Seed: Admin + Officer (bcrypt hash of "test1234")
  const bcrypt = require('bcrypt');
  const hashed = await bcrypt.hash('test1234', 12);

  await conn.query(`INSERT IGNORE INTO systemusers (UserName, UserID, web_password, role, mobile_no, mobile_otp) VALUES
    ('admin', 'USR-001', ?, '1-Administrator', '0710000001', '123456'),
    ('officer', 'USR-002', ?, '1-Bank Officer', '0710000002', '123456')`, [hashed, hashed]);

  await conn.query(`INSERT IGNORE INTO customerinformation (CustomerID, CustomerName) VALUES
    ('CUST-001', 'John Doe'),
    ('CUST-002', 'Jane Smith')`);
  console.log('dataentry seeded');

  // 3. Switch to images DB and create tables
  await conn.query('USE holcemlk_banker_images');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS customer_images (
      image_id CHAR(36) PRIMARY KEY,
      customer_id VARCHAR(20) NOT NULL,
      image_type ENUM('profile_picture','signature') NOT NULL,
      image_data LONGBLOB,
      file_hash CHAR(64),
      collected_by VARCHAR(20),
      collected_at DATETIME,
      qr_session_ref CHAR(36),
      INDEX idx_customer_id (customer_id),
      UNIQUE INDEX idx_customer_type (customer_id, image_type)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS customer_previous_images (
      log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      image_id CHAR(36),
      customer_id VARCHAR(20),
      old_image_data LONGBLOB,
      old_file_hash CHAR(64),
      replaced_by VARCHAR(20),
      replaced_at DATETIME,
      INDEX idx_customer_id (customer_id),
      INDEX idx_replaced_at (replaced_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(50),
      user_id VARCHAR(20),
      ip_address VARCHAR(45),
      device_fingerprint VARCHAR(255),
      event_time DATETIME,
      detail JSON
    )
  `);
  console.log('images tables created');

  // 4. Create users with SSL requirement
  try {
    await conn.query("DROP USER IF EXISTS 'app_dataentry_ro'@'%'");
    await conn.query("DROP USER IF EXISTS 'app_images_rw'@'%'");
    await conn.query("CREATE USER 'app_dataentry_ro'@'%' IDENTIFIED BY 'dataentry_ro_pass' REQUIRE SSL");
    await conn.query("CREATE USER 'app_images_rw'@'%' IDENTIFIED BY 'images_rw_pass' REQUIRE SSL");

    // dataentry_ro: SELECT only on dataentry DB
    await conn.query("GRANT SELECT ON holcemlk_banker_dataentry.* TO 'app_dataentry_ro'@'%'");

    // images_rw: SELECT/INSERT/DELETE on customer_images (DELETE needed for archive-before-insert),
    //             SELECT/INSERT only on customer_previous_images (append-only archive),
    //             SELECT/INSERT only on audit_log (append-only)
    await conn.query("GRANT SELECT, INSERT, DELETE ON holcemlk_banker_images.customer_images TO 'app_images_rw'@'%'");
    await conn.query("GRANT SELECT, INSERT ON holcemlk_banker_images.customer_previous_images TO 'app_images_rw'@'%'");
    await conn.query("GRANT SELECT ON holcemlk_banker_images.audit_log TO 'app_images_rw'@'%'");
    await conn.query("GRANT INSERT ON holcemlk_banker_images.audit_log TO 'app_images_rw'@'%'");

    await conn.query('FLUSH PRIVILEGES');
    console.log('Users created with SSL requirement and least-privilege grants');
  } catch (e) {
    console.log('User creation error (may already exist):', e.message);
  }

  // 5. Row counts
  await conn.query('USE holcemlk_banker_dataentry');
  const [adminRows] = await conn.query("SELECT COUNT(*) as cnt FROM systemusers WHERE UserName='admin'");
  const [officerRows] = await conn.query("SELECT COUNT(*) as cnt FROM systemusers WHERE UserName='officer'");
  const [custRows] = await conn.query('SELECT COUNT(*) as cnt FROM customerinformation');

  await conn.query('USE holcemlk_banker_images');
  const [imgRows] = await conn.query('SELECT COUNT(*) as cnt FROM customer_images');
  const [prevImgRows] = await conn.query('SELECT COUNT(*) as cnt FROM customer_previous_images');
  const [auditRows] = await conn.query('SELECT COUNT(*) as cnt FROM audit_log');

  console.log('\n=== ROW COUNTS ===');
  console.log(`systemusers (admin):   ${adminRows[0].cnt}`);
  console.log(`systemusers (officer): ${officerRows[0].cnt}`);
  console.log(`customerinformation:   ${custRows[0].cnt}`);
  console.log(`customer_images:       ${imgRows[0].cnt}`);
  console.log(`customer_previous:     ${prevImgRows[0].cnt}`);
  console.log(`audit_log:             ${auditRows[0].cnt}`);

  await conn.end();
  console.log('\nAll done');
}

main().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
