import { Connection } from "./network/connection.ts";
import { CompoundTag, decodeCompoundTag } from "./nbt/mod.ts";
import { ChatComponent } from "./chat/mod.ts";
import { Player } from "./server/player.ts";

import { ServerHandshakeHandler } from "./network/protocol/handshake_handler.ts";
import { handshakeProtocol } from "./network/protocol/handshake_protocol.ts";

import { ServerGameHandler } from "./network/protocol/game_handler.ts";
import {
  ClientChatMessagePacket,
  ClientDisconnectPacket,
  ClientJoinGamePacket,
  ClientPlayerInfoPacket,
  ClientPlayerPositionAndLookPacket,
  gameProtocol,
} from "./network/protocol/game_protocol.ts";

export interface ServerConfig {
  hostname?: string;
  port?: number;
}

export const defaultServerConfig: Required<ServerConfig> = {
  hostname: "127.0.0.1",
  port: 25565,
};

const dimensionCodec = decodeCompoundTag(
  Deno.readFileSync(new URL("../dimension-codec.nbt", import.meta.url)),
)!;

const dimension = new CompoundTag()
  .setBoolean("piglin_safe", true)
  .setBoolean("natural", true)
  .setFloat("ambient_light", 0)
  .setString("infiniburn", "minecraft:infiniburn_end")
  .setBoolean("respawn_anchor_works", false)
  .setBoolean("has_skylight", true)
  .setBoolean("bed_works", true)
  .setString("effects", "minecraft:the_overworld")
  .setLong("fixed_time", 6000n)
  .setBoolean("has_raids", false)
  .setDouble("logical_height", 256)
  .setDouble("coordinate_scale", 1)
  .setBoolean("ultrawarm", false)
  .setBoolean("has_ceiling", false);

export class Server {
  config: Required<ServerConfig>;
  private stopped = false;
  private listener?: Deno.Listener;

  players = new Map<string, Player>();
  private nextEid = 1;

  constructor(config?: ServerConfig) {
    this.config = { ...defaultServerConfig, ...config };
  }

  async start() {
    if (this.listener) throw new Error("Can't start server twice");
    this.startListening();
    console.log("server started");
  }

  async stop() {
    if (this.stopped) throw new Error("Server already stopped");
    this.listener?.close();
    this.stopped = true;

    for (const player of this.players.values()) {
      await player.conn.sendPacket(
        new ClientDisconnectPacket({
          translate: "multiplayer.disconnect.server_shutdown",
        }),
      );
      player.conn.close();
    }

    console.log("server stopped");
  }

  async broadcastChat(chat: ChatComponent) {
    console.log("chat", chat);
    const packet = new ClientChatMessagePacket(chat, 0);
    this.players.forEach((player) => {
      player.conn.sendPacket(packet);
    });
  }

  async addPlayer(conn: Connection, uuid: Uint8Array, name: string) {
    const player = new Player(this, conn, this.nextEid++, uuid, name);

    conn.setProtocol(
      gameProtocol,
      new ServerGameHandler(this, conn, player),
    );

    if (this.players.has(name)) {
      await conn.sendPacket(
        new ClientDisconnectPacket({
          translate: "multiplayer.disconnect.duplicate_login",
        }),
      );
      return conn.close();
    }

    this.broadcastChat({
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
      new ClientPlayerPositionAndLookPacket(0, 0, 0, 0, 0, 0, 0),
    );

    await conn.sendPacket(
      new ClientPlayerInfoPacket("add_player", [...this.players.values()]),
    );
  }

  async removePlayer(player: Player) {
    this.players.delete(player.name);

    for (const otherPlayer of this.players.values()) {
      await otherPlayer.conn.sendPacket(
        new ClientPlayerInfoPacket("remove_player", [player]),
      );
    }

    this.broadcastChat({
      translate: "multiplayer.player.left",
      with: [player.name],
    });
  }

  private async handleConnection(conn: Connection) {
    conn.setProtocol(handshakeProtocol, new ServerHandshakeHandler(this, conn));

    while (true) {
      const packet = await conn.receivePacket();
      if (packet == null) break;
    }
  }

  private startListening() {
    this.listener = Deno.listen(this.config);

    console.log(
      `listening on ${this.config.hostname}:${this.config.port}`,
    );

    Promise.resolve().then(async () => {
      for await (const conn of this.listener!) {
        const addr = conn.remoteAddr as Deno.NetAddr;
        console.log("new connection", `${addr.hostname}:${addr.port}`);

        this.handleConnection(new Connection(conn)).catch((e) => {
          console.error("error in connection handler", e);
          conn.close();
        }).finally(() => {
          console.log("connection closed", `${addr.hostname}:${addr.port}`);
        });
      }
    }).catch((e) => {
      console.error("error in accept loop", e);
      this.stop();
    });
  }
}
