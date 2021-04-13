import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { Protocol } from "../protocol.ts";
import { Connection } from "../connection.ts";

export class ServerStatusHandler {
  constructor(private conn: Connection) {}

  handleRequest() {
    this.conn.sendPacket(
      new ClientStatusResponsePacket({
        description: "A Minecraft Server",
        version: {
          name: "1.16.5",
          protocol: 754,
        },
        players: { online: 0, max: 0 },
      }),
    );
  }

  handlePing(ping: ServerStatusPingPacket) {
    this.conn.sendPacket(new ClientStatusPongPacket(ping.id));
  }
}

export class ClientStatusResponsePacket implements Packet<ServerStatusHandler> {
  static read(reader: PacketReader) {
    return new this(reader.readJSON());
  }

  constructor(public status: any) {}

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
statusProtocol.registerServerbound(0, ServerStatusRequestPacket);
statusProtocol.registerServerbound(1, ServerStatusPingPacket);
statusProtocol.registerClientbound(0, ClientStatusResponsePacket);
statusProtocol.registerClientbound(1, ClientStatusPongPacket);
