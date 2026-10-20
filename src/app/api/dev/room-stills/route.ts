import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { STILL_PHASES } from "~/modules/about/room/stills";

const FOLDER = join(process.cwd(), "public", "about", "room");
const MOST_BYTES = 2_000_000;

export const POST = async (request: Request) => {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Not a form" }, { status: 400 });

  const pictures = STILL_PHASES.map((phase) => ({ phase, file: form.get(phase) }));
  for (const { phase, file } of pictures) {
    const isPicture = file instanceof File && file.type === "image/webp" && file.size < MOST_BYTES;
    if (!isPicture) {
      return Response.json({ error: `No ${phase} picture` }, { status: 400 });
    }
  }

  await mkdir(FOLDER, { recursive: true });
  for (const { phase, file } of pictures) {
    await writeFile(join(FOLDER, `${phase}.webp`), Buffer.from(await (file as File).arrayBuffer()));
  }
  return Response.json({ ok: true });
};
