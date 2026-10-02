const { matchJob } = require("../src/matching/jobMatcher");

const appleJob = {
    company: "Apple",
    title: "Software Development Engineer in Test - IS&T",
    url: "https://jobs.apple.com/en-in/details/200678391-0321/software-development-engineer-in-test-is-t",
    locations: [
        "Bengaluru, Karnataka, India",
        "Hyderabad, Telangana, India"
    ],
    roleNumber: "200678391-0321",
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
        "CI/CD",
        "Maven",
        "Gradle",
        "JMeter",
        "Gatling",
        "Locust",
        "AWS",
        "GCP",
        "Docker",
        "Kubernetes",
        "Performance Testing",
        "Security Testing",
        "Accessibility Testing"
    ]
};

console.log("Testing Apple SDET job...\n");

const result = matchJob(appleJob);

console.log(
    JSON.stringify(result, null, 2)
);