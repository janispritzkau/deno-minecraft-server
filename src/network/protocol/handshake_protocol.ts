import { Protocol } from "../protocol.ts";
import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { ServerHandshakeHandler } from "./handshake_handler.ts";

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
    return handler.handleHandshake(this);
  }
}

export const handshakeProtocol = new Protocol<ServerHandshakeHandler>();
handshakeProtocol.registerServerbound(0x00, ServerHandshakePacket);
