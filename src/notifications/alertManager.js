const {
    getJob,
    saveJob,
    markJobAlerted
} = require("../database/jobStore");

const {
    sendJobAlert
} = require("./gmailNotifier");

async function processMatchedJobWithAlert(
    job,
    alertSender = sendJobAlert
) {
    const result = processMatchedJob(job);

    if (
        result.action !== "NEW_MATCH" &&
        result.action !== "RETRY_ALERT"
    ) {
        return result;
    }

    try {
        await alertSender(result.job);

        const alertedJob =
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

function processMatchedJob(job) {
    const match = job.match;

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

    // Check whether this exact requisition
    // has already been reported successfully.
    const existingJob = getJob(job);

    if (existingJob && existingJob.alertedAt) {
        return {
            action: "ALREADY_REPORTED",
            job: existingJob,
            reason:
                "This job requisition has already been reported successfully."
        };
    }

    if (existingJob && !existingJob.alertedAt) {
        return {
            action: "RETRY_ALERT",
            job: existingJob,
            reason:
                "This job was previously saved, but its email alert was not confirmed."
        };
    }

    // Store the new matching job first.
    const savedJob = saveJob(job);

    return {
        action: "NEW_MATCH",
        job: savedJob,
        reason:
            "New matching job found and saved."
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