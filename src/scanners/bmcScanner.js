const { chromium } = require("playwright");

function normalize(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function extractField(bodyText, fieldName, nextFields = []) {
    const escapedField = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const nextPattern =
        nextFields.length > 0
            ? `(?=\\s*(?:${nextFields
                  .map((field) =>
                      field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                  )
                  .join("|")})\\s*)`
            : "$";

    const pattern = new RegExp(
        `${escapedField}\\s*\\n\\s*([^\\n]+?)\\s*${nextPattern}`,
        "i"
    );

    const match = bodyText.match(pattern);

    return match ? normalize(match[1]) : "";
}

function extractExperience(text) {
    const patterns = [
        /(\d+)\+?\s*years?\s+(?:of\s+)?(?:relevant\s+)?experience/i,
        /(\d+)\+?\s*years?\s+working\s+in/i,
        /minimum\s+(?:of\s+)?(\d+)\+?\s*years?/i,
        /(\d+)\+?\s*years?\s+experience/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match) {
            return Number(match[1]);
        }
    }

    return null;
}

function detectAutomation(text) {
    return /automation|automated testing|test automation|automation framework|automated tests|automation tools|automation scripts/i.test(
        text
    );
}

function isPotentialQATitle(title) {
    const normalizedTitle = normalize(title).toLowerCase();

    const qaTitleKeywords = [
        "qa",
        "quality assurance",
        "quality engineer",
        "quality analyst",
        "software quality",
        "sqa",
        "test engineer",
        "test automation",
        "automation tester",
        "automation engineer",
        "sdet",
        "software test",
        "software quality"
    ];

    return qaTitleKeywords.some((keyword) =>
        normalizedTitle.includes(keyword)
    );
}

function parseJobCardText(text) {
    const normalized = normalize(text);

    const parts = normalized
        .split(/\s{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

    return parts;
}

async function extractBmcJobDetails(page, jobUrl) {
    await page.goto(jobUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    await page.waitForTimeout(2500);

    const rawBodyText = await page.locator("body").innerText();

    const bodyText = rawBodyText
        .replace(/\r/g, "")
        .trim();

    const title =
    normalize(
        await page.locator("h1").filter({
            hasText: /quality|qa|test|automation|engineer|sdet/i
        }).first().innerText().catch(() => "")
    ) ||
    normalize(
        await page.locator("h2").filter({
            hasText: /quality|qa|test|automation|engineer|sdet/i
        }).first().innerText().catch(() => "")
    );

    const country = extractField(
        bodyText,
        "Country",
        ["State", "City", "Date Published", "Job ID", "Travel"]
    );

    const state = extractField(
        bodyText,
        "State",
        ["City", "Date Published", "Job ID", "Travel"]
    );

    const city = extractField(
        bodyText,
        "City",
        ["Date Published", "Job ID", "Travel"]
    );

    const postedDate = extractField(
        bodyText,
        "Date Published",
        ["Job ID", "Travel"]
    );

    const roleNumber = extractField(
        bodyText,
        "Job ID",
        ["Travel", "Secondary locations", "Description and Requirements"]
    );

    const secondaryLocationMatch = bodyText.match(
        /Secondary locations\s*\n([\s\S]*?)(?=\nLooking for details|\nDescription and Requirements)/i
    );

    const secondaryLocations = secondaryLocationMatch
        ? normalize(secondaryLocationMatch[1])
        : "";

    const experienceYears = extractExperience(bodyText);

    const automationRequired = detectAutomation(bodyText);

    const locationParts = [
        city,
        state,
        country
    ].filter(Boolean);

    const location = locationParts.join(", ");

    return {
        company: "BMC Software",
        platform: "bmc",
        roleNumber: roleNumber || null,
        title,
        location,
        country,
        state,
        city,
        secondaryLocations,
        postedDate,
        experienceYears,
        automationRequired,
        description: bodyText,
        fullText: bodyText,
        url: jobUrl
    };
}

async function scanBmcJobs(config = {}) {
    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    const jobs = [];

    const company = config.company || "BMC Software";

    const indiaUrl =
        config.url ||
        "https://jobs.bmc.com/Careers/SearchJobs/?listFilterMode=1&1274=9406&1274_format=1347&intcmp=JobsByCountry";

    try {
        console.log(`\n=== ${company} BMC scan ===`);
        console.log(`URL: ${indiaUrl}`);

        await page.goto(indiaUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(3000);

        const jobLinks = await page.locator(
            "a[href*='/Careers/JobDetail/']"
        ).evaluateAll((links) => {
            return links.map((link) => ({
                title: (link.innerText || "").trim(),
                url: link.href
            }));
        });

        const uniqueLinks = new Map();

        for (const job of jobLinks) {
            if (!job.url) {
                continue;
            }

            uniqueLinks.set(job.url, job);
        }

        console.log(
            `BMC job links found: ${uniqueLinks.size}`
        );

        let potentialTitleCount = 0;

        for (const [jobUrl, link] of uniqueLinks) {
            const linkTitle = normalize(link.title);

            if (!isPotentialQATitle(linkTitle)) {
                continue;
            }

            potentialTitleCount++;

            try {
                const details =
                    await extractBmcJobDetails(
                        page,
                        jobUrl
                    );

                const title =
                    details.title ||
                    linkTitle;

                if (!isPotentialQATitle(title)) {
                    continue;
                }

                jobs.push({
                    ...details
                });

                console.log(
                    `QA candidate: ${title} | ${details.location || "location unknown"} | ${details.roleNumber || "ID unknown"}`
                );
            }
            catch (error) {
                console.log(
                    `Failed to read ${jobUrl}: ${error.message}`
                );
            }
        }

        console.log(
            `Potential QA titles found: ${potentialTitleCount}`
        );

        console.log(
            `BMC QA candidates: ${jobs.length}`
        );

        return jobs;
    }
    finally {
        await browser.close();
    }
}

async function getBmcJobDetails(jobUrl) {
    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    try {
        return await extractBmcJobDetails(
            page,
            jobUrl
        );
    }
    finally {
        await browser.close();
    }
}

if (require.main === module) {
    const TEST_JOB =
        "https://jobs.bmc.com/Careers/JobDetail/Lead-Quality-Automation-Engineer-India/46575";

    getBmcJobDetails(TEST_JOB)
        .then((job) => {
            console.log(
                "\n========================================"
            );
            console.log(
                "BMC JOB DETAIL EXTRACTION"
            );
            console.log(
                "========================================"
            );

            console.log("\nCompany:");
            console.log(job.company);

            console.log("\nTitle:");
            console.log(job.title);

            console.log("\nLocation:");
            console.log(job.location);

            console.log("\nCountry:");
            console.log(job.country);

            console.log("\nState:");
            console.log(job.state);

            console.log("\nCity:");
            console.log(job.city);

            console.log("\nSecondary Locations:");
            console.log(job.secondaryLocations);

            console.log("\nPosted:");
            console.log(job.postedDate);

            console.log("\nJob ID:");
            console.log(job.roleNumber);

            console.log("\nExperience Required:");
            console.log(job.experienceYears);

            console.log("\nAutomation Mentioned:");
            console.log(job.automationRequired);

            console.log("\nDescription length:");
            console.log(job.description.length);
        })
        .catch((error) => {
            console.error(
                "\nBMC job detail extraction failed:"
            );
            console.error(error.message);
            process.exit(1);
        });
}

module.exports = {
    scanBmcJobs,
    extractBmcJobDetails,
    getBmcJobDetails
};