import { Connection } from "../../network/connection.ts";
import { Server } from "../server.ts";
import { Md5 } from "https://deno.land/std/hash/md5.ts";

import {
  ClientLoginSuccessPacket,
  ClientSetCompressionPacket,
  ServerLoginPacketHandler,
} from "../../network/protocol/login.ts";

export function createLoginHandler(
  server: Server,
  conn: Connection,
): ServerLoginPacketHandler {
  return {
    async handleLoginStart({ name }) {
      await conn.sendPacket(
        new ClientSetCompressionPacket(server.compressionThreshold),
      );
      conn.setCompression(server.compressionThreshold);

      const uuid = uuidFromName(name);

      await conn.sendPacket(new ClientLoginSuccessPacket(uuid, name));
      await server.joinPlayer(conn, uuid, name);
    },
  };
}

function uuidFromName(name: string) {
  const uuid = new Uint8Array(
    new Md5().update(`OfflinePlayer:${name}`).digest(),
  );
  uuid[6] = (uuid[6] & 0x0f) | 0x30;
  uuid[8] = (uuid[8] & 0x3f) | 0x80;
  return uuid;
}
