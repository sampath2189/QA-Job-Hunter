const { scanAppleJobs } = require("../src/scanners/appleScanner");

async function main() {
    console.log("Starting Apple scanner...\n");

    const jobs = await scanAppleJobs();

    console.log("\n========== APPLE SCAN RESULT ==========\n");

    console.log(`Total jobs extracted: ${jobs.length}`);

    console.log("\nFirst 5 jobs:\n");

    console.log(
        JSON.stringify(jobs.slice(0, 5), null, 2)
    );

    console.log("\n========================================\n");
}

main().catch((error) => {
    console.error("Apple scanner test failed:");
    console.error(error.message);
});