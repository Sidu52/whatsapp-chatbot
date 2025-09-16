
dotenv.config();
import { Client } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import axios from "axios";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./giminiAi.js";


// WhatsApp Client
const client = new Client();
client.on("qr", qr => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("✅ WhatsApp Bot Ready!"));

console.log('APIKEY', process.env.NEXT_PUBLIC_GOOGLE_API_KEY);
// When message received
// Store messages per user

const userMessages = {};
const debounceTimers = {};

client.on("message", async (msg) => {
    const userId = msg.from;

    // Initialize array if not exists
    if (!userMessages[userId]) {
        userMessages[userId] = [];
    }

    // Push new message into queue
    userMessages[userId].push(msg.body);

    // If there's already a timer running, clear it
    if (debounceTimers[userId]) {
        clearTimeout(debounceTimers[userId]);
    }

    // Start new debounce timer (e.g., 5 sec after last message)
    debounceTimers[userId] = setTimeout(async () => {
        const allMessages = userMessages[userId].join("\n");
        console.log(`Final collected messages from ${userId}:`, allMessages);

        // Send whole conversation batch to AI
        const reply = await handleIncomingMessage(userId, allMessages);

        await msg.reply(reply);

        // Clear messages after reply
        userMessages[userId] = [];
        delete debounceTimers[userId];
    }, 5000); // 5 seconds debounce
});

client.initialize();
