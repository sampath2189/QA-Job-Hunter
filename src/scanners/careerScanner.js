const { chromium } = require("playwright");

async function scanCareerPage(url) {
    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    console.log(`Opening: ${url}`);

    await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    console.log(`Page title: ${await page.title()}`);
    console.log(`Page URL: ${page.url()}`);

    await browser.close();
}

module.exports = { scanCareerPage };