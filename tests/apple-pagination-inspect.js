const { chromium } = require("playwright");

async function inspectApplePagination() {
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

    const initialLinks = await page.locator(
        'a[href*="/en-in/details/"]'
    ).count();

    console.log(`\nInitial detail links found: ${initialLinks}`);

    // Look for buttons and links that may control pagination/loading.
    const controls = await page.locator(
        'button, a'
    ).evaluateAll((elements) =>
        elements
            .map((element) => ({
                tag: element.tagName,
                text: element.innerText.trim(),
                ariaLabel: element.getAttribute("aria-label"),
                href: element.getAttribute("href")
            }))
            .filter((item) =>
                /load|more|next|page|show/i.test(
                    `${item.text} ${item.ariaLabel || ""} ${item.href || ""}`
                )
            )
            .slice(0, 30)
    );

    console.log("\nPossible pagination/load controls:");

    console.log(JSON.stringify(controls, null, 2));

    // Inspect visible text around the bottom of the results page.
    const bodyText = await page.locator("body").innerText();

    const interestingLines = bodyText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) =>
            /load more|show more|next|previous|page \d|of \d|results/i.test(
                line
            )
        );

    console.log("\nPossible pagination text:");

    console.log(JSON.stringify(interestingLines, null, 2));

    await browser.close();
}

inspectApplePagination().catch((error) => {
    console.error("Apple pagination inspection failed:");
    console.error(error.message);
});