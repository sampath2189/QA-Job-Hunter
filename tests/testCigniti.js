const {
    scanSmartRecruitersJobs
} = require("../src/scanners/smartRecruitersScanner");

async function main() {
    const jobs = await scanSmartRecruitersJobs({
        company: "Cigniti",
        url: "https://careers.smartrecruiters.com/CignitiTechnologiesLtd"
    });

    console.log("\n=== RESULTS ===");
    console.log(`Total QA candidates: ${jobs.length}`);

    for (const job of jobs) {
        console.log("\n--------------------");
        console.log(`Title: ${job.title}`);
        console.log(`Location: ${job.location}`);
        console.log(`Experience: ${job.experienceYears}`);
        console.log(`Automation: ${job.automationRequired}`);
        console.log(`URL: ${job.url}`);
    }
}

main().catch((error) => {
    console.error("Cigniti SmartRecruiters test failed:");
    console.error(error);
});