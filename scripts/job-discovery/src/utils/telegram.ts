import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from '../config.js';

export async function sendTelegramMessage(text: string) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn("Telegram credentials missing, skipping message.");
        return;
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
        if (!res.ok) {
            console.error("Failed to send telegram message:", await res.text());
        }
    } catch (err) {
        console.error("Error sending to telegram:", err);
    }
}
