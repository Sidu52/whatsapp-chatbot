// src/gemini.js
import axios from "axios";
import { delay } from "./utils.js";
import dotenv from "dotenv";
dotenv.config();

const MODEL = "gemini-2.0-flash";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (!API_KEY) {
    console.warn("Warning: NEXT_PUBLIC_GOOGLE_API_KEY not set in .env");
}

/**
 * Call Gemini-like endpoint with retries & backoff.
 * options can include any fields you want to pass in the request body.
 */
export async function callGemini(prompt, options = {}, {
    maxRetries = 3,
    initialDelayMs = 500
} = {}) {
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        ...options
    };

    let attempt = 0;
    let lastErr = null;

    while (attempt <= maxRetries) {
        try {
            const res = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
                body,
                { headers: { "Content-Type": "application/json" }, timeout: 15000 }
            );

            const text = res?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return String(text).trim();
            // if response doesn't contain expected field, throw
            throw new Error("No text in Gemini response");
        } catch (err) {
            lastErr = err;
            attempt += 1;
            if (attempt > maxRetries) break;
            const backoff = initialDelayMs * Math.pow(2, attempt - 1);
            await delay(backoff + Math.random() * 200);
        }
    }
    console.error("callGemini failed:", lastErr?.message || lastErr);
    throw lastErr;
}
