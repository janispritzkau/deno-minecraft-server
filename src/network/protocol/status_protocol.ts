import { Protocol } from "../protocol.ts";
import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { ServerStatusHandler } from "./status_handler.ts";
import { ServerStatus } from "../../server/status.ts";

export class ClientStatusResponsePacket implements Packet<ServerStatusHandler> {
  static read(reader: PacketReader) {
    return new this(reader.readJSON());
  }

  constructor(public status: ServerStatus) {}

  write(writer: PacketWriter) {
    writer.writeJSON(this.status);
  }

  handle() {}
}

export class ClientStatusPongPacket implements Packet<ServerStatusHandler> {
  static read(reader: PacketReader) {
    return new this(reader.readLong());
  }

  constructor(public id: bigint) {}

  write(writer: PacketWriter) {
    writer.writeLong(this.id);
  }

  handle() {}
}

export class ServerStatusRequestPacket implements Packet<ServerStatusHandler> {
  static read() {
    return new this();
  }

  write() {}

  handle(handler: ServerStatusHandler) {
    handler.handleRequest();
  }
}

export class ServerStatusPingPacket implements Packet<ServerStatusHandler> {
  static read(reader: PacketReader) {
    return new this(reader.readLong());
  }

  constructor(public id: bigint) {}

  write(writer: PacketWriter) {
    writer.writeLong(this.id);
  }

  handle(handler: ServerStatusHandler) {
    handler.handlePing(this);
  }
}

export const statusProtocol = new Protocol<ServerStatusHandler>();
statusProtocol.registerServerbound(0x00, ServerStatusRequestPacket);
statusProtocol.registerServerbound(0x01, ServerStatusPingPacket);
statusProtocol.registerClientbound(0x00, ClientStatusResponsePacket);
statusProtocol.registerClientbound(0x01, ClientStatusPongPacket);
