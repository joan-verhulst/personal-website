// Digital art as it was hard-coded, imported once by scripts/import-content.mts
import type { DigitalArtProject } from "../../src/modules/content/types.ts";

const project = (
  id: string,
  title: string,
  file: string,
): DigitalArtProject => ({
  id,
  title,
  image: `/assets/images/digital-art/${file}`,
});

export const digitalArtProjects: DigitalArtProject[] = [
  project("tree", "Tree", "tree.jpg"),
  project(
    "knight-in-the-woods",
    "Knight in the Woods",
    "knight-in-the-woods-v2.jpg",
  ),
  project("medieval-knight", "Medieval Knight", "medieval-knight.jpg"),
  project("orb-striking-down", "Orb Striking Down", "orb-striking-down.jpg"),
  project("woman-with-sword", "Woman with Sword", "woman-with-sword.jpg"),
  project("gladiator", "Gladiator", "gladiator2.jpg"),
  project("duality", "Duality", "duality.jpg"),
  project("magical-tree", "Magical Tree", "magical-tree.jpg"),
  project(
    "waterfall-landscape",
    "Waterfall Landscape",
    "waterfall-landscape-5.jpg",
  ),
  project("shipwreck", "Shipwreck", "shipwreck-3.jpg"),
  project("diving", "Diving", "diving.jpg"),
  project("swan", "Swan", "swan-2-flipped.jpg"),
  project("western", "Western", "western-color.jpg"),
  project("phaserunner", "Phaserunner", "phaserunner-edit-4.jpg"),
  project("landscape", "Landscape", "landscape-thing-whatever-2.jpg"),
  project("destroyed-planet", "Destroyed Planet", "destroyed-planet.jpg"),
  project("planet-nebula", "Planet Nebula", "planet-nebula.jpg"),
  project("bright-space", "Bright Space", "bright-space-orange.jpg"),
  project("space-landscape", "Space Landscape", "space-landscape-thing.jpg"),
  project("space-wallpaper", "Space Wallpaper", "space-wallpaper.jpg"),
  project("space-something", "Space Something", "space-something.jpg"),
];
