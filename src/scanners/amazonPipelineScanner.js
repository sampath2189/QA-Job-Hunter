const { scanAmazonJobs } = require("./amazonScanner");
const { getAmazonJobDetails } = require("./amazonJobDetails");

async function scanAmazonPipeline() {
    console.log("\n========================================");
    console.log("AMAZON PIPELINE SCANNER");
    console.log("========================================");

    const jobs = await scanAmazonJobs();

    const detailedJobs = [];

    for (const job of jobs) {
        try {
            const detailedJob = await getAmazonJobDetails(job);
            detailedJobs.push(detailedJob);

            console.log(
                `Processed: ${detailedJob.title} | ${detailedJob.roleNumber} | ${detailedJob.location}`
            );
        } catch (error) {
            console.error(
                `Failed to process Amazon job ${job.roleNumber}: ${error.message}`
            );
        }
    }

    console.log(
        `\nAmazon pipeline returned ${detailedJobs.length} detailed jobs.`
    );

    return detailedJobs;
}

module.exports = {
    scanAmazonPipeline
};