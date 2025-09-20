// src/handler.js
import { addMessage, enqueueOutgoing, dequeueOutgoing, getChat, allowSend, getRecentConversation } from "./chatStore.js";
import { detectIntent } from "./intents.js";
import { summarizeIfNeeded } from "./summarizer.js";
import { callGemini } from "./gemini.js";
import { delay, randomChoice } from "./utils.js";

const userMessages = {}; // batching buffer per user
const debounceTimers = {};
const PROCESSING = {}; // lock per user so we don't process same user concurrently

// Helper to send typing style delay + reply
async function sendWithTyping(client, chatId, replyText, originalMsg, minTypingMs = 600, msPerChar = 40) {
    // Attempt to use presence/typing if available; if not, fallback to just delaying send.
    try {
        // If whatsapp-web.js exposes sendPresenceAvailable, call it (some versions do)
        if (typeof client.sendPresenceAvailable === "function") {
            client.sendPresenceAvailable();
        }
        // compute a typing delay (bounded)
        const typingTime = Math.min(4000, minTypingMs + (replyText?.length || 0) * msPerChar);
        // optional: send 'composing' via client if available (some libs don't have it)
        if (client.info && client.info.wid) {
            // no-op; we keep compatibility. Real typing is simulated by delay.
        }

        // Randomize slightly for human feel
        const jitter = Math.floor(Math.random() * 700);
        await delay(typingTime + jitter);
    } catch (e) {
        // ignore presence failures; still delay
        await delay(Math.min(3000, (replyText?.length || 0) * 40));
    }

    // final small random pause
    await delay(200 + Math.random() * 400);
    // reply
    await originalMsg.reply(replyText);
}

export async function handleIncomingMessage(client, msg) {
    const userId = msg.from;
    // Append to local buffer
    if (!userMessages[userId]) userMessages[userId] = [];
    userMessages[userId].push(msg.body);

    // Debounce batching: restart timer each message
    if (debounceTimers[userId]) clearTimeout(debounceTimers[userId]);
    debounceTimers[userId] = setTimeout(async () => {
        const allMessages = userMessages[userId].join("\n").trim();
        userMessages[userId] = [];
        delete debounceTimers[userId];

        // push into official chat store as one combined user message
        addMessage(userId, "user", allMessages);

        // Avoid concurrent processing for same user
        if (PROCESSING[userId]) {
            // enqueue a notification or skip; we'll just enqueue for later processing
            enqueueOutgoing(userId, { type: "batch_user", text: allMessages, originalMsg: msg });
            return;
        }
        PROCESSING[userId] = true;

        try {
            // 1) detect intent
            const intent = await detectIntent(allMessages).catch(e => ({ intent: "unknown", confidence: 0 }));
            // 2) low confidence: ask clarifying question
            if (intent.confidence < 0.4 || intent.intent === "unknown") {
                const clarifyingOptions = [
                    "Kya khana chahoge?",
                    "Thoda aur batao please?",
                    "Main kaise madad karu?"
                ];
                const clarifying = randomChoice(clarifyingOptions);
                addMessage(userId, "assistant", clarifying);
                await sendWithTyping(client, userId, clarifying, msg);
                PROCESSING[userId] = false;
                return;
            }

            // Update last intent
            const chat = getChat(userId);
            chat.lastIntent = intent.intent;

            // 3) Build response prompt (short Hindi assistant style)
            const systemInstruction = `You are a friendly, casual Hindi WhatsApp assistant. Keep replies short (1-15 words), empathetic, and human-like. Match user's language. If unsure ask one short clarifying question.`;
            const summaryBlock = chat.summary ? `Chat summary: ${chat.summary}\nTopic: ${chat.topic || "unknown"}\n` : "";
            const history = getRecentConversation(userId);
            const fewShot = `User: hyy\nAssistant: Hey! Kaise ho?\n`;
            const prompt = `${fewShot}\n${systemInstruction}\n${summaryBlock}\nRecent conversation:\n${history}\nDetectedIntent: ${intent.intent} (confidence: ${intent.confidence})\nUser: ${allMessages}\nAssistant:`;

            // 4) Call Gemini / LLM
            let aiReply = "";
            try {
                aiReply = await callGemini(prompt, {});
                if (!aiReply) aiReply = "Thoda clear batao please.";
            } catch (e) {
                // If LLM failed, fallback friendly message
                aiReply = "Network issue, thoda ruk jao.";
            }

            // 5) store assistant reply and send with typing simulation
            addMessage(userId, "assistant", aiReply);
            await sendWithTyping(client, userId, aiReply, msg);

            // 6) Periodic summarization
            await summarizeIfNeeded(userId);

            // 7) Process any queued outgoing messages for that user (if any)
            while (true) {
                const queued = dequeueOutgoing(userId);
                if (!queued) break;
                // For queued messages we attempt to send them as is (with typing)
                await sendWithTyping(client, userId, queued.text, msg);
            }
        } finally {
            PROCESSING[userId] = false;
        }
    }, 5000); // 5s debounce
}
