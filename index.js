const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField,
    AuditLogEvent,
    MessageFlags
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================== عدل هون ==================
client.login(process.env.TOKEN);
const SPECIAL_ROLE_ID = "1475799622613205012";

const JOIN_LEAVE_LOG = "1475589765532221450";
const ROLE_LOG_CHANNEL = "1475603887934406726";
const MOD_LOG_CHANNEL = "1475790140717928521";
// =============================================

const savedMembers = new Set();

client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// ================= خروج عضو =================
client.on("guildMemberRemove", async member => {

    const log = member.guild.channels.cache.get(JOIN_LEAVE_LOG);

    if (member.roles.cache.has(SPECIAL_ROLE_ID)) {
        savedMembers.add(member.id);
    }

    if (log) {
        log.send({
            content: `📤 خرج ${member}`,
            flags: MessageFlags.SuppressNotifications
        });
    }

    const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberKick
    });

    const kickLog = fetchedLogs.entries.first();

    if (kickLog && kickLog.target.id === member.id) {
        const modLog = member.guild.channels.cache.get(MOD_LOG_CHANNEL);
        if (modLog) {
            modLog.send({
                content: `👢 كيك
👤 العضو: ${member}
🛠 بواسطة: ${kickLog.executor}`,
                flags: MessageFlags.SuppressNotifications
            });
        }
    }
});

// ================= دخول عضو =================
client.on("guildMemberAdd", async member => {

    const log = member.guild.channels.cache.get(JOIN_LEAVE_LOG);

    if (member.user.bot) {
        await member.ban({ reason: "Bots not allowed" });
        return;
    }

    if (savedMembers.has(member.id)) {

        const role = member.guild.roles.cache.get(SPECIAL_ROLE_ID);
        if (role) await member.roles.add(role).catch(() => {});

        savedMembers.delete(member.id);

        if (log) {
            log.send({
                content: `📥 رجع ${member}
🔄 تم استرجاع الرتبة الخاصة`,
                flags: MessageFlags.SuppressNotifications
            });
        }
    } else {
        if (log) {
            log.send({
                content: `📥 دخول عضو جديد ${member}`,
                flags: MessageFlags.SuppressNotifications
            });
        }
    }
});

// ================= الأوامر =================
client.on("messageCreate", async message => {

    if (!message.guild) return;
    if (message.author.bot) return;

    // رد بكلمة كود
    if (message.content === "كود") {
        return message.reply({
            content: "الكود ",
            flags: MessageFlags.SuppressNotifications
        });
    }

    if (!message.content.startsWith("!")) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.split(" ");
    const command = args[0].toLowerCase();

    // ===== BAN =====
    if (command === "!ban") {
        const member = message.mentions.members.first();
        if (!member) return message.reply("حدد الشخص");

        await member.ban();

        message.channel.send(`🔨 بندتو${member}`);

        const modLog = message.guild.channels.cache.get(MOD_LOG_CHANNEL);
        if (modLog) {
            modLog.send({
                content: `🔨 باند
👤 العضو: ${member}
🛠 بواسطة: ${message.author}`,
                flags: MessageFlags.SuppressNotifications
            });
        }
    }

    // ===== UNBAN =====
    if (command === "!unban") {
        const id = args[1];
        if (!id) return message.reply("حط ID الشخص");

        await message.guild.members.unban(id);
        message.channel.send(`فكيتو <@${id}>`);
    }

    // ===== KICK =====
    if (command === "!kick") {
        const member = message.mentions.members.first();
        if (!member) return message.reply("حدد الشخص");

        await member.kick();

        message.channel.send(`👢 ككيتو  ${member}`);
    }

    // ===== GIVE ROLE =====
    if (command === "!giverole") {
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return message.reply("حدد عضو ورتبة");

        await member.roles.add(role);
        message.channel.send(`➕ تم إعطاء ${role} لـ ${member}`);
    }

    // ===== REMOVE ROLE =====
    if (command === "!removerole") {
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return message.reply("حدد عضو ورتبة");

        await member.roles.remove(role);
        message.channel.send(`➖ تم سحب ${role} من ${member}`);
    }

    // ===== LOCK =====
    if (command === "!lock") {
        await message.channel.permissionOverwrites.edit(
            message.guild.roles.everyone,
            { SendMessages: false }
        );
        message.channel.send(`🔒 تم قفل ${message.channel}`);
    }

    // ===== UNLOCK =====
    if (command === "!unlock") {
        await message.channel.permissionOverwrites.edit(
            message.guild.roles.everyone,
            { SendMessages: true }
        );
        message.channel.send(`🔓 تم فتح ${message.channel}`);
    }

});

// ================= تسجيل إعطاء وسحب رتب =================
client.on("guildMemberUpdate", async (oldMember, newMember) => {

    const log = newMember.guild.channels.cache.get(ROLE_LOG_CHANNEL);
    if (!log) return;

    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    const fetchedLogs = await newMember.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberRoleUpdate
    });

    const auditEntry = fetchedLogs.entries.first();
    const executor = auditEntry ? auditEntry.executor : "غير معروف";

    addedRoles.forEach(role => {
        log.send({
            content: `➕ إعطاء رتبة
👤 العضو: ${newMember}
🏷 الرتبة: ${role}
🛠 بواسطة: ${executor}`,
            flags: MessageFlags.SuppressNotifications
        });
    });

    removedRoles.forEach(role => {
        log.send({
            content: `➖ سحب رتبة
👤 العضو: ${newMember}
🏷 الرتبة: ${role}
🛠 بواسطة: ${executor}`,
            flags: MessageFlags.SuppressNotifications
        });
    });
});

