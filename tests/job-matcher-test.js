
const assert = require("node:assert/strict");
const { matchJob } = require("../src/matching/jobMatcher");

function createJob(overrides = {}) {
    return {
        company: "Example Software",
        title: "Senior QA Engineer",
        url: "https://example.com/jobs/qa-engineer",
        location: "Hyderabad, India",
        experienceYears: 5,
        description:
            "Manual testing, Playwright, JavaScript, API testing, web application testing, functional testing and regression testing.",
        fullText:
            "QA Engineer STLC Playwright JavaScript API Testing Manual Testing",
        ...overrides
    };
}

console.log("Testing normal QA match...");
const normalResult = matchJob(createJob());

console.log(JSON.stringify(normalResult, null, 2));

assert.notEqual(
    normalResult.match.status,
    "IGNORE",
    "A suitable QA role within the candidate's experience should not be ignored."
);

console.log("PASS: Suitable QA role is not ignored.");

console.log("\nTesting stretch QA match...");
const stretchResult = matchJob(
    createJob({ experienceYears: 6 })
);

console.log(JSON.stringify(stretchResult, null, 2));

assert.equal(
    stretchResult.match.status,
    "REVIEW_MATCH",
    "A suitable role requiring 6 years should be available for review as a stretch match."
);


console.log("\nTesting excluded leadership title...");

const managerResult = matchJob(
    createJob({
        title: "QA Engineer Manager",
        experienceYears: 5
    })
);

assert.equal(
    managerResult.match.status,
    "IGNORE",
    "QA Manager roles should be ignored."
);

console.log("PASS: QA Manager role is ignored.");

console.log("PASS: Suitable stretch role is classified as REVIEW_MATCH.");


console.log("\nTesting gaming QA titles...");

for (const title of [
    "Game QA Tester",
    "QA Game Tester",
    "Video Game Tester"
]) {
    const result = matchJob(
        createJob({
            title,
            experienceYears: 3
        })
    );

    assert.notEqual(
        result.match.status,
        "IGNORE",
        `${title} should be recognized as a target role.`
    );

    console.log(`PASS: ${title} is recognized.`);
}
