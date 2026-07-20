const crypto = require('crypto');

// ×××××××××××××××××××××××××××××××××××××××××××××××××
// WARNING: This script generates self-signed certificates
// for LOCAL DEVELOPMENT ONLY. Never use these in production.
// ×××××××××××××××××××××××××××××××××××××××××××××××××

function generateAndWrite() {
    const configDir = 'D:/Company/nanosoft_signature_system/config';
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    // 1. Generate CA key pair
    const { privateKey: caKey, publicKey: caPub } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    fs.writeFileSync(path.join(configDir, 'ca-key.pem'), caKey);
    fs.writeFileSync(path.join(configDir, 'ca-cert.pem'), caPub);
    console.log('1/6 ca-key.pem written');
    console.log('2/6 ca-cert.pem written');

    // 2. Generate server key pair for MySQL
    const { privateKey: mysqlKey, publicKey: mysqlPub } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    fs.writeFileSync(path.join(configDir, 'mysql-server-key.pem'), mysqlKey);
    fs.writeFileSync(path.join(configDir, 'mysql-server-cert.pem'), mysqlPub);
    console.log('3/6 mysql-server-key.pem written');
    console.log('4/6 mysql-server-cert.pem written');

    // 2. Generate server key pair for Redis
    const { privateKey: redisKey, publicKey: redisPub } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    fs.writeFileSync(path.join(configDir, 'redis-server-key.pem'), redisKey);
    fs.writeFileSync(path.join(configDir, 'redis-server-cert.pem'), redisPub);
    console.log('5/6 redis-server-key.pem written');
    console.log('6/6 redis-server-cert.pem written');

    // Verify all 6 files exist
    const files = ['ca-key.pem', 'ca-cert.pem', 'mysql-server-key.pem', 'mysql-server-cert.pem', 'redis-server-key.pem', 'redis-server-cert.pem'];
    console.log('\n=== File verification ===');
    files.forEach(f => {
        const p = path.join(configDir, f);
        if (fs.existsSync(p)) {
            const size = fs.statSync(p).size;
            console.log(`${f}: ${size} bytes (${size > 0 ? 'OK' : 'EMPTY!'})`);
        } else {
            console.log(`${f}: MISSING!`);
        }
    });
}

generateAndWrite();
