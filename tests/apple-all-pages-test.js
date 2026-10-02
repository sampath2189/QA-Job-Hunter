const { chromium } = require("playwright");

async function scanAllApplePages() {
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

    const allJobs = new Map();

    let pageNumber = 1;

    while (true) {
        console.log(`\n========== APPLE PAGE ${pageNumber} ==========`);

        const pageJobs = await page.locator(
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

        console.log(
            `Unique jobs on this page: ${pageJobs.length}`
        );

        for (const job of pageJobs) {
            allJobs.set(job.jobId, job);
        }

        console.log(
            `Total unique jobs collected so far: ${allJobs.size}`
        );

        const nextButton = page.locator(
            'button[aria-label="Next Page"]'
        );

        if (await nextButton.count() === 0) {
            console.log("\nNext Page button not found.");
            break;
        }

        const disabled = await nextButton.isDisabled();

        console.log(
            `Next Page disabled: ${disabled}`
        );

        if (disabled) {
            console.log("\nReached the last Apple page.");
            break;
        }

        pageNumber++;

        console.log("Moving to next page...");

        await nextButton.click();

        await page.waitForTimeout(3000);
    }

    const jobs = Array.from(allJobs.values());

    console.log("\n==========================================");
    console.log("APPLE FULL LISTING SCAN COMPLETE");
    console.log("==========================================");

    console.log(`Pages scanned: ${pageNumber}`);
    console.log(`Total unique jobs: ${jobs.length}`);

    console.log("\nFirst 10 jobs:");

    console.log(
        JSON.stringify(jobs.slice(0, 10), null, 2)
    );

    console.log("\n==========================================");

    await browser.close();
}

scanAllApplePages().catch((error) => {
    console.error("Apple full-page scan failed:");
    console.error(error.message);
});