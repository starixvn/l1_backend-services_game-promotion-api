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
        const ciEnvName = process.env.CI_ENVIRONMENT_NAME;
        if (!ciEnvName) {
            console.error('❌ CI_ENVIRONMENT_NAME environment variable is not set.');
            console.error('This script must be run in a GitLab CI environment with CI_ENVIRONMENT_NAME defined (e.g., LOCAL, LOCAL_1).');
            process.exit(1);
        }

        const stackName = process.env.STACK_NAME;
        if (!stackName) {
            console.error('❌ STACK_NAME environment variable is not set.');
            console.error("This script requires STACK_NAME to be defined as 'l1' (for SG) or 'l2' (for VG).");
            process.exit(1);
        }

        console.log(`\n🔎 Running tests for CI environment: ${ciEnvName} on Stack: ${stackName}`);

        const envNameMapping = {
            'LOCAL': 'local0',
            'LOCAL_1': 'local1',
            'LOCAL_2': 'local2',
            'LOCAL_3': 'local3',
        };

        const stackToMarketMapping = {
            'l1': 'sg1',
            'l2': 'vg2',
        };

        const fileEnvPart = envNameMapping[ciEnvName];
        if (!fileEnvPart) {
            console.error(`❌ Invalid CI_ENVIRONMENT_NAME: "${ciEnvName}". Expected one of ${Object.keys(envNameMapping).join(', ')}.`);
            process.exit(1);
        }

        const market = stackToMarketMapping[stackName];
        if (!market) {
            console.error(`❌ Invalid STACK_NAME: "${stackName}". Expected one of ${Object.keys(stackToMarketMapping).join(', ')}.`);
            process.exit(1);
        }
        
        const marketPrefix = market.replace(/[0-9]/g, '').toUpperCase();
        const environmentFileName = `${marketPrefix}_${fileEnvPart}.postman_environment.json`;
        const environmentPath = path.resolve(__dirname, 'environments', market, environmentFileName);

        if (!fs.existsSync(environmentPath)) {
            console.error(`\n❌ Environment file not found: ${environmentPath}`);
            process.exit(1);
        }
            
        console.log(`\n\n🚀 Starting tests for market: "${market}" using environment ${environmentFileName}`);

        // 1. Run Complete Flow
        const collection1 = path.resolve(__dirname, 'collections', 'Game Promotion API - Complete Lifecycle Flow.postman_collection.json');
        await runCollection(collection1, environmentPath);

        // 2. Run Deduction Verification Flow
        const collection2 = path.resolve(__dirname, 'collections', 'Game Promotion API - Deduction Verification Flow.postman_collection.json');
        await runCollection(collection2, environmentPath);

        console.log(`\n🎉 All collections finished for market "${market}"!`);
    } catch (error) {
        console.error('\n❌ Test execution failed');
        console.error(error);
        process.exit(1);
    }
}

main();