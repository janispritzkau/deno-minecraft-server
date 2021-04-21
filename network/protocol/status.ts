import { Protocol } from "../protocol.ts";
import { Packet, PacketReader, PacketWriter } from "../packet.ts";

export interface ServerStatusPacketHandler {
  handleRequest(packet: ServerStatusRequestPacket): Promise<void>;
  handlePing(packet: ServerStatusPingPacket): Promise<void>;
}

type ServerHandler = ServerStatusPacketHandler;

export class ServerStatusRequestPacket implements Packet<ServerHandler> {
  static read() {
    return new this();
  }

  write() {}

  handle(handler: ServerHandler) {
    return handler.handleRequest(this);
  }
}

export class ServerStatusPingPacket implements Packet<ServerHandler> {
  constructor(public id: bigint) {}

  static read(reader: PacketReader) {
    return new this(reader.readLong());
  }

  write(writer: PacketWriter) {
    writer.writeLong(this.id);
  }

  handle(handler: ServerHandler) {
    return handler.handlePing(this);
  }
}

export class ClientStatusResponsePacket implements Packet<void> {
  constructor(public status: unknown) {}

  static read(reader: PacketReader) {
    return new this(reader.readJSON());
  }

  write(writer: PacketWriter) {
    writer.writeJSON(this.status);
  }

  handle() {}
}

export class ClientStatusPongPacket implements Packet<void> {
  constructor(public id: bigint) {}

  static read(reader: PacketReader) {
    return new this(reader.readLong());
  }

  write(writer: PacketWriter) {
    writer.writeLong(this.id);
  }

  handle() {}
}

export const statusProtocol = new Protocol<ServerHandler, void>();

statusProtocol.registerServerbound(0x00, ServerStatusRequestPacket);
statusProtocol.registerServerbound(0x01, ServerStatusPingPacket);

statusProtocol.registerClientbound(0x00, ClientStatusResponsePacket);
statusProtocol.registerClientbound(0x01, ClientStatusPongPacket);