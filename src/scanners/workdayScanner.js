const { chromium } = require("playwright");

const careerPlatforms = require("../../config/careerPlatforms.json");

function normalize(text) {
    return (text || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function extractWorkdayRequisitionId(url) {
    if (!url) return null;

    const cleanUrl = url.split("?")[0];

    const match = cleanUrl.match(/_([A-Z]{1,3}\d+)(?:-\d+)?$/);

    if (!match) return null;

    return match[1];
}

function applyLocationFilter(url, location) {
    if (!url || !location) {
        return url;
    }

    const normalizedLocation = normalize(location);

    /*
     * NVIDIA Workday requires its internal locationHierarchy1
     * parameter for the India location filter.
     */
    if (
        normalizedLocation === "india" &&
        url.includes("nvidia.wd5.myworkdayjobs.com")
    ) {
        const separator = url.includes("?") ? "&" : "?";

        return `${url}${separator}locationHierarchy1=2fcb99c455831013ea52b82135ba3266`;
    }

    return url;
}

async function waitForJobList(page, timeout = 15000) {
    await page.waitForFunction(() => {
        const links = document.querySelectorAll(
            'a[data-automation-id="jobTitle"]'
        );

        return links.length > 0;
    }, { timeout });
}

async function getJobListSignature(page) {
    return await page.locator(
        'a[data-automation-id="jobTitle"]'
    ).evaluateAll((links) =>
        links
            .slice(0, 3)
            .map((link) => {
                const title = link.innerText.trim();
                const url = link.href || "";

                return `${title}|${url}`;
            })
            .join("||")
    );
}

async function waitForJobListToChange(
    page,
    previousSignature,
    timeout = 15000
) {
    await page.waitForFunction(
        (oldSignature) => {
            const links = [
                ...document.querySelectorAll(
                    'a[data-automation-id="jobTitle"]'
                )
            ];

            if (links.length === 0) {
                return false;
            }

            const currentSignature = links
                .slice(0, 3)
                .map((link) => {
                    const title = link.innerText.trim();
                    const url = link.href || "";

                    return `${title}|${url}`;
                })
                .join("||");

            return (
                currentSignature.length > 0 &&
                currentSignature !== oldSignature
            );
        },
        previousSignature,
        { timeout }
    );
}

async function scanWorkdayJobs(company, options = {}) {
    const config = careerPlatforms.companies[company];

    if (!config) {
        throw new Error(
            `No career platform configuration found for ${company}`
        );
    }

    if (config.platform !== "workday") {
        throw new Error(
            `${company} is not configured as a Workday company`
        );
    }

    const requestedLocation = options.location || null;

    let baseUrl = config.url;

    baseUrl = applyLocationFilter(
        baseUrl,
        requestedLocation
    );

    console.log("========================================");
    console.log(`WORKDAY SCANNER - ${company}`);
    console.log("========================================");

    console.log(`\nOpening: ${baseUrl}`);

    if (requestedLocation) {
        console.log(`Location filter: ${requestedLocation}`);
    }

    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    const jobs = [];
    const seenUrls = new Set();

    try {
        await page.goto(baseUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        console.log("\nWaiting for initial Workday job list...");

        await waitForJobList(page, 15000);

        console.log("Initial job list loaded.");

        let pageNumber = 1;

        while (true) {
            console.log(
                `\nScanning Workday page ${pageNumber}...`
            );

            const pageJobs = await page.locator(
                'a[data-automation-id="jobTitle"]'
            ).evaluateAll((links) =>
                links.map((link) => ({
                    title: link.innerText.trim(),
                    url: link.href
                }))
            );

            console.log(
                `Jobs found on page: ${pageJobs.length}`
            );

            for (const job of pageJobs) {
                if (!job.url || seenUrls.has(job.url)) {
                    continue;
                }

                seenUrls.add(job.url);

                jobs.push({
                    company,
                    title: job.title,
                    url: job.url,
                    roleNumber:
                        extractWorkdayRequisitionId(job.url)
                });
            }

            console.log(
                `Unique jobs collected: ${jobs.length}`
            );

            const nextButton = page.locator(
                'button[data-automation-id="paginationNext"], button[aria-label="next"]'
            );

            const nextCount = await nextButton.count();

            if (nextCount === 0) {
                console.log(
                    "Next button not found. Pagination complete."
                );
                break;
            }

            const isDisabled =
                await nextButton.isDisabled().catch(() => true);

            if (isDisabled) {
                console.log(
                    "Next button disabled. Pagination complete."
                );
                break;
            }

            /*
             * Capture the current page before clicking Next.
             * Workday replaces the job list asynchronously,
             * so we wait for the actual list contents to change.
             */
            const previousSignature =
                await getJobListSignature(page);

            console.log(
                "Clicking Next and waiting for job list to change..."
            );

            await nextButton.click();

            try {
                await waitForJobListToChange(
                    page,
                    previousSignature,
                    15000
                );
            } catch (error) {
                console.log(
                    "Job list did not change within 15 seconds."
                );

                console.log(
                    "Stopping pagination safely."
                );

                break;
            }

            pageNumber++;

            if (pageNumber > 100) {
                console.log(
                    "Safety limit reached at 100 pages."
                );
                break;
            }
        }

        const potentialQAJobs = jobs.filter((job) => {
            const title = normalize(job.title);

            return (
                title.includes("qa") ||
                title.includes("quality") ||
                title.includes("test engineer") ||
                title.includes("test automation") ||
                title.includes("sdet") ||
                title.includes("software test") ||
                title.includes("quality assurance")
            );
        });

        console.log(
            `\nTotal unique jobs collected: ${jobs.length}`
        );

        console.log(
            `QA/testing jobs found: ${potentialQAJobs.length}`
        );

        console.log("\n========== QA JOBS ==========");

        for (const job of potentialQAJobs) {
            console.log(`\nTitle: ${job.title}`);
            console.log(`Role: ${job.roleNumber}`);
            console.log(`URL: ${job.url}`);
        }

        console.log(
            "\n========== END QA JOBS =========="
        );

        return potentialQAJobs;

    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    (async () => {
        try {
            const jobs = await scanWorkdayJobs(
                "NVIDIA",
                {
                    location: "India"
                }
            );

            console.log(
                `\nNVIDIA QA jobs: ${jobs.length}`
            );

        } catch (error) {
            console.error(
                "\nWorkday scanner failed:"
            );

            console.error(error.message);

            process.exit(1);
        }
    })();
}

module.exports = {
    scanWorkdayJobs,
    applyLocationFilter,
    extractWorkdayRequisitionId
};