
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

/*
 * Process one matching job and send an individual alert.
 * The email delivery and history update are handled separately
 * so a storage failure is not incorrectly reported as an email failure.
 */
async function processMatchedJobWithAlert(
    job,
    alertSender = sendJobAlert
) {
    let result;

    try {
        result = await processMatchedJob(job);
    } catch (error) {
        return {
            action: "PROCESSING_FAILED",
            job,
            reason: "Could not process the job history.",
            error: error.message
        };
    }

    if (
        result.action !== "NEW_MATCH" &&
        result.action !== "RETRY_ALERT"
    ) {
        return result;
    }

    try {
        await alertSender(result.job);
    } catch (error) {
        return {
            action: "ALERT_FAILED",
            job: result.job,
            sourceAction: result.action,
            reason: "Email delivery failed. The job remains eligible for retry.",
            error: error.message
        };
    }

    try {
        const alertedJob =
            await markSheetJobAlerted(result.job);

        if (!alertedJob) {
            return {
                action: "ALERT_SENT_MARKING_INCOMPLETE",
                job: result.job,
                sourceAction: result.action,
                reason:
                    "The email sender returned successfully, but the Google Sheets alert record could not be confirmed. Check the sheet before retrying to avoid a duplicate email."
            };
        }

        markJobAlerted(result.job);

        return {
            action: "ALERT_SENT",
            job: alertedJob,
            sourceAction: result.action,
            reason:
                "Email sent and the alert history was updated successfully."
        };
    } catch (error) {
        return {
            action: "ALERT_SENT_MARKING_INCOMPLETE",
            job: result.job,
            sourceAction: result.action,
            reason:
                "The email sender returned successfully, but updating alert history failed. Check Google Sheets before retrying.",
            error: error.message
        };
    }
}

/*
 * Find the job in persistent history and decide whether it is:
 * - ignored
 * - already reported
 * - a new matching job
 * - an existing job whose alert needs retrying
 */
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

        // Keep the local backup in sync when recovering a Sheet record.
        saveJob(updatedJob);

        return {
            action: "RETRY_ALERT",
            job: updatedJob,
            reason:
                "The job was previously saved, but its alert was not confirmed."
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
        job: savedJob || newJob,
        reason:
            "A new matching job was saved to persistent history."
    };
}

/*
 * Process matching jobs with individual email alerts.
 */
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
 * 1. Process jobs and collect new or retryable matches.
 * 2. Send one digest for the eligible jobs.
 * 3. Mark each job alerted only after the digest sender returns
 *    successfully and its Sheet update is confirmed.
 *
 * emailSender is injectable for tests. Tests can use a fake sender
 * without contacting Gmail.
 */
async function processMatchedJobsAsDigest(
    jobs,
    emailSender
) {
    const results = [];
    const eligibleJobs = [];
    const processingFailures = [];

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
            const failure = {
                action: "PROCESSING_FAILED",
                job,
                reason: "Could not process the job history.",
                error: error.message
            };

            results.push(failure);
            processingFailures.push(failure);
        }
    }

    if (eligibleJobs.length === 0) {
        return {
            action: processingFailures.length > 0
                ? "PROCESSING_FAILED_NO_DIGEST"
                : "NO_DIGEST",
            results,
            processingFailures,
            eligibleCount: 0,
            reason: processingFailures.length > 0
                ? "No digest was sent because no eligible jobs were processed successfully. Some job-history operations failed."
                : "No new or retryable matching jobs."
        };
    }

    let digestResult;

    try {
        digestResult = await sendJobDigest(
            eligibleJobs,
            emailSender
        );

        if (!digestResult.sent) {
            return {
                action: "DIGEST_NOT_SENT",
                results,
                processingFailures,
                eligibleCount: eligibleJobs.length,
                reason:
                    digestResult.reason ||
                    "The digest sender did not confirm delivery."
            };
        }
    } catch (error) {
        return {
            action: "DIGEST_FAILED",
            results,
            processingFailures,
            eligibleCount: eligibleJobs.length,
            reason:
                "Digest delivery was not confirmed. Eligible jobs remain unconfirmed for retry.",
            error: error.message
        };
    }

    /*
     * The sender returned successfully.
     * Now update each Sheet record independently so one failure
     * does not prevent the remaining records from being processed.
     */
    const markingResults = [];

    for (const job of eligibleJobs) {
        try {
            const alertedJob =
                await markSheetJobAlerted(job);

            if (!alertedJob) {
                markingResults.push({
                    jobKey: job.jobKey,
                    action: "SHEET_RECORD_NOT_CONFIRMED",
                    reason:
                        "The digest sender returned successfully, but the Sheet update could not be confirmed."
                });

                continue;
            }

            try {
                markJobAlerted(job);

                markingResults.push({
                    jobKey: job.jobKey,
                    action: "ALERTED"
                });
            } catch (error) {
                markingResults.push({
                    jobKey: job.jobKey,
                    action: "LOCAL_MARKING_FAILED",
                    error: error.message
                });
            }
        } catch (error) {
            markingResults.push({
                jobKey: job.jobKey,
                action: "SHEET_MARKING_FAILED",
                error: error.message
            });
        }
    }

    const markingFailed = markingResults.some(
        item => item.action !== "ALERTED"
    );

    const hasProcessingFailures =
        processingFailures.length > 0;

    let action = "DIGEST_SENT";

    if (markingFailed) {
        action = "DIGEST_SENT_MARKING_INCOMPLETE";
    } else if (hasProcessingFailures) {
        action = "DIGEST_SENT_WITH_PROCESSING_ERRORS";
    }

    return {
        action,
        results,
        processingFailures,
        eligibleCount: eligibleJobs.length,
        digestResult,
        markingResults,
        reason: markingFailed
            ? "The digest sender returned successfully, but one or more alert-history updates were not confirmed. Review those records before retrying to avoid duplicate emails."
            : hasProcessingFailures
                ? "The digest sender returned successfully and its included jobs were marked alerted, but some other jobs failed during processing."
                : "The digest sender returned successfully and all included jobs were marked alerted."
    };
}

module.exports = {
    processMatchedJob,
    processMatchedJobWithAlert,
    processMatchedJobs,
    processMatchedJobsAsDigest
};
