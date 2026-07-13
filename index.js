require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Error:', err.message));

const User = mongoose.model('User', new mongoose.Schema({ discordId: String, key: String, expiry: Date, hwid: String }));
const UsedTX = mongoose.model('UsedTX', new mongoose.Schema({ txid: String, date: Date }));

const WEBHOOK_URL = "https://discord.com/api/webhooks/1525785618842386603/YDbl5L502MZzul9IZv5FzuSdimQ_-TEFPUx6fOZ2R139jTzmImlBR3vceXXEckwPRehc";
const PAYMENTS_CHANNEL_ID = "1525785598487564288";
const OWNER_ID = "1489469164371312761";

const UNVERIFIED_ROLE = "1526175241938796695";
const VERIFIED_ROLE = "1526175453956800642";

client.on('ready', () => {
    console.log('✅ StrikeX Bot Running 24/7');
});

// Give Unverified role on join
client.on('guildMemberAdd', async member => {
    const unverifiedRole = member.guild.roles.cache.get(UNVERIFIED_ROLE);
    if (unverifiedRole) {
        await member.roles.add(unverifiedRole).catch(() => {});
    }
});

// !rules Command
client.on('messageCreate', async message => {
    if (message.content === '!rules') {
        const embed = new EmbedBuilder()
            .setTitle('📜 Server Rules & Guidelines')
            .setDescription('**Welcome to StrikeX!** Please read the rules below.')
            .setColor(0x00ff88)
            .addFields(
                { name: 'General Rules', value: '• Be respectful to everyone\n• No spam, flooding, or excessive caps\n• No toxicity, drama, or harassment\n• No advertising without permission\n• No sharing cracks or free cheats' },
                { name: 'Payment Rules', value: '• All purchases must go through the store panel\n• No chargebacks or scams\n• No refunds after payment\n• Do not ask for free keys' },
                { name: 'Support Rules', value: '• Use tickets for support only\n• Do not ping staff unnecessarily\n• Be patient' },
                { name: 'Prohibited', value: '• Sharing keys\n• Reselling keys\n• Promoting other cheats\n• Asking for HWID resets without purchase' }
            )
            .setFooter({ text: 'By clicking I Agree, you accept the rules.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('accept_rules')
                .setLabel('I Agree')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );

        message.channel.send({ embeds: [embed], components: [row] });
    }

    if (message.content === '!panel' && message.author.id === OWNER_ID) {
        const embed = new EmbedBuilder()
            .setTitle('⚡ **StrikeX Store** ⚡')
            .setDescription('**Premium Fortnite Cheats & HWID Spoofers**\nUndetected • Daily Updates • Instant Delivery')
            .setColor(0x00ff88)
            .addFields(
                { name: '🔥 Fortnite Cheat', value: '```24 Hours — $5\n7 Days — $20\n30 Days — $45\nLifetime — $130```', inline: false },
                { name: '🛡️ HWID Spoofer', value: '```Permanent — $35\nTemporary — $15```', inline: false },
                { name: '✅ How It Works', value: '1. Click Purchase\n2. Select Product\n3. Pay Crypto\n4. Paste TXID → Auto Verified' }
            )
            .setFooter({ text: 'StrikeX' });

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('🛒 Purchase Now')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🛒')
        );

        message.channel.send({ embeds: [embed], components: [button] });
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'accept_rules') {
        const member = interaction.member;
        const unverifiedRole = member.guild.roles.cache.get(UNVERIFIED_ROLE);
        const verifiedRole = member.guild.roles.cache.get(VERIFIED_ROLE);

        if (unverifiedRole) await member.roles.remove(unverifiedRole);
        if (verifiedRole) await member.roles.add(verifiedRole);

        await interaction.reply({ content: '✅ You are now **Verified**! Welcome to StrikeX.', ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        // Your ticket creation code (keep it)
        const ticket = await interaction.guild.channels.create({
            name: `purchase-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        interaction.reply({ content: `✅ Ticket created → ${ticket}`, ephemeral: true });

        // Product menu code...
    }
});

client.login(process.env.BOT_TOKEN);
