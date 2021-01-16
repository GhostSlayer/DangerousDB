require('dotenv').config();
const { resolveNaptr } = require('dns');
const Eris = require('eris');
const fetch = require('node-fetch');
var bot = new Eris(process.env.DISCORD_TOKEN);

bot.on('ready', () => {
  console.info('Ready')
});

bot.on('messageCreate', async (message) => {
  const mentionRegexPrefix = RegExp(`^<@!?${bot.user.id}>`);

  if (!message || !message.member || message.member.bot) return; 

  // settings ? settings.prefix
  let mainPrefix = '!';
  const prefix = message.content.match(mentionRegexPrefix) ? 
    message.content.match(mentionRegexPrefix)[0] : mainPrefix;

  if (!message.content.startsWith(prefix)) return;
  
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toString();

  if (command === 'check') {
    const id = args[0] || message.author.id;
    const user = await fetch(`https://discord.riverside.rocks/check.json.php?id=${id}`).then(res => res.json())

    if (!user) return message.channel.createMessage('We didn\'t get any response from the API. Please try again later!')
    if (user.Code === '400') return message.channel.createMessage('Please enter a valid user id')

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
    const id = args[0];
    const reason = args.slice(1).join(' ');

    if (!id) return message.channel.createMessage('You need to the user id you want to report!');
    if (!reason) return message.channel.createMessage('Please provide a reason for this report! For example, what the user did?');

    const user = await fetch(`https://discord.riverside.rocks/report.json.php?id=${id}&key=${process.env.DANGEROUSDB_KEY}&details=${reason}`).then(res => res.json())
    console.log(user)

    message.channel.createMessage(`Reported ${id} successfully for reason ${reason}`)
  }

});

bot.connect();