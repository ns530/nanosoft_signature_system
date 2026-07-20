// health-check.ts — waits for Docker services to be ready before running tests
import { execSync } from 'child_process';

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Waiting for MySQL...');
  for (let i = 0; i < 60; i++) {
    try {
      execSync('docker exec holcemlk_mysql mysqladmin ping -h127.0.0.1 --silent', { stdio: 'ignore' });
      console.log('MySQL ready');
      break;
    } catch {
      await wait(1000);
    }
    if (i === 59) { console.error('MySQL not ready after 60s'); process.exit(1); }
  }

  console.log('Waiting for Redis...');
  for (let i = 0; i < 30; i++) {
    try {
      execSync('docker exec holcemlk_redis redis-cli ping', { stdio: 'ignore' });
      console.log('Redis ready');
      break;
    } catch {
      await wait(1000);
    }
    if (i === 29) { console.error('Redis not ready after 30s'); process.exit(1); }
  }

  console.log('All services healthy');
}

main();
