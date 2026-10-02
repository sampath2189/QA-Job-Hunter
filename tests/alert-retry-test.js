require("dotenv").config();

const {
    processMatchedJobWithAlert
} = require("../src/notifications/alertManager");

const {
    loadJobs,
    saveJobs,
    getJob
} = require("../src/database/jobStore");

const TEST_ROLE_NUMBER = "TEST-RETRY-002";

const testJob = {
    company: "QA Job Hunter Retry Test",
    title: "Test QA Engineer - Retry Scenario",
    url: "https://example.com/qa-retry-test",
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
            "Controlled retry test"
        ]
    }
};

async function main() {
    console.log("========================================");
    console.log("ALERT FAILURE & RETRY TEST");
    console.log("========================================");

    const testJobKey =
        `QA Job Hunter Retry Test:${TEST_ROLE_NUMBER}`;

    // Remove any previous copy of this test job.
    const existingJobs = loadJobs();

    saveJobs(
        existingJobs.filter(
            (job) => job.jobKey !== testJobKey
        )
    );

    console.log("\n[1/4] Simulating email failure...");

    // This fake sender deliberately fails.
    // It does NOT contact Gmail.
    const failingAlertSender = async function () {
        throw new Error(
            "Simulated email delivery failure for testing."
        );
    };

    const failedResult =
        await processMatchedJobWithAlert(
            testJob,
            failingAlertSender
        );

    console.log(`Result: ${failedResult.action}`);
    console.log(`Reason: ${failedResult.reason}`);
    console.log(`Error: ${failedResult.error}`);

    const savedAfterFailure =
        getJob(testJob);

    console.log(
        `AlertedAt after failure: ${
            savedAfterFailure?.alertedAt || "NOT SET"
        }`
    );

    console.log("\n[2/4] Verifying failed alert state...");

    if (
        failedResult.action === "ALERT_FAILED" &&
        savedAfterFailure &&
        !savedAfterFailure.alertedAt
    ) {
        console.log(
            "Failure state verified: job saved without alertedAt."
        );
    } else {
        throw new Error(
            "Failure state was not recorded as expected."
        );
    }

    console.log("\n[3/4] Retrying with real Gmail alert...");

    // No custom sender is supplied here.
    // Therefore the production Gmail sender is used.
    const retryResult =
        await processMatchedJobWithAlert(testJob);

    console.log(`Result: ${retryResult.action}`);
    console.log(`Reason: ${retryResult.reason}`);

    if (retryResult.error) {
        console.log(`Error: ${retryResult.error}`);
    }

    const savedAfterRetry =
        getJob(testJob);

    console.log(
        `AlertedAt after retry: ${
            savedAfterRetry?.alertedAt || "NOT SET"
        }`
    );

    console.log("\n[4/4] Cleaning up test job...");

    const finalJobs = loadJobs().filter(
        (job) => job.jobKey !== testJobKey
    );

    saveJobs(finalJobs);

    console.log(
        "Temporary retry-test job removed."
    );

    console.log("\n========================================");
    console.log("RETRY TEST SUMMARY");
    console.log("========================================");

    console.log(
        `Failure simulation : ${failedResult.action}`
    );

    console.log(
        `Retry result       : ${retryResult.action}`
    );

    console.log(
        `Alerted after retry: ${
            savedAfterRetry?.alertedAt
                ? "YES"
                : "NO"
        }`
    );

    if (
        failedResult.action === "ALERT_FAILED" &&
        retryResult.action === "ALERT_SENT" &&
        savedAfterRetry?.alertedAt
    ) {
        console.log(
            "\nSUCCESS: Failure and retry flow works correctly."
        );
    } else {
        console.log(
            "\nWARNING: Retry flow did not produce the expected result."
        );
    }
}

main().catch((error) => {
    console.error("\nRetry test failed:");
    console.error(error);
    process.exit(1);
});