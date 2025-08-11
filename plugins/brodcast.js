// commands/owner/broadcast.js
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const cooldowns = new Map();
const { cmd } = require('../../command');

const DATA_PATH = path.resolve(__dirname, '../../data/send_data.json');
let store = { templates: {}, optOut: [], reports: [] };
if (fs.existsSync(DATA_PATH)) store = JSON.parse(fs.readFileSync(DATA_PATH));

cmd({
    pattern: "broadcast",
    alias: ["sendpro", "sendplus"],
    desc: "Owner-only advanced broadcast with scheduling, templates, media, analytics",
    category: "owner",
    use: ".broadcast group1,group2 | Message --media=url --at=YYYY-MM-DDTHH:MM",
    filename: __filename
}, async (conn, mek, m, { q, args, isCreator, reply, db }) => {
    if (!isCreator) return reply("🚫 Owner only.");
    
    const senderId   = m.sender;
    const flags      = args.filter(a => a.startsWith('--')).map(f => f.slice(2));
    const scheduled  = flags.find(f => f.startsWith('at='));
    const isSchedule = !!scheduled;
    const sendTime   = isSchedule ? new Date(scheduled.split('=')[1]) : null;
    const groupNames = q.split('|')[0].split(',').map(g => g.trim()).filter(Boolean);
    let message      = q.split('|')[1] || '';
    const mediaFlag  = flags.find(f => f.startsWith('media='));
    const media      = mediaFlag ? mediaFlag.split('=')[1] : null;

    // Cooldown
    const cdTime = 60 * 1000;
    if (cooldowns.has(senderId) && cooldowns.get(senderId) > Date.now()) {
        const rem = ((cooldowns.get(senderId) - Date.now()) / 1000).toFixed(1);
        return reply(`⏳ Wait ${rem}s`);
    }
    cooldowns.set(senderId, Date.now() + cdTime);

    if (isSchedule && sendTime > Date.now()) {
        const jobId = uuid();
        db.scheduleJob({ id: jobId, runAt: sendTime, command: 'broadcast', args: args.join(' ') });
        return reply(`⏰ Scheduled at ${sendTime}`);
    }

    const allGroups = await conn.groupFetchAllParticipating();
    let sent = 0, failed = 0;
    const startTime = Date.now();

    for (const name of groupNames) {
        // ✅ Partial match allowed
        const grp = Object.values(allGroups).find(g => g.subject.toLowerCase().includes(name.toLowerCase()));
        if (!grp) continue;

        const meta    = await conn.groupMetadata(grp.id);
        const admins  = meta.participants.filter(p => p.admin).map(p => p.id);
        const members = meta.participants.map(p => p.id).filter(id => id !== senderId && !admins.includes(id));

        for (const userId of members) {
            if (store.optOut.includes(userId)) continue;

            let text = message || store.templates['default'] || 'Hello {{first_name}}!';
            const profile = await conn.onWhatsApp(userId);
            const first   = profile[0]?.notify?.split(' ')[0] || '';

            text = text.replace(/{{first_name}}/g, first)
                       .replace(/{{group}}/g, grp.subject)
                       .replace(/{{total}}/g, members.length);

            const sendOpts = { text };
            if (media) {
                sendOpts[media.match(/\.(jpg|png|gif)$/) ? 'image' : 'video'] = { url: media, caption: text };
            }

            try {
                await retrySend(() => conn.sendMessage(userId, sendOpts), 3, 1000);
                sent++;
            } catch {
                failed++;
            }
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    store.reports.push({ id: uuid(), when: new Date(), sent, failed, time: elapsed });
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));

    reply(`✅ Broadcast complete!\n🕒 ${elapsed}s\n📤 Sent: ${sent}\n❌ Failed: ${failed}`);
});

async function retrySend(fn, attempts, delay) {
    for (let i = 0; i < attempts; i++) {
        try { return await fn(); }
        catch (e) { if (i === attempts - 1) throw e; await new Promise(r => setTimeout(r, delay)); }
    }
}
