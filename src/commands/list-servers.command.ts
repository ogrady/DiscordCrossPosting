import { SlashCommandBuilder } from 'discord.js'
import * as bot from '../bot-client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listservers')
        .setDescription('List all servers the bot is present on.'),
    async execute(interaction) {
        await interaction.deferReply()
        const c = bot.Util.counter()
        await interaction.editReply(interaction.client.guilds.cache
            .map(g => `\`${c.next().value}\`: ${g.name} (${g.id})`)
            .join('\n'))
    },
}