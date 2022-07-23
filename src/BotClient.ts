const config = require('../config.json')
import { DiscordCommand, DiscordModule } from '@discord-nestjs/core'
import * as akairo from 'discord-akairo'
import * as discord from 'discord.js'
import { ActivityType, NewsChannel, TextChannel } from 'discord.js'
import { Module } from '@nestjs/common'
import * as db from './DB'

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

export class BotClient extends discord.Client { //extends akairo.AkairoClient {
    public readonly db: db.Database
    public readonly cache: Set<string> // caches input channels, which are unique Snowflakes, to speed up when messages should be discarded

    /*
    public readonly commandHandler: akairo.CommandHandler
    public readonly listenerHandler: akairo.ListenerHandler
    public readonly inhibitorHandler: akairo.InhibitorHandler
    */

    public constructor(options: discord.ClientOptions & { dbfile: string }) {
        super(options)
        this.db = new db.Database(options.dbfile)
        this.cache = new Set<string>()

        /*
        this.commandHandler = new akairo.CommandHandler(this, {
            directory: './built/commands/',
            prefix: config.prefix,
            commandUtil: true,
            commandUtilLifetime: 600000
        })
        this.commandHandler.loadAll()

        this.listenerHandler = new akairo.ListenerHandler(this, {
            directory: './built/listeners/'
        })
        this.listenerHandler.loadAll()

        this.on('ready', () => {
            this.user?.setPresence({
                activities: [{
                    name: config.status,
                    type: ActivityType.Watching
                }]
            })
        })
    */
        this.db.initSchema()
        this.updateCache()
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
    protected static gatherMissingArguments(args: any, required: string[]) {
        return required
            .filter(r => !Object.keys(args).includes(r))  // find missing ones
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
    static chunk(s: string, size: number): string[] {
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