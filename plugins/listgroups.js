// commands/owner/listgroups.js
const { cmd } = require('../../command');

cmd({
    pattern: "listgroups",
    alias: ["groups", "grouplist"],
    desc: "List all joined groups with names and IDs",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { isCreator, reply }) => {
    if (!isCreator) return reply("🚫 Owner only.");

    const allGroups = await conn.groupFetchAllParticipating();
    let text = `📋 *Bot's Groups* (${Object.keys(allGroups).length})\n\n`;

    for (const [id, g] of Object.entries(allGroups)) {
        text += `• ${g.subject}\n  ID: ${id}\n\n`;
    }

    reply(text.trim());
});
