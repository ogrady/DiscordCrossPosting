const config = require("../config.json")
import * as akairo from "discord-akairo"
import * as db from "./DB"
import * as discord from "discord.js"

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
    readonly source_channel: discord.TextChannel, 
    readonly destination_guild: discord.Guild,
    readonly destination_channel: discord.TextChannel,
    readonly condition_id: number,
    readonly attribute: Attribute, 
    readonly regex: string
}

export class BotClient extends akairo.AkairoClient {
    public readonly db: db.Database;
    public readonly cache: Set<string>; // caches input channels, which are unique Snowflakes, to speed up when messages should be discarded
    
    public constructor(options, dbfile) {
        super(options, {});
        this.db = new db.Database(dbfile);
        this.cache = new Set<string>();
        
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
        for(const b of this.db.getBridges(undefined)) {
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
        const srcGuild: discord.Guild = this.guilds.find(b => b.name === bridge.source_guild);
        const dstGuild: discord.Guild = this.guilds.find(b => b.name === bridge.destination_guild);
        const srcChannel: discord.TextChannel | undefined = Util.findTextChannel(srcGuild, bridge.source_channel);
        const dstChannel: discord.TextChannel | undefined = Util.findTextChannel(dstGuild, bridge.destination_channel);
        return srcChannel === undefined || dstChannel === undefined 
                            ? undefined
                            : {
                                bridge_id: bridge.bridge_id,
                                source_guild: srcGuild,
                                source_channel: srcChannel,
                                destination_guild: dstGuild,
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
    static * counter(): Generator {
        let i = 0;
        while(true) {
            yield i++;
        }
    }

    static formatBridge(bid: number, bridge?: ResolvedBridge): string {
        return bridge === undefined 
                        ? `\`${bid}\`: INVALID`
                        : `\`${bridge.bridge_id}\`: ${bridge.source_guild.name}#${bridge.source_channel.name} → ${bridge.destination_guild.name}#${bridge.destination_channel.name} on condition \`${bridge.attribute}:${bridge.regex}\``
    }


    /**
    * Tries to find a TextChannel with a given name. 
    * Discord -- for whatever reason -- puts all their Channels,
    * text, voice, or others, into one big collection.
    * @param g: the guild to look for the TextChannel in.
    *           Passing a falsey value for g results in undefined.
    * @param name: the name that TextChannel should have
    * @returns the TextChannel, if a channel of that name was found,
    *          or undefined if no such channel was found or g is falsey.
    */
    static findTextChannel(g: discord.Guild | undefined, name: string): discord.TextChannel | undefined {
        return g ? <discord.TextChannel>g.channels
                                         .filter(c => c instanceof discord.TextChannel)
                                         .find(c => c.name === name) 
                 : undefined
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
        size = Math.max(1,size);
        const chunks: string[] = [];
        let i: number = 0;
        while(i < s.length) {
            chunks.push(s.substring(i, i + size));
            i += size;
        }
        return chunks;
    }

    private constructor() {}
}