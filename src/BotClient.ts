const config = require("../config.json");
import * as akairo from "discord-akairo";
import { Guild, NewsChannel, TextChannel } from "discord.js";
import * as discord from "discord.js";
import * as db from "./DB";

// Valid attributesthat can be checked.
// This was an algebraic sum type once,
// but since types are erased at runtime
// due to the compilation to untyped JS,
// this is now an enum instead. Sigh.
export enum Attribute {
    UID = "uid",
    UNAME = "uname",
    TEXT = "text",
    CID = "cid",
    CNAME = "cname"
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

export class BotClient extends akairo.AkairoClient {
    public readonly db: db.Database;
    public readonly cache: Set<string>; // caches input channels, which are unique Snowflakes, to speed up when messages should be discarded
    public readonly commandHandler: akairo.CommandHandler;
    public readonly listenerHandler: akairo.ListenerHandler;
    public readonly inhibitorHandler: akairo.InhibitorHandler;

    public constructor(options, dbfile) {
        super(options, {});
        this.db = new db.Database(dbfile);
        this.cache = new Set<string>();

        this.commandHandler = new akairo.CommandHandler(this, {
            directory: './built/commands/',
            prefix: config.prefix,
            commandUtil: true,
            commandUtilLifetime: 600000
        });
        this.commandHandler.loadAll();

        this.listenerHandler = new akairo.ListenerHandler(this, {
            directory: './built/listeners/'
        });
        this.listenerHandler.loadAll();

        this.on("ready", () => {

        });

        this.db.initSchema();
        this.updateCache();
    }

    /**
     * Loads all unique source channels from the database.
     * The cache is used to speed up how messages are
     * dismissed for which no bridge exists.
     */
    public updateCache(): void {
        this.cache.clear();
        for (const b of this.db.getBridges(undefined)) {
            this.cache.add(b.source_channel);
        }
    }

    /**
     * Resolves a db.Bridge into a ResolvedBridge.
     * Returning undefined means that one of the guilds or channels is no
     * longer available to the bot.
     * @param bridge: the bridge to resolve.
     * @returns ResolvedBridge if possible, else undefined.
     */
    public resolveBridge(bridge: db.Bridge): ResolvedBridge | undefined {
        const srcGuild: discord.Guild | undefined = this.guilds.cache.find(b => b.id === bridge.source_guild);
        const dstGuild: discord.Guild | undefined = this.guilds.cache.find(b => b.id === bridge.destination_guild);
        const srcChannel: TextChannel | NewsChannel | undefined = Util.findTextChannel(srcGuild,bridge.source_channel);
        const dstChannel: TextChannel | NewsChannel | undefined = Util.findTextChannel(srcGuild,bridge.destination_channel);
        if (!srcGuild) {
            console.error(`Could not find a source guild with id = ${bridge.source_guild}.`);
        }
        if (!dstGuild) {
            console.error(`Could not find a destination guild with id = ${bridge.destination_guild}.`);
        }
        if (!srcChannel) {
            console.error(`Could not find a source channel with id = ${bridge.source_channel}.`);
        }
        if (!dstChannel) {
            console.error(`Could not find a destination channel with id = ${bridge.destination_channel}.`);
        }
        return srcChannel === undefined || dstChannel === undefined
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
            };
    }
}

/**
 * This is just a wrapper that offers a bit of convenience.
 * As it turns out, the client is referenced quite a bit
 * as it grants access to the DB and so on and casting
 * manually every time just clutters the code a lot.
 */
export class BotCommand extends akairo.Command {
    constructor(id: string, options: akairo.CommandOptions) {
        super(id, options);
    }

    /**
     * @returns the casted bot client.
     */
    public getClient(): BotClient {
        return <BotClient>this.client;
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
    static readonly MAX_MESSAGE_LENGTH: number = 2000;

    /**
     * Generator function that creates
     * an infinite list of numbers,
     * incremented by one.
     */
    static* counter(): Generator {
        let i = 0;
        while (true) {
            yield i++;
        }
    }

    static formatBridge(bid: number, bridge?: ResolvedBridge): string {
        return bridge === undefined
            ? `\`${bid}\`: INVALID`
            : `\`${bridge.bridge_id}\`: \`${bridge.source_guild.name}#${bridge.source_channel.name}\` → \`${bridge.destination_guild.name}#${bridge.destination_channel.name}\` on condition \`${bridge.attribute}:${bridge.regex}\``;
    }


    static findGuild( client:BotClient, term: string): discord.Guild | null {
        return client.guilds.resolve(term);
    }

    /**
     * Tries to find a TextChannel by a generic predicate.
     * Discord -- for whatever reason -- puts all their Channels,
     * text, voice, or others, into one big collection.
     * Note that internally Collection.find is used, returning
     * only the first matching channel.
     * @param g: the guild to look for the TextChannel in.
     *           Passing a falsey value for g results in undefined.
     * @param phrase: channel name or id to look for
     * @returns the TextChannel, if a channel passing the predicate was found,
     *          or undefined if no such channel was found or g is falsey.
     */
    static findTextChannel(g: discord.Guild | undefined, phrase: string): TextChannel | NewsChannel | undefined {
        if (g) {
            let resolve = g.channels.resolve(phrase);
            if (resolve?.isText()) {
                return resolve
            }
            return undefined;
        } else {
            return undefined;
        }
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
        size = Math.max(1, size);
        const chunks: string[] = [];
        let i: number = 0;
        while (i < s.length) {
            chunks.push(s.substring(i, i + size));
            i += size;
        }
        return chunks;
    }

    private constructor() {
    }
}