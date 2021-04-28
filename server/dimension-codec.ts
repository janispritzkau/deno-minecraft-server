import { CompoundTag } from "../nbt/mod.ts";

export const dimension = new CompoundTag()
  .setBoolean("piglin_safe", true)
  .setBoolean("natural", true)
  .setFloat("ambient_light", 0)
  .setString("infiniburn", "minecraft:infiniburn_end")
  .setBoolean("respawn_anchor_works", false)
  .setBoolean("has_skylight", true)
  .setBoolean("bed_works", true)
  .setString("effects", "minecraft:the_overworld")
  .setLong("fixed_time", 6000n)
  .setBoolean("has_raids", false)
  .setDouble("logical_height", 256)
  .setDouble("coordinate_scale", 1)
  .setBoolean("ultrawarm", false)
  .setBoolean("has_ceiling", false);

const worldGenBiomes: CompoundTag[] = [
  new CompoundTag()
    .setString("name", "minecraft:plains")
    .setInt("id", 1)
    .setCompound(
      "element",
      new CompoundTag()
        .setString("precipitation", "rain")
        .setCompound(
          "effects",
          new CompoundTag()
            .setInt("sky_color", 7907327)
            .setInt("water_fog_color", 329011)
            .setInt("fog_color", 12638463)
            .setInt("water_color", 4159204)
            .setCompound(
              "mood_sound",
              new CompoundTag()
                .setInt("tick_delay", 6000)
                .setDouble("offset", 2)
                .setString("sound", "minecraft:ambient.cave")
                .setInt("block_search_extend", 8),
            ),
        )
        .setFloat("depth", 0.125)
        .setFloat("temperature", 0.8)
        .setFloat("scale", 0.05)
        .setFloat("downfall", 0.4)
        .setString("category", "plains"),
    ),
];

export const dimensionCodec = new CompoundTag()
  .setCompound(
    "dimension_type",
    new CompoundTag()
      .setString("type", "minecraft:dimension_type")
      .setList("value", [
        new CompoundTag()
          .setString("name", "minecraft:overworld")
          .setInt("id", 0)
          .setCompound("element", dimension),
      ]),
  )
  .setCompound(
    "minecraft:worldgen/biome",
    new CompoundTag()
      .setString("type", "minecraft:worldgen/biome")
      .setList("value", worldGenBiomes),
  );
