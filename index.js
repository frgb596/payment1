require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

mongoose.connect(process.env.MONGO_URI);

const User = mongoose.model('User', new mongoose.Schema({ discordId: String, key: String, expiry: Date, hwid: String }));
const UsedTX = mongoose.model('UsedTX', new mongoose.Schema({ txid: String, date: Date }));

const WEBHOOK_URL = "https://discord.com/api/webhooks/1525785618842386603/YDbl5L502MZzul9IZv5FzuSdimQ_-TEFPUx6fOZ2R139jTzmImlBR3vceXXEckwPRehc";

client.on('clientReady', () => {
    console.log('StrikeX Bot Running 24/7');

    const messages = [
        { name: "⚡ StrikeX Fortnite Cheats", details: "Undetected Internal", state: "Aimbot • ESP • Spoofer" },
        { name: "🔥 Lifetime Cheat $130", details: "Daily Updates", state: "HWID Locked • Instant Delivery" },
        { name: "🛡️ Permanent Spoofer", details: "Reset Any HWID", state: "$35 • Works with any cheat" },
        { name: "💰 Auto Payments", details: "Crypto • Instant Keys", state: "24/7 • No Staff Needed" }
    ];

    let i = 0;
    setInterval(() => {
        const msg = messages[i++ % messages.length];
        client.user.setPresence({
            activities: [{
                name: msg.name,
                type: 0,
                details: msg.details,
                state: msg.state,
                largeImageKey: "strikex",
                largeImageText: "StrikeX | Premium Cheats",
                smallImageKey: "online",
                smallImageText: "Online • Undetected",
                buttons: [
                    { label: "🛒 Buy Now", url: "https://discord.gg/rDNWTMxTvG" },
                    { label: "📌 Join Server", url: "https://discord.gg/rDNWTMxTvG" }
                ]
            }],
            status: "dnd"
        });
    }, 12000);
});

// Payment Webhook Function
async function sendPaymentLog(user, product, txid, key) {
    const embed = new EmbedBuilder()
        .setTitle('💰 New Payment Received!')
        .setColor(0x00ff00)
        .addFields(
            { name: 'User', value: `<@${user.id}>`, inline: true },
            { name: 'Product', value: product, inline: true },
            { name: 'TXID', value: `\`${txid}\``, inline: false },
            { name: 'Key Generated', value: `\`${key}\``, inline: false }
        )
        .setTimestamp();

    await axios.post(WEBHOOK_URL, { embeds: [embed] }).catch(() => {});
}

// Create Store Panel
client.on('messageCreate', async message => {
    if (message.content === '!panel' && message.author.id === process.env.OWNER_ID) {
        const embed = new EmbedBuilder()
            .setTitle('**StrikeX Store**')
            .setDescription('**Premium Fortnite Cheats & Spoofers**')
            .setColor(0x00ff00)
            .addFields(
                { name: '🔥 Fortnite Cheat', value: '⚡ 24 Hours — $5\n⚡ 7 Days — $20\n⚡ 30 Days — $45\n⚡ Lifetime — $130' },
                { name: '🛡️ Spoofer', value: '🔒 Permanent — $35\n🔄 Temporary — $15' },
                { name: 'How It Works', value: '1. Click Purchase\n2. Pick product\n3. Pay crypto\n4. Paste TXID → Auto Verified' }
            );

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_ticket').setLabel('Purchase').setStyle(ButtonStyle.Success).setEmoji('🛒')
        );

        message.channel.send({ embeds: [embed], components: [button] });
    }
});

// Ticket + Auto System
client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        const ticket = await interaction.guild.channels.create({
            name: `purchase-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        interaction.reply({ content: `✅ Ticket created → ${ticket}`, ephemeral: true });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('product_select')
            .setPlaceholder('Choose product...')
            .addOptions([
                { label: '24h Cheat', value: 'cheat_24h_5', emoji: '⚡' },
                { label: '7d Cheat', value: 'cheat_7d_20', emoji: '⚡' },
                { label: '30d Cheat', value: 'cheat_30d_45', emoji: '⚡' },
                { label: 'Lifetime Cheat', value: 'cheat_life_130', emoji: '⚡' },
                { label: 'Perm Spoofer', value: 'spoof_perm_35', emoji: '🔒' },
                { label: 'Temp Spoofer', value: 'spoof_temp_15', emoji: '🔄' }
            ]);

        ticket.send({ 
            embeds: [new EmbedBuilder().setTitle('Select Product').setColor(0x00ff00)], 
            components: [new ActionRowBuilder().addComponents(menu)] 
        });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'product_select') {
        const [_, plan, price] = interaction.values[0].split('_');
        interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('💰 Payment')
                .setDescription(`**Product:** ${interaction.values[0]}\n**Amount:** $${price}\n\nSend exact amount then paste **TXID** here.`)
                .addFields(
                    { name: 'Bitcoin', value: '`bc1qknrm6zgfwkxl3dp5rgze6ha335ml69tzed7ph4`' },
                    { name: 'Litecoin', value: '`LdX2Svxt2MdhfZNyjV1Tm4Pj41yuzmAFka`' },
                    { name: 'ETH/BNB', value: '`0x7382956c59E425df370Ca365286538236d06e3A0`' },
                    { name: 'Solana', value: '`DzxPUtXm9fwXDZ4T7r5e7HsRh34XsJoHVGuRexCE4f2Q`' }
                )
            ]
        });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 86400000 });

        collector.on('collect', async m => {
            const success = await verifyPayment(m.content.trim(), parseInt(price), interaction.values[0], interaction.user, interaction.channel);
            if (!success) m.reply('❌ TXID invalid, wrong amount, or already used.');
        });
    }
});

async function verifyPayment(txid, expectedUSD, productName, user, channel) {
    if (await UsedTX.findOne({ txid })) return false;

    let verified = false;
    if (txid.length > 70) {
        try {
            const res = await axios.post('https://api.mainnet-beta.solana.com', {
                jsonrpc: "2.0", id: 1, method: "getTransaction",
                params: [txid, { commitment: "confirmed" }]
            });
            if (res.data.result) verified = true;
        } catch(e) {}
    }

    if (verified) {
        await new UsedTX({ txid }).save();
        const member = await channel.guild.members.fetch(user.id);
        await member.roles.add('1525768447965790278');

        const key = crypto.randomBytes(8).toString('hex').toUpperCase();
        await new User({ discordId: user.id, key, expiry: new Date(Date.now() + 999 * 86400000) }).save();

        await sendPaymentLog(user, productName, txid, key);

        channel.send(`✅ **Payment Verified!**\n**💵 | Buyer Role Given**\n**Key:** \`${key}\``);
    }
    return verified;
}

client.login(process.env.BOT_TOKEN);