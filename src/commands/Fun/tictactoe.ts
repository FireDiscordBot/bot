import {
  MessageActionRow,
  SnowflakeUtil,
  MessageButton,
  Collection,
  Snowflake,
} from "discord.js";
import { SlashCommandMessage } from "@fire/lib/extensions/slashcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

type TicTacToeSymbol = "x" | "o";
type TicTacToeButtons = { [location: number]: ButtonData };
interface ButtonData {
  customID: string;
  player?: string;
}
interface GameData {
  players: { [id: string]: TicTacToeSymbol };
  buttons: TicTacToeButtons;
  message?: Snowflake;
  channel: Snowflake;
  current: string;
}

const { emojis } = constants;

// these are the positions required for winning
const winningStates = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [1, 5, 9],
  [3, 5, 7],
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
];

export default class TicTacToe extends Command {
  games: Collection<string, GameData>;

  constructor() {
    super("tictactoe", {
      description: (language: Language) =>
        language.get("TICTACTOE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "opponent",
          type: "memberSilent",
          default: null,
          required: true,
        },
      ],
      requiresExperiment: { id: 1621199146, bucket: 1 },
      enableSlashCommand: true,
      restrictTo: "guild",
      aliases: ["ttt"],
    });

    this.games = new Collection();
  }

  async exec(message: FireMessage, args: { opponent?: FireMember }) {
    if (!args.opponent || args.opponent?.id == message.author.id)
      return await message.error("TICTACTOE_OPPONENT_REQUIRED");

    const { opponent } = args;
    if (opponent.user.bot) return await message.error("TICTACTOE_COMPUTER");

    const authorHasGame = this.games.findKey(
      (game) => message.author.id in game.players
    );
    if (authorHasGame) {
      const existing = this.games.get(authorHasGame);
      const endId = SnowflakeUtil.generate();
      const endGameMessage = await message.channel.send({
        content: `${emojis.error} ${message.language.get(
          "TICTACTOE_EXISTING"
        )}`,
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setLabel(message.guild.language.get("TICTACTOE_END_GAME"))
              .setCustomID(endId)
              .setStyle("PRIMARY")
          ),
        ],
      });
      try {
        await this.awaitEndGame(endId, message.member);
        for (const button of Object.values(existing.buttons))
          this.client.buttonHandlers.delete(button.customID);
        this.client.buttonHandlers.delete(`${authorHasGame}:forfeit`);
        this.games.delete(authorHasGame);

        const existingMessage = (await (this.client.channels.cache.get(
          existing.channel
        ) as FireTextChannel)?.messages
          .fetch(existing.message)
          .catch(() => {})) as FireMessage;
        if (existingMessage) {
          const existingGuild = existingMessage.guild;
          await existingMessage.edit({
            content: existingGuild.language.get("TICTACTOE_JOINED_NEW", {
              user: message.member?.toMention(),
            }),
            components: [],
          });
        }
        await endGameMessage.delete().catch(() => {});
      } catch {
        return;
      }
    }

    const requestId = SnowflakeUtil.generate();
    const requestMsgOptions = {
      allowedMentions: {
        users:
          message.mentions.users.has(opponent.id) ||
          // instance check so that using the slash command will mention
          (message.guild.memberCount > 100 && message instanceof FireMessage)
            ? []
            : [opponent.id],
      },
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setLabel(message.guild.language.get("TICTACTOE_ACCEPT_CHALLENGE"))
            .setStyle("SUCCESS")
            .setCustomID(requestId)
        ),
      ],
    };

    const requestMsg = await message.channel.send({
      content: message.guild.language.get("TICTACTOE_GAME_REQUEST", {
        challenger: message.author.username,
        opponent: opponent.toMention(),
      }),
      ...requestMsgOptions,
    });
    if (!requestMsg) return await message.error();
    const accepted = await this.awaitOpponentResponse(requestId, opponent);
    this.client.buttonHandlers.delete(requestId);
    if (!accepted) {
      requestMsgOptions.components[0].components[0].setDisabled(true);
      await requestMsg.edit({
        content: message.guild.language.get("TICTACTOE_GAME_REQUEST", {
          challenger: message.author.username,
          opponent: opponent.toMention(),
        }),
        ...requestMsgOptions,
      });
      if (message instanceof SlashCommandMessage)
        return await (message as SlashCommandMessage).edit({
          content: message.guild.language.get(
            "TICTACTOE_REQUEST_EXPIRED_SLASH",
            { opponent: opponent.toMention() }
          ) as string,
          components: [],
        });
      else return await message.error("TICTACTOE_REQUEST_EXPIRED");
    } else
      message instanceof SlashCommandMessage
        ? await message.delete()
        : await requestMsg.delete().catch(() => {});

    const opponentHasGame = this.games.find(
      (game) => args.opponent.id in game.players
    );
    if (opponentHasGame) return await message.error("TICTACTOE_OPPONENT_BUSY");

    const gameId = SnowflakeUtil.generate();
    const gameData = this.games
      .set(gameId, {
        current: opponent.id, // opponent goes first
        buttons: this.getInitialButtons(),
        channel: message.channel.id,
        players: {
          [message.author.id]: "x",
          [opponent.id]: "o",
        },
      })
      .get(gameId);

    const handler = this.getGameHandler(gameId);
    for (const button of Object.values(gameData.buttons))
      this.client.buttonHandlers.set(button.customID, handler);
    this.client.buttonHandlers.set(`${gameId}:forfeit`, async (button) => {
      if (button.ephemeral) return;
      let buttonMessage = button.message as FireMessage;
      const game = this.games.get(gameId);
      if (!(button.author.id in game.players))
        return await button.channel.ack();
      if (game.message != buttonMessage.id)
        buttonMessage = (await button.channel.messages
          .fetch(game.message)
          .catch(() => {})) as FireMessage;

      if (!buttonMessage) return;

      for (const button of Object.values(game.buttons))
        this.client.buttonHandlers.delete(button.customID);
      this.client.buttonHandlers.delete(`${gameId}:forfeit`);
      this.games.delete(gameId);

      return await buttonMessage.edit({
        content: button.guild.language.get("TICTACTOE_FORFEITED", {
          user: button.member?.toMention(),
        }),
        components: [],
      });
    });

    const components = [
      new MessageActionRow().addComponents(
        [1, 2, 3].map((pos) =>
          new MessageButton()
            .setCustomID("!" + gameData.buttons[pos].customID)
            .setStyle("SECONDARY")
            .setEmoji("842914636026216498")
        )
      ),
      new MessageActionRow().addComponents(
        [4, 5, 6].map((pos) =>
          new MessageButton()
            .setCustomID("!" + gameData.buttons[pos].customID)
            .setStyle("SECONDARY")
            .setEmoji("842914636026216498")
        )
      ),
      new MessageActionRow().addComponents(
        [7, 8, 9].map((pos) =>
          new MessageButton()
            .setCustomID("!" + gameData.buttons[pos].customID)
            .setStyle("SECONDARY")
            .setEmoji("842914636026216498")
        )
      ),
      new MessageActionRow().addComponents(
        new MessageButton()
          .setLabel(message.guild.language.get("TICTACTOE_FORFEIT"))
          .setCustomID(`!${gameId}:forfeit`)
          .setStyle("PRIMARY")
      ),
    ];

    const game = await message.channel.send({
      content: message.guild.language.get("TICTACTOE_GAME_START", {
        opponent: opponent.toMention(),
      }),
      components,
      allowedMentions: { users: [opponent.id, message.author.id] },
    });
    gameData.message = game.id;
    this.games.set(gameId, gameData);
  }

  private awaitOpponentResponse(
    requestId: string,
    opponent: FireMember
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;
      setTimeout(() => {
        if (!resolved) resolve(false);
      }, 60000);
      const handler = (button: ComponentMessage) => {
        if (button.author.id == opponent.id) resolve(true);
      };
      this.client.buttonHandlers.set(requestId, handler);
    });
  }

  private awaitEndGame(
    requestId: string,
    author: FireMember
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;
      setTimeout(() => {
        if (!resolved) resolve(false);
      }, 60000);
      const handler = (button: ComponentMessage) => {
        if (button.author.id == author.id) resolve(true);
      };
      this.client.buttonHandlers.set(requestId, handler);
    });
  }

  private getInitialButtons(): TicTacToeButtons {
    return {
      1: {
        customID: SnowflakeUtil.generate(),
      },
      2: {
        customID: SnowflakeUtil.generate(),
      },
      3: {
        customID: SnowflakeUtil.generate(),
      },
      4: {
        customID: SnowflakeUtil.generate(),
      },
      5: {
        customID: SnowflakeUtil.generate(),
      },
      6: {
        customID: SnowflakeUtil.generate(),
      },
      7: {
        customID: SnowflakeUtil.generate(),
      },
      8: {
        customID: SnowflakeUtil.generate(),
      },
      9: {
        customID: SnowflakeUtil.generate(),
      },
    };
  }

  private getGameHandler(gameId: string) {
    return async (button: ComponentMessage) => {
      if (button.ephemeral) return;
      const buttonMessage = button.message as FireMessage;
      const game = this.games.get(gameId);
      if (!game || button.author.id != game.current)
        return await button.channel.ack().catch(() => {});

      const buttonId = button.customID;
      const [pos] = Object.entries(game.buttons).find(
        ([, data]) => data.customID == buttonId
      );
      const parsedPos = parseInt(pos);

      if (game.buttons[parsedPos].player) return;
      else game.buttons[parsedPos].player = button.author.id;

      game.current = Object.keys(game.players).find(
        (id) => id != button.author.id
      );
      this.games.set(gameId, game);

      const components = buttonMessage.components;
      const actionRowIndex = components.findIndex(
        (component) =>
          component.type == "ACTION_ROW" &&
          component.components.find(
            (component) =>
              component.type == "BUTTON" &&
              component.style != "LINK" &&
              component.customID == "!" + buttonId
          )
      );
      const buttonIndex = components[actionRowIndex].components.findIndex(
        (component) =>
          component.type == "BUTTON" &&
          component.style != "LINK" &&
          component.customID == "!" + buttonId
      );
      (components[actionRowIndex].components[buttonIndex] as MessageButton)
        .setEmoji(
          game.players[button.author.id] == "x"
            ? "836004296696659989"
            : "836004296008269844"
        )
        .setCustomID(button.customID)
        .setStyle(game.players[button.author.id] == "x" ? "SUCCESS" : "DANGER")
        .setDisabled(true);

      const hasWon = winningStates.some((states) =>
        states.every((state) => game.buttons[state].player == button.author.id)
      );
      if (hasWon) {
        // game is over, remove handler, game data & edit message
        for (const button of Object.values(game.buttons))
          this.client.buttonHandlers.delete(button.customID);
        this.client.buttonHandlers.delete(`${gameId}:forfeit`);
        this.games.delete(gameId);

        const state = winningStates.find((states) =>
          states.every(
            (state) => game.buttons[state].player == button.author.id
          )
        );
        for (const index of state) {
          const actionRowIndex = components.findIndex(
            (component) =>
              component.type == "ACTION_ROW" &&
              component.components.find(
                (component) =>
                  component.type == "BUTTON" &&
                  component.style != "LINK" &&
                  component.customID == game.buttons[index].customID
              )
          );
          const buttonIndex = components[actionRowIndex].components.findIndex(
            (component) =>
              component.type == "BUTTON" &&
              component.style != "LINK" &&
              component.customID == game.buttons[index].customID
          );
          if (
            components[actionRowIndex].components[buttonIndex].type == "BUTTON"
          )
            (components[actionRowIndex].components[
              buttonIndex
            ] as MessageButton).setStyle("PRIMARY");
        }

        for (const [index, row] of components.entries()) {
          row.components = row.components.map((component) =>
            component.setDisabled(true)
          );
          components[index] = row;
        }

        return await button.channel
          .update(
            button.guild.language.get("TICTACTOE_WINNER", {
              winner: button.member?.toMention(),
            }),
            {
              components: components.slice(0, -1),
            }
          )
          .catch(() => {});
      }

      const hasTied = Object.values(game.buttons).every(
        (data) => !!data.player
      );
      if (hasTied) {
        // game is over, remove handler, game data & edit message
        for (const button of Object.values(game.buttons))
          this.client.buttonHandlers.delete(button.customID);
        this.client.buttonHandlers.delete(`${gameId}:forfeit`);
        this.games.delete(gameId);

        for (const [index, row] of components.entries()) {
          row.components = row.components.map((component) =>
            component.setDisabled(true)
          );
          components[index] = row;
        }

        return await button.channel
          .update(button.guild.language.get("TICTACTOE_DRAW"), {
            components: components.slice(0, -1),
          })
          .catch(() => {});
      }

      await button.channel
        .update(
          button.guild.language.get("TICTACTOE_TURN", {
            current: `<@!${game.current}>`,
          }),
          { components }
        )
        .catch(() => {});
    };
  }
}
