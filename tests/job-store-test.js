const {
    loadJobs,
    saveJob,
    getJob,
    hasJob,
    getJobKey
} = require("../src/database/jobStore");

const testJob = {
    company: "Apple",
    title: "Software Development Engineer in Test - IS&T",
    roleNumber: "200678391-0321",
    url: "https://jobs.apple.com/en-in/details/200678391-0321/software-development-engineer-in-test-is-t",
    locations: [
        "Bengaluru, Karnataka, India",
        "Hyderabad, Telangana, India"
    ],
    postedDate: "Sep 16, 2026",
    minimumExperience: "3+ years",
    automationExperience: "2+ years"
};

console.log("========== JOB STORE TEST ==========\n");

console.log("Initial jobs in database:");
console.log(loadJobs());

console.log("\nJob key:");
console.log(getJobKey(testJob));

console.log("\nHas job before saving:");
console.log(hasJob(testJob));

console.log("\nSaving job...");
const savedJob = saveJob(testJob);

console.log("Saved job:");
console.log(JSON.stringify(savedJob, null, 2));

console.log("\nHas job after saving:");
console.log(hasJob(testJob));

console.log("\nRetrieved job:");
console.log(
    JSON.stringify(getJob(testJob), null, 2)
);

console.log("\n====================================");