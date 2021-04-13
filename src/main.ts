import { Server } from "./server.ts";

const server = new Server();
server.start();

for await (const _ of Deno.signal(Deno.Signal.SIGINT)) {
  await server.stop();
  Deno.exit();
}
