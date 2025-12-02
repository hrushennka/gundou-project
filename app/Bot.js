const Discord = require('discord.js'),
config = require('./config.json')
config.cfg.intents = new Discord.Intents(config.cfg.intents)
var client = new Discord.Client(config.cfg)

const WebSocket = require('./web/web_socket')

const textCommands = require("./commands/TextCommands")

client.on('ready', () => {
    console.log('\nActivation is successful with mode: standart');
    var webSocket = new WebSocket('1234', 5665, client)
    client.user.setStatus(config.status);
    client.user.setActivity(config.activity.name, {type: config.activity.type})

    textCommands(client)
})

client.login(config.token);