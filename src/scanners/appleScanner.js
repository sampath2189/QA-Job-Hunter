const { chromium } = require("playwright");

async function scanAppleJobs() {
    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    const baseUrl =
        "https://jobs.apple.com/en-in/search?location=india-INDC";

    const allJobs = new Map();

    try {
        console.log("Opening Apple careers:", baseUrl);

        await page.goto(baseUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(5000);

        let pageNumber = 1;

        while (true) {
            console.log(
                `\nScanning Apple listing page ${pageNumber}...`
            );

            await page.waitForTimeout(2000);

            const jobs = await page.locator(
                'a[href*="/details/"]'
            ).evaluateAll((links) => {
                const results = [];

                for (const link of links) {
                    const href = link.href || "";

                    let title =
                        link.innerText?.trim() || "";

                    if (!href) {
                        continue;
                    }

                    if (!href.includes("/details/")) {
                        continue;
                    }

                    const match =
                        href.match(
                            /\/details\/([^/]+)\//
                        );

                    const roleNumber =
                        match ? match[1] : null;

                    /*
                     * Apple listing pages currently return
                     * "See full role description" as the link text.
                     *
                     * Use the URL slug as a temporary fallback title.
                     * The real official title will be extracted from
                     * the detail page later.
                     */
                    if (
                        title === "See full role description" ||
                        !title
                    ) {
                        const pathMatch =
                            href.match(
                                /\/details\/[^/]+\/([^?]+)/
                            );

                        if (pathMatch) {
                            title =
                                pathMatch[1]
                                    .replace(/-/g, " ")
                                    .replace(
                                        /\b\w/g,
                                        (char) =>
                                            char.toUpperCase()
                                    );
                        }
                    }

                    results.push({
                        company: "Apple",
                        title,
                        roleNumber,
                        url: href,
                        source: "Apple Careers"
                    });
                }

                return results;
            });

            const uniquePageJobs = [
                ...new Map(
                    jobs.map((job) => [
                        job.roleNumber || job.url,
                        job
                    ])
                ).values()
            ];

            console.log(
                "Jobs found on page:",
                uniquePageJobs.length
            );

            for (const job of uniquePageJobs) {
                const key =
                    job.roleNumber || job.url;

                if (!allJobs.has(key)) {
                    allJobs.set(key, job);
                }
            }

            const nextButton = page.locator(
                'button[aria-label*="Next"], a[aria-label*="Next"]'
            ).first();

            if (
                !(await nextButton.count()) ||
                !(await nextButton.isVisible().catch(() => false))
            ) {
                break;
            }

            const disabled =
                await nextButton
                    .isDisabled()
                    .catch(() => false);

            if (disabled) {
                break;
            }

            await nextButton.click();

            await page.waitForTimeout(3000);

            pageNumber++;
        }

        const jobs = [...allJobs.values()];

        console.log(
            `\nTotal unique Apple jobs found: ${jobs.length}`
        );

        /*
         * Identify potential QA/testing roles from the listing.
         *
         * We intentionally keep this broad because the final
         * matcher will decide whether the role is relevant.
         */
        const qaKeywords = [
            "qa",
            "quality",
            "test",
            "testing",
            "sdet",
            "automation"
        ];

        const qaJobs = jobs.filter((job) => {
            const text =
                `${job.title || ""} ${job.url || ""}`
                    .toLowerCase();

            return qaKeywords.some((keyword) =>
                text.includes(keyword)
            );
        });

        console.log(
            "Potential QA/testing jobs:",
            qaJobs.length
        );

        console.log("\nPotential QA jobs:");

        for (const job of qaJobs) {
            console.log(
                `- ${job.title} | ${job.url}`
            );
        }

        const detailedJobs = [];

        for (const job of qaJobs) {
            console.log(
                `\nInspecting QA candidate: ${job.title}`
            );

            console.log(
                "URL:",
                job.url
            );

            const detailPage =
                await browser.newPage();

            try {
                let detailPageLoaded = false;

for (let attempt = 1; attempt <= 2; attempt++) {
    try {
        console.log(
            `Loading Apple detail page (attempt ${attempt}/2)...`
        );

        await detailPage.goto(job.url, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        detailPageLoaded = true;
        break;

    } catch (error) {
        console.log(
            `Apple detail page attempt ${attempt} failed: ${error.message}`
        );

        if (attempt < 2) {
            console.log(
                "Retrying Apple detail page..."
            );

            await detailPage.waitForTimeout(2000);
        }
    }
}

if (!detailPageLoaded) {
    throw new Error(
        "Apple detail page failed to load after 2 attempts."
    );
}

await detailPage.waitForTimeout(4000);

                const bodyText =
                    await detailPage
                        .locator("body")
                        .innerText();

                /*
                 * Apple detail pages have the real job title
                 * inside the first H1.
                 */
                const detailTitle =
                    await detailPage
                        .locator("h1")
                        .first()
                        .innerText()
                        .catch(() => "");

                const title =
                    detailTitle.trim() ||
                    job.title;

                /*
                 * Break the complete page into clean lines.
                 */
                const lines =
                    bodyText
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean);

                /*
                 * Apple currently places the primary location
                 * immediately after the job title.
                 *
                 * Example:
                 *
                 * Software Development Engineer in Test - IS&T
                 * Bengaluru, Karnataka, India
                 * Software and Services
                 */
                const titleIndex =
                    lines.findIndex(
                        (line) => line === title
                    );

                let location = "";

                if (
                    titleIndex >= 0 &&
                    lines[titleIndex + 1]
                ) {
                    location =
                        lines[titleIndex + 1];
                }

                /*
                 * Apple can have multiple work locations.
                 *
                 * Example:
                 *
                 * Bengaluru, Karnataka, India
                 * Hyderabad, Telangana, India
                 * Work Locations (2)
                 *
                 * Capture the location lines immediately
                 * before "Work Locations (N)".
                 */
                const workLocationsIndex =
                    lines.findIndex((line) =>
                        /^Work Locations \(\d+\)$/i.test(
                            line
                        )
                    );

                if (workLocationsIndex >= 0) {
                    const workLocationCountMatch =
                        lines[workLocationsIndex].match(
                            /\((\d+)\)/
                        );

                    const workLocationCount =
                        workLocationCountMatch
                            ? Number(
                                workLocationCountMatch[1]
                            )
                            : 0;

                    const additionalLocations = [];

                    for (
                        let i =
                            workLocationsIndex - 1;
                        i >= 0 &&
                        additionalLocations.length <
                            workLocationCount;
                        i--
                    ) {
                        const line =
                            lines[i];

                        /*
                         * Apple location format normally ends
                         * with ", India", ", United States", etc.
                         */
                        if (
                            /,\s*(India|United States|United Kingdom|Canada|Germany|China|Japan|Singapore|Australia|Ireland|France|Spain|Italy|Netherlands|Switzerland|South Korea)$/i.test(
                                line
                            )
                        ) {
                            additionalLocations.unshift(
                                line
                            );
                        }
                    }

                    if (
                        additionalLocations.length > 0
                    ) {
                        location =
                            [
                                location,
                                ...additionalLocations
                            ]
                                .filter(Boolean)
                                .filter(
                                    (value, index, array) =>
                                        array.indexOf(
                                            value
                                        ) === index
                                )
                                .join(" | ");
                    }
                }

                /*
                 * Extract required experience.
                 *
                 * Example:
                 * "3+ years experience in software quality assurance testing"
                 */
                const experiencePatterns = [
                    /(\d+)\+?\s*years?\s+experience/i,
                    /(\d+)\+?\s*years?\s+of\s+experience/i,
                    /(\d+)\+?\s*years?\s+professional experience/i,
                    /(\d+)\+?\s*years?\s+in\s+software quality/i
                ];

                let experienceYears = null;

                for (
                    const pattern of experiencePatterns
                ) {
                    const experienceMatch =
                        bodyText.match(pattern);

                    if (experienceMatch) {
                        experienceYears =
                            Number(
                                experienceMatch[1]
                            );

                        break;
                    }
                }

                /*
                 * Detect whether automation is required or
                 * strongly mentioned in the role.
                 */
                const automationRequired =
                    /test automation|automation framework|automated testing|automation/i.test(
                        bodyText
                    );

                detailedJobs.push({
                    ...job,
                    title,
                    location,
                    experienceYears,
                    automationRequired,
                    description: bodyText,
                    fullText: bodyText
                });
            }
            catch (error) {
                console.log(
                    "Apple detail extraction failed:",
                    error.message
                );

                /*
                 * Keep the job instead of losing it if one
                 * detail page fails.
                 */
                detailedJobs.push({
                    ...job,
                    location: "",
                    experienceYears: null,
                    automationRequired: false,
                    description: "",
                    fullText: ""
                });
            }
            finally {
                await detailPage.close();
            }
        }

        return detailedJobs;
    }
    finally {
        await browser.close();
    }
}

module.exports = {
    scanAppleJobs
};