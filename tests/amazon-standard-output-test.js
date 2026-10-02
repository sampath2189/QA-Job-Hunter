const { scanAmazonJobs } = require("../src/scanners/amazonScanner");
const { getAmazonJobDetails } = require("../src/scanners/amazonJobDetails");

async function main() {
    console.log("========================================");
    console.log("AMAZON STANDARD OUTPUT TEST");
    console.log("========================================");

    const jobs = await scanAmazonJobs();

    console.log(`\nPotential QA jobs: ${jobs.length}`);

    for (const job of jobs) {
        const detailedJob = await getAmazonJobDetails(job);

        console.log("\n----------------------------------------");
        console.log("STANDARDIZED JOB OBJECT:");
        console.log("----------------------------------------");

        console.log(JSON.stringify({
            company: detailedJob.company,
            roleNumber: detailedJob.roleNumber,
            title: detailedJob.title,
            url: detailedJob.url,
            location: detailedJob.location,
            experienceYears: detailedJob.experienceYears,
            automationRequired: detailedJob.automationRequired,
            description: detailedJob.description,
            basicQualifications: detailedJob.basicQualifications,
            preferredQualifications: detailedJob.preferredQualifications
        }, null, 2));
    }

    console.log("\n========================================");
    console.log("Amazon standard output test completed.");
    console.log("========================================");
}

main().catch((error) => {
    console.error("\nAmazon standard output test failed:");
    console.error(error.message);
    process.exit(1);
});