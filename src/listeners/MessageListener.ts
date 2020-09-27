import { Listener } from "discord-akairo"
import * as discord from "discord.js"
import * as bot from "../BotClient"
import * as db from "../DB"

export class MessageListener extends Listener {
    private getters: {[key: string]: ((m: discord.Message) => string)};

    public constructor() {
        super("message", {
            emitter: "client",
            event: "message"
        });

        this.getters = {
            "cid": m => m.channel.id,
            "cname": m => (<discord.TextChannel>m.channel).name,
            "uid": m => m.author.id,
            "uname": m => m === null || m.member === null ? "" : m.member.displayName,
            "text": m => m.content
        }
    }

    public async exec(message: discord.Message): Promise<void> {
        if(message.author.id === this.client.user!.id) return; // early bail on own messages to avoid endless loops
        
        const cl: bot.BotClient = (<bot.BotClient>this.client);

        if(message.channel instanceof discord.TextChannel && cl.cache.has(message.channel.id)) {
            // to avoid posting one message to the same channel multiple times, 
            // all channels to which the message has been posted already are remembered
            // to serve as a filter.
            // This effectively creates a short-circuit OR-logic for when multiple 
            // Bridges target the same input-output channels.
            const postedChannels: Set<string> = new Set<string>();
            for(const b of cl.db.getBridges(message.channel)) {

                if(!postedChannels.has(b.destination_channel) && this.evaluateCondition(message, b)) {
                    const g: discord.Guild | undefined = cl.guilds.cache.get(b.destination_guild);

                    if(g !== undefined) {
                        const c: discord.Channel | undefined = g.channels.cache.get(b.destination_channel);

                        if(c !== undefined && c instanceof discord.TextChannel) {
                            for(const chunk of bot.Util.chunk(this.format(message), bot.Util.MAX_MESSAGE_LENGTH)) {
                                 await c.send(chunk, {disableMentions: 'everyone'});
                            }
                            postedChannels.add(b.destination_channel);
                            
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
        return `**${message.member === null ? "" : message.member!.displayName}** (\`${message.guild!.name}#${(<discord.TextChannel>message.channel).name}\`):\n${message.content}`;
    }
}

module.exports = MessageListener;