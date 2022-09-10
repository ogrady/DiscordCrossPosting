import { BotClient } from '../bot-client'
import { SlashCommandBuilder } from 'discord.js'

module.exports = module.exports = {
    data: new SlashCommandBuilder()
        .setName('removebridge')
        .addIntegerOption(option => option.setName('bridge-id')
            .setDescription('Select a bridge ID')
            .setRequired(true)
        )
        .setDescription('Removes a bridge.'),
    async execute(interaction) {
        await interaction.deferReply()
        const bid = interaction.options.getInteger('bridge-id')
        const client = interaction.client as BotClient
        client.db.removeBridge(bid)
        await interaction.editReply(`Removed bridge with id = \`${bid}\``)
    },
}