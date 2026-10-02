const {
    scanGreenhouseJobs
} = require("../src/scanners/greenhouseScanner");

async function main() {
    const jobs = await scanGreenhouseJobs({
        company: "Commvault",
        url: "https://job-boards.greenhouse.io/commvault"
    });

    console.log("\n=== RESULTS ===");
    console.log(`Total QA candidates: ${jobs.length}`);

    for (const job of jobs.slice(0, 10)) {
        console.log("\n--------------------");
        console.log(`Title: ${job.title}`);
        console.log(`Location: ${job.location}`);
        console.log(
            `Experience: ${job.experienceYears}`
        );
        console.log(
            `Automation: ${job.automationRequired}`
        );
        console.log(`URL: ${job.url}`);
    }
}

main().catch((error) => {
    console.error("Greenhouse test failed:");
    console.error(error);
});