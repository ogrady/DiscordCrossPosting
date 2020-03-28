import * as bot from "../BotClient"
import * as discord from "discord.js"

export class CreateBridge extends bot.BotCommand {
    public constructor() {
        super("createbridge", 
            {
                aliases: ["bridge", "mkbridge"],
                userPermissions: ["ADMINISTRATOR"],
                split: "quoted",
                args: [
                    {
                        id: "sourceGuild",
                        type: (word: string, m: discord.Message, prevArgs: any[]): discord.Guild | undefined => 
                            this.getClient().guilds.find(g => g.name === word)
                    },
                    {
                        id: "sourceChannel",
                        type: (word: string, m: discord.Message, prevArgs: { sourceGuild: discord.Guild }): discord.TextChannel | undefined => 
                            bot.Util.findTextChannel(prevArgs.sourceGuild, c => c.name === word)                            
                    },
                    {
                        id: "destinationGuild",
                        type: (word: string, m: discord.Message, prevArgs: { sourceGuild: discord.Guild, sourceChannel: discord.TextChannel }): discord.Guild | undefined => 
                            this.getClient().guilds.find(g => g.name === word)
                    },
                    {
                        id: "destinationChannel",
                        type: (word: string, m: discord.Message, prevArgs: { sourceGuild: discord.Guild, sourceChannel: discord.TextChannel, destinationGuild: discord.Guild }): discord.TextChannel | undefined => 
                            bot.Util.findTextChannel(prevArgs.destinationGuild, c => c.name === word)
                    },
                    {
                        id: "condition",
                        type: (word: string, m: discord.Message, prevArgs: any): bot.Condition | undefined => {
                            const [_,attr,regex,__] = word.trim().split(/^(.+):(.+)$/); // x:y produces ['','x','y',''], so drop first and last value
                            return attr && Object.keys(bot.Attribute).map(s => s.toUpperCase()).includes(attr.toUpperCase()) 
                                     ? { attribute: attr as bot.Attribute, regex: regex } 
                                     : undefined;
                        }
                    }
                ]
                }
        );
    }

    public exec(message: discord.Message, args: any): void {
        if(args.sourceGuild && args.sourceChannel && args.destinationGuild && args.destinationChannel && args.condition) {
            this.getClient().db.createBridge(args.sourceChannel, args.destinationChannel, [args.condition]);
            this.getClient().cache.add(args.sourceChannel.id);
            message.reply(`Created bridge for \`${args.sourceGuild.name}#${args.sourceChannel.name}\` → \`${args.destinationGuild.name}#${args.destinationChannel.name}\` on condition \`${args.condition.attribute}:${args.condition.regex}\``);
        } else {
            message.reply(`Missing arguments. Use like this:\n\`<name of source guild>\` \`<name of source channel>\` \`<name of destination guild>\` \`<name of destination channel>\` \`<attribute:regex>\`, where attribute is one of ${Object.keys(bot.Attribute).join(",")}`);
        }        
    }
}

module.exports = CreateBridge;