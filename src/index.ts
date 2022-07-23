import config from '../config.json'
import { DiscordModule, InjectDiscordClient, Once } from '@discord-nestjs/core'
import { Module } from '@nestjs/common'
import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js'
import { Injectable, Logger } from '@nestjs/common';
import { BotClient } from './BotClient';

const client = new BotClient({ intents: [GatewayIntentBits.Guilds], dbfile: './db/database.db' });

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


['SIGTERM', 'SIGINT'].forEach(value => process.on(value, shutdown))

client.login(config.token)

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