require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Error:', err.message));

const User = mongoose.model('User', new mongoose.Schema({ discordId: String, key: String, expiry: Date, hwid: String }));
const UsedTX = mongoose.model('UsedTX', new mongoose.Schema({ txid: String, date: Date }));

const WEBHOOK_URL = "https://discord.com/api/webhooks/1525785618842386603/YDbl5L502MZzul9IZv5FzuSdimQ_-TEFPUx6fOZ2R139jTzmImlBR3vceXXEckwPRehc";
const PAYMENTS_CHANNEL_ID = "1525785598487564288";
const OWNER_ID = "1489469164371312761";

client.on('ready', () => {
    console.log('✅ StrikeX Bot Running 24/7');
});

async function sendPaymentLog(user, product, txid, key, network) {
    const paymentsChannel = await client.channels.fetch(PAYMENTS_CHANNEL_ID).catch(() => null);
    if (paymentsChannel) {
        paymentsChannel.send({
            content: `<@${OWNER_ID}> New Payment!`,
            embeds: [new EmbedBuilder()
                .setTitle('💰 New Payment Received!')
                .setColor(0x00ff88)
                .addFields(
                    { name: 'User', value: `<@${user.id}>`, inline: true },
                    { name: 'Product', value: product, inline: true },
                    { name: 'Network', value: network, inline: true },
                    { name: 'TXID', value: `\`${txid}\``, inline: false },
                    { name: 'Key', value: `\`${key}\``, inline: false }
                )
                .setTimestamp()
            ]
        });
    }
}

client.on('messageCreate', async message => {
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
        );

        message.channel.send({ embeds: [embed], components: [button] });
    }

    if (message.content === '!close' && message.channel.name.startsWith('purchase-')) {
        message.reply('🔒 Closing ticket in 3 seconds...');
        setTimeout(() => message.channel.delete().catch(() => {}), 3000);
    }
});

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
            .setPlaceholder('Select your product...')
            .addOptions([
                { label: '24h Cheat', value: 'cheat_24h_5', emoji: '⚡' },
                { label: '7d Cheat', value: 'cheat_7d_20', emoji: '⚡' },
                { label: '30d Cheat', value: 'cheat_30d_45', emoji: '⚡' },
                { label: 'Lifetime Cheat', value: 'cheat_life_130', emoji: '⚡' },
                { label: 'Permanent Spoofer', value: 'spoof_perm_35', emoji: '🔒' },
                { label: 'Temporary Spoofer', value: 'spoof_temp_15', emoji: '🔄' }
            ]);

        ticket.send({ 
            embeds: [new EmbedBuilder().setTitle('🎯 Choose Product').setColor(0x00ff88)], 
            components: [new ActionRowBuilder().addComponents(menu)] 
        });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'product_select') {
        const [_, plan, price] = interaction.values[0].split('_');
        interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('💎 Payment Instructions')
                .setDescription(`**Product:** ${interaction.values[0].replace(/_/g, ' ')}\n**Price:** $${price}\n\nSend exact amount then paste **TXID** here.`)
                .setColor(0x00ff88)
                .addFields(
                    { name: 'Bitcoin', value: '`bc1qknrm6zgfwkxl3dp5rgze6ha335ml69tzed7ph4`', inline: false },
                    { name: 'Litecoin', value: '`LdX2Svxt2MdhfZNyjV1Tm4Pj41yuzmAFka`', inline: false },
                    { name: 'ETH / BNB', value: '`0x7382956c59E425df370Ca365286538236d06e3A0`', inline: false },
                    { name: 'Solana', value: '`DzxPUtXm9fwXDZ4T7r5e7HsRh34XsJoHVGuRexCE4f2Q`', inline: false }
                )
            ]
        });
    }
});

client.on('messageCreate', async message => {
    if (message.channel.name.startsWith('purchase-') && !message.author.bot) {
        const txid = message.content.trim();
        const success = await verifyPayment(txid, message);
        if (!success) {
            message.reply("❌ **Invalid or fake TXID!**\nHey did you try sending a fake TXID 😡");
        }
    }
});

async function verifyPayment(txid, message) {
    if (await UsedTX.findOne({ txid })) return false;

    let verified = false;
    let network = "Unknown";

    if (txid.length > 70) {
        try {
            const res = await axios.post('https://api.mainnet-beta.solana.com', { jsonrpc: "2.0", id: 1, method: "getTransaction", params: [txid, { commitment: "confirmed" }] });
            if (res.data.result) { verified = true; network = "Solana"; }
        } catch(e) {}
    } else if (txid.length >= 60 && txid.length <= 70) {
        try {
            const res = await axios.get(`https://blockchain.info/rawtx/${txid}`);
            if (res.data) { verified = true; network = "Bitcoin"; }
        } catch(e) {}
    } else if (txid.startsWith('L') || txid.length >= 60) {
        try {
            const res = await axios.get(`https://api.blockcypher.com/v1/ltc/main/txs/${txid}`);
            if (res.data) { verified = true; network = "Litecoin"; }
        } catch(e) {}
    } else if (txid.length === 66 && txid.startsWith('0x')) {
        try {
            const res = await axios.post('https://eth.llamarpc.com', { jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [txid] });
            if (res.data.result) { verified = true; network = "ETH/BNB"; }
        } catch(e) {}
    }

    if (verified) {
        const user = message.author;
        await new UsedTX({ txid }).save();

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (member) await member.roles.add('1525768447965790278');

        const key = crypto.randomBytes(8).toString('hex').toUpperCase();
        await new User({ discordId: user.id, key, expiry: new Date(Date.now() + 999 * 86400000) }).save();

        await sendPaymentLog(user, message.channel.name, txid, key, network);

        message.channel.send(`✅ **Payment Verified!**\n**Network:** ${network}\n**Key:** \`${key}\`\n\nTicket closing in 8 seconds...`);

        user.send(`✅ **Payment Successful!**\n**Key:** \`${key}\``).catch(() => {});

        setTimeout(() => message.channel.delete().catch(() => {}), 8000);
    }
    return verified;
}

client.login(process.env.BOT_TOKEN);
