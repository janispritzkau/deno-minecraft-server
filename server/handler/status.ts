import { Connection } from "../../network/connection.ts";
import { Server } from "../server.ts";

import {
  ClientStatusPongPacket,
  ClientStatusResponsePacket,
  ServerStatusPacketHandler,
} from "../../network/protocol/status.ts";

export function createStatusHandler(
  server: Server,
  conn: Connection,
): ServerStatusPacketHandler {
  return {
    async handleRequest() {
      await conn.sendPacket(
        new ClientStatusResponsePacket({
          version: { name: "1.16.5", protocol: 754 },
          players: { online: server.players.size, max: 0 },
          description: "A Minecraft Server",
        }),
      );
    },
    async handlePing(ping) {
      await conn.sendPacket(new ClientStatusPongPacket(ping.id));
    },
  };
}
