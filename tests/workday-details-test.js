const { scanWorkdayJobs } = require("../src/scanners/workdayScanner");
const { getWorkdayJobDetails } = require("../src/scanners/workdayJobDetails");

async function runTest() {
    console.log("========================================");
    console.log("WORKDAY DETAILS - ALL ADOBE QA JOBS");
    console.log("========================================");

    const jobs = await scanWorkdayJobs("Adobe");

    console.log(`\nQA jobs returned by scanner: ${jobs.length}`);

    const detailedJobs = [];

    for (const job of jobs) {
        console.log("\n----------------------------------------");
        console.log(`Opening: ${job.title}`);
        console.log(`Role: ${job.roleNumber}`);

        try {
            const detailedJob = await getWorkdayJobDetails(job);

            detailedJobs.push(detailedJob);

            console.log("SUCCESS");
            console.log(`Title: ${detailedJob.title}`);
            console.log(`Location: ${detailedJob.location}`);
            console.log(`Posted: ${detailedJob.postedDate}`);
            console.log(`Experience: ${detailedJob.experienceYears}`);
            console.log(`Automation: ${detailedJob.automationRequired}`);
	    console.log(`Domain Experience: ${detailedJob.domainExperienceYears}`);
	    console.log(`Domain Area: ${detailedJob.domainExperienceArea}`);

	const experienceLines = detailedJob.fullText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) =>
        /years?|experience|degree|qualification/i.test(line)
    );

console.log("\nPotential experience/qualification lines:");

for (const line of experienceLines.slice(0, 40)) {
    console.log(`- ${line}`);
}

        } catch (error) {
            console.log("FAILED");
            console.log(error.message);
        }
    }

    console.log("\n========================================");
    console.log("WORKDAY DETAIL TEST SUMMARY");
    console.log("========================================");

    console.log(`Scanner QA jobs: ${jobs.length}`);
    console.log(`Successfully detailed: ${detailedJobs.length}`);
    console.log(`Failed: ${jobs.length - detailedJobs.length}`);
}

runTest().catch((error) => {
    console.error("\nWorkday details test failed:");
    console.error(error.message);
    process.exit(1);
});