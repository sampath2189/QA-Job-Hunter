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
        company: "ADP",
        url: "https://jobs.adp.com/en/"
    },
    {
        company: "BMC Software",
        url: "https://www.bmc.com/careers/careers.html"
    },
    {
        company: "Broadridge",
        url: "https://careers.broadridge.com/"
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

async function detectPlatform(page) {
    const html = (await page.content()).toLowerCase();
    const url = page.url().toLowerCase();

    if (
        html.includes("workday") ||
        url.includes("myworkdayjobs")
    ) {
        return "Workday";
    }

    if (
        html.includes("greenhouse") ||
        url.includes("greenhouse.io")
    ) {
        return "Greenhouse";
    }

    if (
        html.includes("lever") ||
        url.includes("lever.co")
    ) {
        return "Lever";
    }

    if (
        html.includes("smartrecruiters") ||
        url.includes("smartrecruiters.com")
    ) {
        return "SmartRecruiters";
    }

    if (
        html.includes("icims") ||
        url.includes("icims.com")
    ) {
        return "iCIMS";
    }

    if (
        html.includes("successfactors") ||
        url.includes("successfactors")
    ) {
        return "SAP SuccessFactors";
    }

    if (
        html.includes("ashby") ||
        url.includes("ashbyhq.com")
    ) {
        return "Ashby";
    }

    return "Custom/Unknown";
}

async function scanCompany(browser, site) {
    const page = await browser.newPage();

    try {
        console.log("\n----------------------------------------");
        console.log(`Company: ${site.company}`);
        console.log(`URL: ${site.url}`);

        await page.goto(site.url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(2000);

        const finalUrl = page.url();
        const title = await page.title();
        const platform = await detectPlatform(page);

        console.log("Status: SUCCESS");
        console.log(`Final URL: ${finalUrl}`);
        console.log(`Page title: ${title}`);
        console.log(`Detected platform: ${platform}`);

        return {
            company: site.company,
            url: site.url,
            finalUrl,
            title,
            status: "SUCCESS",
            platform
        };

    } catch (error) {
        console.log("Status: NAVIGATION_ERROR");
        console.log(`Error: ${error.message}`);

        return {
            company: site.company,
            url: site.url,
            status: "NAVIGATION_ERROR",
            error: error.message
        };

    } finally {
        await page.close();
    }
}

async function main() {
    console.log("========================================");
    console.log("CAREER PLATFORM SCAN");
    console.log("========================================");

    const browser = await chromium.launch({
        headless: true
    });

    const results = [];

    for (const site of CAREER_SITES) {
        const result = await scanCompany(browser, site);
        results.push(result);
    }

    await browser.close();

    console.log("\n========================================");
    console.log("SCAN SUMMARY");
    console.log("========================================");

    results.forEach((result) => {
        console.log(
            `${result.company} | ${result.status} | ${result.platform || "N/A"}`
        );
    });

    console.log("\n========================================");
    console.log("Career platform scan completed.");
    console.log("========================================");
}

main().catch((error) => {
    console.error("\nCareer platform scan failed:");
    console.error(error.message);
    process.exit(1);
});