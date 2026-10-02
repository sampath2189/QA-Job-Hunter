const { scanAmazonJobs } = require("../src/scanners/amazonScanner");
const { getAmazonJobDetails } = require("../src/scanners/amazonJobDetails");
const { matchJob } = require("../src/matching/jobMatcher");

async function main() {
    console.log("========================================");
    console.log("AMAZON END-TO-END MATCHER TEST");
    console.log("========================================");

    const jobs = await scanAmazonJobs();

    console.log(`\nJobs passed from scanner: ${jobs.length}`);

    for (const job of jobs) {
        console.log("\n----------------------------------------");
        console.log(`Checking: ${job.title}`);
        console.log(`Job ID: ${job.roleNumber}`);

        const detailedJob = await getAmazonJobDetails(job);

        const matchedJob = matchJob(detailedJob);

        console.log("\nMATCH RESULT:");
        console.log(JSON.stringify(matchedJob.match, null, 2));
    }

    console.log("\n========================================");
    console.log("Amazon matcher test completed.");
    console.log("========================================");
}

main().catch((error) => {
    console.error("\nAmazon matcher test failed:");
    console.error(error.message);
    process.exit(1);
});