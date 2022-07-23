import * as discord from 'discord.js'
import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import * as bot from '../bot-client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listbridges')
        .setDescription('Lists all active bridges.'),
    async execute(interaction: discord.ChatInputCommandInteraction) {
        const client = (interaction.client as bot.BotClient)
        await interaction.deferReply();

        const bridges = await Promise.all(
            client.db.getBridges().map(async b => bot.Util.formatBridge(b.bridge_id, await client.resolveBridge(b)))
        )
        
        const messageEmbed = new EmbedBuilder().setTitle('Active Bridges')
        if (bridges.length > 0) {
            messageEmbed.addFields(bridges.map(b => ({ name: b.title, value: b.content, inline: false })))
        } else {
            messageEmbed.addFields([{ name: '_ _', value: '_ _' }])
        }
        await interaction.editReply({ content: '_ _', embeds: [messageEmbed] });
    },
}