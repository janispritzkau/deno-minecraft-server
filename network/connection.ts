import * as zlib from "https://deno.land/x/compress/zlib/mod.ts";
import { Packet, PacketReader, PacketWriter } from "./packet.ts";
import { Protocol } from "./protocol.ts";
import { PacketHandler } from "./packet_handler.ts";

export class Connection {
  readonly conn: Deno.Conn;

  private buf: Uint8Array;
  private pos = 0;
  private bytesRead = 0;
  private skipRead = false;
  private closed = false;

  private isServer = false;
  private protocol: Protocol<unknown, unknown> | null = null;
  private handler: PacketHandler | null = null;

  private compressionThreshold = -1;

  constructor(conn: Deno.Conn) {
    this.conn = conn;
    this.buf = new Uint8Array(256);
  }

  setServerProtocol<H>(
    protocol: Protocol<H, unknown>,
    handler: H & PacketHandler | null,
  ) {
    this.isServer = true;
    this.protocol = protocol;
    this.handler = handler;
  }

  setClientProtocol<H>(
    protocol: Protocol<unknown, H>,
    handler: H & PacketHandler | null,
  ) {
    this.isServer = false;
    this.protocol = protocol;
    this.handler = handler;
  }

  async sendPacket(packet: Packet<unknown>) {
    if (!this.protocol) throw new Error("No protocol set");
    await this.send(
      this.isServer
        ? this.protocol.serializeClientbound(packet)
        : this.protocol.serializeServerbound(packet),
    );
  }

  async receivePacket() {
    const buf = await this.receive();
    if (!buf) return null;
    if (!this.protocol) throw new Error("No protocol set");
    const packet = this.isServer
      ? this.protocol.deserializeServerbound(buf)
      : this.protocol.deserializeClientbound(buf);
    if (this.handler) await packet.handle?.(this.handler);
    return packet;
  }

  async send(buf: Uint8Array) {
    if (this.compressionThreshold != -1) {
      if (buf.length < this.compressionThreshold) {
        buf = new PacketWriter().writeVarInt(0)
          .write(buf).bytes();
      } else {
        buf = new PacketWriter().writeVarInt(buf.length)
          .write(zlib.deflate(buf)).bytes();
      }
    }

    await this.conn.write(
      new PacketWriter().writeVarInt(buf.byteLength).write(buf).bytes(),
    );
  }

  async receive() {
    if (this.closed) return null;

    // copy the unread part of the buffer to the front
    if (this.bytesRead) {
      this.buf.copyWithin(0, this.bytesRead, this.pos);
      this.pos -= this.bytesRead;
      this.bytesRead = 0;
    }

    while (true) {
      if (this.pos == this.buf.byteLength) throw new Error("Packet too big");

      if (this.pos == 0 || !this.skipRead) {
        const len = await this.conn.read(this.buf.subarray(this.pos));
        if (!len) return null;
        this.pos += len;
      }

      this.skipRead = false;

      const reader = new PacketReader(this.buf.subarray(0, this.pos));

      let packetLen: number;
      try {
        packetLen = reader.readVarInt();
      } catch (e) {
        if (this.pos >= 5) throw e; // max length of a varint is 5
        continue;
      }

      if (packetLen == 0) {
        throw new Error("Packet length can't be zero");
      }

      const packetStart = reader.bytesRead();
      const packetEnd = packetStart + packetLen;

      if (packetEnd <= this.pos) {
        // skip reading a packet the next time the method is called,
        // since there might still be an unread packet in the buffer
        this.skipRead = true;
        this.bytesRead = packetEnd;

        let packetBuf: Uint8Array;
        if (this.compressionThreshold != -1) {
          const uncompressedSize = reader.readVarInt();
          packetBuf = this.buf.subarray(reader.bytesRead(), packetEnd);
          if (uncompressedSize != 0) {
            packetBuf = zlib.inflate(packetBuf);
          }
        } else {
          packetBuf = this.buf.subarray(packetStart, packetEnd);
        }

        return packetBuf;
      }
    }
  }

  close() {
    if (this.closed) return;
    this.conn.close();
    this.handler?.onDisconnect?.();
    this.closed = true;
  }

  setCapacity(capacity: number) {
    const oldBuf = this.buf;
    this.buf = new Uint8Array(capacity);
    this.buf.set(oldBuf.subarray(0, this.pos));
  }

  setCompression(threshold: number) {
    this.compressionThreshold = threshold;
  }
}
