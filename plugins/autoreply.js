// commands/owner/autoreply.js
const fs = require('fs');
const path = require('path');
const { cmd } = require('../../command');

const DATA_PATH = path.resolve(__dirname, '../../data/send_data.json');
let store = { reports: [] };
if (fs.existsSync(DATA_PATH)) store = JSON.parse(fs.readFileSync(DATA_PATH));

cmd({
    pattern: "autoreply",
    desc: "Set an automatic follow-up message for all future broadcasts",
    category: "owner",
    use: ".autoreply Your auto follow-up message here",
    filename: __filename
}, async (conn, mek, m, { q, isCreator, reply, db }) => {
    if (!isCreator) return reply("🚫 Owner only.");
    if (!q) return reply("❌ Please provide the auto-reply message.");

    store.autoReply = q;
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
    reply(`✅ Auto-reply message set:\n"${q}"`);

    // Hook into DB scheduler (depends on your broadcast system)
    db.on('broadcastComplete', async (reportId) => {
        setTimeout(async () => {
            const nonResp = await db.getNonResponders(reportId);
            for (const userId of nonResp) {
                try {
                    await conn.sendMessage(userId, { text: store.autoReply });
                } catch {}
            }
        }, 24 * 60 * 60 * 1000); // 24 hours later
    });
});
