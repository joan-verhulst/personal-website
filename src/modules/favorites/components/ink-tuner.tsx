"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { InkSettings } from "~/modules/favorites/utils/ink-shader";

type Knob = Exclude<keyof InkSettings, "ink" | "paper">;

// The shader's controls, under the names they have in Figma
const KNOBS: { key: Knob; label: string; min: number; max: number; step: number }[] =
  [
    { key: "blur", label: "Blur amount", min: 0, max: 30, step: 0.1 },
    { key: "unevenness", label: "Blur variation", min: 0, max: 1, step: 0.01 },
    { key: "patchSize", label: "Patch size", min: 0.04, max: 0.8, step: 0.01 },
    { key: "focusX", label: "Focus X", min: 0, max: 1, step: 0.01 },
    { key: "focusY", label: "Focus Y", min: 0, max: 1, step: 0.01 },
    { key: "focusSize", label: "Focus size", min: 0, max: 1, step: 0.01 },
    { key: "falloff", label: "Falloff", min: 0.01, max: 1, step: 0.01 },
    { key: "strokeLength", label: "Stroke length", min: 1, max: 15, step: 0.5 },
    { key: "strokeAngle", label: "Stroke angle", min: 0, max: 360, step: 1 },
    { key: "balance", label: "Spray density", min: 0, max: 1, step: 0.01 },
    { key: "detailScale", label: "Detail scale", min: 0.05, max: 3, step: 0.01 },
    { key: "clump", label: "Clump size", min: 0.25, max: 15, step: 0.05 },
    { key: "hardness", label: "Edge hardness", min: 3, max: 60, step: 0.5 },
  ];

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const Slider = ({ label, value, min, max, step, onChange }: SliderProps) => (
  <label className="block">
    <span className="flex justify-between">
      <span>{label}</span>
      <span className="text-neutral-950/50 tabular-nums">{value}</span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full cursor-pointer accent-neutral-950"
    />
  </label>
);

interface Props {
  settings: InkSettings;
  defaults: InkSettings;
  // The ink weight of every department, in the order of their titles
  weights: number[];
  defaultWeights: number[];
  departments: string[];
  onChange: (settings: InkSettings) => void;
  onWeightsChange: (weights: number[]) => void;
}

/**
 * Sliders for the ink shader, to tune the print by eye. Only there in
 * development. Copy hands back the values as they'd be written in the code.
 */
const InkTuner = ({
  settings,
  defaults,
  weights,
  defaultWeights,
  departments,
  onChange,
  onWeightsChange,
}: Props) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const values = [
    ...departments.map(
      (title, index) => `  // inkWeight, ${title}: ${weights[index]}`,
    ),
    ...KNOBS.map(({ key }) => `  ${key}: ${settings[key]},`),
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(values);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 1500);
    } catch {}
  };

  // Over the modal, which is at z-50
  return createPortal(
    <div className="fixed top-4 right-4 z-60 w-72 rounded-2xl border border-neutral-950/10 bg-neutral-50 text-neutral-950 text-xs shadow-[0_12px_30px_-12px_rgb(0_0_0/0.35)]">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex-1 cursor-pointer text-left font-medium"
        >
          Ink shader {isOpen ? "▾" : "▸"}
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(defaults);
            onWeightsChange(defaultWeights);
          }}
          className="cursor-pointer rounded-lg px-2 py-1 hover:bg-neutral-950/10"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={copy}
          className="cursor-pointer rounded-lg bg-neutral-950 px-2 py-1 text-neutral-50"
        >
          {hasCopied ? "Copied" : "Copy"}
        </button>
      </div>

      {isOpen && (
        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto border-neutral-950/10 border-t p-3">
          {/* Ink weight is set per department, so it has a slider for each */}
          {departments.map((title, index) => (
            <Slider
              key={title}
              label={`Ink weight · ${title}`}
              value={weights[index]}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) =>
                onWeightsChange(
                  weights.map((weight, at) => (at === index ? value : weight)),
                )
              }
            />
          ))}
          {KNOBS.map(({ key, label, min, max, step }) => (
            <Slider
              key={key}
              label={label}
              value={settings[key]}
              min={min}
              max={max}
              step={step}
              onChange={(value) => onChange({ ...settings, [key]: value })}
            />
          ))}
          <pre className="select-all rounded-lg bg-neutral-950/5 p-2 text-[0.625rem] leading-snug">
            {values}
          </pre>
        </div>
      )}
    </div>,
    document.body,
  );
};

export default InkTuner;
