import { Listener } from "discord-akairo"
import * as discord from "discord.js"
import * as bot from "../BotClient"
import * as db from "../DB"

export class MessageListener extends Listener {
    private getters: {[key: string]: ((m: discord.Message) => string)};

    public constructor() {
        super("message", {
            emitter: "client",
            eventName: "message"
        });

        this.getters = {
            "cid": m => m.channel.id,
            "cname": m => (<discord.TextChannel>m.channel).name,
            "uid": m => m.author.id,
            "uname": m => m.member.displayName,
            "text": m => m.content
        }
    }

    public exec(message: discord.Message): void {
        if(message.author.id === this.client.user.id) return; // early bail on own messages to avoid endless loops
        
        const cl: bot.BotClient = (<bot.BotClient>this.client);
        if(message.channel instanceof discord.TextChannel && cl.cache.has(message.channel.id)) {
            for(const b of cl.db.getBridges(message.channel)) {
                if(this.evaluateCondition(message, b)) {
                    const g: discord.Guild | undefined = cl.guilds.get(b.destination_guild);
                    if(g !== undefined) {
                        const c: discord.Channel | undefined = g.channels.get(b.destination_channel);
                        if(c !== undefined && c instanceof discord.TextChannel) {
                            c.sendMessage(this.format(message))
                        } else {
                            console.error(`Condition ${b.condition_id} dictates to forward a message to channel ${b.destination_channel} in guild ${g.name}, but there is such (text)channel (anymore).`)
                        }
                    } else {
                        console.error(`Condition ${b.condition_id} dictates to forward a message to guild ${b.destination_guild}, but the bot is not a member of that guild (anymore).`)
                    }
                }
            }
        }
    }

    /**
    * Checks if the condition for a Bridge holds for the passed message.
    * @param message: the message to check.
    * @bridge bridge: the Bridge to check.
    * @returns true, if the message passes the condition of the Bridge.
    */
    private evaluateCondition(message: discord.Message, bridge: db.Bridge): boolean {
        let holds = false;
        if(bridge.attribute in this.getters) {
            const targetAttribute = this.getters[bridge.attribute](message);
            holds = new RegExp(bridge.regex).test(targetAttribute);
        } else {
            console.error(`Unknown attribute '${bridge.attribute}' in condition ${bridge.condition_id}`);
        }
        return holds;
    }

    private format(message: discord.Message): string {
        return `${message.member.displayName}: ${message.content}`;
    }
}

module.exports = MessageListener;