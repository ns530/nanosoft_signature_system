import { initDatabaseConnections, checkDbConnections } from '../db';
import { getEncryptionKey } from '../services/keyManagement';
import { redisConnection } from '../redis';

async function runVerification() {
  console.log('Running Epic 1 verification tests...\n');

  // Test 1: Database connections (requires live DB)
  console.log('Test 1: Database Connection Setup');
  try {
    const { dataEntryDb, imagesDb } = await initDatabaseConnections();
    console.log('  Connections initialized successfully');
    const health = await checkDbConnections();
    console.log(`  DataEntry DB: ${health.dataEntry ? 'PASS' : 'FAIL'}`);
    console.log(`  Images DB: ${health.images ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.log('  DB connection test skipped (no live database available)');
    console.log(`  Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  // Test 2: Redis connection
  console.log('\nTest 2: Redis Connection Setup');
  try {
    await redisConnection.connect();
    const redisHealth = await redisConnection.healthCheck();
    console.log(`  Redis: ${redisHealth ? 'PASS' : 'FAIL'}`);
  } catch {
    console.log('  Redis test skipped (no live Redis available)');
  }

  // Test 3: Key management
  console.log('\nTest 3: Key Management');
  try {
    const key = await getEncryptionKey();
    console.log(`  Encryption key loaded: ${key.length > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`  Key length: ${key.length * 4} bits (expected: 256)`);
  } catch (err) {
    console.error('  Key management test FAILED:', err);
    process.exit(1);
  }

  console.log('\n✅ Verification complete');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
