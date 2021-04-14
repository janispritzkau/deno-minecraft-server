import { PacketHandler } from "../packet_handler.ts";
import { Connection } from "../connection.ts";
import { Server } from "../../server.ts";
import {
  ClientStatusPongPacket,
  ClientStatusResponsePacket,
  ServerStatusPingPacket,
} from "./status_protocol.ts";

export class ServerStatusHandler implements PacketHandler {
  constructor(private server: Server, private conn: Connection) {}

  handleRequest() {
    this.conn.sendPacket(
      new ClientStatusResponsePacket({
        description: "A Minecraft Server",
        version: {
          name: "1.16.5",
          protocol: 754,
        },
        players: { online: this.server.players.size, max: 0 },
      }),
    );
  }

  handlePing(ping: ServerStatusPingPacket) {
    this.conn.sendPacket(new ClientStatusPongPacket(ping.id));
  }

  handleDisconnect() {}
}
