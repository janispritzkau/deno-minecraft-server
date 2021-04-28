import { Server } from "./server.ts";
import { Connection } from "../network/connection.ts";

import { gameProtocol } from "../network/protocol/game.ts";
import { createGameHandler, GameHandler } from "./handler/game.ts";

export class Player {
  latency = -1;
  gamemode = 0

  private handler: GameHandler;

  constructor(
    public server: Server,
    public conn: Connection,
    public uuid: Uint8Array,
    public name: string,
    public eid: number,
  ) {
    this.handler = createGameHandler(server, this, conn);
    conn.setServerProtocol(gameProtocol, this.handler);
  }

  async tick() {
    await this.handler.tick();
  }
}
