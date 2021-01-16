require('dotenv').config();
const mongoose = require('mongoose');
const Eris = require("eris-additions")(require("eris"))
const bot = new Eris(process.env.DISCORD_TOKEN);

const fetch = require('node-fetch');
const Guild = require('./database/schemas/guild');

bot.on('ready', () => {
  console.info('Ready');

  mongoose.connect(process.env.MONGODB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true
  })
});

bot.on('messageCreate', async (message) => {
  const mentionRegexPrefix = RegExp(`^<@!?${bot.user.id}>`);

  if (!message || !message.member || message.member.bot) return; 

  const guildSettings = await Guild.findOne({ guildId: message.channel.guild.id })
  if (!guildSettings) await Guild.create({ guildId: message.channel.guild.id })

  let mainPrefix = guildSettings ? guildSettings.prefix : '!';
  const prefix = message.content.match(mentionRegexPrefix) ? 
    message.content.match(mentionRegexPrefix)[0] : mainPrefix;

  if (!message.content.startsWith(prefix)) return;
  
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toString();

  if (command) console.info(`"${message.content}" (${command}) ran by ${message.author.tag} (${message.author.id}) in ${message.channel.guild.name} (${message.channel.guild.id})`)

  if (command === 'help') {
    message.channel.createMessage({
      embed: {
        color: 0x7289DA,
        title: 'DangerousDB Help',
        fields: [
          {
            name: 'Config',
            value: '`prefix`'
          },
          {
            name: 'Core',
            value: '`help`, `ping`'
          },
          {
            name: 'API',
            value: '`report`, `check`'
          }
        ],
        footer: {
          text: 'Made by the developers of slaybot.xyz'
        }
      }
    })
  }

  if (command === 'ping') {
    const msg = await message.channel.createMessage('Pinging...');

    const latency = msg.timestamp - message.timestamp;

    msg.edit(` \`\`\`js
Time taken: ${latency}ms
Discord API: ${message.channel.guild.shard.latency}ms\`\`\``);
  }

  if (command === 'prefix') {
    if (!message.member.hasPermission('manageMessages')) return message.channel.createMessage(`<:sbdeny:736927045522817106> You need the \`MANAGE MESSAGES\` permission to change the prefix! This server's prefix is \`${guildSettings.prefix || '!'}\``)
    const prefix = args[0];
    if (!prefix) return message.channel.createMessage(`<:sbdeny:736927045522817106> Please provide a prefix you want to change to! This server's prefix is \`${guildSettings.prefix || '!'}\``)
    if (prefix.length > 10) return message.channel.createMessage('<:sbdeny:736927045522817106> Please provide a prefix that is under 10 characters!')

    await guildSettings.updateOne({ prefix: args[0] })
    message.channel.createMessage(`<:sbaccept:736927045661098034> Prefix changed successfully to \`${args[0]}\``)
  }

  if (command === 'check') {
    const id = args[0] || message.author.id;
    const user = await fetch(`https://discord.riverside.rocks/check.json.php?id=${id}`).then(res => res.json())

    if (!user) return message.channel.createMessage('<:sbdeny:736927045522817106> We didn\'t get any response from the API. Please try again later!')
    if (user.Code === '400') return message.channel.createMessage('<:sbdeny:736927045522817106> Please enter a valid user id')

    message.channel.createMessage({
      embed: {
        color: 0x7289DA,
        title: user.username,
        url: `https://discord.riverside.rocks/check?id=${id}`,
        fields: [
          {
            name: 'Reports',
            value: user.reports || user.total_reports
          },
          {
            name: 'How dangerous this account is?',
            value: user.score
          }
        ],
        footer: {
          text: 'Checked from Dangerous Database'
        }
      }
    })
  }

  if (command === 'report') {
    try {
      const id = args[0];
      const reason = args.slice(1).join(' ');

      /* Check if the user exists on Discord API or Dangerous Database (https://discord.riverside.rocks) */
      const user = await fetch(`https://discord.riverside.rocks/check.json.php?id=${id}`).then(res => res.json())
      if (!user) return message.channel.createMessage('<:sbdeny:736927045522817106> We didn\'t get any response from the API. Please try again later!')
      if (user.Code === '400') return message.channel.createMessage('<:sbdeny:736927045522817106> Please enter a valid user id')
  
      if (!id) return message.channel.createMessage('<:sbdeny:736927045522817106> You need to the user id you want to report!');
      if (!reason) return message.channel.createMessage('<:sbdeny:736927045522817106> Please provide a reason for this report! For example, what the user did?');
  
      await fetch(`https://discord.riverside.rocks/report.json.php?id=${id}&key=${process.env.DANGEROUSDB_KEY}&details=${reason}`).then(res => res.json())
  
      return message.channel.createMessage(`<:sbaccept:736927045661098034> Reported \`${user.username}\` successfully for reason \`${reason}\``)
    } catch (err) {
      return message.channel.createMessage(`<:sbdeny:736927045522817106> A error occured while reporting the user: ${err}`)
    }
  }

});

bot.connect();