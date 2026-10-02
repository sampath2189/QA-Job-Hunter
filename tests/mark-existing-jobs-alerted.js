const {
    loadJobs,
    saveJobs
} = require("../src/database/jobStore");

function main() {
    const jobs = loadJobs();

    console.log(`Found ${jobs.length} existing jobs.`);

    if (jobs.length === 0) {
        console.log("No existing jobs found. Nothing to migrate.");
        return;
    }

    const timestamp = new Date().toISOString();

    const updatedJobs = jobs.map((job) => ({
        ...job,
        alertedAt: job.alertedAt || timestamp
    }));

    saveJobs(updatedJobs);

    console.log(
        `Marked ${updatedJobs.length} existing jobs as already alerted.`
    );

    console.log("\nNo emails were sent.");
}

main();