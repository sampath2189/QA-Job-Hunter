const assert = require("node:assert/strict");

const {
    isPotentialQATitle
} = require("../src/scanners/leverScanner");

const positiveTitles = [
    "QA Engineer",
    "Manual QA Tester",
    "Senior Test Engineer",
    "QA Automation Engineer",
    "SDET",
    "Game QA Tester",
    "Localization Tester",
    "Game Tester",
    "Gameplay Tester",
    "Video Game Tester",
    "Localization QA",
    "Localization Test Engineer",
    "Compatibility Tester",
    "Compatibility Test Engineer"
];

const negativeTitles = [
    "Executive Assistant",
    "Product Manager",
    "Director of Sales",
    "Cloud Network Engineer"
];

for (const title of positiveTitles) {
    assert.equal(
        isPotentialQATitle(title),
        true,
        `Expected QA title to be recognized: ${title}`
    );
    console.log(`PASS: Recognized ${title}`);
}

for (const title of negativeTitles) {
    assert.equal(
        isPotentialQATitle(title),
        false,
        `Expected unrelated title to be rejected: ${title}`
    );
    console.log(`PASS: Rejected ${title}`);
}

console.log("\nAll Lever title-filter tests passed.");
