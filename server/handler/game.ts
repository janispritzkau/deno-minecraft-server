import { Connection } from "../../network/connection.ts";
import { Server } from "../server.ts";
import { Player } from "../player.ts";

import {
  ClientDisconnectPacket,
  ClientKeepAlivePacket,
  ServerGamePacketHandler,
} from "../../network/protocol/game.ts";

export interface GameHandler extends ServerGamePacketHandler {
  tick(): Promise<void>;
}

export function createGameHandler(
  server: Server,
  player: Player,
  conn: Connection,
): GameHandler {
  let keepAlivePending = false;
  let keepAliveTime = 0;
  let keepAliveId = 0n;

  return {
    async tick() {
      if (performance.now() - keepAliveTime >= 15000) {
        if (keepAlivePending) {
          await conn.sendPacket(
            new ClientDisconnectPacket({
              translate: "disconnect.timeout",
            }),
          );
          conn.close();
        } else {
          keepAlivePending = true;
          keepAliveTime = performance.now();
          keepAliveId = BigInt(~~keepAliveTime);
          await conn.sendPacket(new ClientKeepAlivePacket(keepAliveId));
        }
      }
    },
    async handleChat(chat) {
      await server.broadcastChat({
        translate: "chat.type.text",
        with: [player.name, chat.text],
      });
    },
    async handleKeepAlive({ id }) {
      if (keepAlivePending && id == keepAliveId) {
        const latency = performance.now() - keepAliveTime;
        player.latency = (player.latency * 3 + latency) / 4;
        keepAlivePending = false;
      } else {
        await conn.sendPacket(
          new ClientDisconnectPacket({ translate: "disconnect.timeout" }),
        );
      }
    },
    onDisconnect() {
      server.removePlayer(player).catch((e) => {
        console.error("error while removing player", e);
      });
    },
  };
}
