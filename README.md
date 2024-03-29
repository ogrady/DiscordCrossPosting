![Node CI](https://github.com/ogrady/DiscordCrossPosting/actions/workflows/node.yml/badge.svg)
![Docker Build CI](https://github.com/ogrady/DiscordCrossPosting/actions/workflows/docker-build.yml/badge.svg)
![Automerge](https://github.com/ogrady/DiscordCrossPosting/actions/workflows/automerge.yml/badge.svg)

# Discord Cross Poster
## Purpose
Bot to cross-post messages between servers, similar to what the [announcement channels](https://support.discordapp.com/hc/en-us/articles/360032008192-Announcement-Channels-) do, but without having to be a Discord partner and with more control over what is published automatically.

## Setup
This bot is written in [Typescript](https://www.typescriptlang.org/), running as a [Node.js](https://nodejs.org/en/) package.
To set it up, first install the dependencies and compile to vanilla Javascript, running

```
npm i && npm run build
```

from the root directory.

Copy the `config.json.example` to `data/config.json` and adjust to your liking. Tokens can be acquired from the [Developer Portal](https://discordapp.com/developers/applications/) when creating a new application.

Note that the `Message Content Intent` needs to be enabled for your bot application on the developer portal!

When starting for the first time, you need to first register all commands with the app. To do so, you can run 

```
node built/src/index.js --register
```

## Running
After setting up, you can run the bot using

```
node built/index.js
```
or
```
npm run run
```

From the root directory. You may want to put a service in place to automatically run the bot, as usual.

## Usage
The crossposter features the following commands, all of them only available to the owner of the bot, as defined within the configuration file.

### listservers
Lists all servers the bot instance is running on. No parameters.

### listbridges
Lists all active bridges. No parameters.

### removebridge
Removes a bridge by its ID. The only parameter is a numerical ID, which can be acquired from the `listbridges` command.

### createbridge
Creates a new bridge from one server + channel to another. The parameters are as following:

1. Name of the server from which the messages should be read. A list of servers the bot has access to can be acquired from `listservers`.
2. Name of the channel on the source server from which messages should be read. The channel must exist and the bot must be able to read from it, or the command will.
3. Name of the server to which the messages should be forwarded.
4. Name of the channel on the destination server where the messages should be written to. Again, that channel must exist.
5. A descrimniator to determine whether a message will be forwarded over the bridge. Available discriminators are:
	1. `uid` the user ID of the user who posted the message. Use if you want to only forward messages from certain users.
	2. `uname` the display name of the user who posted the message. Use if you want to only forward messages when their poster has a certain name. See below for RegEx usage.
	3. `text` the text of the message. Useful if you only want to forward messages when they feature certain content. See below for RegEx usage.
6. The regular expression which the descriminator must match. If anything should match, just pass `.`.
7. Mentions that should be preserved. These can be `users`, `roles`, or `everyone`. That means for example, if you preserve `roles` on a bridge, the bot will attempt to actually mention role in their forwarded post. Elsewise, roles will just appear as plain text without causing a notification for users. Note that `everyone` will preserve both `@everyone` and `@here`. You can combine these mentions by passing multiple values with a comma separator. I.e. passing `users,everyone` for this parameter will preserve mentions for users and `@everyone`, but not for roles.

If any of the parameters in a command contains whitespace, you need to put qutoes around them.

#### RegEx
Messages are only forwarded, if their discriminator matches a [regular expression](https://regexr.com/). The most simple case would be to have all messages from server `A` in channel `foo` forwarded to channel `bar` on server `B`:

```
createbridge A foo B bar text:.*
```

But it could also be used to only forward messages that start with a trigger word, like "ATTENTION":

```
createbridge A foo B bar text "^ATTENTION.*"  
```

Or players whose display name indicate they belong to a certain guild (be aware that on most servers users can freely change their display name):

```
createbridge A foo B bar uname "\[EPIC\]"
```
would only forward messages from players with the tag "[EPIC]" in their display name.

## Docker
You can mount a volume on `/app/data` which should contain your `config.json` and your `database.db` file.