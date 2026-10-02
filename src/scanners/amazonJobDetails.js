const { chromium } = require("playwright");

async function extractAmazonJobDetails(page, job) {
    await page.goto(job.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    await page.waitForTimeout(2000);

    const data = await page.locator("body").innerText();

    const title = await page.locator("h1").first().innerText();

    const locationMatch = data.match(
        /Job details\s+([^\n]+)/
    );

    const location = locationMatch
        ? locationMatch[1].trim()
        : "";

    const basicQualificationsMatch = data.match(
        /Basic Qualifications\s+([\s\S]*?)\s+Preferred Qualifications/
    );

    const preferredQualificationsMatch = data.match(
        /Preferred Qualifications\s+([\s\S]*?)\s+Our inclusive culture/
    );

    const basicQualifications = basicQualificationsMatch
        ? basicQualificationsMatch[1].trim()
        : "";

    const preferredQualifications = preferredQualificationsMatch
        ? preferredQualificationsMatch[1].trim()
        : "";

    const descriptionMatch = data.match(
        /Description\s+([\s\S]*?)\s+Basic Qualifications/
    );

    const description = descriptionMatch
        ? descriptionMatch[1].trim()
        : "";

    const fullText = [
        description,
        basicQualifications,
        preferredQualifications
    ].join("\n");

    const qaExperienceMatch = fullText.match(
    /(\d+)\+?\s*years?\s+of\s+(?:quality assurance|QA)\s+(?:engineering\s+)?experience/i
);

const experienceYears = qaExperienceMatch
    ? Number(qaExperienceMatch[1])
    : null;

    const automationKeywords = [
        "automation",
        "automated testing",
        "test automation",
        "test framework",
        "automation framework"
    ];

    const automationRequired = automationKeywords.some(
        keyword => fullText.toLowerCase().includes(keyword)
    );

    return {
        ...job,
        title: title.trim(),
        location,
        description,
        basicQualifications,
        preferredQualifications,
        experienceYears,
        automationRequired,
        fullText
    };
}

async function getAmazonJobDetails(job) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        return await extractAmazonJobDetails(page, job);
    } finally {
        await browser.close();
    }
}

module.exports = {
    extractAmazonJobDetails,
    getAmazonJobDetails
};