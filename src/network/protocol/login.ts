import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { Protocol } from "../protocol.ts";
import { Connection } from "../connection.ts";

export class ServerLoginHandler {
  constructor(private conn: Connection) {}

  async handleLoginStart(_loginStart: ServerLoginStartPacket) {
    await this.conn.sendPacket(
      new ClientLoginDisconnectPacket("Login not yet implemented"),
    );
    this.conn.close();
  }
}

export class ClientLoginDisconnectPacket implements Packet<ServerLoginHandler> {
  static read(reader: PacketReader) {
    return new this(reader.readJSON());
  }

  constructor(public reason: any) {}

  write(writer: PacketWriter) {
    writer.writeJSON(this.reason);
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
loginProtocol.registerServerbound(0, ServerLoginStartPacket);
loginProtocol.registerClientbound(0, ClientLoginDisconnectPacket);
