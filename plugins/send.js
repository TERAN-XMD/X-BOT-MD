// commands/owner/send.js
const { cmd } = require('../../command');

cmd({
    pattern: "send",
    alias: ["quickbroadcast", "qsend"],
    desc: "Simple owner-only broadcast without scheduling or analytics",
    category: "owner",
    use: ".send group1,group2 | Your message here",
    filename: __filename
}, async (conn, mek, m, { q, isCreator, reply }) => {
    if (!isCreator) return reply("🚫 Owner only.");

    const [groupPart, messagePart] = q.split('|').map(s => s.trim());
    if (!groupPart || !messagePart) return reply("❌ Format: .send group1,group2 | message");

    const groupNames = groupPart.split(',').map(g => g.trim()).filter(Boolean);
    const allGroups = await conn.groupFetchAllParticipating();
    let sent = 0, failed = 0;

    for (const name of groupNames) {
        const grp = Object.values(allGroups).find(g => g.subject.toLowerCase().includes(name.toLowerCase()));
        if (!grp) continue;
        try {
            await conn.sendMessage(grp.id, { text: messagePart });
            sent++;
        } catch {
            failed++;
        }
    }

    reply(`✅ Sent to ${sent} groups\n❌ Failed: ${failed}`);
});
