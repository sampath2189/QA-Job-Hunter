const { chromium } = require("playwright");

const AMAZON_SEARCH_URL =
    "https://www.amazon.jobs/en/search?base_query=QA&loc_query=India";

async function main() {
    console.log("========================================");
    console.log("AMAZON SCANNER TEST");
    console.log("========================================");

    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    console.log("\nOpening Amazon careers:");
    console.log(AMAZON_SEARCH_URL);

    await page.goto(AMAZON_SEARCH_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    await page.waitForTimeout(5000);

    console.log("\nPage title:");
    console.log(await page.title());

    console.log("\nCurrent URL:");
    console.log(page.url());

    const jobLinks = await page.locator(
        'a[href*="/en/jobs/"]'
    ).evaluateAll((links) =>
        links.map((link) => ({
            title: link.textContent.trim(),
            url: link.href
        }))
    );

    console.log(
        `\nJob links found: ${jobLinks.length}`
    );

    jobLinks.slice(0, 10).forEach((job, index) => {
        console.log(
            `${index + 1}. ${job.title} | ${job.url}`
        );
    });

    await browser.close();

    console.log("\nAmazon scanner test completed.");
}

main().catch((error) => {
    console.error("\nAmazon scanner test failed:");
    console.error(error.message);
    process.exit(1);
});