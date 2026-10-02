const { chromium } = require("playwright");

async function inspectAppleLocation() {
    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    const url =
        "https://jobs.apple.com/en-in/details/200678391-0321/software-development-engineer-in-test-is-t?team=SFTWR";

    console.log(`Opening: ${url}`);

    await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    await page.waitForTimeout(4000);

    const h1 = page.locator("h1").first();

    console.log("\nJob title:");
    console.log(await h1.innerText());

    // Inspect the parent containers around the job title.
    const parentInfo = await h1.evaluate((element) => {
        const results = [];

        let current = element;

        for (let level = 0; level < 5 && current; level++) {
            results.push({
                level,
                tag: current.tagName,
                className: current.className,
                text: current.innerText?.trim()
            });

            current = current.parentElement;
        }

        return results;
    });

    console.log("\nElements around the job title:");

    console.log(
        JSON.stringify(parentInfo, null, 2)
    );

    await browser.close();
}

inspectAppleLocation().catch((error) => {
    console.error("Apple location inspection failed:");
    console.error(error.message);
});