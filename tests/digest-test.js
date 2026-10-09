
const assert = require("node:assert/strict");

const sheetJobs = new Map();
const localJobs = new Map();
let digestCalls = 0;
let shouldFailEmail = false;

const testJobs = [
    {
        company: "Digest Test Company",
        title: "Senior QA Engineer",
        roleNumber: "DIGEST-001",
        url: "https://example.com/digest-001",
        match: {
            status: "STRONG_MATCH",
            score: 95
        }
    },
    {
        company: "Digest Test Company",
        title: "Manual QA Tester",
        roleNumber: "DIGEST-002",
        url: "https://example.com/digest-002",
        match: {
            status: "REVIEW_MATCH",
            score: 65
        }
    }
];

// Replace the database modules before loading alertManager.
// These fakes keep the test isolated from real storage.
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

            sheetJobs.set(job.jobKey, {
                ...previous,
                ...job,
                alertedAt: previous?.alertedAt || job.alertedAt || ""
            });

            return {
                action: previous ? "UPDATED" : "INSERTED",
                job: sheetJobs.get(job.jobKey)
            };
        },

        markSheetJobAlerted: async job => {
    if (job.roleNumber === "DIGEST-SHEETS-FAIL") {
        throw new Error(
            "Simulated Google Sheets update failure."
        );
    }

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
            throw new Error("Individual email sender should not be used.");
        },

        sendJobDigest: async jobs => {
            digestCalls++;

            if (shouldFailEmail) {
                throw new Error("Simulated digest delivery failure.");
            }

            return {
                sent: true,
                count: jobs.length,
                strongMatches: jobs.filter(
                    job => job.match?.status === "STRONG_MATCH"
                ).length,
                reviewMatches: jobs.filter(
                    job => job.match?.status === "REVIEW_MATCH"
                ).length
            };
        }
    }
};

const {
    processMatchedJobsAsDigest
} = require("../src/notifications/alertManager");

async function main() {
    console.log("Testing digest alert manager with fake storage and email...");

    const first = await processMatchedJobsAsDigest(testJobs);

    assert.equal(first.action, "DIGEST_SENT");
    assert.equal(first.eligibleCount, 2);
    assert.equal(digestCalls, 1);

    for (const job of testJobs) {
        const key = `${job.company}:${job.roleNumber}`;

        assert.ok(sheetJobs.get(key)?.alertedAt);
        assert.ok(localJobs.get(key)?.alertedAt);
    }

    console.log("PASS: One digest sent for two matching jobs.");
    console.log("PASS: Both jobs marked alerted after success.");

    const second = await processMatchedJobsAsDigest(testJobs);

    assert.equal(second.action, "NO_DIGEST");
    assert.equal(digestCalls, 1);

    console.log("PASS: Previously alerted jobs do not trigger another digest.");

    const failedJob = {
        ...testJobs[0],
        roleNumber: "DIGEST-FAIL-001",
        url: "https://example.com/digest-fail-001"
    };

    shouldFailEmail = true;

    const failed = await processMatchedJobsAsDigest([failedJob]);

    assert.equal(failed.action, "DIGEST_FAILED");
    assert.equal(failed.eligibleCount, 1);

    const failedKey = `${failedJob.company}:${failedJob.roleNumber}`;

    assert.equal(sheetJobs.get(failedKey)?.alertedAt || "", "");
    assert.equal(localJobs.get(failedKey)?.alertedAt || "", "");

    console.log("PASS: Failed delivery does not mark the job alerted.");

    shouldFailEmail = false;
	const sheetsFailureJob = {
        ...testJobs[0],
        roleNumber: "DIGEST-SHEETS-FAIL",
        url: "https://example.com/digest-sheets-fail"
    };

    const sheetsFailureResult =
        await processMatchedJobsAsDigest([sheetsFailureJob]);

    assert.equal(
        sheetsFailureResult.action,
        "DIGEST_SENT_MARKING_INCOMPLETE"
    );

    assert.equal(
        sheetsFailureResult.markingResults[0].action,
        "SHEET_MARKING_FAILED"
    );

    console.log(
        "PASS: Sheets update failure is reported after successful delivery."
    );

    console.log("\nAll alert-manager digest tests passed.");
}

main().catch(error => {
    console.error("Digest alert-manager test failed:", error);
    process.exitCode = 1;
});
