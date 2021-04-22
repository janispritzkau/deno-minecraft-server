import { Protocol } from "../protocol.ts";
import { PacketHandler } from "../packet_handler.ts";
import { Packet, PacketReader, PacketWriter } from "../packet.ts";

export interface ServerHandshakePacketHandler extends PacketHandler {
  handleHandshake(packet: ServerHandshakePacket): Promise<void>;
}

type ServerHandler = ServerHandshakePacketHandler;

export class ServerHandshakePacket implements Packet<ServerHandler> {
  constructor(
    public protocol: number,
    public hostname: string,
    public port: number,
    public nextState: number,
  ) {}

  static read(reader: PacketReader) {
    return new this(
      reader.readVarInt(),
      reader.readString(),
      reader.readUnsignedShort(),
      reader.readVarInt(),
    );
  }

  write(writer: PacketWriter) {
    writer.writeVarInt(this.protocol)
      .writeString(this.hostname)
      .writeUnsignedShort(this.port)
      .writeVarInt(this.nextState);
  }

  handle(handler: ServerHandler) {
    return handler.handleHandshake(this);
  }
}

export const handshakeProtocol = new Protocol<ServerHandler, void>();

handshakeProtocol.registerServerbound(0x00, ServerHandshakePacket);
