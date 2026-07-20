const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const pki = forge.pki;

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const TEN_YEARS = 10 * 365 * 24 * 60 * 60;

function certPem(cert) {
  return pki.certificateToPem(cert);
}

function keyPem(key) {
  return pki.privateKeyToPem(key);
}

function generateKeyPair() {
  return pki.rsa.generateKeyPair(2048);
}

function createCACert(keyPair) {
  const cert = pki.createCertificate();
  cert.publicKey = keyPair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + TEN_YEARS * 1000);

  const attrs = [{ name: 'commonName', value: 'HolcemLK-Local-CA' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
  ]);

  cert.sign(keyPair.privateKey, forge.md.sha256.create());
  return cert;
}

function createServerCert(caKeyPair, caCert, commonName) {
  const keyPair = generateKeyPair();
  const cert = pki.createCertificate();
  cert.publicKey = keyPair.publicKey;
  cert.serialNumber = '02';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + TEN_YEARS * 1000);

  const attrs = [{ name: 'commonName', value: commonName }];
  cert.setSubject(attrs);

  cert.setIssuer(caCert.subject.attributes);

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true,
      critical: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
    },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
      ],
    },
  ]);

  cert.sign(caKeyPair.privateKey, forge.md.sha256.create());
  return { key: keyPair.privateKey, cert };
}

// === Main ===
const caKeyPair = generateKeyPair();
const caCert = createCACert(caKeyPair);

fs.writeFileSync(path.join(CONFIG_DIR, 'ca-key.pem'), keyPem(caKeyPair.privateKey));
fs.writeFileSync(path.join(CONFIG_DIR, 'ca-cert.pem'), certPem(caCert));
console.log('CA generated');

const mysql = createServerCert(caKeyPair, caCert, 'mysql');
fs.writeFileSync(path.join(CONFIG_DIR, 'mysql-server-key.pem'), keyPem(mysql.key));
fs.writeFileSync(path.join(CONFIG_DIR, 'mysql-server-cert.pem'), certPem(mysql.cert));
console.log('MySQL server cert signed');

const redis = createServerCert(caKeyPair, caCert, 'redis');
fs.writeFileSync(path.join(CONFIG_DIR, 'redis-server-key.pem'), keyPem(redis.key));
fs.writeFileSync(path.join(CONFIG_DIR, 'redis-server-cert.pem'), certPem(redis.cert));
console.log('Redis server cert signed');

// Verify
const files = ['ca-key.pem', 'ca-cert.pem', 'mysql-server-key.pem', 'mysql-server-cert.pem', 'redis-server-key.pem', 'redis-server-cert.pem'];
console.log('\n=== Verification ===');
files.forEach(f => {
  const p = path.join(CONFIG_DIR, f);
  const size = fs.statSync(p).size;
  console.log(`${f}: ${size} bytes`);
});

// Verify chain: load CA cert and verify each server cert
const caCertLoaded = pki.certificateFromPem(fs.readFileSync(path.join(CONFIG_DIR, 'ca-cert.pem'), 'utf8'));
const mysqlCertLoaded = pki.certificateFromPem(fs.readFileSync(path.join(CONFIG_DIR, 'mysql-server-cert.pem'), 'utf8'));
const redisCertLoaded = pki.certificateFromPem(fs.readFileSync(path.join(CONFIG_DIR, 'redis-server-cert.pem'), 'utf8'));

const caStore = pki.createCaStore([caCertLoaded]);
console.log('\nMySQL cert verified by CA:', caStore.getIssuer(mysqlCertLoaded) !== null);
console.log('Redis cert verified by CA:', caStore.getIssuer(redisCertLoaded) !== null);
console.log('All done');
