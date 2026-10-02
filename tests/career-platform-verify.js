const { chromium } = require("playwright");

const CAREER_SITES = [
    {
        company: "Adobe",
        url: "https://careers.adobe.com/us/en"
    },
    {
        company: "Arcesium",
        url: "https://www.arcesium.com/careers"
    },
    {
        company: "BrowserStack",
        url: "https://www.browserstack.com/careers"
    },
    {
        company: "Cisco",
        url: "https://careers.cisco.com/global/en/india"
    },
    {
        company: "Commvault",
        url: "https://www.commvault.com/careers"
    },
    {
        company: "Cigniti",
        url: "https://www.cigniti.com/careers/"
    },
    {
        company: "Datadog",
        url: "https://careers.datadoghq.com/"
    }
];

async function inspectCompany(browser, site) {
    const page = await browser.newPage();

    try {
        console.log("\n========================================");
        console.log(`Company: ${site.company}`);
        console.log(`Career URL: ${site.url}`);

        await page.goto(site.url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(2000);

        const finalUrl = page.url();
        const title = await page.title();

        const links = await page.locator("a").evaluateAll((anchors) =>
            anchors
                .map((a) => ({
                    text: a.textContent.trim(),
                    href: a.href
                }))
                .filter((link) => link.href)
        );

        const iframes = await page.locator("iframe").evaluateAll((frames) =>
            frames
                .map((frame) => frame.src)
                .filter(Boolean)
        );

        const scripts = await page.locator("script[src]").evaluateAll((scripts) =>
            scripts
                .map((script) => script.src)
                .filter(Boolean)
        );

        const externalRecruitmentLinks = links.filter((link) => {
            const value = link.href.toLowerCase();

            return (
                value.includes("workday") ||
                value.includes("myworkdayjobs") ||
                value.includes("greenhouse") ||
                value.includes("lever.co") ||
                value.includes("smartrecruiters") ||
                value.includes("icims") ||
                value.includes("successfactors") ||
                value.includes("ashby")
            );
        });

        const platformEvidence = [
            ...externalRecruitmentLinks.map((link) => link.href),
            ...iframes,
            ...scripts
        ].filter((value) => {
            const text = value.toLowerCase();

            return (
                text.includes("workday") ||
                text.includes("myworkdayjobs") ||
                text.includes("greenhouse") ||
                text.includes("lever.co") ||
                text.includes("smartrecruiters") ||
                text.includes("icims") ||
                text.includes("successfactors") ||
                text.includes("ashby")
            );
        });

        console.log("\nFinal URL:");
        console.log(finalUrl);

        console.log("\nPage title:");
        console.log(title);

        console.log("\nRecruitment/platform links:");
        if (externalRecruitmentLinks.length === 0) {
            console.log("None detected");
        } else {
            externalRecruitmentLinks.slice(0, 20).forEach((link) => {
                console.log(`${link.text} | ${link.href}`);
            });
        }

        console.log("\nPlatform evidence:");
        if (platformEvidence.length === 0) {
            console.log("None detected");
        } else {
            [...new Set(platformEvidence)]
                .slice(0, 20)
                .forEach((item) => console.log(item));
        }

    } catch (error) {
        console.log("\nVerification failed:");
        console.log(error.message);
    } finally {
        await page.close();
    }
}

async function main() {
    console.log("========================================");
    console.log("CAREER PLATFORM VERIFICATION");
    console.log("========================================");

    const browser = await chromium.launch({
        headless: true
    });

    for (const site of CAREER_SITES) {
        await inspectCompany(browser, site);
    }

    await browser.close();

    console.log("\n========================================");
    console.log("Career platform verification completed.");
    console.log("========================================");
}

main().catch((error) => {
    console.error("\nVerification script failed:");
    console.error(error.message);
    process.exit(1);
});