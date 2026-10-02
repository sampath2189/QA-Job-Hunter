const { chromium } = require("playwright");

const CAREER_SITES = [
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

        await page.waitForTimeout(3000);

        console.log("\nFinal URL:");
        console.log(page.url());

        console.log("\nPage title:");
        console.log(await page.title());

        const links = await page.locator("a").evaluateAll((anchors) =>
            anchors
                .map((a) => ({
                    text: a.textContent.trim().replace(/\s+/g, " "),
                    href: a.href
                }))
                .filter((link) => link.href)
        );

        const relevantLinks = links.filter((link) => {
            const text = link.text.toLowerCase();
            const href = link.href.toLowerCase();

            return (
                text.includes("job") ||
                text.includes("career") ||
                text.includes("opening") ||
                text.includes("position") ||
                text.includes("apply") ||
                text.includes("search") ||
                href.includes("/job") ||
                href.includes("/career") ||
                href.includes("jobs.") ||
                href.includes("careers.") ||
                href.includes("greenhouse") ||
                href.includes("lever") ||
                href.includes("workday") ||
                href.includes("icims") ||
                href.includes("smartrecruiters") ||
                href.includes("successfactors") ||
                href.includes("ashby")
            );
        });

        console.log("\nRelevant career/job links:");

        if (relevantLinks.length === 0) {
            console.log("None detected");
        } else {
            const uniqueLinks = new Map();

            for (const link of relevantLinks) {
                if (!uniqueLinks.has(link.href)) {
                    uniqueLinks.set(link.href, link);
                }
            }

            Array.from(uniqueLinks.values())
                .slice(0, 40)
                .forEach((link, index) => {
                    console.log(
                        `${index + 1}. ${link.text || "[no text]"} | ${link.href}`
                    );
                });
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
    console.log("CAREER PLATFORM DEEP VERIFICATION");
    console.log("========================================");

    const browser = await chromium.launch({
        headless: true
    });

    for (const site of CAREER_SITES) {
        await inspectCompany(browser, site);
    }

    await browser.close();

    console.log("\n========================================");
    console.log("Deep verification completed.");
    console.log("========================================");
}

main().catch((error) => {
    console.error("\nDeep verification failed:");
    console.error(error.message);
    process.exit(1);
});