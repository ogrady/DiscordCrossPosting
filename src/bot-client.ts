const config = require('../config.json')
import * as discord from 'discord.js'
import { ActivityType, NewsChannel, SlashCommandBuilder, TextChannel, Routes } from 'discord.js'
import * as db from './db'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { REST } from '@discordjs/rest'
//const { REST } = require('@discordjs/rest');
const { client_id, guildId, token } = require('../config.json')

// Valid attributesthat can be checked.
// This was an algebraic sum type once,
// but since types are erased at runtime
// due to the compilation to untyped JS,
// this is now an enum instead. Sigh.
export enum Attribute {
    UID = 'uid',
    UNAME = 'uname',
    TEXT = 'text',
    CID = 'cid',
    CNAME = 'cname'
}

export interface Condition {
    readonly attribute: Attribute;
    readonly regex: string;
}

export interface ResolvedBridge {
    readonly bridge_id: number;
    readonly source_guild: discord.Guild;
    readonly source_channel: TextChannel | NewsChannel;
    readonly destination_guild: discord.Guild;
    readonly destination_channel: TextChannel | NewsChannel;
    readonly condition_id: number;
    readonly attribute: Attribute;
    readonly regex: string;
}

export class BotClient extends discord.Client {
    public readonly db: db.Database
    public readonly cache: Set<string> // caches input channels, which are unique Snowflakes, to speed up when messages should be discarded
    public readonly commands: discord.Collection<string, { data: SlashCommandBuilder, execute: (interaction: discord.Interaction) => void }>
    private getters: { [key: string]: ((m: discord.Message) => string) }

    public constructor(options: discord.ClientOptions & { dbfile: string }) {
        super(options)
        this.db = new db.Database(options.dbfile)
        this.cache = new Set<string>()
        this.commands = new discord.Collection()
        this.rest = new REST({ version: '10' }).setToken(token)
        this.getters = {
            'cid': m => m.channel.id,
            'cname': m => (<discord.TextChannel>m.channel).name,
            'uid': m => m.author.id,
            'uname': m => m === null || m.member === null ? '' : m.member.displayName,
            'text': m => m.content
        }

        const commandsPath = path.join(__dirname, 'commands')
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.command.js'))

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file)
            const command = require(filePath)
            this.commands.set(command.data.name, command)
            console.log(`Loaded ${command.data.name} command.`)
        }

        this.on('ready', () => {
            this.user?.setPresence({
                activities: [{
                    name: config.status ?? 'your content',
                    type: ActivityType.Streaming
                }]
            })
        })

        this.on('interactionCreate', async interaction => {
            if (interaction.isChatInputCommand()) {
                const command = this.commands.get(interaction.commandName)
       
                if (command) {
                    try {
                        // as all commands of this bot are restricted to owners, we can do this check centralised.
                        // If we ever were to allow a more finely-grained permissions system, this had to be put
                        // into the each command.
                        if(Util.sourceIsOwner(interaction)) {
                            await command.execute(interaction)
                        } else {
                            await interaction.reply({ content: 'You are not allowed to use this command!', ephemeral: true })    
                        }
                        
                    } catch (error) {
                        console.error(error)
                        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
                    }
                }
            }       
        })

        this.on('messageCreate', async message => {
            if (message.author.id === this.user!.id) return // early bail on own messages to avoid endless loops
   
            if (message.channel instanceof discord.TextChannel && this.cache.has(message.channel.id)) {
                // to avoid posting one message to the same channel multiple times, 
                // all channels to which the message has been posted already are remembered
                // to serve as a filter.
                // This effectively creates a short-circuit OR-logic for when multiple 
                // Bridges target the same input-output channels.
                const postedChannels: Set<string> = new Set<string>()
                for (const b of this.db.getBridges(message.channel)) {
    
                    if (!postedChannels.has(b.destination_channel) && this.evaluateCondition(message, b)) {
                        const g: discord.Guild | null = this.guilds.resolve(b.destination_guild)
    
                        if (g !== null) {
                            const c: discord.Channel | null = g.channels.resolve(b.destination_channel)
    
                            if (c !== undefined && c instanceof discord.TextChannel) {
                                for (const chunk of Util.chunk(this.format(message))) {
                                    await c.send({ content: chunk, allowedMentions: { parse: ['roles', 'users'] } })
                                }
                                postedChannels.add(b.destination_channel)
    
                            } else {
                                console.error(`Condition ${b.condition_id} dictates to forward a message to channel ${b.destination_channel} in guild ${g.name}, but there is such (text)channel (anymore).`)
                            }
                        } else {
                            console.error(`Condition ${b.condition_id} dictates to forward a message to guild ${b.destination_guild}, but the bot is not a member of that guild (anymore).`)
                        }
                    }
                }
            }
        })
        
        this.db.initSchema()
        this.updateCache()
    }

       /**
     * Checks if the condition for a Bridge holds for the passed message.
     * @param message: the message to check.
     * @bridge bridge: the Bridge to check.
     * @returns true, if the message passes the condition of the Bridge.
     */
        private evaluateCondition(message: discord.Message, bridge: db.Bridge): boolean {
            let holds = false
            if (bridge.attribute in this.getters) {
                const targetAttribute = this.getters[bridge.attribute](message)
                holds = new RegExp(bridge.regex).test(targetAttribute)
            } else {
                console.error(`Unknown attribute '${bridge.attribute}' in condition ${bridge.condition_id}`)
            }
            return holds
        }
    
        private format(message: discord.Message): string {
            return `**${message.member === null ? 'WebHook' : message.member!.displayName}** (\`${message.guild!.name}#${(<discord.TextChannel>message.channel).name}\`):\n${message.content}`
        }

    /**
     * Loads all unique source channels from the database.
     * The cache is used to speed up how messages are
     * dismissed for which no bridge exists.
     */
    public updateCache(): void {
        this.cache.clear()
        for (const b of this.db.getBridges(undefined)) {
            this.cache.add(b.source_channel)
        }
    }

    private async registerCommands(): Promise<void> {
        try {
            const commands = this.commands.mapValues(c => c.data.toJSON())
            await this.rest.put(Routes.applicationCommands(client_id), { body: commands })
            console.log(`Successfully registered application commands: ${[...commands.keys()].join(', ')}`)
        } catch(e) {
            console.error(e)
        }
    }
    
    private async unregisterCommands(): Promise<void> {
        try {
            const commands = this.commands.mapValues(c => c.data.toJSON())
            await this.rest.put(Routes.applicationCommands(client_id), { body: [] })
            console.log('Successfully deleted all application commands.')
        } catch(e) {
            console.error(e)
        }
    }
    
    public async reregisterCommands(): Promise<void> {
        if(this.isReady()) {
            console.log('Bot was already logged in when attempting to re-register commands. You might have to restart the bot in order to use your commands.')
        }
        await this.unregisterCommands()
        await this.registerCommands()
    }

    /**
     * Resolves a db.Bridge into a ResolvedBridge.
     * Returning undefined means that one of the guilds or channels is no
     * longer available to the bot.
     * @param bridge: the bridge to resolve.
     * @returns ResolvedBridge if possible, else undefined.
     */
    public async resolveBridge(bridge: db.Bridge): Promise<ResolvedBridge | undefined> {
        const srcGuild: discord.Guild | null = await this.guilds.resolve(bridge.source_guild)
        const dstGuild: discord.Guild | null = await this.guilds.resolve(bridge.destination_guild)
        const srcChannel: TextChannel | NewsChannel | null = await Util.findTextChannel(srcGuild, bridge.source_channel)
        const dstChannel: TextChannel | NewsChannel | null = await Util.findTextChannel(dstGuild, bridge.destination_channel)
        if (!srcGuild) {
            console.error(`Could not find a source guild with id = ${bridge.source_guild}.`)
        }
        if (!dstGuild) {
            console.error(`Could not find a destination guild with id = ${bridge.destination_guild}.`)
        }
        if (!srcChannel) {
            console.error(`Could not find a source channel with id = ${bridge.source_channel}.`)
        }
        if (!dstChannel) {
            console.error(`Could not find a destination channel with id = ${bridge.destination_channel}.`)
        }
        return srcChannel === null || dstChannel === null
            ? undefined
            : {
                bridge_id: bridge.bridge_id,
                source_guild: <discord.Guild>srcGuild,
                source_channel: srcChannel,
                destination_guild: <discord.Guild>dstGuild,
                destination_channel: dstChannel,
                condition_id: bridge.condition_id,
                attribute: bridge.attribute,
                regex: bridge.regex
            }
    }
}

/**
 * This is just a wrapper that offers a bit of convenience.
 * As it turns out, the client is referenced quite a bit
 * as it grants access to the DB and so on and casting
 * manually every time just clutters the code a lot.
 */
export abstract class BotCommand {
    /**
     * Derives a list of attributes that are missing in an object.
     * Result is given in a more readable form:
     * sourceGuild => Source Guild
     * sourceguild => Sourceguild
     * sourceGuildWithIDAppended => Source Guild With ID Appended
     * @param args argument object.
     * @param required list of required attributes.
     * @returns list of missing attributes; each in a more readable form as described above.
     */
    public static gatherMissingArguments(args: any, required: string[]) {
        return required
            .filter(r => !Object.keys(args).includes(r) || args[r] === undefined || args[r] === null)  // find missing ones
            .map(a => a.split(/(?=[A-Z])/)  // split on capital letters
                .reduce((acc, e, i) => {  // handle all-caps parts, like "ID"
                    const last = acc[acc.length - 1] ?? ''
                    if (i > 0 && e.toUpperCase() === e && last.toUpperCase() === last) {
                        acc[acc.length - 1] += e
                    } else {
                        acc.push(e)
                    }
                    return acc
                }, [] as string[])
                .map(s => s.charAt(0).toUpperCase() + s.slice(1))  // capitalise
                .join(' ')
            )
    }
}

/**
 * Utility stuff.
 */
export class Util {
    /**
     * Maximum length a message in Discord may have.
     * Used to chunk messages before sending them when
     * prepending the "header".
     */
    static readonly MAX_MESSAGE_LENGTH: number = 2000

    /**
     * Generator function that creates
     * an infinite list of numbers,
     * incremented by one.
     */
    static* counter(): Generator {
        let i = 0
        while (true) {
            yield i++
        }
    }

    static formatBridge(bid: number, bridge?: ResolvedBridge): { title: string; content: string } {
        const result = {
            title: `Bridge \`${bid}\``,
            content: 'INVALID'
        }

        if (bridge !== undefined) {
            result.content = `Source: \`${bridge.source_guild.name}\` \`#${bridge.source_channel.name}\`\n` +
                `Target: \`${bridge.destination_guild.name}\` \`#${bridge.destination_channel.name}\`\n` +
                `Condition: \`${bridge.attribute}:${bridge.regex}\``
        }

        return result
    }


    static async findGuild(client: BotClient, term: string): Promise<discord.Guild | null> {
        return client.guilds.resolve(term) || client.guilds.cache.filter(value => value.name === term).first() || null
    }

    static sourceIsOwner(interaction: discord.ChatInputCommandInteraction): boolean {
        return config.owner_ids.includes(interaction.member?.user.id)
    }

    /**
     * Tries to find a TextChannel by a generic predicate.
     * Discord -- for whatever reason -- puts all their Channels,
     * text, voice, or others, into one big collection.
     * Note that internally Collection.find is used, returning
     * only the first matching channel.
     * @param g: the guild to look for the TextChannel in.
     *           Passing a falsey value for g results in null.
     * @param phrase: channel name or id to look for
     * @returns the TextChannel, if a channel passing the predicate was found,
     *          or null if no such channel was found or g is falsey.
     */
    static async findTextChannel(g: discord.Guild | null, phrase: string): Promise<TextChannel | NewsChannel | null> {
        const guild = await g?.fetch()
        if (guild) {
            const resolve = guild.channels.resolve(phrase) ?? guild.channels.cache.filter(c => c.name === phrase).first() ?? null
            if (resolve?.isTextBased() && !resolve.isThread() && !resolve.isVoiceBased()) {
                return resolve
            }
        }
        return null
    }

    /**
     * Cuts a string into chunks of at most SIZE characters.
     * chunk("123456789", 200) -> [ '123456789' ]
     * chunk("123456789", 2) -> [ '12', '34', '56', '78', '9' ]
     * @param s: the string to chop up.
     * @param size: the maximum length of each chunk.
     *              Final chunk may be smaller.
     *              Size will be normalised to be at least 1.
     */
    static chunk(s: string, size: number = Util.MAX_MESSAGE_LENGTH): string[] {
        size = Math.max(1, size)
        const chunks: string[] = []
        let i = 0
        while (i < s.length) {
            chunks.push(s.substring(i, i + size))
            i += size
        }
        return chunks
    }



    private constructor() {
        // static class
    }
}