const textDecoder = new TextDecoder();

export class PacketReader {
  buf: Uint8Array;
  view: DataView;
  pos = 0;

  constructor(buf: Uint8Array) {
    this.buf = buf;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  readByte() {
    const x = this.view.getInt8(this.pos);
    this.pos += 1;
    return x;
  }

  readShort() {
    const x = this.view.getInt16(this.pos);
    this.pos += 2;
    return x;
  }

  readInt() {
    const x = this.view.getInt32(this.pos);
    this.pos += 4;
    return x;
  }

  readLong() {
    const x = this.view.getBigInt64(this.pos);
    this.pos += 8;
    return x;
  }

  readFloat() {
    const value = this.view.getFloat32(this.pos);
    this.pos += 4;
    return value;
  }

  readDouble() {
    const value = this.view.getFloat64(this.pos);
    this.pos += 8;
    return value;
  }

  readVarInt() {
    let x = 0, n = 0, b: number;
    do {
      b = this.readByte();
      x |= (b & 0x7f) << (7 * n);
      if (++n > 5) throw new Error("VarInt is too big");
    } while ((b & 0x80) != 0);
    return x;
  }

  readVarLong() {
    let x = 0n, n = 0n, b: number;
    do {
      b = this.readByte();
      x |= BigInt(b & 0x7f) << (7n * n);
      if (++n > 10n) throw new Error("VarInt is too big");
    } while ((b & 0x80) != 0);
    return BigInt.asIntN(64, x);
  }

  read(n: number) {
    if (this.pos + n > this.buf.byteLength) throw new Error("Not enough data");
    return this.buf.subarray(this.pos, this.pos += n);
  }

  readString(maxLen?: number) {
    const len = this.readVarInt();
    if (maxLen && len > maxLen) throw new Error("String is too long");
    return textDecoder.decode(this.read(len));
  }

  readJSON(maxLen?: number) {
    return JSON.parse(this.readString(maxLen));
  }
}

const textEncoder = new TextEncoder();

export class PacketWriter {
  buf: Uint8Array;
  view: DataView;
  pos = 0;

  constructor(capacity = 64) {
    this.buf = new Uint8Array(capacity);
    this.view = new DataView(
      this.buf.buffer,
      this.buf.byteOffset,
      this.buf.byteLength,
    );
  }

  bytes() {
    return this.buf.subarray(0, this.pos);
  }

  grow(n: number) {
    const capacity = this.buf.byteLength;
    if (this.pos + n <= capacity) return;

    const buf = this.buf;
    this.buf = new Uint8Array(capacity * 2 + n);
    this.buf.set(buf);
    this.view = new DataView(
      this.buf.buffer,
      this.buf.byteOffset,
      this.buf.byteLength,
    );
  }

  writeByte(x: number) {
    this.grow(1);
    this.view.setInt8(this.pos, x);
    return (this.pos += 1, this);
  }

  writeShort(x: number) {
    this.grow(2);
    this.view.setInt16(this.pos, x);
    return (this.pos += 2, this);
  }

  writeInt(x: number) {
    this.grow(4);
    this.view.setInt32(this.pos, x);
    return (this.pos += 4, this);
  }

  writeLong(x: bigint) {
    this.grow(8);
    this.view.setBigInt64(this.pos, x);
    return (this.pos += 8, this);
  }

  writeFloat(x: number) {
    this.grow(4);
    this.view.setFloat32(this.pos, x);
    return (this.pos += 4, this);
  }

  writeDouble(x: number) {
    this.grow(8);
    this.view.setFloat64(this.pos, x);
    return (this.pos += 8, this);
  }

  writeVarInt(x: number) {
    do {
      let b = x & 0x7f;
      x >>>= 7;
      if (x != 0) b |= 0x80;
      this.writeByte(b);
    } while (x != 0);
    return this;
  }

  writeVarLong(x: bigint) {
    x = BigInt.asUintN(64, x);
    do {
      let b = x & 0x7fn;
      x = BigInt.asUintN(64, x >> 7n);
      if (x != 0n) b |= 0x80n;
      this.writeByte(Number(b));
    } while (x != 0n);
    return this;
  }

  write(buf: Uint8Array) {
    this.grow(buf.byteLength);
    this.buf.set(buf, this.pos);
    this.pos += buf.byteLength;
    return this;
  }

  writeString(string: string) {
    const buf = textEncoder.encode(string);
    this.writeVarInt(buf.byteLength);
    this.write(buf);
    return this;
  }

  writeJSON<T>(value: T) {
    return this.writeString(JSON.stringify(value));
  }
}
