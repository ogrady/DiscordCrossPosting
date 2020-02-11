import * as bot from "../BotClient"
import * as discord from "discord.js"

export class ListServers extends bot.BotCommand {
    public constructor() {
        super("listserver", 
            {
                aliases: ["listserver", "lsservers"],
                userPermissions: ['ADMINISTRATOR']
            }
        );
    }

    public exec(message: discord.Message, args: any): void {
        const c = bot.Util.counter();
        message.reply(this.client
                          .guilds
                          .map(g => `\`${c.next().value}\`: ${g.name} (${g.id})`)
                          .join("\n"));
    }
}

module.exports = ListServers;