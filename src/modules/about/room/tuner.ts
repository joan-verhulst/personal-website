
import { type Object3D, Raycaster, Vector2, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  overSaved,
  PIECE_KEYS,
  type PieceKey,
  type RoomLayout,
  savedLayout,
} from "~/modules/about/room/layout";
import type { Room } from "~/modules/about/room/room-scene";
import { homeHourAt } from "~/modules/about/room/schedule";
import { STILL_PHASES, stillHourOn } from "~/modules/about/room/stills";

const DRAFT_KEY = "room-layout-draft";
const SAVE_URL = "/api/dev/room-layout";
const STILLS_URL = "/api/dev/room-stills";
const STILL_WIDTH = 1280;
const STILL_QUALITY = 0.82;

const RAD = Math.PI / 180;
const DAY = 86_400_000;

const NAMES: Record<PieceKey, string> = {
  bed: "Bed",
  desk: "Desk",
  chair: "Chair",
  rug: "Rug",
  shelves: "Shelves",
  guitarNatural: "Natural guitar",
  guitarSunburst: "Sunburst guitar",
  electric: "Electric guitar",
  plant: "Plant",
  lamp: "Lamp",
  walkway: "Walkway (where I walk past)",
  headphones: "Headphones (open On Rotation)",
  turntable: "Record player (opens On Rotation)",
  frameLarge: "Frame, large",
  framePortrait: "Frame, portrait",
  frameSmall: "Frame, small",
  frameSquare: "Frame, square",
  frameLeftTall: "Frame, tall (left wall)",
  frameLeftSmall: "Frame, small (left wall)",
  frameNear: "Frame, landscape (left wall)",
  frameRight: "Frame (right wall)",
  shelfBooks: "Shelf with books",
  shelfTrinkets: "Shelf with trinkets",
  plantTall: "Tall plant",
  plantHanging: "Hanging plant",
  plantDesk: "Plant on the desk",
};

const SETTLES: PieceKey[] = ["bed", "chair", "walkway"];

export const readDraft = (): RoomLayout | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? overSaved(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const round = (value: number, places = 3) => Number(value.toFixed(places));

const refresh = (folder: GUI) => {
  for (const controller of folder.controllersRecursive()) controller.updateDisplay();
};

const assignDeep = (target: Record<string, unknown>, source: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object") {
      assignDeep(current as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = Array.isArray(value) ? [...value] : value;
    }
  }
};

export const attachTuner = (
  room: Room,
  { hasDraft, setOffset }: { hasDraft: boolean; setOffset: (ms: number) => void },
) => {
  const { tuning } = room;
  const { layout, camera, canvas, overlay, pieces } = tuning;
  tuning.setTuning(true);

  const state = {
    status: hasDraft ? "Unsaved changes from last time" : "Saved",
    selected: "Nothing yet: click something",
    shown: true,
    mode: "move" as "move" | "turn",
    snap: true,
    lockHeight: true,
    freeCamera: false,
    followClock: true,
    hour: round(homeHourAt(new Date()), 2),
    days: 0,
    activity: "auto",
  };
  let selected: PieceKey | null = null;

  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  const changed = () => {
    state.status = "Unsaved changes";
    tuning.relight();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(layout));
      } catch {}
    }, 300);
  };

  const drawStills = async () => {
    tuning.setActivity(null);
    const pictures = new FormData();
    try {
      for (const phase of STILL_PHASES) {
        state.status = `Drawing the ${phase} picture…`;
        const now = new Date();
        setOffset((stillHourOn(phase, now) - homeHourAt(now)) * 3_600_000);
        await tuning.whenSettled();
        const blob = await tuning.snapshot(STILL_WIDTH, "image/webp", STILL_QUALITY);
        if (!blob) throw new Error(`No ${phase} picture`);
        pictures.append(phase, blob, `${phase}.webp`);
      }
    } finally {
      applyTime();
      applyActivity();
    }
    const response = await fetch(STILLS_URL, { method: "POST", body: pictures });
    if (!response.ok) throw new Error(String(response.status));
  };

  const writeLayout = async (done: string) => {
    state.status = "Saving…";
    try {
      const response = await fetch(SAVE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(layout),
      });
      if (!response.ok) throw new Error(String(response.status));
      clearTimeout(draftTimer);
      localStorage.removeItem(DRAFT_KEY);
      state.status = done;
    } catch {
      state.status = "Couldn't save: is the dev server running?";
    }
  };

  // The layout only, the loading pictures stay as they were
  const save = () => writeLayout("Saved to layout.json");

  const saveWithStills = async () => {
    let hasStills = true;
    try {
      await drawStills();
      layout.stills = Date.now();
    } catch {
      hasStills = false;
    }
    await writeLayout(
      hasStills
        ? "Saved to layout.json, with the loading pictures"
        : "Saved to layout.json, but not the loading pictures",
    );
  };

  const picture = async () => {
    state.status = "Drawing the picture…";
    const blob = await tuning.snapshot(2400);
    if (!blob) {
      state.status = "Couldn't draw the picture";
      return;
    }
    const hour = state.followClock ? homeHourAt(new Date()) : state.hour;
    const hh = String(Math.floor(hour)).padStart(2, "0");
    const mm = String(Math.floor((hour % 1) * 60)).padStart(2, "0");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `room-${hh}${mm}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    state.status = `Saved room-${hh}${mm}.png`;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(layout, null, 2));
      state.status = "Copied as JSON";
    } catch {
      state.status = "Couldn't copy";
    }
  };

  // Made, the controls turn the camera to their own target, the room's
  // middle: back to the layout's view, which the loading pictures are drawn
  // from
  const orbit = new OrbitControls(camera, canvas);
  orbit.enabled = false;
  orbit.target.fromArray(layout.camera.target);
  tuning.applyCamera();
  const gizmo = new TransformControls(camera, canvas);
  overlay.add(gizmo.getHelper());
  gizmo.addEventListener("dragging-changed", (event) => {
    orbit.enabled = state.freeCamera && !event.value;
  });

  const applyGizmo = () => {
    if (state.mode === "move") {
      gizmo.setMode("translate");
      gizmo.showX = true;
      gizmo.showY = !state.lockHeight;
      gizmo.showZ = true;
      gizmo.setTranslationSnap(state.snap ? 0.05 : null);
    } else {
      gizmo.setMode("rotate");
      gizmo.showX = false;
      gizmo.showY = true;
      gizmo.showZ = false;
      gizmo.setRotationSnap(state.snap ? 15 * RAD : null);
    }
  };
  applyGizmo();

  const select = (key: PieceKey | null) => {
    selected = key;
    if (key) {
      gizmo.attach(pieces[key]);
      state.selected = NAMES[key];
      state.shown = !layout.pieces[key].hidden;
    } else {
      gizmo.detach();
      state.selected = "Nothing yet: click something";
      state.shown = true;
    }
    tuning.highlight(key ? pieces[key] : null);
  };

  const applyShown = () => {
    if (!selected || selected === "walkway") return;
    layout.pieces[selected].hidden = !state.shown || undefined;
    pieces[selected].visible = state.shown;
    changed();
  };

  const forward = new Vector3();
  gizmo.addEventListener("objectChange", () => {
    if (!selected) return;
    const piece = pieces[selected];
    forward.set(0, 0, 1).applyQuaternion(piece.quaternion);
    const turn = Math.atan2(forward.x, forward.z);
    piece.rotation.set(0, turn, 0);
    layout.pieces[selected] = {
      ...layout.pieces[selected],
      position: [round(piece.position.x), round(piece.position.y), round(piece.position.z)],
      rotation: round(turn / RAD, 1),
    };
    if (SETTLES.includes(selected)) tuning.resettle();
    changed();
  });

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let press: { x: number; y: number; onGizmo: boolean } | null = null;

  const handleDown = (event: PointerEvent) => {
    press = { x: event.clientX, y: event.clientY, onGizmo: gizmo.axis !== null };
  };

  const handleUp = (event: PointerEvent) => {
    const pressed = press;
    press = null;
    if (!pressed || pressed.onGizmo || gizmo.dragging) return;
    if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 4) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(Object.values(pieces), true);
    let node: Object3D | null = hit?.object ?? null;
    while (node && !node.userData.piece) node = node.parent;
    select((node?.userData.piece as PieceKey | undefined) ?? null);
  };

  const handleKey = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (event.key === "g") state.mode = "move";
    else if (event.key === "r") state.mode = "turn";
    else if (event.key === "Escape") select(null);
    else if (event.key === "f") {
      state.freeCamera = !state.freeCamera;
      applyFreeCamera();
    } else return;
    applyGizmo();
    refresh(gui);
  };

  canvas.addEventListener("pointerdown", handleDown);
  canvas.addEventListener("pointerup", handleUp);
  window.addEventListener("keydown", handleKey);

  const applyFreeCamera = () => {
    orbit.enabled = state.freeCamera;
    if (state.freeCamera) {
      orbit.target.fromArray(layout.camera.target);
      orbit.update();
    } else {
      tuning.applyCamera();
    }
  };

  const useView = () => {
    layout.camera.position = [round(camera.position.x), round(camera.position.y), round(camera.position.z)];
    const target = state.freeCamera ? orbit.target : new Vector3().fromArray(layout.camera.target);
    layout.camera.target = [round(target.x), round(target.y), round(target.z)];
    changed();
    state.status = "Camera set to this view: save to keep it";
  };

  const applyTime = () => {
    if (state.followClock) {
      setOffset(0);
      return;
    }
    const now = new Date();
    setOffset((state.hour - homeHourAt(now)) * 3_600_000 + state.days * DAY);
  };

  const applyActivity = () =>
    tuning.setActivity(state.activity === "auto" ? null : (state.activity as "work" | "away" | "sleep"));

  const gui = new GUI({ title: "Room", width: 300 });
  gui.add(state, "status").name("Status").disable().listen();
  gui.add({ save }, "save").name("Save");
  gui.add({ saveWithStills }, "saveWithStills").name("Save, with the loading pictures");
  gui.add({ copy }, "copy").name("Copy as JSON");
  gui.add({ picture }, "picture").name("Save a picture of the room");
  gui
    .add(
      {
        discard: () => {
          assignDeep(layout as unknown as Record<string, unknown>, savedLayout as unknown as Record<string, unknown>);
          localStorage.removeItem(DRAFT_KEY);
          tuning.placePieces();
          tuning.applyColors();
          tuning.rebuildShell();
          tuning.applyCamera();
          tuning.resettle();
          select(null);
          refresh(gui);
          state.status = "Back to what's saved";
        },
      },
      "discard",
    )
    .name("Discard changes");

  const move = gui.addFolder("Move things (click one)");
  move.add(state, "selected").name("Selected").disable().listen();
  move.add(state, "shown").name("In the room").listen().onChange(applyShown);
  move.add(state, "mode", { "Move (G)": "move", "Turn (R)": "turn" }).name("Handle").listen().onChange(applyGizmo);
  move.add(state, "snap").name("Snap to 5 cm / 15°").onChange(applyGizmo);
  move.add(state, "lockHeight").name("Keep on its height").onChange(applyGizmo);
  move.add({ deselect: () => select(null) }, "deselect").name("Let go (Esc)");

  const view = gui.addFolder("Camera");
  view.add(state, "freeCamera").name("Look around (F)").listen().onChange(applyFreeCamera);
  view.add({ useView }, "useView").name("Use this view");
  view.add(layout.camera, "fov", 25, 90, 1).name("Field of view").onChange(() => {
    tuning.applyCamera();
    changed();
  });

  const time = gui.addFolder("Time");
  time.add(state, "followClock").name("Follow the clock").onChange(applyTime);
  time.add(state, "hour", 0, 24, 0.05).name("Hour at home").onChange(() => {
    state.followClock = false;
    applyTime();
    refresh(time);
  });
  time.add(state, "days", -182, 182, 1).name("Days from today").onChange(() => {
    state.followClock = false;
    applyTime();
    refresh(time);
  });
  time
    .add(state, "activity", { "By the clock": "auto", Working: "work", Out: "away", Asleep: "sleep" })
    .name("What I'm doing")
    .onChange(applyActivity);
  time.add(layout.room, "nearWallFaces", 0, 359, 1).name("Window wall faces (°)").onChange(changed);

  const lights = gui.addFolder("Light");
  lights
    .add(layout.light, "toneMapping", { ACES: "aces", AgX: "agx", Neutral: "neutral" })
    .name("Tone mapping")
    .onChange(changed);
  type LightNumber = Exclude<keyof RoomLayout["light"], "toneMapping">;
  const lightRanges: [LightNumber, string, number, number, number][] = [
    ["gi", "Bounced light", 0, 3, 0.01],
    ["ao", "Contact shadows", 0, 1.5, 0.01],
    ["reflections", "Reflections", 0, 3, 0.01],
    ["sun", "Sun", 0, 30, 0.1],
    ["beams", "Beams in the air", 0, 0.5, 0.005],
    ["bounce", "Bounce off the sunlit patch", 0, 15, 0.1],
    ["window", "Sky through the window", 0, 80, 0.5],
    ["sky", "Light from everywhere", 0, 3, 0.01],
    ["ambient", "Flat fill", 0, 1, 0.01],
    ["lamp", "Ceiling lamp", 0, 30, 0.1],
    ["deskLamps", "Desk lamps", 0, 8, 0.05],
    ["ledStrip", "LED strip", 0, 120, 0.5],
    ["screens", "Screen brightness", 0, 4, 0.05],
    ["exposure", "Exposure", 0.2, 3, 0.01],
    ["bloom", "Glow", 0, 2, 0.01],
    ["bloomRadius", "Glow size", 0, 1, 0.01],
    ["bloomThreshold", "Glow from", 0, 4, 0.01],
  ];
  for (const [key, name, min, max, step] of lightRanges) {
    lights.add(layout.light, key, min, max, step).name(name).onChange(changed);
  }

  const colors = gui.addFolder("Colours");
  const colorNames: [keyof RoomLayout["colors"], string][] = [
    ["walls", "Walls"],
    ["duvet", "Duvet"],
    ["sheets", "Sheets and pillows"],
    ["chair", "Chair"],
    ["deskLamps", "Desk lamps' light"],
    ["ledStrip", "LED strip's light"],
    ["trim", "Trim, window frame and door"],
    ["outline", "Outlines"],
    ["floor", "Floor tint"],
    ["wood", "Wood tint"],
    ["hallway", "Hallway"],
  ];
  for (const [key, name] of colorNames) {
    colors.addColor(layout.colors, key).name(name).onChange(() => {
      tuning.applyColors();
      changed();
    });
  }

  const look = gui.addFolder("Style");
  look.add(layout.paint, "bands", 0, 8, 1).name("Light in bands (0 is smooth)").onChange(changed);
  look.add(layout.paint, "softness", 0, 0.5, 0.01).name("Band edges, soft").onChange(changed);
  look.add(layout.paint, "outline", 0, 5, 0.1).name("Outline width (px)").onChange(changed);
  look.add(layout.paint, "detail", 0, 1, 0.01).name("Texture detail").onChange(changed);
  look.add(layout.paint, "smooth").name("Smooth edges").onChange(changed);

  const quality = gui.addFolder("Quality while moving");
  quality
    .add(layout.quality, "playResolution", 0.4, 1, 0.05)
    .name("Size while a day plays")
    .onChange(changed);
  quality
    .add(layout.quality, "movingShade", 0.4, 1, 0.05)
    .name("Contact shade size while moving")
    .onChange(changed);

  const shape = gui.addFolder("Room shape");
  shape.close();
  const rebuild = () => {
    tuning.rebuildShell();
    changed();
  };
  shape.add(layout.room, "width", 2.5, 7, 0.05).name("Width").onFinishChange(rebuild);
  shape.add(layout.room, "depth", 2.5, 7, 0.05).name("Depth").onFinishChange(rebuild);
  shape.add(layout.room, "height", 2.1, 3.5, 0.05).name("Height").onFinishChange(rebuild);
  shape.add(layout.room, "hallway", 0.8, 3, 0.05).name("Hallway width").onFinishChange(rebuild);
  shape.add(layout.room.window, "wall", { "Near wall (behind you)": "near", "Left wall": "left" }).name("Window in").onChange(rebuild);
  shape.add(layout.room.window, "from", -3.5, 3.5, 0.05).name("Window from").onFinishChange(rebuild);
  shape.add(layout.room.window, "to", -3.5, 3.5, 0.05).name("Window to").onFinishChange(rebuild);
  shape.add(layout.room.window, "bottom", 0, 2, 0.05).name("Window bottom").onFinishChange(rebuild);
  shape.add(layout.room.window, "top", 0.5, 3.5, 0.05).name("Window top").onFinishChange(rebuild);
  shape.add(layout.room.door, "from", -3.5, 3.5, 0.05).name("Door from").onFinishChange(rebuild);
  shape.add(layout.room.door, "to", -3.5, 3.5, 0.05).name("Door to").onFinishChange(rebuild);
  shape.add(layout.room.door, "height", 1.8, 2.6, 0.01).name("Door height").onFinishChange(rebuild);
  shape.add(layout.room.door, "open", 0, 120, 1).name("Door open (°)").onFinishChange(rebuild);

  const list = gui.addFolder("Everything in the room");
  list.close();
  for (const key of PIECE_KEYS) {
    list.add({ pick: () => select(key) }, "pick").name(NAMES[key]);
  }

  return () => {
    clearTimeout(draftTimer);
    canvas.removeEventListener("pointerdown", handleDown);
    canvas.removeEventListener("pointerup", handleUp);
    window.removeEventListener("keydown", handleKey);
    gizmo.detach();
    overlay.remove(gizmo.getHelper());
    gizmo.dispose();
    orbit.dispose();
    gui.destroy();
    tuning.highlight(null);
    tuning.setTuning(false);
  };
};
