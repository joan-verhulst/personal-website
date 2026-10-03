// Records as they were hard-coded, imported once by scripts/import-content.mts
import type { RotationRecord } from "../../src/modules/content/types.ts";

const COVERS = "/assets/images/on-rotation";

export const onRotation: RotationRecord[] = [
  {
    id: "the-search-for-everything",
    type: "album",
    title: "The Search for Everything",
    artist: "John Mayer",
    cover: `${COVERS}/the-search-for-everything.jpg`,
    favoriteSong: { appleId: 1224353029, title: "Helpless" },
  },
  {
    id: "dandelion",
    type: "album",
    title: "Dandelion",
    artist: "Ella Langley",
    cover: `${COVERS}/dandelion.jpg`,
    favoriteSong: { appleId: 1869436839, title: "Choosin' Texas" },
  },
  {
    id: "where-the-light-is",
    type: "album",
    title: "Where the Light Is",
    artist: "John Mayer",
    cover: `${COVERS}/where-the-light-is.jpg`,
    favoriteSong: { appleId: 388127554, title: "I'm Gonna Find Another You" },
  },
  {
    id: "the-road-less-traveled",
    type: "album",
    title: "The Road Less Traveled",
    artist: "George Strait",
    cover: `${COVERS}/the-road-less-traveled.jpg`,
    favoriteSong: { appleId: 1440800201, title: "Run" },
  },
  {
    id: "the-great-american-bar-scene",
    type: "album",
    title: "The Great American Bar Scene",
    artist: "Zach Bryan",
    cover: `${COVERS}/the-great-american-bar-scene.jpg`,
    favoriteSong: { appleId: 1819829896, title: "The Great American Bar Scene" },
  },
];
