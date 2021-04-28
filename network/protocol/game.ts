import { Protocol } from "../protocol.ts";
import { PacketHandler } from "../packet_handler.ts";
import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { CompoundTag } from "../../nbt/tag.ts";

export interface ServerGamePacketHandler extends PacketHandler {
  handleKeepAlive?(packet: ServerKeepAlivePacket): void;
  handleChat?(packet: ServerChatPacket): void;
}

type ServerHandler = ServerGamePacketHandler;

export class ServerChatPacket implements Packet<ServerHandler> {
  constructor(public text: string) {}

  static read(reader: PacketReader) {
    return new this(reader.readString());
  }

  handle(handler: ServerHandler) {
    return handler.handleChat?.(this);
  }
}

export class ServerKeepAlivePacket implements Packet<ServerHandler> {
  constructor(public id: bigint) {}

  static read(reader: PacketReader): ServerKeepAlivePacket {
    return new this(reader.readLong());
  }

  handle(handler: ServerHandler) {
    handler.handleKeepAlive?.(this);
  }
}

export class ClientChatPacket implements Packet<void> {
  constructor(
    public chat: unknown,
    public position: number,
    public sender = new Uint8Array(16),
  ) {}

  write(writer: PacketWriter) {
    writer.writeJSON(this.chat).writeByte(this.position).write(this.sender);
  }
}

export class ClientDisconnectPacket implements Packet<void> {
  constructor(public reason: unknown) {}

  write(writer: PacketWriter) {
    writer.writeJSON(this.reason);
  }
}

export class ClientKeepAlivePacket implements Packet<void> {
  constructor(public id: bigint) {}

  write(writer: PacketWriter) {
    writer.writeLong(this.id);
  }
}

export class ClientJoinGamePacket implements Packet<void> {
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
      .writeByte(-1)
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
      .writeBoolean(false)
      .writeBoolean(this.isFlat);
  }
}

interface PlayerUpdateEntry {
  uuid: Uint8Array;
  name: string;
  gamemode: number;
  latency: number;
  displayName?: string;
}

type PlayerUpdateVariant<
  Action,
  Fields extends keyof PlayerUpdateEntry = "uuid",
> = {
  action: Action;
  entries: Pick<PlayerUpdateEntry, Fields | "uuid">[];
};

export type PlayerUpdate =
  | PlayerUpdateVariant<
    "add_player",
    "name" | "gamemode" | "latency" | "displayName"
  >
  | PlayerUpdateVariant<"update_latency", "latency">
  | PlayerUpdateVariant<"remove_player">;

export class ClientPlayerInfoPacket implements Packet<void> {
  constructor(public update: PlayerUpdate) {}

  write(writer: PacketWriter) {
    const { update } = this;
    if (update.action == "add_player") {
      writer.writeVarInt(0).writeVarInt(update.entries.length);
      for (const entry of update.entries) {
        writer.write(entry.uuid).writeString(entry.name)
          .writeVarInt(0)
          .writeVarInt(entry.gamemode)
          .writeVarInt(entry.latency)
          .writeBoolean(entry.displayName != null);
        if (entry.displayName != null) writer.writeString(entry.displayName);
      }
    } else if (update.action == "update_latency") {
      writer.writeVarInt(2).writeVarInt(update.entries.length);
      for (const entry of update.entries) {
        writer.write(entry.uuid).writeVarInt(entry.latency);
      }
    } else if (update.action == "remove_player") {
      writer.writeVarInt(4).writeVarInt(update.entries.length);
      for (const player of update.entries) {
        writer.write(player.uuid);
      }
    }
  }
}

export class ClientPlayerPositionAndLookPacket implements Packet<void> {
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
}

export const gameProtocol = new Protocol<ServerHandler, void>();

gameProtocol.registerServerbound(0x03, ServerChatPacket);
gameProtocol.registerServerbound(0x10, ServerKeepAlivePacket);

gameProtocol.registerClientbound(0x0e, ClientChatPacket);
gameProtocol.registerClientbound(0x19, ClientDisconnectPacket);
gameProtocol.registerClientbound(0x1f, ClientKeepAlivePacket);
gameProtocol.registerClientbound(0x24, ClientJoinGamePacket);
gameProtocol.registerClientbound(0x32, ClientPlayerInfoPacket);
gameProtocol.registerClientbound(0x34, ClientPlayerPositionAndLookPacket);
