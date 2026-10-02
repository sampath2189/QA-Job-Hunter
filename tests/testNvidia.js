const {
    scanWorkdayJobs
} = require("../src/scanners/workdayScanner");

const {
    getWorkdayJobDetails
} = require("../src/scanners/workdayJobDetails");

const {
    matchJob
} = require("../src/matching/jobMatcher");

async function main() {
    const jobs = await scanWorkdayJobs({
        company: "NVIDIA",
        url: "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite"
    });

    console.log("\n=== NVIDIA WORKDAY RESULTS ===");
    console.log(`Jobs discovered: ${jobs.length}`);

    const qaJobs = [];

    for (const job of jobs) {
        const text =
            `${job.title || ""} ${job.description || ""}`.toLowerCase();

        if (
            /qa|quality|test|testing|sdet|automation/.test(text)
        ) {
            qaJobs.push(job);
        }
    }

    console.log(
        `Potential QA/testing jobs: ${qaJobs.length}`
    );

    console.log("\n=== NVIDIA MATCHING RESULTS ===");

    let strong = 0;
    let review = 0;
    let ignored = 0;

    for (const job of qaJobs) {
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
        console.log(`URL: ${job.url}`);

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
    console.error("NVIDIA test failed:");
    console.error(error);
});