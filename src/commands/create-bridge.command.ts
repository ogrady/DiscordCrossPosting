import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import * as discord from 'discord.js'
import * as bot from '../bot-client'


const resolveArgs = async (client, args) => {
    console.log(args)
    const sourceGuild: discord.Guild | null = await bot.Util.findGuild(client, args.getString('source-server'))
    const sourceChannel: discord.TextChannel | discord.NewsChannel | null = sourceGuild 
        ? await bot.Util.findTextChannel(sourceGuild, args.getString('source-channel')) 
        : null
    const destinationGuild: discord.Guild | null = await bot.Util.findGuild(client, args.getString('destination-server'))
    const destinationChannel: discord.TextChannel | discord.NewsChannel | null = destinationGuild 
        ? await bot.Util.findTextChannel(destinationGuild, args.getString('destination-channel'))
        : null
    
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const [_, attr, regex, __] = args.getString('condition').trim().split(/^(.+):(.+)$/) // x:y produces ['','x','y',''], so drop first and last value
    const condition = attr && Object.keys(bot.Attribute).map(s => s.toLowerCase()).includes(attr.toLowerCase())
        ? { attribute: attr as bot.Attribute, regex: regex }
        : undefined
    
    return { sourceGuild, sourceChannel, destinationGuild, destinationChannel, condition }
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('createbridge')
        .setDescription('Creates a new bridge.')
        .addStringOption(option => option
            .setName('source-server')
            .setDescription('server name to funnel messages from')
            .setRequired(true))
        .addStringOption(option => option
            .setName('source-channel')
            .setDescription('channel name on the source server to funnel messages from')
            .setRequired(true))
        .addStringOption(option => option
            .setName('destination-server')
            .setDescription('server name to funnel messages to')
            .setRequired(true))
        .addStringOption(option => option
            .setName('destination-channel')
            .setDescription('channel name on the destgination server to funnel messages to')
            .setRequired(true))
        .addStringOption(option => option
            .setName('condition')
            .setDescription('condition to match messages on')
            .setRequired(true))
    ,
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as bot.BotClient
        await interaction.deferReply()

        const args = await resolveArgs(client, interaction.options)

        const missing = bot.BotCommand.gatherMissingArguments(args, ['sourceGuild', 'sourceChannel', 'destinationGuild', 'destinationChannel', 'condition'])

        if (missing.length > 0) {
            await interaction.editReply(`The following arguments were not valid, i.e. could not be resolved to a proper server/ channel or were generally invalid: ${missing.join(', ')}. Make sure attribute is one of ${Object.keys(bot.Attribute).join(',')}, e.g. 'text:.* to match everything.'`)
        } else {
            const { sourceGuild, sourceChannel, destinationGuild, destinationChannel, condition } = args
            client.db.createBridge(sourceChannel!, destinationChannel!, [condition!])
            client.cache.add(sourceChannel!.id)
            await interaction.editReply(`Created bridge for \`${sourceGuild!.name}#${sourceChannel!.name}\` → \`${destinationGuild!.name}#${destinationChannel!.name}\` on condition \`${condition!.attribute}:${condition!.regex}\``)
        }        
    },
}