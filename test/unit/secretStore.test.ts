import { storeSecret, retrieveSecret } from '../../src/services/secretStore';

describe('secretStore — concurrent write safety', () => {
  const TEST_KEY = 'concurrent-test-key';

  afterEach(async () => {
    // Clean up
    try { await storeSecret(TEST_KEY, ''); } catch {}
  });

  it('does not lose writes when multiple stores happen concurrently', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(storeSecret(TEST_KEY, `value-${i}`));
    }
    await Promise.all(promises);

    const finalValue = await retrieveSecret(TEST_KEY);
    // The final value should be one of the written values (the last one that completed)
    // Importantly, the JSON file should not be corrupted
    expect(finalValue).not.toBeNull();
    expect(typeof finalValue).toBe('string');
    expect(finalValue).toMatch(/^value-/);
  });

  it('does not mix write data between separate store calls', async () => {
    await storeSecret(TEST_KEY, 'first-value');
    await storeSecret('other-key', 'other-value');
    const val = await retrieveSecret(TEST_KEY);
    expect(val).toBe('first-value');
  });
});
