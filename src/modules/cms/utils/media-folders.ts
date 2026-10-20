import { LIBRARY_FOLDER } from "~/modules/media/utils/media-types";

const FOLDER_LABELS: Record<string, string> = {
  [LIBRARY_FOLDER]: "Uploaded to Media",
  work: "UI/UX",
  experiments: "Experiments",
  products: "Products",
  photography: "Photography",
  "digital-art": "Digital art",
  "on-rotation": "On rotation",
  icons: "Tag logos",
  about: "About",
  "": "Top level",
};

export const folderLabel = (folder: string) => FOLDER_LABELS[folder] ?? folder;

// A select item can't have an empty value, which is what the top level has
const TOP_LEVEL = "top-level";

export const folderKey = (folder: string) => folder || TOP_LEVEL;

export const foldersOf = (files: { folder: string }[]) =>
  [...new Set(files.map((file) => file.folder))].sort((a, b) =>
    folderLabel(a).localeCompare(folderLabel(b)),
  );
