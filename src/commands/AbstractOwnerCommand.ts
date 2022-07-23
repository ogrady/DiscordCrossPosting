import { CommandExecutionContext, DiscordCommand } from '@discord-nestjs/core'
import { ChatInputCommandInteraction, CacheType, ContextMenuCommandInteraction, SelectMenuInteraction, ButtonInteraction, MessagePayload, InteractionReplyOptions, Client, Message } from 'discord.js'
import * as bot from '../BotClient'

/**
 * https://github.com/discord-akairo/discord-akairo/blob/master/docs/commands/permissions.md#dynamic-permissions
 */
export abstract class OwnerCommand extends bot.BotCommand implements DiscordCommand {
    handler(interaction: ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction<CacheType>, executionContext: CommandExecutionContext<SelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>>): string | void | MessagePayload | InteractionReplyOptions | Promise<string | void | MessagePayload | InteractionReplyOptions> {
        throw new Error('Method not implemented.')
    }

    userPermissions = (client: Client, message: Message) => 
        client.application?.owner?.id !== message.member?.id 
            ? 'Owner' // return missing "permission"
            : null // all fine 
}
