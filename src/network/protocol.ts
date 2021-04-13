import {
  Packet,
  PacketConstructor,
  PacketReader,
  PacketWriter,
} from "./packet.ts";

export class Protocol<PacketHandler> {
  private idToConstructor = new Map<number, PacketConstructor>();
  private constructorToId = new Map<PacketConstructor, number>();

  registerServerbound(id: number, constructor: PacketConstructor) {
    this.idToConstructor.set(id, constructor);
  }

  registerClientbound(id: number, constructor: PacketConstructor) {
    this.constructorToId.set(constructor, id);
  }

  deserialize(buf: Uint8Array): Packet<PacketHandler> {
    const reader = new PacketReader(buf);
    const id = reader.readVarInt();
    const constructor = this.idToConstructor.get(id);

    if (!constructor) {
      throw new Error(`Invalid packet id ${id}`);
    }

    return constructor.read(reader);
  }

  serialize(packet: Packet<PacketHandler>): Uint8Array {
    const id = this.constructorToId.get(
      packet.constructor as unknown as PacketConstructor,
    );

    if (id == null) {
      throw new Error(`Packet ${packet.constructor.name} not registered`);
    }

    const writer = new PacketWriter();
    writer.writeVarInt(id);
    packet.write(writer);
    return writer.bytes();
  }
}
