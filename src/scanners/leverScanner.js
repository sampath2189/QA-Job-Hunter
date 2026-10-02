const { chromium } = require("playwright");

function normalize(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function extractExperience(text) {
    const patterns = [
        /(\d+)\+?\s*years?\s+of\s+(?:relevant\s+)?experience/i,
        /(\d+)\+?\s*years?\s+experience/i,
        /experience\s+(?:of|with)\s+(\d+)\+?\s*years?/i,
        /minimum\s+(?:of\s+)?(\d+)\+?\s*years?/i
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
    return /automation|automated testing|test automation|selenium|playwright|cypress/i.test(
        text
    );
}

function isPotentialQATitle(title) {
    const normalizedTitle =
        normalize(title).toLowerCase();

    const qaTitleKeywords = [
        "qa engineer",
        "qa tester",
        "qa automation",
        "quality assurance",
        "quality engineer",
        "quality analyst",
        "software test engineer",
        "software qa engineer",
        "software quality engineer",
        "test engineer",
        "test automation engineer",
        "automation tester",
        "automation test engineer",
        "sdet",
        "software development engineer in test",
        "test analyst",
        "quality test engineer",
        "senior qa",
        "senior test engineer",
        "tester"
    ];

    return qaTitleKeywords.some((keyword) =>
        normalizedTitle.includes(keyword)
    );
}

async function getLeverJobDetails(page, jobUrl) {
    await page.goto(jobUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    await page.waitForTimeout(1200);

    const bodyText = normalize(
        await page.locator("body").innerText()
    );

    const title = normalize(
        await page.locator("h1").first().innerText().catch(() => "")
    );

    let location = "";

    const locationSelectors = [
        ".posting-categories .location",
        ".location",
        "[class*='location']"
    ];

    for (const selector of locationSelectors) {
        const locator =
            page.locator(selector).first();

        if (await locator.count()) {
            const value = normalize(
                await locator.innerText().catch(() => "")
            );

            if (value) {
                location = value;
                break;
            }
        }
    }

    return {
        title,
        location,
        experienceYears:
            extractExperience(bodyText),
        automationRequired:
            detectAutomation(bodyText),
        description: bodyText,
        fullText: bodyText,
        url: jobUrl
    };
}

async function scanLeverJobs(config) {
    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    const jobs = [];

    try {
        console.log(
            `\n=== ${config.company} Lever scan ===`
        );

        console.log(
            `URL: ${config.url}`
        );

        await page.goto(config.url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(2500);

        const jobLinks =
            await page.locator(
                "a[href*='jobs.lever.co/']"
            ).evaluateAll((links) => {
                return links.map((link) => ({
                    title:
                        (link.innerText || "").trim(),
                    url: link.href
                }));
            });

        const uniqueLinks = new Map();

        for (const job of jobLinks) {
            if (!job.url) {
                continue;
            }

            if (
                job.url.includes("/apply") ||
                !job.url.match(
                    /jobs\.lever\.co\/[^/]+\/[^/?#]+/
                )
            ) {
                continue;
            }

            uniqueLinks.set(job.url, job);
        }

        console.log(
            `Lever job links found: ${uniqueLinks.size}`
        );

        let potentialTitleCount = 0;

        for (
            const [jobUrl, link]
            of uniqueLinks
        ) {
            try {
                console.log(
                    `Checking: ${link.title || jobUrl}`
                );

                const details =
                    await getLeverJobDetails(
                        page,
                        jobUrl
                    );

                const title =
                    details.title ||
                    normalize(link.title);

                console.log(
                    `Actual title: ${title}`
                );

                if (!isPotentialQATitle(title)) {
                    continue;
                }

                potentialTitleCount++;

                jobs.push({
                    company: config.company,
                    platform: "lever",
                    roleNumber: null,
                    title,
                    location:
                        details.location,
                    experienceYears:
                        details.experienceYears,
                    automationRequired:
                        details.automationRequired,
                    description:
                        details.description,
                    fullText:
                        details.fullText,
                    url: details.url
                });

                console.log(
                    `QA candidate: ${title} | ${details.location || "location unknown"}`
                );
            }
            catch (error) {
                console.log(
                    `Failed to read ${jobUrl}`
                );
            }
        }

        console.log(
            `Potential QA titles found: ${potentialTitleCount}`
        );

        console.log(
            `Lever QA candidates: ${jobs.length}`
        );

        return jobs;
    }
    finally {
        await browser.close();
    }
}

module.exports = {
    scanLeverJobs
};