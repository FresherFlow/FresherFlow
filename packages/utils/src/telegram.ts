export async function sendTelegramMessage(text: string) {
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^bot/i, '');
    const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim().replace(/^["']|["']$/g, '');

    if (!botToken || !chatId) {
        console.warn("Telegram credentials missing, skipping message.");
        return;
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
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
