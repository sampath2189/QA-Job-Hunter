const { google } = require("googleapis");
require("dotenv").config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = "Jobs";

function getSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets"
        ]
    });

    return google.sheets({
        version: "v4",
        auth
    });
}

function jobToRow(job) {
    return [
        job.jobKey || "",
        job.company || "",
        job.title || "",
        job.location || "",
        job.url || "",
        job.match?.status || "",
        job.match?.score ?? "",
        job.firstSeenAt || "",
        job.lastSeenAt || "",
        job.alertedAt || ""
    ];
}

function rowToJob(row) {
    return {
        jobKey: row[0] || "",
        company: row[1] || "",
        title: row[2] || "",
        location: row[3] || "",
        url: row[4] || "",
        match: {
            status: row[5] || "",
            score:
                row[6] === "" || row[6] === undefined
                    ? null
                    : Number(row[6])
        },
        firstSeenAt: row[7] || "",
        lastSeenAt: row[8] || "",
        alertedAt: row[9] || ""
    };
}

async function loadSheetJobs() {
    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:J`
    });

    const rows = response.data.values || [];

    return rows
        .filter(row => row.length > 0)
        .map(rowToJob);
}

async function findSheetJob(jobKey) {
    const jobs = await loadSheetJobs();

    return jobs.find(
        job => job.jobKey === jobKey
    ) || null;
}

async function appendSheetJob(job) {
    const sheets = getSheetsClient();

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:J`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
            values: [
                jobToRow(job)
            ]
        }
    });

    return job;
}

async function upsertSheetJob(job) {
    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:J`
    });

    const rows = response.data.values || [];

    const rowIndex = rows.findIndex(
        row => row[0] === job.jobKey
    );

    if (rowIndex === -1) {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:J`,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [
                    jobToRow(job)
                ]
            }
        });

        return {
            action: "INSERTED",
            job
        };
    }

    const existingJob = rowToJob(rows[rowIndex]);

    const mergedJob = {
        ...existingJob,
        ...job,
        match: {
            ...existingJob.match,
            ...job.match
        },
        firstSeenAt:
            existingJob.firstSeenAt ||
            job.firstSeenAt ||
            new Date().toISOString(),
        lastSeenAt:
            job.lastSeenAt ||
            existingJob.lastSeenAt ||
            new Date().toISOString(),
        alertedAt:
            job.alertedAt ||
            existingJob.alertedAt ||
            ""
    };

    const sheetRowNumber = rowIndex + 2;

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range:
            `${SHEET_NAME}!A${sheetRowNumber}:J${sheetRowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [
                jobToRow(mergedJob)
            ]
        }
    });

    return {
        action: "UPDATED",
        job: mergedJob
    };
}

async function markSheetJobAlerted(job) {
    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:J`
    });

    const rows = response.data.values || [];

    const rowIndex = rows.findIndex(
        row => row[0] === job.jobKey
    );

    if (rowIndex === -1) {
        return null;
    }

    const existingJob = rowToJob(rows[rowIndex]);

    const updatedJob = {
        ...existingJob,
        alertedAt:
            new Date().toISOString()
    };

    const sheetRowNumber = rowIndex + 2;

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range:
            `${SHEET_NAME}!A${sheetRowNumber}:J${sheetRowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [
                jobToRow(updatedJob)
            ]
        }
    });

    return updatedJob;
}

module.exports = {
    loadSheetJobs,
    findSheetJob,
    appendSheetJob,
    upsertSheetJob,
    markSheetJobAlerted,
    jobToRow,
    rowToJob
};