import { Md5 } from "https://deno.land/std/hash/md5.ts";
import { PacketHandler } from "../packet_handler.ts";
import { Connection } from "../connection.ts";
import { Server } from "../../server.ts";
import {
  ClientLoginSuccessPacket,
  ClientSetCompressionPacket,
  ServerLoginStartPacket,
} from "./login_protocol.ts";

export class ServerLoginHandler implements PacketHandler {
  constructor(private server: Server, private conn: Connection) {}

  async handleLoginStart(loginStart: ServerLoginStartPacket) {
    await this.conn.sendPacket(new ClientSetCompressionPacket(256));
    this.conn.setCompression(256);

    const uuid = new Uint8Array(
      new Md5().update(`OfflinePlayer:${loginStart.name}`).digest(),
    );

    await this.conn.sendPacket(
      new ClientLoginSuccessPacket(uuid, loginStart.name),
    );

    await this.server.addPlayer(this.conn, uuid, loginStart.name);
  }

  handleDisconnect() {}
}
