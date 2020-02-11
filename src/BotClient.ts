const config = require("../config.json")
import * as akairo from "discord-akairo"
import * as db from "./DB"
import * as discord from "discord.js"

export type Attribute = "uid" | "uname" | "text" | "cid" | "cname";

export interface Condition {
    readonly attribute: Attribute;
    readonly regex: string;
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
}

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

export class Util {
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

    private constructor() {}
}