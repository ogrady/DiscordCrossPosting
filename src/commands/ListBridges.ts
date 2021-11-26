import * as bot from "../BotClient";
import * as discord from "discord.js";
import {OwnerCommand} from "./AbstractOwnerCommand";

export class ListBridges extends OwnerCommand {
    public constructor() {
        super("listbridges",
            {
                aliases: ["listbridges", "lsbridges"],
                quoted: true
            }
        );
    }

    public async exec(message: discord.Message, args: any): Promise<void> {
        await message.reply(this.getClient().db.getBridges()
                .map(async b => bot.Util.formatBridge(b.bridge_id, await this.getClient().resolveBridge(b)))
                .join("\n")
            , { split: true });

    }
}

module.exports = ListBridges;