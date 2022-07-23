import config from '../config.json'
import { GatewayIntentBits } from 'discord.js'
import { BotClient } from './bot-client'

const client = new BotClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent], dbfile: './db/database.db' })

client.once('ready', () => {
    console.log('Starting up...')
    client.login(config.token)
    console.log('Bot started.')
})

const shutdown = () => {
    console.info('SIGTERM signal received.')
    console.log('Closing.')
    if (client) {
        client.destroy()
    }
    process.exit(0)
}

const main = async () => {
    //await client.reregisterCommands()
    client.login(config.token)
}


['SIGTERM', 'SIGINT'].forEach(value => process.on(value, shutdown))

main()


/*

    const client = new BotClient({
        ownerID: config.owner_ids,
        prefix: config.prefix,
        commandDirectory: './built/commands/',
        //inhibitorDirectory: "./built/inhibitors/",
        listenerDirectory: './built/listeners/',
        commandUtil: true,
        commandUtilLifetime: 600000
    }, './db/database.db')








*/