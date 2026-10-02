const { chromium } = require("playwright");

async function inspectAppleJobDetail() {
    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    const url =
        "https://jobs.apple.com/en-in/details/200678391-0321/software-development-engineer-in-test-is-t";

    console.log(`Opening: ${url}`);

    await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    // Give Apple time to finish rendering.
    await page.waitForTimeout(5000);

    console.log(`\nPage title: ${await page.title()}`);
    console.log(`Page URL: ${page.url()}`);

    const pageText = await page.locator("body").innerText();

    console.log("\n========== APPLE JOB PAGE TEXT ==========\n");

    console.log(pageText);

    console.log("\n========== END JOB PAGE TEXT ==========\n");

    await browser.close();
}

inspectAppleJobDetail().catch((error) => {
    console.error("Apple detail inspection failed:");
    console.error(error.message);
});