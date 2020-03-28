import * as bot from "../BotClient"
import * as discord from "discord.js"

export class RemoveBridge extends bot.BotCommand {
    public constructor() {
        super("removebridge", 
            {
                aliases: ["removebridge", "rmbridge"],
                userPermissions: ["ADMINISTRATOR"],
                split: "quoted",
                args: [
                    {
                        id: "bridgeId",
                        type: "integer"
                    }
                ]
                }
        );
    }

    public exec(message: discord.Message, args: any): void {
        if(args.bridgeId) {
            this.getClient().db.removeBridge(args.bridgeId);
            message.reply(`Removed bridge with it \`${args.bridgeId}`);
        } else {
            message.reply(`Missing arguments. Use like this:\n\`<name of source guild>\` \`<name of source channel>\` \`<name of destination guild>\` \`<name of destination channel>\` \`<attribute:regex>\`, where attribute is one of ${Object.keys(bot.Attribute).join(",")}`);
        }        
    }
}

module.exports = RemoveBridge;