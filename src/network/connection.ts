import * as zlib from "https://deno.land/x/compress@v0.3.8/zlib/mod.ts";

import { PacketReader, PacketWriter } from "./packet.ts";

export class Connection {
  private buf: Uint8Array;
  private pos = 0;
  private bytesRead = 0;
  private skipRead = false;
  private compressionThreshold = -1;

  constructor(
    private conn: Deno.Writer & Deno.Reader & Deno.Closer,
    bufCapacity = 1024 * 1024,
  ) {
    this.buf = new Uint8Array(bufCapacity);
  }

  setCompression(threshold: number) {
    this.compressionThreshold = threshold;
  }

  close() {
    this.conn.close();
  }

  async send(buf: Uint8Array) {
    if (this.compressionThreshold != -1) {
      if (buf.byteLength < this.compressionThreshold) {
        buf = new PacketWriter()
          .writeVarInt(0)
          .write(buf)
          .bytes();
      } else {
        buf = new PacketWriter()
          .writeVarInt(buf.byteLength)
          .write(zlib.deflate(buf))
          .bytes();
      }
    }

    await this.conn.write(
      new PacketWriter().writeVarInt(buf.byteLength).write(buf).bytes(),
    );
  }

  async receive(): Promise<Uint8Array | null> {
    if (this.bytesRead) {
      this.buf.copyWithin(0, this.bytesRead, this.pos);
      this.pos -= this.bytesRead;
      this.bytesRead = 0;
    }

    while (true) {
      if (this.pos == this.buf.byteLength) {
        throw new Error("Packet too big");
      }

      if (this.pos == 0 || !this.skipRead) {
        const len = await this.conn.read(this.buf.subarray(this.pos));
        if (len == null) break;
        this.pos += len;
      }

      this.skipRead = false;

      const reader = new PacketReader(this.buf.subarray(0, this.pos));

      let packetLen: number;
      try {
        packetLen = reader.readVarInt();
      } catch (e) {
        if (this.pos >= 5) throw e;
        continue;
      }

      if (packetLen == 0) {
        throw new Error("Packet length can't be zero");
      }

      const packetEnd = reader.pos + packetLen;

      if (packetEnd <= this.pos) {
        let packetBuf: Uint8Array;
        if (this.compressionThreshold != -1) {
          const uncompressedSize = reader.readVarInt();
          packetBuf = this.buf.subarray(reader.pos, packetEnd);
          if (uncompressedSize != 0) {
            packetBuf = zlib.inflate(packetBuf);
          }
        } else {
          packetBuf = this.buf.subarray(reader.pos, packetEnd);
        }

        this.skipRead = true;
        this.bytesRead = packetEnd;
        return packetBuf;
      }
    }

    this.conn.close();
    return null;
  }
}
