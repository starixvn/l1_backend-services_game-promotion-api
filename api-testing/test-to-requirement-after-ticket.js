const fs = require('fs');
const path = require('path');
const newman = require('newman');

async function runTORequirementAfterTicketTest() {
  return new Promise((resolve, reject) => {
    const collectionPath = path.resolve(
      __dirname,
      'collections',
      'Game Promotion API - TO Requirement After Ticket Creation.postman_collection.json',
    );
    const environmentPath = path.resolve(
      __dirname,
      'environments',
      'sg1',
      'SG_local0.postman_environment.json',
    );

    if (!fs.existsSync(collectionPath)) {
      console.error(`❌ Collection file not found: ${collectionPath}`);
      process.exit(1);
    }

    if (!fs.existsSync(environmentPath)) {
      console.error(`❌ Environment file not found: ${environmentPath}`);
      process.exit(1);
    }

    const collection = require(collectionPath);
    const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));

    console.log('\n🚀 Starting TO Requirement After Ticket Creation tests...');
    console.log(`📁 Collection: ${path.basename(collectionPath)}`);
    console.log(`🌍 Environment: ${path.basename(environmentPath)}`);

    newman.run(
      {
        collection,
        environment,
        reporters: 'cli',
      },
      function (err, summary) {
        if (err) {
          console.error('\n❌ Test execution failed:', err);
          return reject(err);
        }

        if (summary.run.failures.length) {
          console.error(
            `\n❌ TO Requirement After Ticket Creation tests failed. ${summary.run.failures.length} failures.`,
          );
          process.exit(1);
        } else {
          console.log('\n✅ TO Requirement After Ticket Creation tests completed successfully!');
          console.log(`📊 Total requests: ${summary.run.stats.requests.total}`);
          console.log(`✅ Passed: ${summary.run.stats.assertions.passed}`);
          console.log(`❌ Failed: ${summary.run.stats.assertions.failed}`);
          resolve();
        }
      },
    );
  });
}

async function main() {
  try {
    await runTORequirementAfterTicketTest();
    console.log('\n🎉 TO Requirement After Ticket Creation test execution completed!');
  } catch (error) {
    console.error('\n❌ TO Requirement After Ticket Creation test execution failed');
    console.error(error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { runTORequirementAfterTicketTest };
