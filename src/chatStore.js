// src/chatStore.js
export const MAX_HISTORY = 12;
export const SUMMARY_INTERVAL = 6;

const chats = {}; // { chatId: { messages: [ {role, text, ts} ], summary, topic, profile, lastIntent, queue, rateLimit } }

/**
 * Ensure chat exists
 */
function ensureChat(chatId) {
    if (!chats[chatId]) {
        chats[chatId] = {
            messages: [],
            summary: "",
            topic: "",
            profile: {},       // store lightweight user profile/preferences
            lastIntent: "",
            lastActive: Date.now(),
            rateLimit: { lastSentTs: 0, tokens: 5 }, // simple token bucket
            queue: [] // for outgoing messages
        };
    }
    return chats[chatId];
}

export function addMessage(chatId, role, text) {
    const chat = ensureChat(chatId);
    chat.messages.push({ role, text, ts: Date.now() });
    // keep last MAX_HISTORY messages
    if (chat.messages.length > MAX_HISTORY) {
        chat.messages.splice(0, chat.messages.length - MAX_HISTORY);
    }
    chat.lastActive = Date.now();
}

export function getRecentConversation(chatId) {
    const c = ensureChat(chatId);
    return c.messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n");
}

export function setSummary(chatId, summary, topic) {
    const c = ensureChat(chatId);
    if (summary) c.summary = summary;
    if (topic) c.topic = topic;
}

export function setLastIntent(chatId, intent) {
    const c = ensureChat(chatId);
    c.lastIntent = intent;
}

export function getChat(chatId) {
    return ensureChat(chatId);
}

export function enqueueOutgoing(chatId, payload) {
    const c = ensureChat(chatId);
    c.queue.push(payload);
}

export function dequeueOutgoing(chatId) {
    const c = ensureChat(chatId);
    return c.queue.shift();
}

/** Simple token-bucket rate limiter (refill) */
export function allowSend(chatId, maxTokens = 5, refillIntervalMs = 60_000) {
    const c = ensureChat(chatId);
    const now = Date.now();
    const elapsed = now - (c.rateLimit.lastRefill || now);
    const refillTokens = Math.floor(elapsed / refillIntervalMs);
    if (refillTokens > 0) {
        c.rateLimit.tokens = Math.min(maxTokens, c.rateLimit.tokens + refillTokens);
        c.rateLimit.lastRefill = now;
    }
    if (!c.rateLimit.tokens || c.rateLimit.tokens <= 0) {
        return false;
    }
    c.rateLimit.tokens -= 1;
    c.rateLimit.lastSentTs = now;
    return true;
}
