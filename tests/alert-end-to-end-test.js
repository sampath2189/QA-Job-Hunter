const {
    processMatchedJobWithAlert
} = require("../src/notifications/alertManager");

const {
    loadJobs,
    saveJobs
} = require("../src/database/jobStore");

const TEST_ROLE_NUMBER = "TEST-END-TO-END-001";

const testJob = {
    company: "QA Job Hunter Test",
    title: "Test QA Automation Engineer",
    url: "https://example.com/qa-job-hunter-test",
    locations: [
        "Hyderabad, Telangana, India"
    ],
    roleNumber: TEST_ROLE_NUMBER,
    postedDate: "Sep 28, 2026",
    minimumExperience: "3+ years",
    automationExperience: "1+ years",
    technologies: [
        "Playwright",
        "JavaScript",
        "API Testing"
    ],
    match: {
        status: "STRONG_MATCH",
        score: 95,
        reasons: [
            "Controlled end-to-end alert test"
        ]
    }
};

async function main() {
    console.log("========================================");
    console.log("ALERT END-TO-END TEST");
    console.log("========================================");

    console.log("\nThis test will send ONE test email.");

    // Remove any previous copy of this test job.
    const existingJobs = loadJobs();

    const cleanedJobs = existingJobs.filter(
        (job) =>
            job.jobKey !==
            `QA Job Hunter Test:${TEST_ROLE_NUMBER}`
    );

    saveJobs(cleanedJobs);

    console.log("\nStarting new-job alert test...");

    try {
        const result =
            await processMatchedJobWithAlert(testJob);

        console.log("\nAlert result:");
        console.log(result.action);
        console.log(result.reason);

        if (result.error) {
            console.log(`Error: ${result.error}`);
        }

        if (result.job?.alertedAt) {
            console.log(
                `\nAlertedAt: ${result.job.alertedAt}`
            );
        }

        if (result.action === "ALERT_SENT") {
            console.log("\nSUCCESS: New job alert flow completed.");
        } else {
            console.log(
                "\nWARNING: Expected ALERT_SENT but received a different result."
            );
        }

    } finally {
        // Remove only the temporary test record.
        const jobsAfterTest = loadJobs();

        const finalJobs = jobsAfterTest.filter(
            (job) =>
                job.jobKey !==
                `QA Job Hunter Test:${TEST_ROLE_NUMBER}`
        );

        saveJobs(finalJobs);

        console.log(
            "\nTemporary test job removed from jobs.json."
        );
    }

    console.log("\nEnd-to-end test completed.");
}

main().catch((error) => {
    console.error("\nEnd-to-end test failed:");
    console.error(error);
    process.exit(1);
});