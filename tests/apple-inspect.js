const { chromium } = require("playwright");

async function inspectAppleJobs() {
    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    const url = "https://jobs.apple.com/en-in/search?location=india-INDC";

    console.log(`Opening: ${url}`);

    await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    // Give Apple time to finish rendering the results.
    await page.waitForTimeout(5000);

    console.log(`Page title: ${await page.title()}`);
    console.log(`Page URL: ${page.url()}`);

    const jobLinks = await page.locator('a[href*="/en-in/details/"]').evaluateAll(
        (links) => {
            const uniqueJobs = new Map();

            for (const link of links) {
                const href = link.href;

                // Extract the actual Apple job ID and base job URL.
                const match = href.match(/\/details\/(\d+)(?:\/([^?]+))?/);

                if (!match) {
                    continue;
                }

                const jobId = match[1];
                const jobUrl = `https://jobs.apple.com/en-in/details/${jobId}`;

                // Ignore Apple location-picker URLs.
                if (href.includes("/locationPicker")) {
                    continue;
                }

                const title = link.innerText.trim();

                // Keep the first useful title we find for each job.
                if (!uniqueJobs.has(jobId) && title) {
                    uniqueJobs.set(jobId, {
                        jobId,
                        title,
                        url: jobUrl
                    });
                }
            }

            return Array.from(uniqueJobs.values());
        }
    );

    console.log(`\nUnique Apple job postings found: ${jobLinks.length}`);

    console.log("\nApple unique job postings:");

    console.log(JSON.stringify(jobLinks.slice(0, 30), null, 2));

    await browser.close();
}

inspectAppleJobs().catch((error) => {
    console.error("Apple inspection failed:");
    console.error(error.message);
});