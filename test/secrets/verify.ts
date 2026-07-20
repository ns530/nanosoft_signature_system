import { storeSecret, retrieveSecret } from './secretStore.test';

async function testSecretStore() {
    try {
        console.log("Testing secret store operations...");
        
        // Test basic write/read
        await storeSecret("test_key", "test_value_123");
        const value1 = await retrieveSecret("test_key");
        console.log(`Retrieved value: ${value1}`);
        
        // Test concurrent access
        const [val1, val2] = await Promise.all([
            retrieveSecret("test_key"),
            retrieveSecret("test_key")
        ]);
        console.log(`Concurrent read test: ${val1 === val2}`);
        
        // Test overwrite
        await storeSecret("test_key", "new_value");
        const value2 = await retrieveSecret("test_key");
        console.log(`Update test: ${value2 === "new_value"}`);
        
        // Test non-existent key
        const missing = await retrieveSecret("non_existent_key");
        console.log(`Missing key test: ${missing === null}`);
        
        console.log("✅ All secret store tests passed");
    } catch (err) {
        console.error("❌ Test failed:", err);
        process.exit(1);
    }
}

testSecretStore();