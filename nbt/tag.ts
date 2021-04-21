import { NBTWriter } from "./writer.ts";

export interface Tag {
  valueOf(): unknown;
  getId(): number;
  write(writer: NBTWriter): void;
}

export class ByteTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 1;
  }

  write(writer: NBTWriter) {
    writer.writeByte(this.value);
  }
}

export class ShortTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 2;
  }

  write(writer: NBTWriter) {
    writer.writeShort(this.value);
  }
}

export class IntTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 3;
  }

  write(writer: NBTWriter) {
    writer.writeInt(this.value);
  }
}

export class LongTag implements Tag {
  constructor(private value: bigint) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 4;
  }

  write(writer: NBTWriter) {
    writer.writeLong(this.value);
  }
}

export class FloatTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 5;
  }

  write(writer: NBTWriter) {
    writer.writeFloat(this.value);
  }
}

export class DoubleTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 6;
  }

  write(writer: NBTWriter) {
    writer.writeDouble(this.value);
  }
}

export class ByteArrayTag implements Tag {
  constructor(private value: Uint8Array) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 7;
  }

  write(writer: NBTWriter) {
    writer.writeByteArray(this.value);
  }
}

export class StringTag implements Tag {
  constructor(private value: string) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 8;
  }

  write(writer: NBTWriter) {
    writer.writeString(this.value);
  }
}

export class ListTag<T extends Tag> implements Tag {
  constructor(private tags: T[] = []) {}

  valueOf() {
    return this.tags;
  }

  getId() {
    return 9;
  }

  write(writer: NBTWriter) {
    writer.writeList(this.tags);
  }
}

export class CompoundTag implements Tag {
  constructor(private tags = new Map<string, Tag>()) {}

  valueOf() {
    return this.tags;
  }

  getId() {
    return 10;
  }

  write(writer: NBTWriter) {
    writer.writeCompound(this.tags);
  }

  set(key: string, tag: Tag) {
    this.tags.set(key, tag);
    return this;
  }

  has(key: string) {
    return this.tags.has(key);
  }

  get(key: string) {
    return this.tags.get(key) ?? null;
  }

  setByte(key: string, value: number) {
    return this.set(key, new ByteTag(value));
  }

  getByte(key: string) {
    return ensureTagType(this.get(key), ByteTag).valueOf();
  }

  setShort(key: string, value: number) {
    return this.set(key, new ShortTag(value));
  }

  getShort(key: string) {
    return ensureTagType(this.get(key), ShortTag).valueOf();
  }

  setInt(key: string, value: number) {
    return this.set(key, new IntTag(value));
  }

  getInt(key: string) {
    return ensureTagType(this.get(key), IntTag).valueOf();
  }

  setLong(key: string, value: bigint) {
    return this.set(key, new LongTag(value));
  }

  getLong(key: string) {
    return ensureTagType(this.get(key), LongTag).valueOf();
  }

  setFloat(key: string, value: number) {
    return this.set(key, new FloatTag(value));
  }

  getFloat(key: string) {
    return ensureTagType(this.get(key), FloatTag).valueOf();
  }

  setDouble(key: string, value: number) {
    return this.set(key, new DoubleTag(value));
  }

  getDouble(key: string) {
    return ensureTagType(this.get(key), DoubleTag).valueOf();
  }

  setByteArray(key: string, value: Uint8Array) {
    return this.set(key, new ByteArrayTag(value));
  }

  getByteArray(key: string) {
    return ensureTagType(this.get(key), ByteArrayTag).valueOf();
  }

  setString(key: string, value: string) {
    return this.set(key, new StringTag(value));
  }

  getString(key: string) {
    return ensureTagType(this.get(key), StringTag).valueOf();
  }

  setList<T extends Tag>(key: string, value: T[]) {
    return this.set(key, new ListTag(value));
  }

  getList(key: string) {
    return ensureTagType(this.get(key), ListTag).valueOf();
  }

  setCompound(key: string, value: CompoundTag) {
    return this.set(key, value);
  }

  getCompound(key: string) {
    return ensureTagType(this.get(key), CompoundTag);
  }

  getCompoundList(key: string) {
    return ensureTagListType(this.getList(key), CompoundTag);
  }

  setIntArray(key: string, value: Int32Array) {
    return this.set(key, new IntArrayTag(value));
  }

  getIntArray(key: string) {
    return ensureTagType(this.get(key), IntArrayTag).valueOf();
  }

  setLongArray(key: string, value: BigInt64Array) {
    return this.set(key, new LongArrayTag(value));
  }

  getLongArray(key: string) {
    return ensureTagType(this.get(key), LongArrayTag).valueOf();
  }

  setBoolean(key: string, value: boolean) {
    return this.setByte(key, Number(value));
  }

  getBoolean(key: string) {
    return Boolean(this.getByte(key));
  }
}

export class IntArrayTag implements Tag {
  constructor(private value: Int32Array) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 11;
  }

  write(writer: NBTWriter) {
    writer.writeIntArray(this.value);
  }
}

export class LongArrayTag implements Tag {
  constructor(private value: BigInt64Array) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 12;
  }

  write(writer: NBTWriter) {
    writer.writeLongArray(this.value);
  }
}

interface TagConstructor<Tag> {
  // deno-lint-ignore no-explicit-any
  new (...args: any): Tag;
}

function ensureTagType<T extends Tag>(
  tag: Tag | null,
  constructor: TagConstructor<T>,
) {
  if (tag == null) throw new Error("Tag not found");
  if (!(tag instanceof constructor)) {
    throw new Error(
      `Expected ${constructor.name} but got ${tag.constructor.name}`,
    );
  }
  return tag;
}

function ensureTagListType<T extends Tag>(
  list: Tag[],
  constructor: TagConstructor<T>,
) {
  if (list.length != 0) ensureTagType(list[0], constructor);
  return list as unknown as T[];
}
