require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function main() {
    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: "Say hello and confirm that the Gemini API connection is working."
    });

    console.log("Gemini response:");
    console.log(response.text);
}

main().catch((error) => {
    console.error("Gemini API test failed:");
    console.error(error.message);
});