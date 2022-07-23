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
        this.getClient().db.removeBridge(bid)
        await interaction.editReply(`Removed bridge with id = \`${bid}\``)
    },
}