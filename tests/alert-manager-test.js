const { matchJob } = require("../src/matching/jobMatcher");
const {
    processMatchedJob
} = require("../src/notifications/alertManager");

const appleJob = {
    company: "Apple",
    title: "Software Development Engineer in Test - IS&T",
    url: "https://jobs.apple.com/en-in/details/TEST-NEW-001",
    locations: [
        "Bengaluru, Karnataka, India",
        "Hyderabad, Telangana, India"
    ],
    roleNumber: "TEST-NEW-001",
    postedDate: "Sep 16, 2026",
    minimumExperience: "3+ years",
    automationExperience: "2+ years",
    technologies: [
        "Playwright",
        "Selenium",
        "Java",
        "Swift",
        "Karate",
        "RestAssured",
        "Appium",
        "Git",
        "CI/CD"
    ]
};

console.log("========== ALERT MANAGER TEST ==========\n");

console.log("Matching Apple job...\n");

const matchedJob = matchJob(appleJob);

console.log(
    "Match status:",
    matchedJob.match.status
);

console.log(
    "Match score:",
    matchedJob.match.score
);

console.log("\nProcessing matched job...\n");

const result = processMatchedJob(matchedJob);

console.log(
    JSON.stringify(result, null, 2)
);

console.log("\n========================================");