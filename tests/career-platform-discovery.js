const fs = require("fs");

const companies = JSON.parse(
    fs.readFileSync("config/companies.json", "utf8")
);

const platforms = JSON.parse(
    fs.readFileSync("config/careerPlatforms.json", "utf8")
);

const knownCompanies = new Set(
    Object.keys(platforms.companies)
);

console.log("========================================");
console.log("CAREER PLATFORM DISCOVERY");
console.log("========================================");

console.log(`\nCompanies in companies.json: ${companies.length}`);
console.log(`Already classified: ${knownCompanies.size}`);

const remainingCompanies = companies.filter((company) => {
    const companyName =
        typeof company === "string"
            ? company
            : company.name;

    return !knownCompanies.has(companyName);
});

console.log(`Remaining to classify: ${remainingCompanies.length}`);

console.log("\nCompanies to classify:");

remainingCompanies.forEach((company, index) => {
    const companyName =
        typeof company === "string"
            ? company
            : company.name;

    console.log(`${index + 1}. ${companyName}`);
});

console.log("\n========================================");
console.log("Discovery preparation completed.");
console.log("========================================");