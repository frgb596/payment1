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
});

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

client.login(process.env.BOT_TOKEN);
