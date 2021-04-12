import { Connection } from "./network/connection.ts";

export interface ServerConfig {
  hostname?: string;
  port?: number;
}

export const defaultServerConfig: Required<ServerConfig> = {
  hostname: "127.0.0.1",
  port: 25565,
};

export class Server {
  config: Required<ServerConfig>;
  private stopped = false;
  private listener?: Deno.Listener;

  constructor(config?: ServerConfig) {
    this.config = { ...defaultServerConfig, ...config };
  }

  start() {
    if (this.listener) throw new Error("Can't start server twice");
    this.startListening();
    console.log("server started");
  }

  stop() {
    if (this.stopped) throw new Error("Server already stopped");
    this.listener?.close();
    this.stopped = true;
    console.log("server stopped");
  }

  private async handleConnection(conn: Connection) {
    while (true) {
      const packet = await conn.receive();
      if (packet == null) break;
      console.log("received packet", packet);
    }
  }

  private startListening() {
    this.listener = Deno.listen(this.config);

    console.log(
      `listening on ${this.config.hostname}:${this.config.port}`,
    );

    Promise.resolve().then(async () => {
      for await (const conn of this.listener!) {
        const addr = conn.remoteAddr as Deno.NetAddr;
        console.log("new connection", `${addr.hostname}:${addr.port}`);

        this.handleConnection(new Connection(conn)).catch((e) => {
          console.error("error in connection handler", e);
        }).finally(() => {
          console.log("connection closed", `${addr.hostname}:${addr.port}`);
        });
      }
    }).catch((e) => {
      console.error("error in accept loop", e);
      this.stop();
    });
  }
}
