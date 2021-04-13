import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { PacketHandler, Protocol } from "../protocol.ts";
import { Connection } from "../connection.ts";
import { Server } from "../../server.ts";
import { ChatComponent } from "../../chat/mod.ts";
import { Md5 } from "https://deno.land/std/hash/md5.ts";

export class ServerLoginHandler implements PacketHandler {
  constructor(private server: Server, private conn: Connection) {}

  async handleLoginStart(loginStart: ServerLoginStartPacket) {
    // await this.conn.sendPacket(new ClientSetCompressionPacket(256));
    // this.conn.setCompression(256);

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
