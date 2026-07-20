const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const pki = forge.pki;

const CONFIG_DIR = path.join(__dirname, '..', 'config');

const caKey = pki.privateKeyFromPem(fs.readFileSync(path.join(CONFIG_DIR, 'ca-key.pem'), 'utf8'));
const caCert = pki.certificateFromPem(fs.readFileSync(path.join(CONFIG_DIR, 'ca-cert.pem'), 'utf8'));

const keyPair = pki.rsa.generateKeyPair(2048);
const cert = pki.createCertificate();
cert.publicKey = keyPair.publicKey;
cert.serialNumber = '03';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);

const attrs = [{ name: 'commonName', value: 'localhost' }];
cert.setSubject(attrs);
cert.setIssuer(caCert.subject.attributes);

cert.setExtensions([
  { name: 'basicConstraints', cA: false },
  { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
  { name: 'extKeyUsage', serverAuth: true },
  {
    name: 'subjectAltName',
    altNames: [
      { type: 2, value: 'localhost' },
      { type: 7, ip: '127.0.0.1' },
      { type: 7, ip: '192.168.1.203' },
    ],
  },
]);

cert.sign(caKey, forge.md.sha256.create());

fs.writeFileSync(path.join(CONFIG_DIR, 'server-key.pem'), pki.privateKeyToPem(keyPair.privateKey));
fs.writeFileSync(path.join(CONFIG_DIR, 'server-cert.pem'), pki.certificateToPem(cert));
console.log('server-cert.pem and server-key.pem written');

// Verify against CA
const caStore = pki.createCaStore([caCert]);
const verified = caStore.getIssuer(cert) !== null;
console.log('HTTPS server cert verified by CA:', verified);

// File sizes
const serverCert = fs.statSync(path.join(CONFIG_DIR, 'server-cert.pem'));
const serverKey = fs.statSync(path.join(CONFIG_DIR, 'server-key.pem'));
console.log('server-cert.pem:', serverCert.size, 'bytes');
console.log('server-key.pem:', serverKey.size, 'bytes');
console.log('All done');
