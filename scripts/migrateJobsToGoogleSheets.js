const { loadJobs } = require("../src/database/jobStore");
const {
    loadSheetJobs,
    upsertSheetJob
} = require("../src/database/googleSheetStore");

async function migrateJobs() {
    console.log("========== GOOGLE SHEETS MIGRATION ==========\n");

    const localJobs = loadJobs();

    console.log(`Local jobs found: ${localJobs.length}`);

    if (localJobs.length === 0) {
        console.log("No local jobs to migrate.");
        return;
    }

    const sheetJobs = await loadSheetJobs();

    console.log(`Existing Sheet jobs: ${sheetJobs.length}\n`);

    let inserted = 0;
    let updated = 0;

    for (const job of localJobs) {
        const existing = sheetJobs.find(
            sheetJob => sheetJob.jobKey === job.jobKey
        );

        const result = await upsertSheetJob(job);

        if (result.action === "INSERTED") {
            inserted++;
            console.log(
                `INSERTED: ${job.jobKey} | ${job.title}`
            );
        } else if (result.action === "UPDATED") {
            updated++;
            console.log(
                `UPDATED: ${job.jobKey} | ${job.title}`
            );
        }

        if (existing) {
            console.log("  Existing Sheet record found.");
        }
    }

    const finalSheetJobs = await loadSheetJobs();

    console.log("\n========== MIGRATION COMPLETE ==========");
    console.log(`Local jobs: ${localJobs.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log(`Final Sheet jobs: ${finalSheetJobs.length}`);
}

migrateJobs().catch(error => {
    console.error("\nMigration failed:");
    console.error(error.message);
    process.exitCode = 1;
});