import type { ReactNode } from "react";
import { codeFont } from "~/modules/blog/components/prose";
import cn from "~/utils/cn";

// Enough of GLSL, WGSL and TypeScript to color the snippets in the posts.
// Anything it doesn't know stays plain, which is most of it
const KEYWORDS = new Set([
  "const", "let", "var", "fn", "return", "if", "else", "for", "while", "break",
  "continue", "uniform", "in", "out", "struct", "export", "import", "from",
  "function", "new", "true", "false", "select", "discard", "type", "interface",
  "async", "await", "of", "void", "precision", "highp",
]);
const TYPES = new Set([
  "float", "int", "bool", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4",
  "sampler2D", "f32", "i32", "u32", "vec2f", "vec3f", "vec4f", "number",
  "string", "boolean",
]);

type Kind = "comment" | "string" | "number" | "keyword" | "type" | "call" | "plain";

const TOKEN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("[^"\n]*"|'[^'\n]*'|`[^`]*`)|(\b\d+(?:\.\d*)?(?:e[-+]?\d+)?\b|\.\d+\b)|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Za-z_][A-Za-z0-9_]*)/g;

const highlight = (code: string) => {
  const parts: { kind: Kind; text: string }[] = [];
  let last = 0;
  for (const match of code.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "plain", text: code.slice(last, index) });
    const [text, comment, string, number, call, word] = match;
    let kind: Kind = "plain";
    if (comment) kind = "comment";
    else if (string) kind = "string";
    else if (number) kind = "number";
    else {
      const name = call ?? word;
      if (KEYWORDS.has(name)) kind = "keyword";
      else if (TYPES.has(name)) kind = "type";
      else if (call) kind = "call";
    }
    parts.push({ kind, text });
    last = index + text.length;
  }
  if (last < code.length) parts.push({ kind: "plain", text: code.slice(last) });
  return parts;
};

const COLORS: Record<Kind, string> = {
  comment: "text-neutral-950/40",
  string: "text-success-700",
  number: "text-warning-700",
  keyword: "text-primary-700",
  type: "text-[#0f766e]",
  call: "text-neutral-950",
  plain: "text-neutral-950/75",
};

interface Props {
  // Over the code: what it does, or where it's from
  caption?: ReactNode;
  children: string;
}

/**
 * A snippet, with a line saying what it is. Only the lines that matter: the
 * rest of a function is left out with a comment, and the whole file is in
 * the site's repository.
 */
const CodeBlock = ({ caption, children }: Props) => {
  const code = children.replace(/^\n+|\s+$/g, "");

  return (
    <figure className="mt-8 overflow-hidden rounded-3xl border border-neutral-950/8 bg-neutral-950/3">
      {caption && (
        <figcaption className="border-neutral-950/8 border-b px-5 py-3 text-neutral-950/55 text-xs">
          {caption}
        </figcaption>
      )}
      <pre
        className={cn(
          codeFont.className,
          "overflow-x-auto px-5 py-4 text-[0.8125rem] leading-[1.7]",
        )}
      >
        <code>
          {highlight(code).map((part, index) => (
            <span
              // The parts never change order
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              key={index}
              className={cn(COLORS[part.kind], part.kind === "comment" && "italic")}
            >
              {part.text}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
};

export default CodeBlock;
