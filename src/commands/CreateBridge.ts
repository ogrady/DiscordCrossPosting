import { Command, CommandExecutionContext, Param, ParamType } from '@discord-nestjs/core'
import { Injectable } from '@nestjs/common'
import { OwnerCommand } from './AbstractOwnerCommand'
import { ChatInputCommandInteraction, CacheType, ContextMenuCommandInteraction, SelectMenuInteraction, ButtonInteraction, MessagePayload, InteractionReplyOptions, Client, Message } from 'discord.js'

@Command({
    name: 'createbridge',
    description: 'Create a new bridge',
})
@Injectable()
export class CreateBridge extends OwnerCommand {
    @Param({description: 'source guild', required: true})
        sourceGuildName: string

    @Param({description: 'source channel', required: true})
        sourceChannelName: string

    @Param({description: 'destination guild', required: true})
        destinationGuildName: string

    @Param({description: 'destination channel', required: true})
        destinationChannelName: string

    @Param({description: 'condition', required: true})
        condition: string

    // alias: ["bridge", "mkbridge"]
    handler(interaction: ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction<CacheType>, executionContext: CommandExecutionContext<SelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>>): string | void | MessagePayload | InteractionReplyOptions | Promise<string | void | MessagePayload | InteractionReplyOptions> {
        console.log(this.sourceGuildName)
    }

    /*
    private* args(message) {
        const sourceGuild: discord.Guild | null = yield {
            type: async (m: discord.Message, phrase: string): Promise<discord.Guild | null> =>
                await bot.Util.findGuild(this.getClient(), phrase)
        };

        const sourceChannel: TextChannel | NewsChannel | null = yield {
            type: async (m: discord.Message, phrase: string): Promise<TextChannel | NewsChannel | null> =>
                await bot.Util.findTextChannel(sourceGuild, phrase)
        };

        const destinationGuild: discord.Guild | null = yield {
            type: async (m: discord.Message, phrase: string): Promise<discord.Guild | null> =>
                await bot.Util.findGuild(this.getClient(), phrase)
        };

        const destinationChannel: TextChannel | NewsChannel | null = yield {
            type: async (m: discord.Message, phrase: string): Promise<TextChannel | NewsChannel | null> =>
                await bot.Util.findTextChannel(destinationGuild, phrase)
        };

        const condition = yield {
            type: (m: discord.Message, phrase: string): bot.Condition | undefined => {
                const [_, attr, regex, __] = phrase.trim().split(/^(.+):(.+)$/); // x:y produces ['','x','y',''], so drop first and last value
                return attr && Object.keys(bot.Attribute).map(s => s.toLowerCase()).includes(attr.toLowerCase())
                    ? { attribute: attr as bot.Attribute, regex: regex }
                    : undefined;
            }
        };
        return { sourceGuild, sourceChannel, destinationGuild, destinationChannel, condition };
    }
    

    public exec(message: discord.Message, args: any): void {
        const missingArgs = CreateBridge.gatherMissingArguments(args, ['sourceGuild', 'sourceChannel', 'destinationGuild', 'destinationChannel', 'condition']);
        if (missingArgs.length > 0) {
            message.reply(`Missing arguments. Use like this:\n\`<name of source guild>\` \`<name of source channel>\` \`<name of destination guild>\` \`<name of destination channel>\` \`<attribute:regex>\`, where attribute is one of ${Object.keys(bot.Attribute).join(",")}\nThe following arguments could not be found: ${missingArgs.join(",")}`);
        } else {
            this.getClient().db.createBridge(args.sourceChannel, args.destinationChannel, [args.condition]);
            this.getClient().cache.add(args.sourceChannel.id);
            message.reply(`Created bridge for \`${args.sourceGuild.name}#${args.sourceChannel.name}\` → \`${args.destinationGuild.name}#${args.destinationChannel.name}\` on condition \`${args.condition.attribute}:${args.condition.regex}\``);
        }
    }
    */
}

module.exports = CreateBridge
