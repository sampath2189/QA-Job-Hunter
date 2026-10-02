const { scanCareerPage } = require("../src/scanners/careerScanner");

const testUrl = "https://www.google.com";

scanCareerPage(testUrl)
    .then(() => {
        console.log("Scanner test completed.");
    })
    .catch((error) => {
        console.error("Scanner test failed:");
        console.error(error.message);
    });