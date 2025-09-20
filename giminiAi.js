import OpenAI from "openai";

// Gemini AI setup
const client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

// Call Gemini API
export async function callGemini(userMessage, chatHistory, userProfile) {
    try {
        const prompt = `
      You're a human-like WhatsApp chat partner. Be casual, friendly, and use emojis sometimes. 
      Remember context and user profile.

      ### Profile
      ${JSON.stringify(userProfile || {}, null, 2)}

      ### Chat History
      ${chatHistory.map(c => `${c.role}: ${c.content}`).join("\n")}

      ### User Message
      ${userMessage}

      Reply in Hinglish (mix of Hindi + English).
    `;

        const completion = await client.chat.completions.create({
            model: "gemini-1.5-flash",
            messages: [{ role: "user", content: prompt }]
        });

        return completion.choices[0].message.content;
    } catch (err) {
        console.error("Gemini Error:", err.message);
        return "😅 thoda issue ho gaya, try again later!";
    }
}
