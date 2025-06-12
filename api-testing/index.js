const fs = require('fs');
const path = require('path');
const newman = require('newman');

async function runCollection(collectionPath, environmentPath) {
    return new Promise((resolve, reject) => {
        const collection = require(collectionPath);
        const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));

        newman.run({
            collection,
            environment,
            reporters: 'cli'
        }, function (err, summary) {
            if (err) return reject(err);
            if (summary.run.failures.length) {
                console.error(`\n❌ Some tests failed in ${path.basename(collectionPath)}.`);
                process.exit(1);
            } else {
                console.log(`\n✅ All tests completed successfully for ${path.basename(collectionPath)}!`);
                resolve();
            }
        });
    });
}

async function main() {
    try {
        const environmentPath = path.resolve(__dirname, 'environments', 'VG');

        // 1. Run Complete Flow
         const collection1 = path.resolve(__dirname, 'collections', 'Game Promotion API - Complete Lifecycle Flow.postman_collection.json');
        await runCollection(collection1, environmentPath);

        // 2. Run Deduction Verification Flow
        const collection2 = path.resolve(__dirname, 'collections', 'Game Promotion API - Deduction Verification Flow.postman_collection.json');
        await runCollection(collection2, environmentPath);

        console.log('\n🎉 All collections finished!');
    } catch (error) {
        console.error('\n❌ Test execution failed');
        console.error(error);
        process.exit(1);
    }
}

main();