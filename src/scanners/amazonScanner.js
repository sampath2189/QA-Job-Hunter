const { chromium } = require("playwright");
const keywords = require("../../config/keywords.json");

const AMAZON_SEARCH_URL =
    "https://www.amazon.jobs/en/search?base_query=QA&loc_query=India";

async function scanAmazonJobs() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(AMAZON_SEARCH_URL, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(3000);

        const jobs = await page.locator(
            'a[href*="/en/jobs/"]'
        ).evaluateAll((links) =>
            links.map((link) => ({
                title: link.textContent.trim(),
                url: link.href
            }))
        );

        const uniqueJobs = new Map();

        for (const job of jobs) {
            const match = job.url.match(/\/en\/jobs\/(\d+)/);

            if (!match) continue;

            const jobId = match[1];

            if (!uniqueJobs.has(jobId)) {
                uniqueJobs.set(jobId, {
                    company: "Amazon",
                    roleNumber: jobId,
                    title: job.title,
                    url: job.url
                });
            }
        }

        const allJobs = Array.from(uniqueJobs.values());

        const qaJobs = allJobs.filter((job) => {
            const title = job.title.toLowerCase();

            const excluded = keywords.exclude_title_keywords.some(
                (keyword) => title.includes(keyword.toLowerCase())
            );

            if (excluded) return false;

            return keywords.job_title_keywords.some(
                (keyword) => title.includes(keyword.toLowerCase())
            );
        });

        console.log("========================================");
        console.log("AMAZON JOB SCANNER");
        console.log("========================================");

        console.log(`\nTotal unique jobs found: ${allJobs.length}`);
        console.log(`Potential QA jobs found: ${qaJobs.length}`);

        console.log("\nPotential QA jobs:");

        qaJobs.forEach((job, index) => {
            console.log(
                `${index + 1}. ${job.title} | ${job.roleNumber} | ${job.url}`
            );
        });

        return qaJobs;

    } finally {
        await browser.close();
    }
}

module.exports = {
    scanAmazonJobs
};