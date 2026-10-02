const { chromium } = require("playwright");

const JOB_URLS = [
    "https://www.amazon.jobs/en/jobs/10389285/acoustic-software-qa-engineer-asia-tech-center",
    "https://www.amazon.jobs/en/jobs/10441861/acoustic-software-qa-engineer-asia-tech-center"
];

async function main() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    for (const url of JOB_URLS) {
        console.log("\n========================================");
        console.log("Opening:");
        console.log(url);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(3000);

        console.log("\nPage title:");
        console.log(await page.title());

        console.log("\nCurrent URL:");
        console.log(page.url());

        const bodyText = await page.locator("body").innerText();

        console.log("\n========== JOB PAGE TEXT ==========");
        console.log(bodyText);
        console.log("========== END JOB PAGE TEXT ==========\n");
    }

    await browser.close();

    console.log("\nAmazon detail test completed.");
}

main().catch((error) => {
    console.error("\nAmazon detail test failed:");
    console.error(error.message);
    process.exit(1);
});