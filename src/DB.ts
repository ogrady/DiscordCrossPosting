import * as sqlite3 from "better-sqlite3"
import * as discord from "discord.js"
import * as bot from "BotClient"

export interface Bridge {
    readonly bridge_id: number;
    readonly source_guild: string;
    readonly source_channel: string, 
    readonly destination_guild: string,
    readonly destination_channel: string,
    readonly condition_id: number,
    readonly attribute: bot.Attribute, 
    readonly regex: string
}

export class Database {
    public readonly file: string;

    constructor(file: string) {
        this.file = file;
    }

    // NOTE: https://github.com/orlandov/node-sqlite/issues/17
    // sqlite3 and node don't work well together in terms of large integers.
    // Therefore, all big numbers are stored as strings.
    // As a consequence, === can't be used, when checking them.
    /**
    * Initial schema. All patches should be applied after
    * creating the init.
    */ 
    public initSchema(): void {
        let sqls = [
        `CREATE TABLE IF NOT EXISTS attributes(
            attribute_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )`,

        `CREATE TABLE IF NOT EXISTS bridges(
            bridge_id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_guild TEXT,
            source_channel TEXT,
            destination_guild TEXT,
            destination_channel TEXT
        )`,

        `CREATE TABLE IF NOT EXISTS bridge_conditions(
            condition_id INTEGER PRIMARY KEY AUTOINCREMENT,
            bridge_id INTEGER,
            attribute TEXT,
            regex TEXT,
            FOREIGN KEY(bridge_id) REFERENCES bridges(bridge_id) ON DELETE CASCADE,
            FOREIGN KEY(attribute) REFERENCES attributes(name)
        )`,

        `INSERT OR IGNORE INTO attributes(name) 
         VALUES ('uid'), ('uname'), ('text'), ('cid'), ('cname')`
        ];
        for(const sql of sqls) {
            try {
                this.execute(db => db.prepare(sql).run());
            } catch(e) {
                console.error(`Error while trying to initialise the database schema: ${e.message}`);
            }
        }
    }

    /**
    * Gets all bridges from a given source channel. 
    * If no source channel is passed, all bridges are returned.
    * @param sourceChannel: the channel from which the bridges should start.
    * @returns list of qualifying bridges.
    */
    public getBridges(sourceChannel: discord.TextChannel | undefined = undefined): Bridge[] {
        let predicate: string = "";
        let params: string[] = [];

        if(sourceChannel !== undefined) {
            predicate = "WHERE b.source_channel = ?";
            params = [sourceChannel.id];
        }
        
        return this.execute(db => db.prepare(`
            SELECT 
                b.bridge_id,
                b.source_guild,
                b.source_channel,
                b.destination_guild,
                b.destination_channel,
                c.condition_id,
                c.attribute,
                c.regex
            FROM 
                bridges AS b 
                JOIN bridge_conditions AS c 
                  ON b.bridge_id = c.bridge_id
            ${predicate}
        `).all(params))
    }

    /**
    * Creates a new bridge.
    * @param sourceChannel: channel in a guild from which the messages should be bridged. 
    * @param destinationChannel: channel in a guild where the messages should be bridged to. 
    * @param conditions: a list of conditions for the bridge to trigger.
    */
    public createBridge(sourceChannel: discord.TextChannel, destinationChannel: discord.TextChannel, conditions: bot.Condition[]): void {
        return this.execute(db => db.transaction((_) => {
                db.prepare(`INSERT INTO bridges(source_guild, source_channel, destination_guild, destination_channel) VALUES (?,?,?,?)`)
                  .run(sourceChannel.guild.id, sourceChannel.id, destinationChannel.guild.id, destinationChannel.id);
                const bridgeId = db.prepare(`SELECT last_insert_rowid() AS id`).get().id;
                for(const c of conditions) {
                    db.prepare(`INSERT INTO bridge_conditions(bridge_id, attribute, regex) VALUES(?,?,?)`)
                      .run(bridgeId, c.attribute, c.regex);    
                }                
            })(null)
        );
    }

    /**
    * Destroys a bridge. 
    * @param bridgeId: Database id of the bridge to destroy.
    */
    public removeBridge(bridgeId: number): void {
        return this.execute(db => db.prepare(`DELETE FROM bridges WHERE bridge_id = ?`).run(bridgeId));
    }

    /**
    * Executes an SQL statement and handles errors, as well as closing the DB connection afterwards.
    * f: lambda expression taking the opened sqlite3 connection to run queries on.
    * returns: the result of the lambda.
    */
    public execute<T>(f: (sqlite3) => T): T | undefined  {
        let db: sqlite3.Database = sqlite3.default(this.file, undefined);
        db.pragma("foreign_keys = ON");

        let res: T|undefined;
        try {
            res = f(db);
        } catch(err) {
            res = undefined;
            console.error(`DB execute: ${err["message"]} (stack: ${new Error().stack})`);
        }

        db.close();
        return res;
    }
}