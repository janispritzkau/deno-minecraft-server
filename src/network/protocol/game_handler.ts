import { PacketHandler } from "../packet_handler.ts";
import { Connection } from "../connection.ts";
import { Server } from "../../server.ts";
import { Player } from "../../server/player.ts";
import {
  ClientDisconnectPacket,
  ClientKeepAlivePacket,
  ServerChatMessagePacket,
  ServerKeepAlivePacket,
} from "./game_protocol.ts";

export class ServerGameHandler implements PacketHandler {
  private keepAliveTime = performance.now();
  private keepAliveId?: bigint | null = null;
  private keepAlivePending = false;
  private keepAliveInterval?: number;

  constructor(
    private server: Server,
    private conn: Connection,
    private player: Player,
  ) {
    this.keepAliveInterval = setInterval(() => this.sendKeepAlive(), 15000);
  }

  sendKeepAlive() {
    if (this.keepAlivePending) {
      this.conn.sendPacket(
        new ClientDisconnectPacket({ translate: "disconnect.timeout" }),
      ).then(() => this.conn.close());
    } else {
      const time = performance.now();
      this.keepAlivePending = true;
      this.keepAliveTime = time;
      this.keepAliveId = BigInt(~~time);
      this.conn.sendPacket(
        new ClientKeepAlivePacket(this.keepAliveId),
      );
    }
  }

  handleChatMessage(chatMessage: ServerChatMessagePacket) {
    this.server.broadcastChat({
      translate: "chat.type.text",
      with: [this.player.name, chatMessage.text],
    });
  }

  handleKeepAlive(keepAlive: ServerKeepAlivePacket) {
    if (this.keepAlivePending && keepAlive.id == this.keepAliveId) {
      this.keepAlivePending = false;
      const latency = performance.now() - this.keepAliveTime;
      this.player.latency = (this.player.latency * 3 + latency) / 4;
    } else {
      this.conn.sendPacket(
        new ClientDisconnectPacket({ translate: "disconnect.timeout" }),
      );
    }
  }

  handleDisconnect() {
    clearInterval(this.keepAliveInterval);
    this.server.removePlayer(this.player);
  }
}
