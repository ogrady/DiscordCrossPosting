import * as discord from 'discord.js'
import * as bot from '../BotClient'
import { OwnerCommand } from './AbstractOwnerCommand'

export class ListServers extends OwnerCommand {
    // alias: ['listserver', 'lsservers']
    /*

    public exec(message: discord.Message, args: any): void {
        const c = bot.Util.counter()
        message.reply(this.client.guilds.cache
            .map(g => `\`${c.next().value}\`: ${g.name} (${g.id})`)
            .join('\n'))
    }
    */
}

module.exports = ListServers