// import "dotenv/config";
// import axios from "axios";

// const MODEL = "gemini-2.0-flash";
// const API_KEY = "AIzaSyA99Q4aOZ-N-wPW3CIrY8Zhyb-QpZy73y0";

// const MAX_HISTORY = 6;       // keep last N messages
// const SUMMARY_INTERVAL = 6;  // after N messages create/update summary

// const chats = {}; // in-memory; replace with DB for production

// async function callGemini(prompt, options = {}) {
//     const body = {
//         contents: [{ parts: [{ text: prompt }] }],
//         // optional: if your endpoint supports params like temperature / maxOutputTokens
//         // you can include them as documented by your API; otherwise control via prompt.
//         ...options
//     };
//     const res = await axios.post(
//         `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
//         body,
//         { headers: { "Content-Type": "application/json" } }
//     );
//     return res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
// }

// // 1) update history helper
// function addMessageToChat(chatId, role, text) {
//     if (!chats[chatId]) chats[chatId] = { messages: [], summary: "", topic: "", lastIntent: "" };
//     const hist = chats[chatId].messages;
//     hist.push({ role, text, ts: Date.now() });
//     // keep only last MAX_HISTORY messages
//     if (hist.length > MAX_HISTORY) hist.splice(0, hist.length - MAX_HISTORY);
// }

// // 2) summarization to compress old context
// async function summarizeChat(chatId) {
//     const chat = chats[chatId];
//     if (!chat) return;
//     const prompt = `
// You are a brief summarizer for a WhatsApp chat.
// Produce a single-line summary and a single-word topic label.

// ChatSummaryInput:
// ${chat.messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join("\n")}

// Return format:
// SUMMARY: <one-line summary>
// TOPIC: <one-word-topic>
// `;
//     const out = await callGemini(prompt);
//     if (!out) return;
//     // parse
//     const summaryMatch = out.match(/SUMMARY:\s*(.+)/i);
//     const topicMatch = out.match(/TOPIC:\s*(\S+)/i);
//     if (summaryMatch) chat.summary = summaryMatch[1].trim();
//     if (topicMatch) chat.topic = topicMatch[1].trim();
// }

// // 3) detect intent + confidence
// async function detectIntent(userMessage) {
//     const prompt = `
// You are an intent classifier. Given the user message, return an intent label and confidence (0-1).
// Reply exactly as JSON: {"intent":"...", "confidence":0.87, "note":"short note"}

// Message: "${userMessage}"
// Possible intents: greeting, mood_complaint, ask_food_suggestion, ask_help, smalltalk, unknown
// `;

//     const out = await callGemini(prompt);

//     try {
//         // Clean output → remove backticks & "json" language hints
//         const clean = out
//             .replace(/```json/i, "")
//             .replace(/```/g, "")
//             .trim();

//         const js = JSON.parse(clean);
//         return js;
//     } catch (e) {
//         console.error("Intent parse failed:", out);
//         return { intent: "unknown", confidence: 0.0, note: out?.slice(0, 120) || "" };
//     }
// }

// // 4) build main response prompt
// function buildReplyPrompt(chatId, userMessage, intent) {
//     const chat = chats[chatId];
//     const systemInstruction = `
// You are a ${chat.persona} Hindi WhatsApp friend. Keep replies casual, short (5–15 words), and natural.
// Sometimes use emojis or Hinglish if user does.
// `;
//     // include compressed summary if exists
//     const summaryBlock = chat.summary ? `Chat summary: ${chat.summary}\nTopic: ${chat.topic || "unknown"}\n` : "";

//     const history = chat.messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join("\n");

//     const fewShot = `
// User: hyy
// Assistant: Hey! Kaise ho?
//   `.trim();

//     const prompt = `
// ${systemInstruction}

// ${summaryBlock}
// Recent conversation:
// ${history}

// DetectedIntent: ${intent.intent} (confidence: ${intent.confidence})
// User: ${userMessage}
// Assistant:
//   `.trim();

//     return `${fewShot}\n\n${prompt}`;
// }

// // 5) main handler to be called from WhatsApp message event
// export async function handleIncomingMessage(chatId, userMessage) {
//     // store user msg
//     addMessageToChat(chatId, "user", userMessage);

//     // 1. intent detection
//     const intent = await detectIntent(userMessage);

//     // 2. if low confidence -> ask clarifying question
//     if (intent.confidence < 0.4 || intent.intent === "unknown") {
//         const clarifying = "Kya khana chate ho?";
//         addMessageToChat(chatId, "assistant", clarifying);
//         return clarifying;
//     }
//     // 3. optional: update lastIntent
//     if (!chats[chatId]) chats[chatId] = { messages: [], summary: "", topic: "", lastIntent: "" };
//     chats[chatId].lastIntent = intent.intent;


//     // 4. build reply prompt with history + summary
//     const prompt = buildReplyPrompt(chatId, userMessage, intent);
//     // 5. call Gemini to get reply
//     const aiReply = await callGemini(prompt, { /* optional params */ });

//     // 6. store assistant reply
//     addMessageToChat(chatId, "assistant", aiReply || "Kya mujhe samajh nahi.");

//     // 7. periodically summarize to compress history
//     if (chats[chatId].messages.filter(m => m.role === "user").length % SUMMARY_INTERVAL === 0) {
//         await summarizeChat(chatId);
//     }
//     return aiReply;
// }

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
