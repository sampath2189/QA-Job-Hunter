const {
    verifyGmailConnection
} = require("../src/notifications/gmailNotifier");

async function main() {
    console.log("Testing Gmail connection...");

    await verifyGmailConnection();

    console.log("Gmail test completed successfully.");
}

main().catch((error) => {
    console.error("Gmail test failed:");
    console.error(error.message);
    process.exit(1);
});