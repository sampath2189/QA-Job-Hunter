const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(
    __dirname,
    "../../data/jobs.json"
);

function ensureDataFile() {
    const dataDirectory = path.dirname(DATA_FILE);

    if (!fs.existsSync(dataDirectory)) {
        fs.mkdirSync(dataDirectory, {
            recursive: true
        });
    }

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(
            DATA_FILE,
            "[]",
            "utf8"
        );
    }
}

function loadJobs() {
    ensureDataFile();

    const fileContent = fs.readFileSync(
        DATA_FILE,
        "utf8"
    );

    if (!fileContent.trim()) {
        return [];
    }

    return JSON.parse(fileContent);
}

function saveJobs(jobs) {
    ensureDataFile();

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(jobs, null, 2),
        "utf8"
    );
}

function getJobKey(job) {
    if (job.roleNumber) {
        return `${job.company}:${job.roleNumber}`;
    }

    return `${job.company}:${job.url}`;
}

function getJob(job) {
    const jobs = loadJobs();

    const key = getJobKey(job);

    return jobs.find(
        (storedJob) =>
            storedJob.jobKey === key
    ) || null;
}

function hasJob(job) {
    return getJob(job) !== null;
}

function saveJob(job) {
    const jobs = loadJobs();

    const jobKey = getJobKey(job);

    const existingIndex = jobs.findIndex(
        (storedJob) =>
            storedJob.jobKey === jobKey
    );

    const record = {
        ...job,
        jobKey,
        firstSeenAt:
            existingIndex >= 0
                ? jobs[existingIndex].firstSeenAt
                : new Date().toISOString(),
        lastSeenAt:
            new Date().toISOString()
    };

    if (existingIndex >= 0) {
        jobs[existingIndex] = record;
    } else {
        jobs.push(record);
    }

    saveJobs(jobs);

    return record;
}

function markJobAlerted(job) {
    const jobs = loadJobs();

    const jobKey = getJobKey(job);

    const existingIndex = jobs.findIndex(
        (storedJob) =>
            storedJob.jobKey === jobKey
    );

    if (existingIndex === -1) {
        return null;
    }

    jobs[existingIndex].alertedAt =
        new Date().toISOString();

    saveJobs(jobs);

    return jobs[existingIndex];
}

module.exports = {
    loadJobs,
    saveJobs,
    saveJob,
    getJob,
    hasJob,
    getJobKey,
    markJobAlerted
};