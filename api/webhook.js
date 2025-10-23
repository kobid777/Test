// api/webhook.js
import { GoogleGenAI } from "@google/genai";
import fetch from "node-fetch";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// init client (SDK membaca env var sesuai docs)
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  try {
    const update = req.body;

    // hanya handle pesan teks pada private chat / group
    const message = update.message || update.edited_message;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true, note: "no text" });
    }

    const chatId = message.chat.id;
    const userText = message.text;

    // contoh prompt — Anda bisa memperkaya prompt untuk persona bot
    const prompt = `You are a helpful, friendly Telegram assistant. User wrote: "${userText}" Respond concisely in Indonesian.`;

    // panggil Gemini (generateContent) sesuai SDK
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const aiText = response?.text ?? "Maaf, saya belum bisa menjawab sekarang.";

    // kirim jawaban ke Telegram via sendMessage
    const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: aiText,
        reply_to_message_id: message.message_id
      })
    });

    const telegramJson = await telegramRes.json();

    return res.status(200).json({ ok: true, aiText, telegram: telegramJson });
  } catch (err) {
    console.error("handler error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
