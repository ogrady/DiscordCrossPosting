import config from '../config.json'
import * as CommandLineArgs from 'command-line-args'
import { GatewayIntentBits } from 'discord.js'
import { BotClient } from './bot-client'

const args = CommandLineArgs.default([
    { name: 'register', alias: 'r', type: Boolean, default: false }
])

const client = new BotClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent], dbfile: './db/database.db' })

const shutdown = () => {
    console.info('SIGTERM signal received.')
    console.log('Closing.')
    if (client) {
        client.destroy()
        console.log('Client destroyed.')
    }
    process.exit(0)
}

const main = async (args) => {
    if (args.register) {
        await client.reregisterCommands()
    }
    console.log('Starting up...')
    client.login(config.token)
    console.log('Bot started.')
}


['SIGTERM', 'SIGINT'].forEach(value => process.on(value, shutdown))

main(args)
