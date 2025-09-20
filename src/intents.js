// src/intents.js
import { callGemini } from "./gemini.js";
import { safeJsonParse } from "./utils.js";

export async function detectIntent(userMessage) {
    const prompt = `
You are an intent classifier. Given the user message, return an intent label and confidence (0-1).
Reply exactly as JSON: {"intent":"...", "confidence":0.87, "note":"short note"}

Message: "${userMessage.replace(/"/g, '\\"')}"
Possible intents: greeting, mood_complaint, ask_food_suggestion, ask_help, smalltalk, unknown
`;
    const raw = await callGemini(prompt).catch(e => null);
    if (!raw) return { intent: "unknown", confidence: 0.0, note: "no-response" };
    // remove backticks, code fences
    const clean = raw.replace(/```json/i, "").replace(/```/g, "").trim();
    const parsed = safeJsonParse(clean);
    if (parsed && parsed.intent) return parsed;
    // fallback: try to extract with regex
    const maybeJson = clean.match(/\{[\s\S]+\}/);
    if (maybeJson) {
        const p = safeJsonParse(maybeJson[0]);
        if (p && p.intent) return p;
    }
    return { intent: "unknown", confidence: 0.0, note: clean.slice(0, 120) };
}
