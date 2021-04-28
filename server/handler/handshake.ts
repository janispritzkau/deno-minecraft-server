import { Connection } from "../../network/connection.ts";
import { Server } from "../server.ts";

import { ServerHandshakePacketHandler } from "../../network/protocol/handshake.ts";

import { statusProtocol } from "../../network/protocol/status.ts";
import { createStatusHandler } from "./status.ts";

import {
  ClientLoginDisconnectPacket,
  loginProtocol,
} from "../../network/protocol/login.ts";
import { createLoginHandler } from "./login.ts";

export function createHandshakeHandler(
  server: Server,
  conn: Connection,
): ServerHandshakePacketHandler {
  return {
    async handleHandshake(handshake) {
      if (handshake.nextState == 1) {
        conn.setServerProtocol(
          statusProtocol,
          createStatusHandler(server, conn),
        );
      } else if (handshake.nextState == 2) {
        conn.setServerProtocol(
          loginProtocol,
          createLoginHandler(server, conn),
        );

        if (handshake.protocol != 754) {
          await conn.sendPacket(
            new ClientLoginDisconnectPacket({
              translate: `multiplayer.disconnect.${
                handshake.protocol < 754 ? "outdated_client" : "incompatible"
              }`,
              with: ["1.16.5"],
            }),
          );
        }
      } else {
        conn.close();
      }
    },
  };
}
