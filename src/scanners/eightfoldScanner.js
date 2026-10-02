const { chromium } = require("playwright");

const DEFAULT_SEARCH_URL =
    "https://careers.qualcomm.com/api/pcsx/search";

const DEFAULT_DETAIL_URL =
    "https://careers.qualcomm.com/api/pcsx/position_details";

const DEFAULT_BASE_URL =
    "https://careers.qualcomm.com";

const POTENTIAL_QA_TITLE_REGEX =
    /\b(qa|quality|test|testing|sdet|automation|software test|validation)\b/i;

const DETAIL_BATCH_SIZE = 8;

function normalizeText(value) {
    if (!value) return "";

    return String(value)
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildSearchUrl(config, start = 0) {
    const params = new URLSearchParams({
        domain: config.domain,
        query: "",
        location: "",
        start: String(start)
    });

    return `${config.searchUrl || DEFAULT_SEARCH_URL}?${params.toString()}`;
}

function buildDetailUrl(config, positionId) {
    const params = new URLSearchParams({
        position_id: String(positionId),
        domain: config.domain,
        hl: "en"
    });

    return `${config.detailUrl || DEFAULT_DETAIL_URL}?${params.toString()}`;
}

function standardizePosition(position, details, config) {
    const description =
        details?.jobDescription ||
        position?.jobDescription ||
        "";

    const locations =
        details?.locations ||
        position?.locations ||
        [];

    const location =
        Array.isArray(locations)
            ? locations.join(", ")
            : String(locations || "");

    const title =
        details?.name ||
        position?.name ||
        "";

    const positionId =
        details?.id ||
        position?.id ||
        "";

    const publicUrl =
        details?.publicUrl ||
        (
            position?.positionUrl
                ? `${config.baseUrl || DEFAULT_BASE_URL}${position.positionUrl}`
                : ""
        );

    return {
        company: config.company,

        title: normalizeText(title),

        location: normalizeText(location),

        url: publicUrl,

        jobId:
            details?.displayJobId ||
            position?.displayJobId ||
            details?.atsJobId ||
            position?.atsJobId ||
            String(positionId),

        posted:
            details?.postedTs ||
            position?.postedTs ||
            null,

        experience: "",

        automation:
            /automation|automated|test framework|regression/i.test(
                normalizeText(description)
            ),

        description: normalizeText(description),

        fullText: normalizeText(
            [
                title,
                location,
                details?.department,
                description
            ].join(" ")
        ),

        source: "Eightfold",

        platform: "eightfold",

        externalId: String(positionId)
    };
}

async function fetchPositionDetails(
    page,
    position,
    config
) {
    const positionId = position?.id;

    if (!positionId) {
        return null;
    }

    const url =
        buildDetailUrl(
            config,
            positionId
        );

    const response =
        await page.request.get(url);

    if (!response.ok()) {
        throw new Error(
            `Eightfold detail request failed: ${response.status()}`
        );
    }

    const data =
        await response.json();

    if (!data || !data.data) {
        return null;
    }

    return data.data;
}

async function fetchDetailsInBatches(
    page,
    positions,
    config
) {
    const jobs = [];

    for (
        let i = 0;
        i < positions.length;
        i += DETAIL_BATCH_SIZE
    ) {
        const batch =
            positions.slice(
                i,
                i + DETAIL_BATCH_SIZE
            );

        console.log(
            `Fetching details ${i + 1}-${Math.min(
                i + DETAIL_BATCH_SIZE,
                positions.length
            )} of ${positions.length}...`
        );

        const results =
            await Promise.all(
                batch.map(async position => {
                    try {
                        const details =
                            await fetchPositionDetails(
                                page,
                                position,
                                config
                            );

                        if (!details) {
                            return null;
                        }

                        return standardizePosition(
                            position,
                            details,
                            config
                        );

                    } catch (error) {
                        console.log(
                            `Eightfold detail failed for ${position.name}: ${error.message}`
                        );

                        return null;
                    }
                })
            );

        for (const job of results) {
            if (job) {
                jobs.push(job);
            }
        }
    }

    return jobs;
}

async function scanEightfoldJobs(config) {
    console.log(
        `\n=== ${config.company} Eightfold scan ===`
    );

    console.log(
        `Search API: ${
            config.searchUrl ||
            DEFAULT_SEARCH_URL
        }`
    );

    const browser =
        await chromium.launch({
            headless: true
        });

    const page =
        await browser.newPage();

    const allPositions = [];
    const seenIds = new Set();

    try {
        let start = 0;
        let pageNumber = 1;

        while (true) {
            const url =
                buildSearchUrl(
                    config,
                    start
                );

            console.log(
                `Fetching Eightfold page ${pageNumber} (start=${start})...`
            );

            const response =
                await page.request.get(url);

            if (!response.ok()) {
                throw new Error(
                    `Eightfold search request failed: ${response.status()}`
                );
            }

            const result =
                await response.json();

            const positions =
                result?.data?.positions || [];

            if (!positions.length) {
                console.log(
                    "No more Eightfold positions returned."
                );

                break;
            }

            let newPositions = 0;

            for (const position of positions) {
                const id =
                    position?.id;

                if (!id) {
                    continue;
                }

                const key =
                    String(id);

                if (seenIds.has(key)) {
                    continue;
                }

                seenIds.add(key);

                allPositions.push(position);

                newPositions++;
            }

            console.log(
                `Positions received: ${positions.length}, new: ${newPositions}`
            );

            /*
             * If the API returns only duplicate records,
             * stop instead of repeatedly requesting the
             * same page.
             */
            if (newPositions === 0) {
                console.log(
                    "No new positions returned. Ending pagination."
                );

                break;
            }

            /*
             * Eightfold currently returns batches of 10.
             * If a future response contains fewer than 10,
             * treat it as the final page.
             */
            if (positions.length < 10) {
                console.log(
                    "Final partial Eightfold page reached."
                );

                break;
            }

            start += positions.length;
            pageNumber++;
        }

        console.log(
            `Total unique Eightfold positions found: ${allPositions.length}`
        );

        const potentialQA =
            allPositions.filter(position =>
                POTENTIAL_QA_TITLE_REGEX.test(
                    normalizeText(position.name)
                )
            );

        console.log(
            `Potential QA titles found: ${potentialQA.length}`
        );

        const jobs =
            await fetchDetailsInBatches(
                page,
                potentialQA,
                config
            );

        console.log(
            `Eightfold QA candidates returned: ${jobs.length}`
        );

        return jobs;

    } finally {
        await browser.close();
    }
}

module.exports = {
    scanEightfoldJobs,
    normalizeText,
    buildSearchUrl,
    buildDetailUrl,
    standardizePosition
};