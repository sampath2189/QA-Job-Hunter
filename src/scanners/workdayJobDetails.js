const { chromium } = require("playwright");

async function extractWorkdayJobDetails(page, job) {
    await page.goto(job.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    await page.waitForTimeout(5000);

    const bodyText = await page.locator("body").innerText();

    /*
     * Workday can expose multiple headings.
     * NVIDIA has:
     *   CAREERS AT NVIDIA
     *   Senior Software QA Engineer page is loaded
     *   Senior Software QA Engineer
     *
     * Prefer the heading that matches the listing title when available.
     */
    let title = job.title || "";

    if (!title) {
        const headingCandidates = await page.locator("h1, h2").allInnerTexts();

        title =
            headingCandidates.find((heading) =>
                !/careers at/i.test(heading.trim()) &&
                !/page is loaded/i.test(heading.trim()) &&
                heading.trim().length > 3
            ) || "";
    }

    /*
     * Workday detail page location.
     */
    const locationMatch = bodyText.match(
        /locations\s+([^\n]+)/i
    );

    /*
     * Posted date.
     */
    const postedMatch = bodyText.match(
        /posted on\s+(Posted[^\n]+)/i
    );

    /*
     * Workday requisition IDs can be:
     * R170647
     * JR2026184
     * etc.
     */
    const requisitionMatch = bodyText.match(
        /job requisition id\s+([A-Z]{1,3}\d+)/i
    );

    /*
     * QA / Testing experience patterns.
     */
    const experiencePatterns = [
        // NVIDIA:
        // "5+ years of hands-on experience in QA / Networking"
        /(\d+)\+?\s*years?\s+of\s+(?:hands-on\s+)?experience\s+in\s+(?:QA|quality|test|testing)/i,

        // "5+ years hands-on experience in QA"
        /(\d+)\+?\s*years?\s+(?:of\s+)?(?:hands-on\s+)?experience\s+in\s+(?:QA|quality|test|testing)/i,

        // "10+ years in software quality engineering"
        /(\d+)\+?\s*years?\s+in\s+software\s+quality\s+engineering/i,

        // "5+ years of experience in software quality engineering"
        /(\d+)\+?\s*years?\s+of\s+(?:experience\s+)?(?:in\s+)?(?:software\s+)?(?:quality|QA|test|testing)[^.\n]*/i,

        // "7+ years of software Quality Engineering experience"
        /(\d+)\+?\s*years?\s+of\s+(?:software\s+)?(?:quality|QA|test|testing)[^.\n]*experience/i,

        // Generic:
        /(\d+)\+?\s*years?\s+experience/i
    ];

    /*
     * Extract domain-specific experience separately.
     */
    const domainExperienceMatch = bodyText.match(
        /(\d+)\+?\s*years?\s+relevant\s+practical\s+experience\s+in\s+([^.\n]+)/i
    );

    const domainExperienceYears = domainExperienceMatch
        ? Number(domainExperienceMatch[1])
        : null;

    const domainExperienceArea = domainExperienceMatch
        ? domainExperienceMatch[2].trim()
        : "";

    /*
     * Extract QA/testing experience.
     */
    let experienceYears = null;

    for (const pattern of experiencePatterns) {
        const match = bodyText.match(pattern);

        if (match) {
            experienceYears = Number(match[1]);
            break;
        }
    }

    /*
     * Detect automation requirements.
     *
     * Includes:
     * - test automation
     * - automation framework
     * - automated testing
     * - writing automation
     * - automation tests
     * - scripting skills
     */
    const automationRequired =
        /test automation|automation framework|automated testing|test automation frameworks|writing automation|automation tests|automation\s*\/\s*scripting skills|automation\/scripting/i.test(
            bodyText
        );

    return {
        ...job,

        title: title.trim(),

        location: locationMatch
            ? locationMatch[1].trim()
            : "",

        postedDate: postedMatch
            ? postedMatch[1].trim()
            : "",

        roleNumber: requisitionMatch
            ? requisitionMatch[1].trim()
            : job.roleNumber,

        experienceYears,

        domainExperienceYears,

        domainExperienceArea,

        automationRequired,

        description: bodyText,

        fullText: bodyText
    };
}

async function getWorkdayJobDetails(jobOrUrl) {
    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    try {
        const job =
            typeof jobOrUrl === "string"
                ? {
                    url: jobOrUrl
                }
                : jobOrUrl;

        return await extractWorkdayJobDetails(page, job);
    } finally {
        await browser.close();
    }
}

const TEST_JOB = {
    company: "Adobe",
    roleNumber: "R170647",
    title: "Software Quality Engineer 5",
    url: "https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced/job/Noida/Software-Development-Engineer-4_R170647"
};

if (require.main === module) {
    getWorkdayJobDetails(TEST_JOB)
        .then((job) => {
            console.log("========================================");
            console.log("WORKDAY JOB DETAIL EXTRACTION");
            console.log("========================================");

            console.log("\nTitle:");
            console.log(job.title);

            console.log("\nLocation:");
            console.log(job.location);

            console.log("\nPosted:");
            console.log(job.postedDate);

            console.log("\nRole Number:");
            console.log(job.roleNumber);

            console.log("\nExperience Required:");
            console.log(job.experienceYears);

            console.log("\nDomain Experience:");
            console.log(job.domainExperienceYears);

            console.log("\nDomain Area:");
            console.log(job.domainExperienceArea);

            console.log("\nAutomation Mentioned:");
            console.log(job.automationRequired);

            console.log("\nDescription length:");
            console.log(job.description.length);
        })
        .catch((error) => {
            console.error("\nWorkday job detail extraction failed:");
            console.error(error.message);
            process.exit(1);
        });
}

module.exports = {
    extractWorkdayJobDetails,
    getWorkdayJobDetails
};