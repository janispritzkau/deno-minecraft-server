import { PacketHandler } from "../packet_handler.ts";
import { Connection } from "../connection.ts";
import { Server } from "../../server.ts";
import { ServerHandshakePacket } from "./handshake_protocol.ts";
import { statusProtocol } from "./status_protocol.ts";
import { ServerStatusHandler } from "./status_handler.ts";
import {
  ClientLoginDisconnectPacket,
  loginProtocol,
} from "./login_protocol.ts";
import { ServerLoginHandler } from "./login_handler.ts";

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
