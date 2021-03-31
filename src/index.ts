const config = require("../config.json")
import {BotClient} from "./BotClient"

const client = new BotClient({
    ownerID: config.owner_ids,
    prefix: config.prefix,
    commandDirectory: "./built/commands/",
    //inhibitorDirectory: "./built/inhibitors/",
    listenerDirectory: "./built/listeners/",
    commandUtil: true,
    commandUtilLifetime: 600000
}, "./db/database.db");

function startBot() {
    console.log("Starting up...");
    client.login(config.token);
    console.log("Started up...");
}

function shutdown() {
    console.info('SIGTERM signal received.');
    console.log('Closing.');
    if (client) {
        client.destroy()
    }
    process.exit(0)
}

['SIGTERM', 'SIGINT'].forEach(value => process.on(value, shutdown));

startBot();