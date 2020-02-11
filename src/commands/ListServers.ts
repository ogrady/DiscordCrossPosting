import * as bot from "../BotClient"
import * as discord from "discord.js"

export class ListServers extends bot.BotCommand {
    constructor() {
        super("listserver", 
            {
                aliases: ["listserver", "lsservers"],
                userPermissions: ['ADMINISTRATOR']
            }
        );
    }

    command(message: discord.Message, responsible: discord.User, guild: discord.Guild, args: any): void {
        const c = bot.Util.counter();
        message.reply(this.client
                          .guilds
                          .map(g => `${c.next().value}: ${g.name} (${g.id})`)
                          .join("\n"));
    }
}

module.exports = ListServers;