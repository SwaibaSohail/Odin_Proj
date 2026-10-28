#!/usr/bin/env node
// Copies the pictures and hiding spots from data.js into the database.
// Safe to run again: it updates what's there and keeps everyone's high scores.

const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const prisma = require("../src/lib/prisma");
const { characters, scenes } = require("./data");

async function main() {
  const characterIds = {};
  for (const [position, character] of characters.entries()) {
    const fields = { ...character, imageUrl: `/images/characters/${character.slug}.webp`, position };
    const saved = await prisma.character.upsert({
      where: { slug: character.slug },
      update: fields,
      create: fields,
    });
    characterIds[character.slug] = saved.id;
  }

  for (const [position, { spots, ...scene }] of scenes.entries()) {
    const fields = {
      ...scene,
      imageUrl: `/images/scenes/${scene.slug}.webp`,
      previewUrl: `/images/scenes/${scene.slug}-preview.webp`,
      position,
    };
    const saved = await prisma.scene.upsert({ where: { slug: scene.slug }, update: fields, create: fields });

    for (const [slug, [left, top, width, height]] of Object.entries(spots)) {
      const characterId = characterIds[slug];
      if (!characterId) throw new Error(`Unknown character "${slug}" in ${scene.slug}`);
      // Store the box as fractions of the image size.
      const box = { x: left / scene.width, y: top / scene.height, width: width / scene.width, height: height / scene.height };
      await prisma.spot.upsert({
        where: { sceneId_characterId: { sceneId: saved.id, characterId } },
        update: box,
        create: { ...box, sceneId: saved.id, characterId },
      });
    }

    // Remove any characters that no longer hide in this scene.
    await prisma.spot.deleteMany({
      where: { sceneId: saved.id, characterId: { notIn: Object.keys(spots).map((slug) => characterIds[slug]) } },
    });
  }

  console.log(`Done: ${scenes.length} pictures and ${characters.length} characters.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
