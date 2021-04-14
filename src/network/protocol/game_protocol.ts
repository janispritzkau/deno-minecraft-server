import { Protocol } from "../protocol.ts";
import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { ServerGameHandler } from "./game_handler.ts";
import { Player } from "../../server/player.ts";
import { CompoundTag } from "../../nbt/tag.ts";
import { ChatComponent } from "../../chat/mod.ts";

export class ClientChatMessagePacket implements Packet<ServerGameHandler> {
  static read(): ClientChatMessagePacket {
    throw new Error();
  }

  constructor(
    public chat: ChatComponent,
    public position: number,
    public sender = new Uint8Array(16),
  ) {}

  write(writer: PacketWriter) {
    writer.writeJSON(this.chat).writeByte(this.position).write(this.sender);
  }

  handle() {}
}

export class ClientKeepAlivePacket implements Packet<ServerGameHandler> {
  static read(): ClientKeepAlivePacket {
    throw new Error();
  }

  constructor(public id: bigint) {}

  write(writer: PacketWriter) {
    writer.writeLong(this.id);
  }

  handle() {}
}

export class ClientDisconnectPacket implements Packet<ServerGameHandler> {
  static read(): ClientDisconnectPacket {
    throw new Error();
  }

  constructor(public reason: ChatComponent) {}

  write(writer: PacketWriter) {
    writer.writeJSON(this.reason);
  }

  handle() {}
}

export class ClientChunkPacket implements Packet<ServerGameHandler> {
  static read(): ClientChunkPacket {
    throw new Error();
  }

  constructor(public x: number, public y: number) {}

  write(writer: PacketWriter) {
    // writer.
  }

  handle() {}
}

export class ClientJoinGamePacket implements Packet<ServerGameHandler> {
  static read(): ClientJoinGamePacket {
    throw new Error();
  }

  constructor(
    public eid: number,
    public isHardcore: boolean,
    public gamemode: number,
    public worldNames: string[],
    public dimensionCodec: CompoundTag,
    public dimension: CompoundTag,
    public worldName: string,
    public maxPlayers: number,
    public viewDistance: number,
    public reducedDebugInfo: boolean,
    public enableRespawnScreen: boolean,
    public isFlat: boolean,
  ) {}

  write(writer: PacketWriter) {
    writer
      .writeInt(this.eid)
      .writeBoolean(this.isHardcore)
      .writeByte(this.gamemode)
      .writeByte(-1) // previous gamemode
      .writeVarInt(this.worldNames.length);
    for (const name of this.worldNames) writer.writeString(name);
    writer
      .writeNBT(this.dimensionCodec)
      .writeNBT(this.dimension)
      .writeString(this.worldName)
      .writeLong(0n)
      .writeVarInt(this.maxPlayers)
      .writeVarInt(this.viewDistance)
      .writeBoolean(this.reducedDebugInfo)
      .writeBoolean(this.enableRespawnScreen)
      .writeBoolean(false) // is debug
      .writeBoolean(this.isFlat);
  }

  handle() {}
}

export type PlayerUpdateAction =
  | "add_player"
  | "update_latency"
  | "remove_player";

export class ClientPlayerInfoPacket implements Packet<ServerGameHandler> {
  static read(): ClientPlayerInfoPacket {
    throw new Error();
  }

  constructor(
    public action: PlayerUpdateAction,
    public players: Player[],
  ) {}

  write(writer: PacketWriter) {
    if (this.action == "add_player") {
      writer.writeVarInt(0).writeVarInt(this.players.length);
      for (const player of this.players) {
        writer.write(player.uuid).writeString(player.name)
          .writeVarInt(0) // properties
          .writeVarInt(0) // gamemode
          .writeVarInt(player.latency)
          .writeBoolean(false);
      }
    } else if (this.action == "update_latency") {
      writer.writeVarInt(2).writeVarInt(this.players.length);
      for (const player of this.players) {
        writer.write(player.uuid).writeString(player.name)
          .writeVarInt(player.latency);
      }
    } else if (this.action == "remove_player") {
      writer.writeVarInt(4).writeVarInt(this.players.length);
      for (const player of this.players) {
        writer.write(player.uuid);
      }
    }
  }

  handle() {}
}

export class ClientPlayerPositionAndLookPacket
  implements Packet<ServerGameHandler> {
  static read(): ClientPlayerPositionAndLookPacket {
    throw new Error();
  }

  constructor(
    public x: number,
    public y: number,
    public z: number,
    public yaw: number,
    public pitch: number,
    public flags: number,
    public teleportId: number,
  ) {}

  write(writer: PacketWriter) {
    writer
      .writeDouble(this.x).writeDouble(this.y).writeDouble(this.z)
      .writeFloat(this.yaw).writeFloat(this.pitch)
      .writeByte(this.flags).writeVarInt(this.teleportId);
  }

  handle() {}
}

export class ServerChatMessagePacket implements Packet<ServerGameHandler> {
  static read(reader: PacketReader) {
    return new this(reader.readString());
  }

  constructor(public text: string) {}

  write() {}

  handle(handler: ServerGameHandler) {
    return handler.handleChatMessage(this);
  }
}

export class ServerKeepAlivePacket implements Packet<ServerGameHandler> {
  static read(reader: PacketReader): ServerKeepAlivePacket {
    return new this(reader.readLong());
  }

  constructor(public id: bigint) {}

  write() {}

  handle(handler: ServerGameHandler) {
    handler.handleKeepAlive(this);
  }
}

export const gameProtocol = new Protocol<ServerGameHandler>(true);
gameProtocol.registerServerbound(0x03, ServerChatMessagePacket);
gameProtocol.registerServerbound(0x10, ServerKeepAlivePacket);
gameProtocol.registerClientbound(0x0e, ClientChatMessagePacket);
gameProtocol.registerClientbound(0x1f, ClientKeepAlivePacket);
gameProtocol.registerClientbound(0x19, ClientDisconnectPacket);
gameProtocol.registerClientbound(0x24, ClientJoinGamePacket);
gameProtocol.registerClientbound(0x32, ClientPlayerInfoPacket);
gameProtocol.registerClientbound(0x34, ClientPlayerPositionAndLookPacket);
