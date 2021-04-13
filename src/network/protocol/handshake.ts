import { Packet, PacketReader, PacketWriter } from "../packet.ts";
import { PacketHandler, Protocol } from "../protocol.ts";
import { Server } from "../../server.ts";
import { Connection } from "../connection.ts";

import { ServerStatusHandler, statusProtocol } from "./status.ts";
import {
  ClientLoginDisconnectPacket,
  loginProtocol,
  ServerLoginHandler,
} from "./login.ts";

export class ServerHandshakeHandler implements PacketHandler {
  constructor(private server: Server, private conn: Connection) {}

  async handleHandshake(handshake: ServerHandshakePacket) {
    switch (handshake.nextState) {
      case 1:
        return this.conn.setProtocol(
          statusProtocol,
          new ServerStatusHandler(this.server, this.conn),
        );
      case 2:
        this.conn.setProtocol(
          loginProtocol,
          new ServerLoginHandler(this.server, this.conn),
        );
        if (handshake.protocol != 754) {
          await this.conn.sendPacket(
            new ClientLoginDisconnectPacket({
              translate: `multiplayer.disconnect.${
                handshake.protocol < 754 ? "outdated_client" : "incompatible"
              }`,
              with: ["1.16.5"],
            }),
          );
          this.conn.close();
        }
        return;
      default:
        throw new Error("Invalid next state");
    }
  }

  handleDisconnect() {}
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
    return handler.handleHandshake(this);
  }
}

export const handshakeProtocol = new Protocol<ServerHandshakeHandler>();
handshakeProtocol.registerServerbound(0x00, ServerHandshakePacket);
