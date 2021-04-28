import { Server } from "./server/server.ts";

new Server(Deno.listen({ port: 25565 }));
