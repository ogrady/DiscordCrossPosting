import * as bot from "../BotClient"
import * as discord from "discord.js"

export class Bridge extends bot.BotCommand {
    public constructor() {
        super("bridge", 
            {
                aliases: ["bridge"],
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
                            bot.Util.findTextChannel(prevArgs.sourceGuild, word)                            
                    },
                    {
                        id: "destinationGuild",
                        type: (word: string, m: discord.Message, prevArgs: { sourceGuild: discord.Guild, sourceChannel: discord.TextChannel }): discord.Guild | undefined => 
                            this.getClient().guilds.find(g => g.name === word)
                    },
                    {
                        id: "destinationChannel",
                        type: (word: string, m: discord.Message, prevArgs: { sourceGuild: discord.Guild, sourceChannel: discord.TextChannel, destinationGuild: discord.Guild }): discord.TextChannel | undefined => 
                            bot.Util.findTextChannel(prevArgs.destinationGuild, word)
                    },
                    {
                        id: "condition",
                        type: (word: string, m: discord.Message, prevArgs: any): bot.Condition | undefined => {
                            const [attr,regex] = word.split(/^(.+):(.+)$/);
                            return (attr as bot.Attribute) ? {attribute: attr as bot.Attribute, regex: regex} : undefined;
                        }
                    }
                ]
                }
        );
    }

    public exec(message: discord.Message, args: any): void {
        if(args.sourceGuild && args.sourceChannel && args.destinationGuild && args.destinationChannel) {
            this.getClient().db.createBridge(args.sourceChannel, args.destinationChannel, [args.condition]);
            //this.getClient().updateCache();
        } else {
            // fixme: error
        }        
    }
}

module.exports = Bridge;