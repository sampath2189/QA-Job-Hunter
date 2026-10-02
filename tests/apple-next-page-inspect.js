const { chromium } = require("playwright");

async function inspectAppleNextPage() {
    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    const url =
        "https://jobs.apple.com/en-in/search?location=india-INDC";

    console.log(`Opening: ${url}`);

    await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    await page.waitForTimeout(5000);

    async function getJobs() {
        return await page.locator(
            'a[href*="/en-in/details/"]'
        ).evaluateAll((links) => {
            const jobs = new Map();

            for (const link of links) {
                const href = link.href;

                if (href.includes("/locationPicker")) {
                    continue;
                }

                const match = href.match(
                    /\/details\/(\d+)/
                );

                if (!match) {
                    continue;
                }

                const jobId = match[1];
                const title = link.innerText.trim();

                if (title && !jobs.has(jobId)) {
                    jobs.set(jobId, {
                        jobId,
                        title,
                        url: href
                    });
                }
            }

            return Array.from(jobs.values());
        });
    }

    const firstPageJobs = await getJobs();

    console.log(
        `\nFirst page unique jobs: ${firstPageJobs.length}`
    );

    console.log("\nFirst page jobs:");

    console.log(
        JSON.stringify(firstPageJobs, null, 2)
    );

    const nextButton = page.locator(
        'button[aria-label="Next Page"]'
    );

    console.log(
        `\nNext Page button count: ${await nextButton.count()}`
    );

    console.log(
        `Next Page button disabled: ${await nextButton.isDisabled()}`
    );

    console.log("\nClicking Next Page...");

    await nextButton.click();

    await page.waitForTimeout(4000);

    const secondPageJobs = await getJobs();

    console.log(
        `\nSecond page unique jobs: ${secondPageJobs.length}`
    );

    console.log("\nSecond page jobs:");

    console.log(
        JSON.stringify(secondPageJobs, null, 2)
    );

    const firstIds = new Set(
        firstPageJobs.map((job) => job.jobId)
    );

    const newJobs = secondPageJobs.filter(
        (job) => !firstIds.has(job.jobId)
    );

    console.log(
        `\nNew jobs found after clicking Next Page: ${newJobs.length}`
    );

    console.log("\nNew jobs:");

    console.log(
        JSON.stringify(newJobs, null, 2)
    );

    await browser.close();
}

inspectAppleNextPage().catch((error) => {
    console.error("Apple next-page inspection failed:");
    console.error(error.message);
});