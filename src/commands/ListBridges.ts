import * as bot from "../BotClient";
import * as db from "../DB";
import * as discord from "discord.js";

export class ListBridges extends bot.BotCommand {
    public constructor() {
        super("listbridges", 
            {
                aliases: ["listbridges", "lsbridges"],
                userPermissions: ["ADMINISTRATOR"],
                quoted: true
            }
        );
    }

    public exec(message: discord.Message, args: any): void {
        message.reply(this.getClient().db.getBridges()
                          .map(b => bot.Util.formatBridge(b.bridge_id, this.getClient().resolveBridge(b)))
                          .join("\n")
                      , {split: true});

    }
}

module.exports = ListBridges;