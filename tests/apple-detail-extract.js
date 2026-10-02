const { chromium } = require("playwright");

async function extractAppleJob() {
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

    await page.waitForTimeout(5000);

    const pageText = await page.locator("body").innerText();

    // Extract job title.
    const title = await page.locator("h1").first().innerText();

    // Extract posted date.
    const postedMatch = pageText.match(
        /Posted:\s*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/
    );

    // Extract role number.
    const roleMatch = pageText.match(
        /Role Number:\s*([0-9-]+)/
    );

    // Extract minimum experience.
    const experienceMatch = pageText.match(
        /(\d+\+?\s*years)\s+experience in software quality assurance testing/i
    );

    // Extract automation experience.
    const automationMatch = pageText.match(
        /(\d+\+?\s*years)\s+of strong practical experience in automation/i
    );

    // Extract useful technology keywords.
    const technologyKeywords = [
        "Playwright",
        "Selenium",
        "JavaScript",
        "TypeScript",
        "Java",
        "Swift",
        "Karate",
        "RestAssured",
        "Appium",
        "Git",
        "CI/CD",
        "Maven",
        "Gradle",
        "JMeter",
        "Gatling",
        "Locust",
        "AWS",
        "GCP",
        "Docker",
        "Kubernetes"
    ];

    const technologies = technologyKeywords.filter((technology) =>
        pageText.toLowerCase().includes(technology.toLowerCase())
    );

    const job = {
        company: "Apple",
        title: title.trim(),
        url,
        roleNumber: roleMatch ? roleMatch[1] : null,
        postedDate: postedMatch ? postedMatch[1] : null,
        minimumExperience: experienceMatch
            ? experienceMatch[1]
            : null,
        automationExperience: automationMatch
            ? automationMatch[1]
            : null,
        technologies
    };

    console.log("\n========== EXTRACTED APPLE JOB ==========\n");

    console.log(JSON.stringify(job, null, 2));

    console.log("\n==========================================\n");

    await browser.close();
}

extractAppleJob().catch((error) => {
    console.error("Apple extraction failed:");
    console.error(error.message);
});