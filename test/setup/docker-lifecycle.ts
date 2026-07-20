// docker-lifecycle.ts — beforeAll/afterAll hooks for Docker containers
import { execSync, spawn } from 'child_process';

const COMPOSE_FILE = '../../docker-compose.yml';

function run(cmd: string): void {
  try { execSync(cmd, { stdio: 'inherit', cwd: __dirname + '/../..' }); }
  catch {} // ignore errors for teardown
}

export async function startContainers(): Promise<void> {
  run('docker compose up -d');
  // Wait for MySQL to be ready by polling port 3306
  for (let i = 0; i < 60; i++) {
    try {
      execSync('docker exec holcemlk_mysql mysqladmin ping -h127.0.0.1 --silent', { stdio: 'ignore' });
      console.log('MySQL ready after ' + (i + 1) + 's');
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  // Wait for Redis
  for (let i = 0; i < 30; i++) {
    try {
      execSync('docker exec holcemlk_redis redis-cli ping', { stdio: 'ignore' });
      console.log('Redis ready after ' + (i + 1) + 's');
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

export async function stopContainers(): Promise<void> {
  if (!process.env.KEEP_CONTAINERS) {
    run('docker compose down');
  }
}

export async function truncateTables(): Promise<void> {
  const mysql = await import('mysql2/promise');
  const fs = await import('fs');
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root',
    password: 'kDTKUMRiN_jSM44aOHVkySL8rqJEbDbH',
    database: 'holcemlk_banker_images',
    ssl: false,
  });
  await conn.query('DELETE FROM audit_log');
  await conn.query('DELETE FROM customer_images');
  await conn.query('DELETE FROM customer_previous_images');
  await conn.end();
}
