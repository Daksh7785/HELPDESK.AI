const GEMINI_API_KEY = "AIzaSyA2P9WvEzxTx6yNzTFV8H6rF6-h1KMZMxU";

async function listModels() {
    console.log("Fetching model list...");
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("No models found. Response:", JSON.stringify(data));
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

listModels();
