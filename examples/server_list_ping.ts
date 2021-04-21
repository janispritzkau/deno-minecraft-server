import { Connection } from "../network/connection.ts";

import {
  handshakeProtocol,
  ServerHandshakePacket,
} from "../network/protocol/handshake.ts";

import {
  ClientStatusPongPacket,
  ClientStatusResponsePacket,
  ServerStatusPingPacket,
  ServerStatusRequestPacket,
  statusProtocol,
} from "../network/protocol/status.ts";

const hostname = Deno.args[0] ?? "127.0.0.1";
const port = parseInt(Deno.args[1] ?? "25565");

const conn = new Connection(await Deno.connect({ hostname, port }));

conn.setClientProtocol(handshakeProtocol, null);
conn.setCapacity(128 * 1024);

await conn.sendPacket(new ServerHandshakePacket(754, hostname, port, 1));

conn.setClientProtocol(statusProtocol, null);

await conn.sendPacket(new ServerStatusRequestPacket());

let packet = await conn.receivePacket();
if (packet == null) throw new Error("Connection closed");

if (!(packet instanceof ClientStatusResponsePacket)) {
  throw new Error("Wrong packet");
}

const status = packet.status as Record<string, unknown>;

await conn.sendPacket(new ServerStatusPingPacket(BigInt(Date.now())));
const start = performance.now();

packet = await conn.receivePacket();
if (packet == null) throw new Error("Connection closed");

if (!(packet instanceof ClientStatusPongPacket)) {
  throw new Error("Wrong packet");
}

const ping = performance.now() - start;

console.log({
  ...status,
  ping: Math.round(ping * 10) / 10,
});
