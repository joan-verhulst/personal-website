import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const FILE = join(process.cwd(), "src", "modules", "about", "room", "layout.json");

export const POST = async (request: Request) => {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const layout: unknown = await request.json().catch(() => null);
  const isLayout =
    typeof layout === "object" &&
    layout !== null &&
    "camera" in layout &&
    "room" in layout &&
    "pieces" in layout;
  if (!isLayout) {
    return Response.json({ error: "Not a room layout" }, { status: 400 });
  }

  await writeFile(FILE, `${JSON.stringify(layout, null, 2)}\n`);
  return Response.json({ ok: true });
};
