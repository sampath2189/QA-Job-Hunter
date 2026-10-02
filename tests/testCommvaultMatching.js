const {
    scanGreenhouseJobs
} = require("../src/scanners/greenhouseScanner");

const {
    matchJob
} = require("../src/matching/jobMatcher");

async function main() {
    const jobs = await scanGreenhouseJobs({
        company: "Commvault",
        url: "https://job-boards.greenhouse.io/commvault"
    });

    console.log("\n=== COMMVAULT MATCHING RESULTS ===");

    let strong = 0;
    let review = 0;
    let ignored = 0;

    for (const job of jobs) {
        const result = matchJob(job);

        console.log("\n--------------------");
        console.log(`Title: ${job.title}`);
        console.log(`Location: ${job.location}`);
        console.log(`Experience: ${job.experienceYears}`);
        console.log(`Status: ${result.match.status}`);
        console.log(`Score: ${result.match.score}`);
        console.log(
            `Reason: ${result.match.reason || "Matched"}`
        );

        if (result.match.status === "STRONG_MATCH") {
            strong++;
        }
        else if (result.match.status === "REVIEW_MATCH") {
            review++;
        }
        else {
            ignored++;
        }
    }

    console.log("\n=== SUMMARY ===");
    console.log(`Strong matches: ${strong}`);
    console.log(`Review matches: ${review}`);
    console.log(`Ignored: ${ignored}`);
}

main().catch((error) => {
    console.error("Commvault matching test failed:");
    console.error(error);
});