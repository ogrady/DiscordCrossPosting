import * as bot from "../BotClient";

/**
 * https://github.com/discord-akairo/discord-akairo/blob/master/docs/commands/permissions.md#dynamic-permissions
 */
export abstract class OwnerCommand extends bot.BotCommand {
    userPermissions = message => {
        if (!this.client.isOwner(message.member)) {
            return 'Owner'; // return missing "permission"
        }
        return null; // all fine
    };


}
