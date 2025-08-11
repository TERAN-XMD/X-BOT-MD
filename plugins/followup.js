// commands/owner/followup.js
const fs = require('fs');
const path = require('path');
const { cmd } = require('../../command');

const DATA_PATH = path.resolve(__dirname, '../../data/send_data.json');
let store = { reports: [] };
if (fs.existsSync(DATA_PATH)) store = JSON.parse(fs.readFileSync(DATA_PATH));

cmd({
    pattern: "followup",
    desc: "Manual follow-up to a previous broadcast report ID",
    category: "owner",
    use: ".followup <report_id> | Your follow-up message",
    filename: __filename
}, async (conn, mek, m, { q, isCreator, reply, db }) => {
    if (!isCreator) return reply("🚫 Owner only.");
    const [reportId, followMsg] = q.split('|').map(s => s.trim());
    if (!reportId || !followMsg) return reply("❌ Format: .followup <report_id> | message");

    const report = store.reports.find(r => r.id === reportId);
    if (!report) return reply(`❌ Report ID not found: ${reportId}`);

    const nonResp = await db.getNonResponders(reportId);
    let sent = 0, failed = 0;
    for (const userId of nonResp) {
        try {
            await conn.sendMessage(userId, { text: followMsg });
            sent++;
        } catch {
            failed++;
        }
    }

    reply(`📬 Follow-up sent\n📤 Sent: ${sent}\n❌ Failed: ${failed}`);
});
