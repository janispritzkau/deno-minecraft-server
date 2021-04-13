import { Server } from "../server.ts";
import { Connection } from "../network/connection.ts";

export class Player {
  latency = -1

  constructor(
    public server: Server,
    public conn: Connection,
    public eid: number,
    public uuid: Uint8Array,
    public name: string,
  ) {}
}
