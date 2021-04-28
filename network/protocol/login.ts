import { Protocol } from "../protocol.ts";
import { PacketHandler } from "../packet_handler.ts";
import { Packet, PacketReader, PacketWriter } from "../packet.ts";

export interface ServerLoginPacketHandler extends PacketHandler {
  handleLoginStart(packet: ServerLoginStart): Promise<void>;
}

type ServerHandler = ServerLoginPacketHandler;

export class ServerLoginStart implements Packet<ServerHandler> {
  constructor(public name: string) {}

  static read(reader: PacketReader) {
    return new this(reader.readString());
  }

  handle(handler: ServerHandler) {
    return handler.handleLoginStart(this);
  }
}

export class ClientLoginDisconnectPacket implements Packet<void> {
  constructor(public reason: unknown) {}

  write(writer: PacketWriter) {
    writer.writeJSON(this.reason);
  }
}

export class ClientLoginSuccessPacket implements Packet<void> {
  constructor(public uuid: Uint8Array, public username: string) {}

  write(writer: PacketWriter) {
    writer.write(this.uuid).writeString(this.username);
  }
}

export class ClientSetCompressionPacket implements Packet<void> {
  constructor(public compressionThreshold: number) {}

  write(writer: PacketWriter) {
    writer.writeVarInt(this.compressionThreshold);
  }
}

export const loginProtocol = new Protocol<ServerHandler, void>();

loginProtocol.registerServerbound(0x00, ServerLoginStart);

loginProtocol.registerClientbound(0x00, ClientLoginDisconnectPacket);
loginProtocol.registerClientbound(0x02, ClientLoginSuccessPacket);
loginProtocol.registerClientbound(0x03, ClientSetCompressionPacket);
