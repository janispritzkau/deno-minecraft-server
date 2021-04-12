import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";

import { CompoundTag, decodeCompoundTag, encodeCompoundTag } from "./mod.ts";

Deno.test("encode compound tag", () => {
  assertEquals(
    encodeCompoundTag(null),
    new Uint8Array([0]),
  );

  assertEquals(
    encodeCompoundTag(new CompoundTag()),
    new Uint8Array([10, 0, 0, 0]),
  );

  assertEquals(
    encodeCompoundTag(new CompoundTag().setByte("byte", -1)),
    new Uint8Array([10, 0, 0, 1, 0, 4, 98, 121, 116, 101, 255, 0]),
  );
});

Deno.test("decode compound tag", () => {
  assertEquals(decodeCompoundTag(new Uint8Array([0])), null);

  assertEquals(
    decodeCompoundTag(new Uint8Array([10, 0, 0, 0])),
    new CompoundTag(),
  );

  // empty buffer
  assertThrows(() => decodeCompoundTag(new Uint8Array()));

  // wrong root tag type
  assertThrows(() => decodeCompoundTag(new Uint8Array([1, 0, 0, 255])));
});
