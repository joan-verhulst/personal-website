import { type GearItem, type GearType, gear } from "~/data/favorites";

/**
 * Typesets the gear as a mail-order catalogue, the kind a general store kept
 * on its counter: a running head, a boxed department banner, every item in
 * its own ruled cell with a plate, a line of copy and its figures on dotted
 * leaders. Each page is drawn onto its own canvas, so its type and plates can
 * be printed through the ink shader as one sheet.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Department {
  title: string;
  items: GearItem[];
  // How heavily its pages are inked, 0 to 1. Set by eye for each department:
  // the cameras and lenses fill in sooner than the rest
  inkWeight: number;
}

const GROUPS: { title: string; types: GearType[]; inkWeight: number }[] = [
  { title: "Cameras & Optics", types: ["camera", "lens"], inkWeight: 0.45 },
  { title: "Film", types: ["film"], inkWeight: 0.6 },
  { title: "Guitars", types: ["guitar"], inkWeight: 0.6 },
];

/** A spread per department, in the order they are paged through. */
export const departments: Department[] = GROUPS.map(
  ({ title, types, inkWeight }) => ({
    title,
    items: gear.filter((item) => types.includes(item.type)),
    inkWeight,
  }),
).filter(({ items }) => items.length > 0);

export const INK = "#161616";
export const PAPER = "#f8f6f1";

export interface PageColors {
  ink: string;
  paper: string;
}

// The covers print in white on the site's blue
export const COVER_COLORS: PageColors = { ink: "#faf9f9", paper: "#3a9bd8" };

interface Sheet {
  ctx: CanvasRenderingContext2D;
  family: string;
  // One fiftieth of a page's width: what all type is sized in
  t: number;
  // The thinnest line that still prints
  hairline: number;
}

const setFont = (
  { ctx, family }: Sheet,
  size: number,
  weight = 400,
  tracking = "0px",
) => {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.letterSpacing = tracking;
};

// Breaks text where it would run past `maxWidth`
const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const rule = ({ ctx, hairline }: Sheet, x: number, y: number, width: number) =>
  ctx.fillRect(x, y, width, hairline);

// The maker comes first in a name, the model after it
const splitName = (name: string) => {
  const [maker, ...model] = name.split(" ");
  return model.length > 0
    ? { maker, model: model.join(" ") }
    : { maker: "", model: maker };
};

// The plate: a cut-out stands free, a cropped photo goes in a frame
const drawPlate = (
  sheet: Sheet,
  image: HTMLImageElement,
  box: Rect,
  isFramed: boolean,
) => {
  const { ctx, t, hairline } = sheet;
  if (box.width <= 0 || box.height <= 0) return;

  let area = box;
  if (isFramed) {
    // Sized to the photo's own proportions, with a double rule around it
    const ratio = image.naturalWidth / image.naturalHeight;
    const height = Math.min(box.height, box.width / ratio);
    const width = height * ratio;
    area = {
      x: box.x + (box.width - width) / 2,
      y: box.y + (box.height - height) / 2,
      width,
      height,
    };
    ctx.lineWidth = hairline * 2;
    ctx.strokeRect(area.x, area.y, area.width, area.height);
    const inset = 0.6 * t;
    ctx.lineWidth = hairline;
    ctx.strokeRect(
      area.x + inset,
      area.y + inset,
      area.width - inset * 2,
      area.height - inset * 2,
    );
    const pad = inset * 2;
    area = {
      x: area.x + pad,
      y: area.y + pad,
      width: area.width - pad * 2,
      height: area.height - pad * 2,
    };
  }

  const ratio = image.naturalWidth / image.naturalHeight;
  const fitsWidth = ratio > area.width / area.height;
  const width = fitsWidth ? area.width : area.height * ratio;
  const height = fitsWidth ? area.width / ratio : area.height;
  ctx.drawImage(
    image,
    area.x + (area.width - width) / 2,
    area.y + (area.height - height) / 2,
    width,
    height,
  );
};

// A figure on a dotted leader, where a store would print the price
const drawFigures = (
  sheet: Sheet,
  item: GearItem,
  x: number,
  bottom: number,
  width: number,
) => {
  const { ctx, t, hairline } = sheet;
  const row = Math.max(2.5 * t, 15);
  const label = Math.max(1.1 * t, 8);
  const value = Math.max(1.3 * t, 9.5);
  let y = bottom - row * item.stats.length;
  const top = y;

  for (const stat of item.stats) {
    const baseline = y + row * 0.72;
    setFont(sheet, label, 500, "0.14em");
    ctx.textAlign = "left";
    ctx.fillText(stat.label.toUpperCase(), x, baseline);
    const labelWidth = ctx.measureText(stat.label.toUpperCase()).width;

    setFont(sheet, value, 700);
    ctx.textAlign = "right";
    ctx.fillText(stat.value, x + width, baseline);
    const valueWidth = ctx.measureText(stat.value).width;

    ctx.save();
    ctx.lineWidth = hairline;
    ctx.setLineDash([hairline, hairline * 3]);
    ctx.beginPath();
    ctx.moveTo(x + labelWidth + 0.8 * t, baseline - hairline);
    ctx.lineTo(x + width - valueWidth - 0.8 * t, baseline - hairline);
    ctx.stroke();
    ctx.restore();
    y += row;
  }
  return top;
};

// One item in its cell: wide cells set the plate beside the copy, tall ones
// set it between the heading and the copy
const drawCell = (
  sheet: Sheet,
  item: GearItem,
  image: HTMLImageElement,
  cell: Rect,
) => {
  const { ctx, t } = sheet;
  const { maker, model } = splitName(item.name);
  const isFramed = item.fit === "cover";
  const isWide = cell.width > cell.height * 1.5;
  const small = Math.max(1.2 * t, 8.5);
  const copy = Math.max(1.3 * t, 9.5);

  if (isWide) {
    const plateWidth = cell.width * 0.4;
    drawPlate(
      sheet,
      image,
      { x: cell.x, y: cell.y, width: plateWidth, height: cell.height },
      isFramed,
    );

    const x = cell.x + plateWidth + 2 * t;
    const width = cell.width - plateWidth - 2 * t;
    let y = cell.y + small;
    ctx.textAlign = "left";
    setFont(sheet, small, 500, "0.2em");
    ctx.fillText(maker.toUpperCase(), x, y);

    const heading = Math.max(2.4 * t, 16);
    setFont(sheet, heading, 800, "0.02em");
    for (const line of wrap(ctx, model.toUpperCase(), width).slice(0, 2)) {
      y += heading * 1.02;
      ctx.fillText(line, x, y);
    }

    const figuresTop = drawFigures(sheet, item, x, cell.y + cell.height, width);
    setFont(sheet, copy, 400);
    ctx.textAlign = "left";
    y += 0.8 * t;
    for (const line of wrap(ctx, item.blurb, width)) {
      if (y + copy * 1.3 > figuresTop - 0.4 * t) break;
      y += copy * 1.3;
      ctx.fillText(line, x, y);
    }
    return;
  }

  const centre = cell.x + cell.width / 2;
  let y = cell.y + small;
  ctx.textAlign = "center";
  setFont(sheet, small, 500, "0.2em");
  ctx.fillText(maker.toUpperCase(), centre, y);

  const heading = Math.max(3 * t, 18);
  setFont(sheet, heading, 800, "0.02em");
  for (const line of wrap(ctx, model.toUpperCase(), cell.width).slice(0, 2)) {
    y += heading * 1.02;
    ctx.fillText(line, centre, y);
  }

  const figuresTop = drawFigures(
    sheet,
    item,
    cell.x,
    cell.y + cell.height,
    cell.width,
  );
  setFont(sheet, copy, 400);
  const lines = wrap(ctx, item.blurb, cell.width * 0.86).slice(0, 2);
  const copyTop = figuresTop - 1.2 * t - lines.length * copy * 1.3;
  ctx.textAlign = "center";
  lines.forEach((line, index) => {
    ctx.fillText(line, centre, copyTop + (index + 1) * copy * 1.3);
  });

  drawPlate(
    sheet,
    image,
    {
      x: cell.x + cell.width * 0.08,
      y: y + 1.6 * t,
      width: cell.width * 0.84,
      height: copyTop - y - 2.6 * t,
    },
    isFramed,
  );
};

interface PageContent {
  owner: string;
  department: string;
  items: GearItem[];
  images: Map<string, HTMLImageElement>;
  folio: number;
  // Shown boxed across the top of the department's first page
  hasBanner: boolean;
  // Printed in the bottom corner, where the page is turned
  turn: { label: string; side: "left" | "right" } | null;
}

const typesetPage = (sheet: Sheet, page: Rect, content: PageContent) => {
  const { ctx, t, hairline } = sheet;
  const margin = 3.2 * t;
  const x = page.x + margin;
  const width = page.width - margin * 2;
  const small = Math.max(1.15 * t, 8);

  // Running head
  let y = page.y + 2.4 * t + small;
  ctx.textAlign = "center";
  setFont(sheet, small, 500, "0.22em");
  ctx.fillText(
    `${content.owner}  ·  ${content.department}`.toUpperCase(),
    page.x + page.width / 2,
    y,
  );
  y += 1.1 * t;
  rule(sheet, x, y, width);
  y += 1.8 * t;

  // Department banner: a heavy box with a hairline inside it
  if (content.hasBanner) {
    const height = 5.4 * t;
    ctx.lineWidth = hairline * 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 0.9 * t);
    ctx.stroke();
    ctx.lineWidth = hairline;
    ctx.beginPath();
    ctx.roundRect(
      x + 0.6 * t,
      y + 0.6 * t,
      width - 1.2 * t,
      height - 1.2 * t,
      0.5 * t,
    );
    ctx.stroke();

    const banner = Math.max(2.4 * t, 15);
    setFont(sheet, banner, 800, "0.1em");
    ctx.textAlign = "center";
    ctx.fillText(
      content.department.toUpperCase(),
      page.x + page.width / 2,
      y + height / 2 + banner * 0.36,
    );
    y += height + 2 * t;
  }

  // The cells, one above the other with a rule between
  const bottom = page.y + page.height - 4.6 * t;
  const gap = 3.2 * t;
  const count = content.items.length;
  const cellHeight = (bottom - y - gap * (count - 1)) / Math.max(count, 1);
  content.items.forEach((item, index) => {
    const top = y + index * (cellHeight + gap);
    if (index > 0) rule(sheet, x, top - gap / 2, width);
    const image = content.images.get(item.id);
    if (image)
      drawCell(sheet, item, image, { x, y: top, width, height: cellHeight });
  });

  // Folio, and where to turn the page
  const foot = page.y + page.height - 1.9 * t;
  setFont(sheet, small, 500, "0.12em");
  ctx.textAlign = "center";
  ctx.fillText(`— ${content.folio} —`, page.x + page.width / 2, foot);
  if (content.turn) {
    const isLeft = content.turn.side === "left";
    ctx.textAlign = isLeft ? "left" : "right";
    setFont(sheet, small, 500, "0.18em");
    ctx.fillText(
      isLeft
        ? `◂ ${content.turn.label.toUpperCase()}`
        : `${content.turn.label.toUpperCase()} ▸`,
      isLeft ? x : x + width,
      foot,
    );
  }
};

/** A page of a department, with its items. */
interface ItemsPage {
  kind: "items";
  department: Department;
  items: GearItem[];
  folio: number;
  // Shown boxed across the top of the first page of a department
  hasBanner: boolean;
  // Printed in the bottom corner, where the page is turned
  turn: { label: string; side: "left" | "right" } | null;
  inkWeight: number;
}

/** One page of the catalogue: a cover, or a page of a department. */
export type CataloguePage =
  | ItemsPage
  | { kind: "front"; inkWeight: number; colors: PageColors }
  | { kind: "back"; inkWeight: number; colors: PageColors };

// The covers are inked like the first department, where their plate comes from
const COVER_INK = departments[0]?.inkWeight ?? 0.5;

/**
 * Every page in reading order, the covers included. They're bound in pairs:
 * an even index is the front of a leaf, which lies on the right while the
 * leaf is unturned, and the odd one after it is its back. So the front cover
 * comes first, its back is the first left page, and the back cover is last.
 */
export const pages: CataloguePage[] = [
  { kind: "front", inkWeight: COVER_INK, colors: COVER_COLORS },
  ...departments.flatMap<ItemsPage>((department, index) => {
    const previous = departments[index - 1];
    const next = departments[index + 1];
    // The first page takes the smaller half, so a lone item gets a page to itself
    const split = Math.floor(department.items.length / 2);

    return [
      {
        kind: "items",
        department,
        items: department.items.slice(0, split),
        folio: index * 2 + 2,
        hasBanner: true,
        turn: previous ? { label: previous.title, side: "left" } : null,
        inkWeight: department.inkWeight,
      },
      {
        kind: "items",
        department,
        items: department.items.slice(split),
        folio: index * 2 + 3,
        hasBanner: false,
        turn: next ? { label: next.title, side: "right" } : null,
        inkWeight: department.inkWeight,
      },
    ];
  }),
  { kind: "back", inkWeight: COVER_INK, colors: COVER_COLORS },
];

/**
 * The cover's title face: Google Sans Flex at its heaviest, a little wide,
 * with rounded ends. A canvas can't reach the rounded axis, so this is an
 * instance with it set, cut down to the letters of "gear". Remade with
 * fonts.googleapis.com/css2?family=Google+Sans+Flex:slnt,wdth,wght,ROND@-10,112,900,100&text=gear
 * (the semi-expanded face). The slant isn't in it, it's drawn.
 */
export const COVER_FONT = {
  family: "Gear Display",
  url: "/fonts/gear-display.ttf",
};

// How far the cover's type leans, like an italic
const SLANT = Math.tan((10 * Math.PI) / 180);

// Racing stripes, in shares of t: the inside one heaviest, thinning outwards
const STRIPES = [1.4, 1.2, 1, 0.7, 0.4];

/**
 * Stripes along the foot of the page that round the corner and run up past
 * its top. Mirrored, they start at the right edge instead.
 */
const drawStripes = (sheet: Sheet, page: Rect, isMirrored: boolean) => {
  const { ctx, t } = sheet;
  ctx.save();
  if (isMirrored) {
    ctx.translate(page.x * 2 + page.width, 0);
    ctx.scale(-1, 1);
  }
  // The corner they round, set from the foot so a taller page only gains
  // room above them
  const bend = { x: page.x + 33 * t, y: page.y + page.height - 20 * t };
  STRIPES.forEach((weight, index) => {
    const radius = (4 + index * 2) * t;
    ctx.lineWidth = weight * t;
    ctx.beginPath();
    ctx.moveTo(page.x, bend.y + radius);
    ctx.lineTo(bend.x, bend.y + radius);
    ctx.arc(bend.x, bend.y, radius, Math.PI / 2, 0, true);
    ctx.lineTo(bend.x + radius, page.y - t);
    ctx.stroke();
  });
  ctx.restore();
};

// Text that leans, from its baseline
const fillSlanted = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -SLANT, 1, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.restore();
};

// The plate on the front cover: the camera on the home page's Gear widget
const COVER_PLATE = "mamiya-rz67";

// The departments by their first word: Cameras, Film, Guitars
const SHORT_DEPARTMENTS = departments
  .map(({ title }) => title.split(" ")[0].toUpperCase())
  .join(" · ");

/**
 * A 1970s store catalogue: racing stripes, a fat rounded title that leans,
 * and the camera parked on the stripes.
 */
const typesetFront = (
  sheet: Sheet,
  page: Rect,
  owner: string,
  images: Map<string, HTMLImageElement>,
) => {
  const { ctx, t } = sheet;
  const left = page.x + 4 * t;
  const right = page.x + page.width - 4 * t;
  const foot = page.y + page.height - 3 * t;
  drawStripes(sheet, page, false);

  ctx.textAlign = "left";
  const title = Math.max(12.8 * t, 48);
  ctx.font = `900 ${title}px "${COVER_FONT.family}", ${sheet.family}`;
  ctx.letterSpacing = `${-0.3 * t}px`;
  fillSlanted(ctx, "gear", left, page.y + 12.6 * t);

  setFont(sheet, Math.max(1.3 * t, 9.5), 500);
  fillSlanted(
    ctx,
    "Cameras, film, guitars and the rest",
    left + 0.6 * t,
    page.y + 17.2 * t,
  );

  // Parked on the innermost stripe
  const image = images.get(COVER_PLATE);
  if (image) {
    const bottom = page.y + page.height - 16 * t - 0.7 * t;
    drawPlate(
      sheet,
      image,
      { x: page.x + 17 * t, y: bottom - 14.4 * t, width: 16 * t, height: 14.4 * t },
      false,
    );
  }

  const small = Math.max(1.05 * t, 8);
  setFont(sheet, small, 600, "0.16em");
  ctx.fillText(`${owner} catalogue`.toUpperCase(), left, foot);
  ctx.textAlign = "right";
  ctx.fillText(SHORT_DEPARTMENTS, right, foot);
};

// The back cover: only the stripes again, coming in from the spine
const typesetBack = (sheet: Sheet, page: Rect) => {
  drawStripes(sheet, page, true);
};

export interface PrintRun {
  owner: string;
  images: Map<string, HTMLImageElement>;
}

/**
 * Typesets one page, filling the canvas with it. The canvas is `scale` device
 * pixels per CSS pixel.
 */
export const drawPage = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  page: CataloguePage,
  { owner, images }: PrintRun,
  family: string,
  // Black on paper, for the ink to pick up. Without WebGPU the page is shown
  // as drawn, so a cover is drawn in its own colors
  colors: PageColors = { ink: INK, paper: PAPER },
) => {
  const sheet: Sheet = {
    ctx,
    family,
    t: width / 50,
    hairline: Math.max(1 / scale, 0.75),
  };

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = colors.ink;
  ctx.strokeStyle = colors.ink;
  ctx.textBaseline = "alphabetic";

  const area = { x: 0, y: 0, width, height };
  if (page.kind === "front") {
    typesetFront(sheet, area, owner, images);
    return;
  }
  if (page.kind === "back") {
    typesetBack(sheet, area);
    return;
  }
  typesetPage(sheet, area, {
    owner,
    images,
    department: page.department.title,
    items: page.items,
    folio: page.folio,
    hasBanner: page.hasBanner,
    turn: page.turn,
  });
};
