const { chromium } = require("playwright");

const { scanAppleJobs } = require("./scanners/appleScanner");
const { scanAmazonPipeline } = require("./scanners/amazonPipelineScanner");
const { scanWorkdayJobs } = require("./scanners/workdayScanner");
const { extractWorkdayJobDetails } = require("./scanners/workdayJobDetails");
const { scanBmcJobs } = require("./scanners/bmcScanner");
const { scanEightfoldJobs } = require("./scanners/eightfoldScanner");

const { matchJob } = require("./matching/jobMatcher");
const { processMatchedJobs } = require("./notifications/alertManager");


// ========================================
// WORKDAY DETAIL EXTRACTION
// ========================================

async function getWorkdayDetailedJobs(jobs) {

    const detailedJobs = [];

    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    try {

        for (const job of jobs) {

            try {

                console.log(
                    `\nGetting Workday details: ${job.title || job.url}`
                );

                const detailedJob =
                    await extractWorkdayJobDetails(
                        page,
                        job
                    );

                detailedJobs.push(detailedJob);

            } catch (error) {

                console.log(
                    `Failed to get Workday details: ${job.url}`
                );

                console.log(error.message);

                detailedJobs.push(job);
            }
        }

    } finally {

        await browser.close();
    }

    return detailedJobs;
}


// ========================================
// MAIN PIPELINE
// ========================================

async function main() {

    console.log("========================================");
    console.log("QA JOB HUNTER - JOB PIPELINE");
    console.log("========================================");


    // ========================================
    // APPLE
    // ========================================

    console.log("\n========================================");
    console.log("Scanning Apple");
    console.log("========================================");

    const appleJobs =
        await scanAppleJobs();

    console.log(
        `Apple jobs returned: ${appleJobs.length}`
    );


    // ========================================
    // AMAZON
    // ========================================

    console.log("\n========================================");
    console.log("Scanning Amazon");
    console.log("========================================");

    const amazonJobs =
        await scanAmazonPipeline();

    console.log(
        `Amazon jobs returned: ${amazonJobs.length}`
    );


    // ========================================
    // ADOBE
    // ========================================

    console.log("\n========================================");
    console.log("Scanning Adobe");
    console.log("========================================");

    const adobeJobs =
        await scanWorkdayJobs(
            "Adobe"
        );

    console.log(
        `Adobe jobs returned: ${adobeJobs.length}`
    );


    // ========================================
    // MOTOROLA SOLUTIONS
    // ========================================

    console.log("\n========================================");
    console.log("Scanning Motorola Solutions");
    console.log("========================================");

    const motorolaJobs =
        await scanWorkdayJobs(
            "Motorola Solutions"
        );

    console.log(
        `Motorola Solutions jobs returned: ${motorolaJobs.length}`
    );


    // ========================================
    // NVIDIA
    // ========================================

    console.log("\n========================================");
    console.log("Scanning NVIDIA - India");
    console.log("========================================");

    const nvidiaJobs =
        await scanWorkdayJobs(
            "NVIDIA",
            {
                location: "India"
            }
        );

    console.log(
        `NVIDIA jobs returned: ${nvidiaJobs.length}`
    );


    // ========================================
    // BMC SOFTWARE
    // ========================================

    console.log("\n========================================");
    console.log("Scanning BMC Software - India");
    console.log("========================================");

    const bmcJobs =
        await scanBmcJobs();

    console.log(
        `BMC Software jobs returned: ${bmcJobs.length}`
    );


    // ========================================
    // BROWSERSTACK
    // ========================================

    console.log("\n========================================");
    console.log("Scanning BrowserStack");
    console.log("========================================");

    const browserStackJobs =
        await scanWorkdayJobs(
            "BrowserStack"
        );

    console.log(
        `BrowserStack jobs returned: ${browserStackJobs.length}`
    );


	// ========================================
// QUALCOMM
// ========================================

console.log("\n========================================");
console.log("Scanning Qualcomm");
console.log("========================================");

const qualcommJobs =
    await scanEightfoldJobs({
        company: "Qualcomm",
        platform: "eightfold",
        url: "https://careers.qualcomm.com/careers",
        domain: "qualcomm.com",
        baseUrl: "https://careers.qualcomm.com",
        searchUrl: "https://careers.qualcomm.com/api/pcsx/search",
        detailUrl: "https://careers.qualcomm.com/api/pcsx/position_details"
    });

console.log(
    `Qualcomm jobs returned: ${qualcommJobs.length}`
);


    // ========================================
    // COMBINE ALL JOBS
    // ========================================

    const allJobs = [

    ...appleJobs,
    ...amazonJobs,
    ...adobeJobs,
    ...motorolaJobs,
    ...nvidiaJobs,
    ...bmcJobs,
    ...browserStackJobs,
    ...qualcommJobs

];


    console.log("\n========================================");
    console.log("TOTAL JOBS");
    console.log("========================================");

    console.log(
        `Total jobs collected: ${allJobs.length}`
    );


    // ========================================
    // WORKDAY JOB DETAILS
    // ========================================

    const workdayJobs = [

        ...adobeJobs,
        ...motorolaJobs,
        ...nvidiaJobs,
        ...browserStackJobs

    ];


    console.log("\n========================================");
    console.log("WORKDAY DETAIL EXTRACTION");
    console.log("========================================");


    const detailedWorkdayJobs =
        await getWorkdayDetailedJobs(
            workdayJobs
        );


    // ========================================
    // NON-WORKDAY JOBS
    // ========================================

    const nonWorkdayJobs = [

    ...appleJobs,
    ...amazonJobs,
    ...bmcJobs,
    ...qualcommJobs

];


    // ========================================
    // FINAL DETAILED JOB LIST
    // ========================================

    const detailedJobs = [

        ...nonWorkdayJobs,
        ...detailedWorkdayJobs

    ];


    // ========================================
    // MATCH JOBS
    // ========================================

    console.log("\n========================================");
    console.log("MATCHING JOBS");
    console.log("========================================");


    const matchedJobs =
        detailedJobs.map((job) => {

            return matchJob(job);

        });


    // ========================================
    // MATCH SUMMARY
    // ========================================

    const strongMatches =
        matchedJobs.filter(
            (job) =>
                job.match &&
                job.match.status === "STRONG_MATCH"
        );


    const reviewMatches =
        matchedJobs.filter(
            (job) =>
                job.match &&
                job.match.status === "REVIEW_MATCH"
        );


    const ignoredJobs =
        matchedJobs.filter(
            (job) =>
                job.match &&
                job.match.status === "IGNORE"
        );


    console.log("\n========================================");
    console.log("MATCH SUMMARY");
    console.log("========================================");


    console.log(
        `Total jobs: ${matchedJobs.length}`
    );


    console.log(
        `Strong matches: ${strongMatches.length}`
    );


    console.log(
        `Review matches: ${reviewMatches.length}`
    );


    console.log(
        `Ignored jobs: ${ignoredJobs.length}`
    );


    // ========================================
    // MATCHED JOB DETAILS
    // ========================================

    console.log("\n========================================");
    console.log("MATCHED JOB DETAILS");
    console.log("========================================");


    const jobsToDisplay = [

        ...strongMatches,
        ...reviewMatches

    ];


    if (jobsToDisplay.length === 0) {

        console.log(
            "No matching jobs found."
        );

    }


    for (const job of jobsToDisplay) {

        console.log(
            "\n----------------------------------------"
        );


        console.log(
            `Company: ${job.company || "N/A"}`
        );


        console.log(
            `Title: ${job.match?.title || job.title || "N/A"}`
        );


        console.log(
            `Location: ${job.match?.location || job.location || "N/A"}`
        );


        console.log(
            `Match Type: ${job.match?.status || "N/A"}`
        );


        console.log(
            `Score: ${job.match?.score ?? "N/A"}`
        );


        console.log(
            `Required Experience: ${
                job.match?.requiredExperience ?? "Not specified"
            }`
        );


        console.log(
            `Candidate Experience: ${
                job.match?.candidateExperience ?? "N/A"
            }`
        );


        console.log(
            `Matched Technologies: ${
                job.match?.matchedPreferredTechnologies?.join(", ") ||
                "None"
            }`
        );


        console.log(
            `URL: ${job.url || "N/A"}`
        );

    }


    // ========================================
    // PROCESS ALERTS
    // ========================================

    console.log("\n========================================");
    console.log("PROCESSING ALERTS");
    console.log("========================================");


    await processMatchedJobs(
        jobsToDisplay
    );


    // ========================================
    // FINAL SUMMARY
    // ========================================

    console.log("\n========================================");
    console.log("PIPELINE COMPLETE");
    console.log("========================================");


    console.log(
        `Total jobs scanned: ${matchedJobs.length}`
    );


    console.log(
        `Strong matches: ${strongMatches.length}`
    );


    console.log(
        `Review matches: ${reviewMatches.length}`
    );


    console.log(
        `Ignored jobs: ${ignoredJobs.length}`
    );


    console.log("========================================");
}


// ========================================
// START PIPELINE
// ========================================

main().catch((error) => {

    console.error("\nJob pipeline failed:");

    console.error(error.message);

    process.exit(1);

});
