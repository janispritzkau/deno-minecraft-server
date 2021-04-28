import { Connection } from "../network/connection.ts";
import { Packet } from "../network/packet.ts";

import { handshakeProtocol } from "../network/protocol/handshake.ts";
import { createHandshakeHandler } from "./handler/handshake.ts";

import {
  ClientChatPacket,
  ClientDisconnectPacket,
  ClientJoinGamePacket,
  ClientPlayerInfoPacket,
  ClientPlayerPositionAndLookPacket,
} from "../network/protocol/game.ts";

import { dimension, dimensionCodec } from "./dimension-codec.ts";
import { Player } from "./player.ts";

export class Server {
  players = new Map<string, Player>();
  connections = new Set<Connection>();
  running = true;

  compressionThreshold = 256;

  constructor(private listener: Deno.Listener) {
    this.runAcceptLoop().catch((e) => {
      console.error("error in accept loop:", e);
      this.stop();
    });

    this.runUpdateLoop().catch((e) => {
      console.error("error in tick loop", e);
      this.stop();
    });
  }

  async broadcast(packet: Packet<unknown>) {
    for (const player of this.players.values()) {
      await player.conn.sendPacket(packet);
    }
  }

  async broadcastChat(chat: unknown) {
    console.log("chat", chat);
    await this.broadcast(new ClientChatPacket(chat, 0));
  }

  async joinPlayer(conn: Connection, uuid: Uint8Array, name: string) {
    const existingPlayer = this.players.get(name);
    if (existingPlayer) {
      await existingPlayer.conn.sendPacket(
        new ClientDisconnectPacket({
          translate: "multiplayer.disconnect.duplicate_login",
        }),
      );
      existingPlayer.conn.close();
    }

    conn.setIgnoreUnregistered(true);

    const player = new Player(this, conn, uuid, name, 0);

    await this.broadcast(
      new ClientPlayerInfoPacket({
        action: "add_player",
        entries: [player],
      }),
    );

    await this.broadcastChat({
      translate: "multiplayer.player.joined",
      with: [player.name],
    });

    this.players.set(name, player);

    await conn.sendPacket(
      new ClientJoinGamePacket(
        player.eid,
        false,
        0,
        ["world"],
        dimensionCodec,
        dimension,
        "world",
        20,
        12,
        false,
        true,
        true,
      ),
    );

    await conn.sendPacket(
      new ClientPlayerPositionAndLookPacket(0, 16, 0, 0, 0, 0, 0),
    );

    await conn.sendPacket(
      new ClientPlayerInfoPacket({
        action: "add_player",
        entries: [...this.players.values()],
      }),
    );

    return player;
  }

  async removePlayer(player: Player) {
    this.players.delete(player.name);

    await this.broadcast(
      new ClientPlayerInfoPacket({
        action: "remove_player",
        entries: [player],
      }),
    );

    await this.broadcastChat({
      translate: "multiplayer.player.left",
      with: [player.name],
    });
  }

  stop() {
    this.listener.close();
    this.running = false;
    console.log("server stopped");
  }

  private latencyUpdateTicks = 0;

  private async tick() {
    for (const player of this.players.values()) {
      await player.tick();
    }

    if (this.latencyUpdateTicks++ > 100) {
      await this.broadcast(
        new ClientPlayerInfoPacket({
          action: "update_latency",
          entries: [...this.players.values()],
        }),
      );
      this.latencyUpdateTicks = 0;
    }
  }

  private async runUpdateLoop() {
    let nextTickTime = performance.now();

    while (this.running) {
      nextTickTime += 50;
      this.tick();

      if (performance.now() < nextTickTime) {
        const ms = performance.now() - nextTickTime;
        await new Promise((resolve) => setTimeout(resolve, ms));
      }
    }
  }

  private async handleConnection(conn: Connection) {
    conn.setServerProtocol(
      handshakeProtocol,
      createHandshakeHandler(this, conn),
    );

    while (true) {
      const packet = await conn.receivePacket();
      if (packet == null) break;
    }
  }

  private async runAcceptLoop() {
    for await (const denoConn of this.listener) {
      const conn = new Connection(denoConn);
      this.connections.add(conn);

      this.handleConnection(conn).catch((e) => {
        console.error("error in connection handler:", e);
      }).finally(() => {
        conn.close();
        this.connections.delete(conn);
      });
    }
  }
}
