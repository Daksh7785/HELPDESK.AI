import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

async function listModels() {
    const key = process.env.VITE_GEMINI_API_KEY;
    console.log("Using VITE_GEMINI_API_KEY:", key ? "FOUND" : "MISSING");
    if (!key) return;

    const genAI = new GoogleGenerativeAI(key);

    // Attempt to list models directly using the API
    try {
        console.log("Fetching model list...");
        // The SDK doesn't have a direct listModels yet, so we use fetch
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("No models found in response:", JSON.stringify(data));
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

listModels();
