import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { Protocol } from "../protocol.ts";
import { Connection } from "../connection.ts";
import { ServerStatusHandler, statusProtocol } from "./status.ts";
import { loginProtocol, ServerLoginHandler } from "./login.ts";

export class ServerHandshakeHandler {
  constructor(private conn: Connection) {}

  handleHandshake(handshake: ServerHandshakePacket) {
    switch (handshake.nextState) {
      case 1:
        return this.conn.setProtocol(
          statusProtocol,
          new ServerStatusHandler(this.conn),
        );
      case 2:
        return this.conn.setProtocol(
          loginProtocol,
          new ServerLoginHandler(this.conn),
        );
      default:
        throw new Error("Invalid next state");
    }
  }
}

export class ServerHandshakePacket implements Packet<ServerHandshakeHandler> {
  static read(reader: PacketReader) {
    return new this(
      reader.readVarInt(),
      reader.readString(),
      reader.readUnsignedShort(),
      reader.readVarInt(),
    );
  }

  constructor(
    public protocol: number,
    public hostname: string,
    public port: number,
    public nextState: number,
  ) {}

  write(writer: PacketWriter) {
    writer
      .writeVarInt(this.protocol)
      .writeString(this.hostname)
      .writeUnsignedShort(this.port)
      .writeVarInt(this.nextState);
  }

  handle(handler: ServerHandshakeHandler) {
    handler.handleHandshake(this);
  }
}

export const handshakeProtocol = new Protocol<ServerHandshakeHandler>();
handshakeProtocol.registerServerbound(0, ServerHandshakePacket);
