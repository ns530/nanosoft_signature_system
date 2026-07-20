// setup.ts — runs before all tests
import { startContainers, truncateTables } from './docker-lifecycle';

beforeAll(async () => {
  await startContainers();
});

beforeEach(async () => {
  await truncateTables();
});

afterAll(async () => {
  const { stopContainers } = await import('./docker-lifecycle');
  await stopContainers();
});
