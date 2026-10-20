import { useState } from "react";
import type { PerfPart, PerfReport } from "~/modules/about/room/profiler";

const ms = (value: number) => value.toFixed(2);
const thousands = (value: number) => `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;

const PANEL =
  "absolute top-3 max-h-[calc(100%-1.5rem)] w-72 max-w-[calc(50%-1.125rem)] overflow-y-auto overscroll-contain rounded-[0.625rem] bg-neutral-950/70 p-3 text-neutral-50 text-xs tabular-nums backdrop-blur-lg [scrollbar-width:thin]";

const partLines = (parts: PerfPart[]) =>
  parts.map(
    (part) =>
      `  ${part.name}: ${thousands(part.triangles)}, ${part.meshes} shapes, ${thousands(part.outlines)} outline, ${thousands(part.shadows)} cast shadows`,
  );

const trianglesText = (report: PerfReport) =>
  [
    `Triangles drawn once: ${thousands(report.parts.reduce((sum, part) => sum + part.triangles, 0))}`,
    "By thing:",
    ...partLines(report.parts),
    "Single shapes:",
    ...partLines(report.meshes),
  ].join("\n");

const reportText = (report: PerfReport) =>
  [
    `Room perf: ${report.state}, ${report.drawn} drawn/s, GPU busy ${ms(report.busy)} ms a second, ${report.width}×${report.height}`,
    `GPU ${ms(report.gpu)} ms (at most ${ms(report.gpuMax)})${report.isGpuTimed ? "" : " [not timed in this browser]"}, CPU ${ms(report.cpu)} ms (at most ${ms(report.cpuMax)})`,
    `${report.calls} draw calls, ${thousands(report.triangles)} triangles, ${report.programs} shaders, ${report.textures} textures, ${report.geometries} geometries`,
    "",
    "Stages (average a frame):",
    ...report.stages.map(
      (stage) =>
        `  ${stage.name}: ${ms(stage.ms)} ms (at most ${ms(stage.max)}), ${Math.round(stage.calls)} calls, ${thousands(stage.triangles)} triangles`,
    ),
    "",
    ...(report.peak
      ? [
          `Heaviest frame, ${report.peak.ago.toFixed(0)} s ago: ${report.peak.state}, ${thousands(report.peak.triangles)} triangles, GPU ${ms(report.peak.gpu)} ms`,
          ...report.peak.stages.map(
            (stage) =>
              `  ${stage.name}: ${thousands(stage.triangles)}, ${stage.calls} calls, ${ms(stage.ms)} ms`,
          ),
          "",
        ]
      : []),
    "By state:",
    ...report.byState.map(
      (seen) => `  ${seen.state}: GPU ${ms(seen.gpu)} ms, CPU ${ms(seen.cpu)} ms, ${seen.frames} frames`,
    ),
    "",
    trianglesText(report),
  ].join("\n");

const CopyReport = ({ text }: { text: () => string }) => {
  const [isCopied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="h-6 shrink-0 cursor-pointer rounded-[0.625rem] bg-neutral-50/10 px-2 text-neutral-50 transition-colors duration-200 hover:bg-neutral-50/20"
    >
      {isCopied ? "Copied" : "Copy report"}
    </button>
  );
};

const Parts = ({ title, parts }: { title: string; parts: PerfPart[] }) => {
  const most = parts[0]?.triangles || 1;
  return (
    <>
      <p className="text-neutral-50/60">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {parts.map((part) => (
          <li key={part.name}>
            <div className="flex justify-between gap-2">
              <span className="truncate">{part.name}</span>
              <span className="shrink-0">{thousands(part.triangles)}</span>
            </div>
            <div className="mt-0.5 h-0.5 overflow-hidden rounded-full bg-neutral-50/15">
              <div
                className="h-full rounded-full bg-neutral-50"
                style={{ width: `${(part.triangles / most) * 100}%` }}
              />
            </div>
            {(part.meshes > 1 || part.outlines > 0 || part.shadows > 0) && (
              <p className="mt-0.5 text-neutral-50/50">
                {part.meshes > 1 && `${part.meshes} shapes`}
                {part.outlines > 0 && ` · ${thousands(part.outlines)} outline`}
                {part.shadows > 0 && ` · ${thousands(part.shadows)} cast shadows`}
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
};

const RoomPerf = ({ report }: { report: PerfReport | null }) => (
  <>
    <div className={`${PANEL} left-3`}>
      {!report ? (
        <p className="text-neutral-50/60">Waiting for the first frames</p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-neutral-50/60">Room perf</span>
            <CopyReport text={() => reportText(report)} />
          </div>
          <div className="flex justify-between gap-2">
            <span>{report.state}</span>
            <span className="text-neutral-50/60">{report.drawn} drawn/s</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span>GPU busy a second</span>
            <span>{ms(report.busy)} ms</span>
          </div>
          <div className="mt-1 flex justify-between gap-2 text-neutral-50/60">
            <span>
              GPU {ms(report.gpu)} ms, at most {ms(report.gpuMax)}
            </span>
            <span>CPU {ms(report.cpu)}</span>
          </div>
          {!report.isGpuTimed && (
            <p className="mt-2 text-neutral-50/60">
              This browser doesn't allow timing the graphics card: only the CPU side is shown
            </p>
          )}

          <ul className="mt-3 flex flex-col gap-1.5">
            {report.stages.map((stage) => (
              <li key={stage.name}>
                <div className="flex justify-between gap-2">
                  <span>{stage.name}</span>
                  <span>
                    {ms(stage.ms)} <span className="text-neutral-50/50">/ {ms(stage.max)}</span>
                  </span>
                </div>
                <div className="mt-0.5 h-0.5 overflow-hidden rounded-full bg-neutral-50/15">
                  <div
                    className="h-full rounded-full bg-neutral-50"
                    style={{ width: `${report.gpu > 0 ? (stage.ms / report.gpu) * 100 : 0}%` }}
                  />
                </div>
                {stage.calls > 0 && (
                  <p className="mt-0.5 text-neutral-50/50">
                    {Math.round(stage.calls)} draw calls · {thousands(stage.triangles)} triangles
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-3 grid grid-cols-2 gap-x-2 text-neutral-50/60">
            <span>{report.calls} draw calls</span>
            <span>{thousands(report.triangles)} triangles</span>
            <span>{report.programs} shaders</span>
            <span>{report.textures} textures</span>
            <span>{report.geometries} geometries</span>
            <span>
              {report.width}×{report.height}
            </span>
          </div>

          {report.peak && (
            <div className="mt-3">
              <p className="flex justify-between gap-2">
                <span>Heaviest frame, {report.peak.ago.toFixed(0)} s ago</span>
                <span>{thousands(report.peak.triangles)}</span>
              </p>
              <p className="text-neutral-50/60">
                {report.peak.state}, GPU {ms(report.peak.gpu)} ms
              </p>
              <ul className="mt-1.5 flex flex-col gap-0.5 text-neutral-50/60">
                {report.peak.stages.map((stage) => (
                  <li key={stage.name} className="flex justify-between gap-2">
                    <span>{stage.name}</span>
                    <span>
                      {thousands(stage.triangles)} · {stage.calls} calls · {ms(stage.ms)} ms
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.byState.length > 1 && (
            <ul className="mt-3 flex flex-col gap-0.5 text-neutral-50/60">
              {report.byState.map((seen) => (
                <li key={seen.state} className="flex justify-between gap-2">
                  <span>{seen.state}</span>
                  <span>
                    GPU {ms(seen.gpu)}, CPU {ms(seen.cpu)}, {seen.frames} frames
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>

    {report && report.parts.length > 0 && (
      <div className={`${PANEL} right-3`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-neutral-50/60">Triangles</span>
          <CopyReport text={() => trianglesText(report)} />
        </div>
        <p className="flex justify-between gap-2">
          <span>Drawn once</span>
          <span>{thousands(report.parts.reduce((sum, part) => sum + part.triangles, 0))}</span>
        </p>
        <div className="mt-3">
          <Parts title="By thing" parts={report.parts} />
        </div>
        <div className="mt-3">
          <Parts title="Single shapes" parts={report.meshes} />
        </div>
      </div>
    )}
  </>
);

export default RoomPerf;
