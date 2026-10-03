// Photos as they were hard-coded, imported once by scripts/import-content.mts
import type { PhotographyProject } from "../../src/modules/content/types.ts";

const PHOTOS = "/assets/images/photography";

const photo = (id: string, title: string, file: string): PhotographyProject => ({
  id,
  title,
  image: `${PHOTOS}/${file}`,
});

/**
 * The grid and popover follow this order, loosely grouped by color: white,
 * green, blue, grey, gold, violet. The table scatters them. Size and color
 * are read from each file.
 */
export const photographyProjects: PhotographyProject[] = [
  photo("into-the-sea", "Into the sea", "s-joan-verhulst-4465-01.jpg"),
  photo("snow-on-the-dunes", "Snow on the dunes", "img-0038-pano-edit.jpg"),
  photo("in-the-shade", "In the shade", "photog_thumbnail7.jpg"),
  photo("white-tulips", "White tulips", "photog_thumbnail9.jpg"),
  photo("through-the-branches", "Through the branches", "img-0005.jpg"),
  photo("stepped-gable", "Stepped gable", "photog_thumbnail8.jpg"),
  photo("cloud-valley", "Cloud valley", "photog_thumbnail5.jpg"),
  photo("two-horses", "Two horses", "img-1859.jpg"),
  photo("storm-at-the-mill", "Storm at the mill", "seascape2.jpg"),
  photo("seafront", "Seafront", "img-0867w.jpg"),
  photo("storm-over-the-bridge", "Storm over the bridge", "img-1145.jpg"),
  photo("breaking-at-the-wall", "Breaking at the wall", "img-0001-edit.jpg"),
  photo("front-row", "Front row", "img-0002-edit-2.jpg"),
  photo("slow-water", "Slow water", "img-0985-2.jpg"),
  photo("fog-under-the-bridge", "Fog under the bridge", "img-0797-edit-4.jpg"),
  photo("between-the-posts", "Between the posts", "photog_thumbnail.jpg"),
  photo("groynes-in-grey", "Groynes in grey", "img-0026-edit.jpg"),
  photo("peaks-in-cloud", "Peaks in cloud", "photog_thumbnail3.jpg"),
  photo("sand-lines", "Sand lines", "img-0012-1-pano-edit.jpg"),
  photo("rocks-and-surf", "Rocks and surf", "img-2451-pano-edit2.jpg"),
  photo("boulevard-bench", "Boulevard bench", "photog_thumbnail10.jpg"),
  photo("fishing-for-two", "Fishing for two", "img-0041-edit.jpg"),
  photo("under-the-canopy", "Under the canopy", "photog_thumbnail2.jpg"),
  photo("platform", "Platform", "photog_thumbnail4.jpg"),
  photo("last-light", "Last light on the groynes", "2.jpg"),
  photo("two-posts", "Two posts", "img-0009-edit.jpg"),
  photo("gulls-at-sunset", "Gulls at sunset", "img-0002-edit.jpg"),
  photo("sun-path", "Sun path", "img-0011-pano-edit.jpg"),
  photo("golden-ripples", "Golden ripples", "img-0016-pano-edit.jpg"),
  photo("low-sun", "Low sun, low tide", "img-0004-edit.jpg"),
  photo("beached", "Beached", "img-2389-pano-2-edit.jpg"),
  photo("evening-walkers", "Evening walkers", "img-0027-pano-edit.jpg"),
  photo("sundown-on-the-flats", "Sundown on the flats", "img-1820-2.jpg"),
  photo("incoming-tide", "Incoming tide", "photog_thumbnail6.jpg"),
  photo("violet-tide", "Violet tide", "img-0022-pano-edit.jpg"),
  photo("afterglow", "Afterglow", "img-1517.jpg"),
  photo("milky-way", "Milky Way over the groynes", "img-1780.jpg"),
];
