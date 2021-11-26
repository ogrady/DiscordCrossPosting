import * as discord from "discord.js";
import { NewsChannel, TextChannel } from "discord.js";
import * as bot from "../BotClient";
import { OwnerCommand } from "./AbstractOwnerCommand";

export class CreateBridge extends OwnerCommand {
    public constructor() {
        super("createbridge",
            {
                aliases: ["bridge", "mkbridge"],
                quoted: true,
            }
        );
    }

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
        if (args.sourceGuild && args.sourceChannel && args.destinationGuild && args.destinationChannel && args.condition) {
            this.getClient().db.createBridge(args.sourceChannel, args.destinationChannel, [args.condition]);
            this.getClient().cache.add(args.sourceChannel.id);
            message.reply(`Created bridge for \`${args.sourceGuild.name}#${args.sourceChannel.name}\` → \`${args.destinationGuild.name}#${args.destinationChannel.name}\` on condition \`${args.condition.attribute}:${args.condition.regex}\``);
        } else {
            const notFound = CreateBridge.gatherMissingArguments(args);
            message.reply(`Missing arguments. Use like this:\n\`<name of source guild>\` \`<name of source channel>\` \`<name of destination guild>\` \`<name of destination channel>\` \`<attribute:regex>\`, where attribute is one of ${Object.keys(bot.Attribute).join(",")}\nThe following arguments could not be found: ${notFound.join(",")}`);
        }
    }

    private static gatherMissingArguments(args: any) {
        const notFound: string[] = [];
        if (!args.sourceGuild) {
            notFound.push("Source Guild");
        }
        if (!args.sourceChannel) {
            notFound.push("Source Channel");
        }
        if (!args.destinationGuild) {
            notFound.push("Destination Guild");
        }
        if (!args.destinationChannel) {
            notFound.push("Destination Channel");
        }
        if (!args.condition) {
            notFound.push("Condition");
        }
        return notFound;
    }
}

module.exports = CreateBridge;
