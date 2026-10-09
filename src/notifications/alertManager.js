
const {
    getJobKey,
    saveJob,
    markJobAlerted
} = require("../database/jobStore");

const {
    findSheetJob,
    upsertSheetJob,
    markSheetJobAlerted
} = require("../database/googleSheetStore");

const {
    sendJobAlert,
    sendJobDigest
} = require("./gmailNotifier");

async function processMatchedJobWithAlert(
    job,
    alertSender = sendJobAlert
) {
    const result = await processMatchedJob(job);

    if (
        result.action !== "NEW_MATCH" &&
        result.action !== "RETRY_ALERT"
    ) {
        return result;
    }

    try {
        await alertSender(result.job);

        const alertedJob =
            await markSheetJobAlerted(result.job);

        markJobAlerted(result.job);

        return {
            action: "ALERT_SENT",
            job: alertedJob || result.job,
            sourceAction: result.action,
            reason:
                result.action === "RETRY_ALERT"
                    ? "Previous alert was not confirmed, so the email alert was retried successfully."
                    : "New matching job found, saved, and email alert sent."
        };
    } catch (error) {
        return {
            action: "ALERT_FAILED",
            job: result.job,
            sourceAction: result.action,
            reason: "Job was saved, but the email alert failed.",
            error: error.message
        };
    }
}

async function processMatchedJob(job) {
    const match = job.match;
    const jobKey = job.jobKey || getJobKey(job);

    if (!match || match.status === "IGNORE") {
        return {
            action: "IGNORE",
            job,
            reason:
                match?.reason ||
                "Job did not pass the matching rules."
        };
    }

    const sheetJob = await findSheetJob(jobKey);

    if (sheetJob && sheetJob.alertedAt) {
        return {
            action: "ALREADY_REPORTED",
            job: sheetJob,
            reason:
                "This job requisition has already been reported successfully."
        };
    }

    if (sheetJob && !sheetJob.alertedAt) {
        const updatedJob = {
            ...sheetJob,
            ...job,
            jobKey,
            match: {
                ...sheetJob.match,
                ...job.match
            },
            firstSeenAt:
                sheetJob.firstSeenAt ||
                job.firstSeenAt ||
                new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            alertedAt: ""
        };

        await upsertSheetJob(updatedJob);

        return {
            action: "RETRY_ALERT",
            job: updatedJob,
            reason:
                "This job was previously saved, but its email alert was not confirmed."
        };
    }

    const newJob = {
        ...job,
        jobKey,
        firstSeenAt:
            job.firstSeenAt ||
            new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
    };

    await upsertSheetJob(newJob);

    const savedJob = saveJob(newJob);

    return {
        action: "NEW_MATCH",
        job: savedJob,
        reason:
            "New matching job found and saved to persistent history."
    };
}

async function processMatchedJobs(jobs) {
    const results = [];

    for (const job of jobs) {
        results.push(
            await processMatchedJobWithAlert(job)
        );
    }

    return results;
}

/*
 * Digest flow:
 * 1. Identify new jobs and jobs whose alerts need retrying.
 * 2. Send one digest for all eligible jobs.
 * 3. Mark eligible jobs alerted only after successful delivery.
 *
 * emailSender is injectable so tests can avoid contacting Gmail.
 */
async function processMatchedJobsAsDigest(
    jobs,
    emailSender
) {
    const results = [];
    const eligibleJobs = [];

    for (const job of jobs) {
        try {
            const result = await processMatchedJob(job);
            results.push(result);

            if (
                result.action === "NEW_MATCH" ||
                result.action === "RETRY_ALERT"
            ) {
                eligibleJobs.push(result.job);
            }
        } catch (error) {
            results.push({
                action: "PROCESSING_FAILED",
                job,
                reason: "Could not process job history.",
                error: error.message
            });
        }
    }

    if (eligibleJobs.length === 0) {
        return {
            action: "NO_DIGEST",
            results,
            eligibleCount: 0,
            reason: "No new or retryable matching jobs."
        };
    }

    try {
        const digestResult = await sendJobDigest(
            eligibleJobs,
            emailSender
        );

        if (!digestResult.sent) {
            return {
                action: "DIGEST_NOT_SENT",
                results,
                eligibleCount: eligibleJobs.length,
                reason: digestResult.reason
            };
        }

        const markingResults = [];

        for (const job of eligibleJobs) {
            try {
                const alertedJob =
                    await markSheetJobAlerted(job);

                if (alertedJob) {
                    markJobAlerted(job);
                    markingResults.push({
                        jobKey: job.jobKey,
                        action: "ALERTED"
                    });
                } else {
                    markingResults.push({
                        jobKey: job.jobKey,
                        action: "SHEET_RECORD_NOT_FOUND"
                    });
                }
            } catch (error) {
                markingResults.push({
                    jobKey: job.jobKey,
                    action: "MARKING_FAILED",
                    error: error.message
                });
            }
        }

        const markingFailed = markingResults.some(
            item => item.action !== "ALERTED"
        );

        return {
            action: markingFailed
                ? "DIGEST_SENT_MARKING_INCOMPLETE"
                : "DIGEST_SENT",
            results,
            eligibleCount: eligibleJobs.length,
            digestResult,
            markingResults,
            reason: markingFailed
                ? "Digest was sent, but one or more alert records could not be updated. Review before retrying to avoid duplicate emails."
                : "Digest was sent and all included jobs were marked as alerted."
        };
    } catch (error) {
        return {
            action: "DIGEST_FAILED",
            results,
            eligibleCount: eligibleJobs.length,
            reason:
                "Digest delivery failed. Eligible jobs remain unconfirmed for retry.",
            error: error.message
        };
    }
}

module.exports = {
    processMatchedJob,
    processMatchedJobWithAlert,
    processMatchedJobs,
    processMatchedJobsAsDigest
};
