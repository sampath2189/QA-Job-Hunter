const {
    sendJobAlert
} = require("../src/notifications/gmailNotifier");

const testJob = {
    company: "QA Job Hunter Test",
    title: "Test QA Automation Engineer",
    locations: [
        "Hyderabad, Telangana, India"
    ],
    minimumExperience: "3+ years",
    automationExperience: "1+ years",
    technologies: [
        "Playwright",
        "JavaScript",
        "API Testing"
    ],
    url: "https://example.com/test-job",
    match: {
        status: "STRONG_MATCH",
        score: 85
    }
};

async function main() {
    console.log("Sending test job alert...");

    await sendJobAlert(testJob);

    console.log("Test job alert sent successfully.");
}

main().catch((error) => {
    console.error("Test email failed:");
    console.error(error.message);
    process.exit(1);
});