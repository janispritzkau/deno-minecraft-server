import { Connection } from "../network/connection.ts";
import { PacketWriter } from "../network/packet.ts";

import {
  handshakeProtocol,
  ServerHandshakePacketHandler,
} from "../network/protocol/handshake.ts";

import {
  ClientStatusPongPacket,
  ClientStatusResponsePacket,
  ServerStatusPacketHandler,
  statusProtocol,
} from "../network/protocol/status.ts";

function createHandshakeHandler(
  conn: Connection,
): ServerHandshakePacketHandler {
  return {
    async handleHandshake(handshake) {
      if (handshake.nextState == 1) {
        return conn.setServerProtocol(
          statusProtocol,
          createStatusHandler(conn),
        );
      } else if (handshake.nextState == 2) {
        await conn.send(
          new PacketWriter().writeVarInt(0x00)
            .writeJSON("Login not implemented!")
            .bytes(),
        );
      }
      conn.close();
    },
  };
}

function createStatusHandler(conn: Connection): ServerStatusPacketHandler {
  return {
    async handleRequest() {
      await conn.sendPacket(
        new ClientStatusResponsePacket({
          version: { name: "1.16.5", protocol: 754 },
          players: { online: 0, max: 0 },
          description: "A Minecraft Server",
        }),
      );
    },
    async handlePing(ping) {
      await conn.sendPacket(new ClientStatusPongPacket(ping.id));
    },
  };
}

const listener = Deno.listen({ port: 25565 });

for await (const denoConn of listener) {
  const conn = new Connection(denoConn);
  conn.setServerProtocol(handshakeProtocol, createHandshakeHandler(conn));

  (async () => {
    while (true) {
      const packet = await conn.receivePacket();
      if (packet == null) break;
    }
  })().catch((e) => {
    console.log("error in receive loop:", e);
  }).finally(() => {
    conn.close();
  });
}
