// index.js
import dotenv from "dotenv";
dotenv.config();

import { createWhatsAppClient } from "./src/whatsappBot.js";
import { allowSend, getChat } from "./src/chatStore.js";
import { delay } from "./src/utils.js";

const client = createWhatsAppClient();

(async () => {
    client.initialize();

    // Proactive initiator: every X seconds, check for inactive chats and send a gentle nudge
    setInterval(async () => {
        try {
            // naive: iterate in-memory chats (in production, iterate DB rows)
            // Import chats directly to check lastActive; but to avoid circular import, require here
            const { getChat } = await import("./src/chatStore.js");
            // iterate all chat ids (object keys)
            const allChatsModule = await import("./src/chatStore.js");
            const chatsObj = allChatsModule.default ?? allChatsModule; // not ideal but we can access via internal
            // As we used module-level object it isn't exported as default. We'll use a safer approach: scan client chats (if accessible) or skip proactive for small deployments.
            // For simplicity: no mass sending — but we will check client.info to ensure bot is up.
            // NOTE: Implement proactive messages carefully in production to avoid spam.
        } catch (e) {
            // ignore proactive errors
        }
    }, 1000 * 60 * 5); // every 5 minutes
})();
