const {
    getJob,
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
    sendJobAlert
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

        // Keep the local database updated as well.
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
            reason:
                "Job was saved, but the email alert failed.",
            error: error.message
        };
    }
}

async function processMatchedJob(job) {
    const match = job.match;
    const jobKey = job.jobKey || getJobKey(job);

    // Ignore jobs that the matcher rejected.
    if (!match || match.status === "IGNORE") {
        return {
            action: "IGNORE",
            job,
            reason:
                match?.reason ||
                "Job did not pass the matching rules."
        };
    }

    /*
     * Google Sheets is now the persistent history source.
     *
     * This allows duplicate-alert prevention to survive
     * GitHub Actions runner restarts.
     */
    const sheetJob =
    await findSheetJob(jobKey);

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
            match: {
                ...sheetJob.match,
                ...job.match
            },
            firstSeenAt:
                sheetJob.firstSeenAt ||
                job.firstSeenAt ||
                new Date().toISOString(),
            lastSeenAt:
                new Date().toISOString(),
            alertedAt:
                sheetJob.alertedAt || ""
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
        lastSeenAt:
            new Date().toISOString()
    };

    await upsertSheetJob(newJob);

    // Keep the local database updated as a local backup.
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

module.exports = {
    processMatchedJob,
    processMatchedJobWithAlert,
    processMatchedJobs
};