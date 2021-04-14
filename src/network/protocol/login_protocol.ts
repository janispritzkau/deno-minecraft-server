import { Protocol } from "../protocol.ts";
import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { ServerLoginHandler } from "./login_handler.ts";
import { ChatComponent } from "../../chat/mod.ts";

export class ClientLoginDisconnectPacket implements Packet<ServerLoginHandler> {
  static read(reader: PacketReader) {
    return new this(reader.readJSON());
  }

  constructor(public reason: ChatComponent) {}

  write(writer: PacketWriter) {
    writer.writeJSON(this.reason);
  }

  handle() {}
}

export class ClientLoginSuccessPacket implements Packet<ServerLoginHandler> {
  static read(reader: PacketReader) {
    return new this(reader.read(16), reader.readString());
  }

  constructor(public uuid: Uint8Array, public username: string) {}

  write(writer: PacketWriter) {
    writer
      .write(this.uuid)
      .writeString(this.username);
  }

  handle() {}
}

export class ClientSetCompressionPacket implements Packet<ServerLoginHandler> {
  static read(reader: PacketReader) {
    return new this(reader.readVarInt());
  }

  constructor(public compressionThreshold: number) {}

  write(writer: PacketWriter) {
    writer.writeVarInt(this.compressionThreshold);
  }

  handle() {}
}

export class ServerLoginStartPacket implements Packet<ServerLoginHandler> {
  static read(reader: PacketReader) {
    return new this(reader.readString());
  }

  constructor(public name: string) {}

  write(writer: PacketWriter) {
    writer.writeString(this.name);
  }

  handle(handler: ServerLoginHandler) {
    return handler.handleLoginStart(this);
  }
}

export const loginProtocol = new Protocol<ServerLoginHandler>();
loginProtocol.registerServerbound(0x00, ServerLoginStartPacket);
loginProtocol.registerClientbound(0x00, ClientLoginDisconnectPacket);
loginProtocol.registerClientbound(0x02, ClientLoginSuccessPacket);
loginProtocol.registerClientbound(0x03, ClientSetCompressionPacket);
