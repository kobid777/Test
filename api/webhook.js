// api/webhook.js
import { GoogleGenAI } from "@google/genai";
import fetch from "node-fetch";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Inisialisasi Gemini
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  try {
    const update = req.body;
    const message = update.message || update.edited_message;
    if (!message || !message.text) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const userText = message.text.trim();

    // 1️⃣ Jika user kirim teks diawali "kode:" atau pakai ``` maka buat format mono
    const isCode =
      userText.startsWith("kode:") ||
      userText.startsWith("code:") ||
      userText.includes("```");

    if (isCode) {
      // Ambil isi kode-nya saja
      let codeContent = userText
        .replace(/^kode:/i, "")
        .replace(/^code:/i, "")
        .trim();

      // Jika belum pakai blok kode, bungkus dengan triple backtick
      if (!codeContent.includes("```")) {
        codeContent = "```\n" + codeContent + "\n```";
      }

      // Kirim ke Telegram dengan mode Markdown
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: codeContent,
          parse_mode: "MarkdownV2",
        }),
      });

      return res.status(200).json({ ok: true, note: "sent as code block" });
    }

    // 2️⃣ Kalau bukan kode, lanjut pakai AI Gemini
    const prompt = `User menulis: "${userText}" — balas secara singkat, alami, dan dalam Bahasa Indonesia.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const aiText = response?.text ?? "Maaf, saya belum bisa menjawab sekarang.";

    // Kirim balasan AI ke Telegram
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: aiText,
        reply_to_message_id: message.message_id,
      }),
    });

    res.status(200).json({ ok: true, aiText });
  } catch (err) {
    console.error("handler error:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
                                  }
