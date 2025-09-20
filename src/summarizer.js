// src/summarizer.js
import { callGemini } from "./gemini.js";
import { setSummary, getChat } from "./chatStore.js";

export async function summarizeIfNeeded(chatId) {
    const chat = getChat(chatId);
    if (!chat) return;
    const userMessagesCount = chat.messages.filter(m => m.role === "user").length;
    if (userMessagesCount === 0) return;
    // Summarize every SUMMARY_INTERVAL user messages
    if (userMessagesCount % 6 !== 0) return;

    const prompt = `
You are a brief summarizer for a WhatsApp chat.
Produce a single-line summary and a single-word topic label.

ChatSummaryInput:
${chat.messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join("\n")}

Return format:
SUMMARY: <one-line summary>
TOPIC: <one-word-topic>
`;
    const out = await callGemini(prompt).catch(e => null);
    if (!out) return;
    const summaryMatch = out.match(/SUMMARY:\s*(.+)/i);
    const topicMatch = out.match(/TOPIC:\s*(\S+)/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : undefined;
    const topic = topicMatch ? topicMatch[1].trim() : undefined;
    if (summary || topic) setSummary(chatId, summary, topic);
}
