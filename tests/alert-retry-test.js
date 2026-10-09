
const assert = require("node:assert/strict");

const sheetJobs = new Map();
const localJobs = new Map();
let senderCalls = 0;

const testJob = {
    company: "QA Job Hunter Retry Test",
    title: "Test QA Engineer - Retry Scenario",
    url: "https://example.com/qa-retry-test",
    roleNumber: "TEST-RETRY-002",
    locations: ["Hyderabad, Telangana, India"],
    technologies: ["Playwright", "JavaScript", "API Testing"],
    match: {
        status: "STRONG_MATCH",
        score: 95,
        reasons: ["Controlled retry test"]
    }
};

const sheetModulePath = require.resolve(
    "../src/database/googleSheetStore"
);

const localModulePath = require.resolve(
    "../src/database/jobStore"
);

const notifierModulePath = require.resolve(
    "../src/notifications/gmailNotifier"
);

require.cache[sheetModulePath] = {
    id: sheetModulePath,
    filename: sheetModulePath,
    loaded: true,
    exports: {
        findSheetJob: async key => sheetJobs.get(key) || null,

        upsertSheetJob: async job => {
            const previous = sheetJobs.get(job.jobKey);

            const updated = {
                ...previous,
                ...job,
                alertedAt: previous?.alertedAt || job.alertedAt || ""
            };

            sheetJobs.set(job.jobKey, updated);

            return {
                action: previous ? "UPDATED" : "INSERTED",
                job: updated
            };
        },

        markSheetJobAlerted: async job => {
            const existing = sheetJobs.get(job.jobKey);

            if (!existing) {
                return null;
            }

            const updated = {
                ...existing,
                alertedAt: new Date().toISOString()
            };

            sheetJobs.set(job.jobKey, updated);

            return updated;
        }
    }
};

require.cache[localModulePath] = {
    id: localModulePath,
    filename: localModulePath,
    loaded: true,
    exports: {
        getJobKey: job =>
            job.roleNumber
                ? `${job.company}:${job.roleNumber}`
                : `${job.company}:${job.url}`,

        saveJob: job => {
            const key = job.jobKey ||
                (job.roleNumber
                    ? `${job.company}:${job.roleNumber}`
                    : `${job.company}:${job.url}`);

            const record = {
                ...job,
                jobKey: key
            };

            localJobs.set(key, record);

            return record;
        },

        markJobAlerted: job => {
            const key = job.jobKey ||
                (job.roleNumber
                    ? `${job.company}:${job.roleNumber}`
                    : `${job.company}:${job.url}`);

            const existing = localJobs.get(key);

            if (!existing) {
                return null;
            }

            const updated = {
                ...existing,
                alertedAt: new Date().toISOString()
            };

            localJobs.set(key, updated);

            return updated;
        }
    }
};

require.cache[notifierModulePath] = {
    id: notifierModulePath,
    filename: notifierModulePath,
    loaded: true,
    exports: {
        sendJobAlert: async () => {
            senderCalls++;
            throw new Error("Simulated email delivery failure.");
        },

        sendJobDigest: async () => {
            senderCalls++;

            if (senderCalls === 1) {
                throw new Error("Simulated email delivery failure.");
            }

            return {
                sent: true,
                count: 1,
                strongMatches: 1,
                reviewMatches: 0
            };
        }
    }
};

const {
    processMatchedJobWithAlert,
    processMatchedJobsAsDigest
} = require("../src/notifications/alertManager");

async function main() {
    console.log("SAFE ALERT RETRY TEST");
    console.log("=====================");

    // Test the existing individual-alert retry path.
    const individualJob = {
        ...testJob,
        roleNumber: "TEST-INDIVIDUAL-RETRY",
        url: "https://example.com/individual-retry"
    };

    const failed = await processMatchedJobWithAlert(
        individualJob,
        async () => {
            throw new Error("Simulated individual email failure.");
        }
    );

    assert.equal(failed.action, "ALERT_FAILED");

    const individualKey =
        `${individualJob.company}:${individualJob.roleNumber}`;

    assert.equal(
        sheetJobs.get(individualKey)?.alertedAt || "",
        ""
    );

    console.log("PASS: Individual email failure leaves job unalerted.");

    const retried = await processMatchedJobWithAlert(
        individualJob,
        async () => ({
            messageId: "fake-individual-retry-success"
        })
    );

    assert.equal(retried.action, "ALERT_SENT");

    console.log("PASS: Individual alert can retry successfully.");

    // Test the digest failure and retry path.
    const digestFailed = await processMatchedJobsAsDigest([testJob]);

    assert.equal(digestFailed.action, "DIGEST_FAILED");

    const digestKey =
        `${testJob.company}:${testJob.roleNumber}`;

    assert.equal(
        sheetJobs.get(digestKey)?.alertedAt || "",
        ""
    );

    console.log("PASS: Digest failure leaves job unalerted.");

    const digestRetried =
        await processMatchedJobsAsDigest([testJob]);

    assert.equal(digestRetried.action, "DIGEST_SENT");

    assert.ok(sheetJobs.get(digestKey)?.alertedAt);

    console.log("PASS: Failed digest can be retried successfully.");
    console.log("\nAll safe retry tests passed.");
}

main().catch(error => {
    console.error("Retry test failed:", error);
    process.exitCode = 1;
});
