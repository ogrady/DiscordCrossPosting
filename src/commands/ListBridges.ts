import * as discord from "discord.js";
import { MessageEmbed } from "discord.js";
import * as bot from "../BotClient";
import { OwnerCommand } from "./AbstractOwnerCommand";

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
        let map = await Promise.all(
            this.getClient().db.getBridges()
                .map(async b => bot.Util.formatBridge(b.bridge_id, await this.getClient().resolveBridge(b)))
        );
        let messageEmbed = new MessageEmbed();
        for (let mapElement of map) {
            messageEmbed.addField(mapElement.title, mapElement.content, false);
        }
        await message.reply({ content: "_ _", embeds: [messageEmbed] });
    }
}

module.exports = ListBridges;