// src/whatsappBot.js
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./handler.js";
import { delay } from "./utils.js";

dotenv.config();

const { Client, LocalAuth } = pkg;

export function createWhatsAppClient() {
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: "whatsapp-ai-bot",
            dataPath: process.env.WHATSAPP_SESSION_PATH || "./sessions", // keep sessions persistent
        })
    });

    // ✅ QR Code
    client.on("qr", qr => qrcode.generate(qr, { small: true }));

    // ✅ Ready
    client.on("ready", () => console.log("✅ WhatsApp Bot Ready!"));

    // ✅ Handle errors
    client.on("auth_failure", msg => console.error("❌ Auth failure:", msg));
    client.on("disconnected", reason => {
        console.warn("Client disconnected:", reason);
        setTimeout(() => client.initialize(), 5000); // retry
    });

    // ✅ Message handler
    client.on("message", async msg => {
        try {
            await handleIncomingMessage(client, msg);
        } catch (e) {
            console.error("💥 Error in message handler:", e?.message || e);
        }
    });

    return client;
}
