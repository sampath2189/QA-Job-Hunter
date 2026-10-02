const fs = require("fs");

function loadJson(filePath) {
    return JSON.parse(
        fs.readFileSync(filePath, "utf8")
    );
}

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Detect roles that are primarily hardware,
 * semiconductor, embedded, manufacturing,
 * supplier quality, or non-software validation roles.
 */
function hasNonSoftwareQARelevance(job) {
    const title = normalize(job.title);

    const text = normalize(
        `${job.title || ""} ${job.description || ""} ${job.fullText || ""}`
    );

    // ----------------------------------------
    // HARDWARE / EMBEDDED TITLE SIGNALS
    // ----------------------------------------

    const hardwareTitleSignals = [
        "hwqa",
        "hardware qa",
        "hardware quality",
        "hardware test",
        "hardware validation",
        "silicon validation",
        "silicon qa",
        "soc validation",
        "soc qa",
        "chip validation",
        "chipset validation",
        "embedded validation",
        "embedded qa",
        "embedded test",
        "firmware validation",
        "firmware qa",
        "firmware test",
        "device validation"
    ];

    // ----------------------------------------
    // HARDWARE / EMBEDDED TEXT SIGNALS
    // ----------------------------------------

    const hardwareTextSignals = [
        "pre-silicon",
        "pre silicon",
        "post-silicon",
        "post silicon",
        "silicon validation",
        "soc architecture",
        "soc validation",
        "chip validation",
        "chipset",
        "asic",
        "fpga",
        "hardware bring-up",
        "hardware bring up",
        "platform bring-up",
        "platform bring up",
        "embedded systems",
        "embedded system",
        "cpu validation",
        "gpu validation",
        "pci-e",
        "pcie",
        "usb3",
        "device driver",
        "device-driver",
        "bootloader"
    ];

    // ----------------------------------------
    // MANUFACTURING / NPI / SUPPLIER SIGNALS
    // ----------------------------------------

    const manufacturingTitleSignals = [
        "operations npi",
        "npi test engineer",
        "npi test engineering",
        "manufacturing quality",
        "manufacturing systems",
        "manufacturing automation",
        "manufacturing engineer",
        "supplier quality",
        "supplier quality engineer",
        "capex supplier",
        "quality engineering technician",
        "production quality",
        "factory quality",
        "operations test engineer",
        "operations test engineering",
        "dfm engineer",
        "smt pcba"
    ];

    const manufacturingTextSignals = [
        "new product introduction",
        "new product introduction",
        "npi",
        "manufacturing systems",
        "manufacturing infrastructure",
        "manufacturing environment",
        "production line",
        "production environment",
        "supplier quality",
        "supplier quality engineering",
        "supplier manufacturing",
        "factory",
        "assembly line",
        "production quality",
        "manufacturing quality",
        "manufacturing process",
        "process engineering",
        "dfm",
        "design for manufacturing",
        "smt",
        "pcba",
        "capex supplier"
    ];

    // ----------------------------------------
    // TITLE CHECKS
    // ----------------------------------------

    const titleHardwareMatch =
        hardwareTitleSignals.some((keyword) =>
            title.includes(normalize(keyword))
        );

    const titleManufacturingMatch =
        manufacturingTitleSignals.some((keyword) =>
            title.includes(normalize(keyword))
        );

    if (
        titleHardwareMatch ||
        titleManufacturingMatch
    ) {
        return true;
    }

    // ----------------------------------------
    // TEXT HARDWARE CHECK
    // ----------------------------------------

    let hardwareSignalCount = 0;

    for (const keyword of hardwareTextSignals) {
        if (text.includes(normalize(keyword))) {
            hardwareSignalCount++;
        }
    }

    /*
     * Don't reject a normal software QA role
     * simply because its description mentions
     * a hardware-related term.
     */
    if (hardwareSignalCount >= 3) {
        return true;
    }

    // ----------------------------------------
    // TEXT MANUFACTURING CHECK
    // ----------------------------------------

    let manufacturingSignalCount = 0;

    for (const keyword of manufacturingTextSignals) {
        if (text.includes(normalize(keyword))) {
            manufacturingSignalCount++;
        }
    }

    /*
     * Manufacturing/NPI roles can have many
     * software-like words such as testing,
     * automation and quality. Therefore we
     * require multiple manufacturing signals
     * when the title itself doesn't identify it.
     */
    if (manufacturingSignalCount >= 3) {
        return true;
    }

    return false;
}


function calculateMatch(job) {

    const profile =
        loadJson("config/profile.json");

    const keywords =
        loadJson("config/keywords.json");

    const title =
        normalize(job.title);

    const location =
        normalize(job.location);

    const description =
        normalize(
            `${job.title || ""} ${job.description || ""} ${job.fullText || ""}`
        );

    const totalExperience =
        profile.candidate.total_qa_experience_years;

    const requiredExperience =
        job.experienceYears;


    // ----------------------------------------
    // ROLE MATCH
    // ----------------------------------------

    const roleMatch =
        keywords.job_title_keywords.some(
            (keyword) =>
                title.includes(
                    normalize(keyword)
                )
        );


    // ----------------------------------------
    // LOCATION MATCH
    // ----------------------------------------

    const locationMatch =
        keywords.location_keywords.some(
            (keyword) =>
                location.includes(
                    normalize(keyword)
                )
        );


    // ----------------------------------------
    // SOFTWARE QA RELEVANCE
    // ----------------------------------------

    const nonSoftwareQA =
        hasNonSoftwareQARelevance(job);


    // ----------------------------------------
    // BASIC FILTERS
    // ----------------------------------------

    if (!roleMatch) {
        return {
            status: "IGNORE",
            score: 0,
            reason:
                "Job title does not match configured QA/testing roles."
        };
    }

    if (!locationMatch) {
        return {
            status: "IGNORE",
            score: 0,
            reason:
                "Job location does not match configured target locations."
        };
    }

    if (nonSoftwareQA) {
        return {
            status: "IGNORE",
            score: 0,
            reason:
                "Job appears focused on hardware, embedded systems, silicon/SoC validation, manufacturing, NPI, supplier quality, or other non-software QA."
        };
    }


    // ----------------------------------------
    // EXPERIENCE
    // ----------------------------------------

    const experienceCompatible =
        requiredExperience === null ||
        requiredExperience === undefined ||
        requiredExperience <= totalExperience;

    if (!experienceCompatible) {
        return {
            status: "IGNORE",
            score: 0,
            reason:
                `Required experience (${requiredExperience} years) exceeds candidate total QA experience (${totalExperience} years).`
        };
    }


    // ----------------------------------------
    // BASE SCORE
    // ----------------------------------------

    let score = 0;

    score += 25; // Role
    score += 20; // Location
    score += 20; // Experience


    // ----------------------------------------
    // PREFERRED TECHNOLOGIES
    // ----------------------------------------

    const preferredWeights = {

        "playwright": 15,
        "javascript": 10,
        "typescript": 10,

        "api testing": 10,
        "api automation": 10,

        "manual testing": 8,

        "web testing": 10,
        "web application testing": 10,

        "game testing": 8,

        "automation testing": 8,
        "test automation": 8,

        "functional testing": 8,
        "regression testing": 5,
        "integration testing": 5,

        "ui testing": 5,

        "end to end testing": 5,
        "e2e testing": 5,

        "stlc": 4,
        "l10n": 4,
        "i18n": 4,

        "cross-platform testing": 5
    };


    let preferredTechnologyScore = 0;

    const matchedPreferredTechnologies = [];


    for (
        const keyword
        of keywords.technology_keywords
    ) {

        const normalizedKeyword =
            normalize(keyword);

        const weight =
            preferredWeights[
                normalizedKeyword
            ];

        if (
            weight &&
            description.includes(
                normalizedKeyword
            )
        ) {

            preferredTechnologyScore +=
                weight;

            matchedPreferredTechnologies.push(
                keyword
            );
        }
    }


    preferredTechnologyScore =
        Math.min(
            preferredTechnologyScore,
            35
        );

    score +=
        preferredTechnologyScore;


    // ----------------------------------------
    // ADDITIONAL TECHNOLOGIES
    // ----------------------------------------

    let additionalTechnologyScore = 0;

    const matchedAdditionalTechnologies = [];


    for (
        const keyword
        of keywords.technology_keywords
    ) {

        const normalizedKeyword =
            normalize(keyword);

        if (
            !preferredWeights[
                normalizedKeyword
            ] &&
            description.includes(
                normalizedKeyword
            )
        ) {

            additionalTechnologyScore += 1;

            matchedAdditionalTechnologies.push(
                keyword
            );
        }
    }


    additionalTechnologyScore =
        Math.min(
            additionalTechnologyScore,
            5
        );

    score +=
        additionalTechnologyScore;


    // ----------------------------------------
    // FINAL SCORE
    // ----------------------------------------

    score =
        Math.min(
            Math.max(score, 0),
            100
        );


    // ----------------------------------------
    // STATUS
    // ----------------------------------------

    let status = "IGNORE";


    if (
        experienceCompatible &&
        preferredTechnologyScore >= 15
    ) {

        status =
            "STRONG_MATCH";

    }
    else if (
        experienceCompatible &&
        score >= 50
    ) {

        status =
            "REVIEW_MATCH";
    }


    return {

        status,

        score,

        reason: "",

        matchedPreferredTechnologies,

        matchedAdditionalTechnologies,

        preferredTechnologyScore,

        additionalTechnologyScore,

        requiredExperience,

        candidateExperience:
            totalExperience,

        location:
            job.location,

        title:
            job.title
    };
}


function matchJob(job) {

    const match =
        calculateMatch(job);

    return {
        ...job,
        match
    };
}


module.exports = {

    calculateMatch,

    matchJob,

    hasNonSoftwareQARelevance
};