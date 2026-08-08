import { useEffect, useRef, useState } from "react";
import { colorForModel } from "./colors";
import type { RaceData, RankedBar } from "./types";

const TOP_N = 10;
const ROW_H = 48;
/** ~140ms per day → ~45s full run with daily frames. */
const MS_PER_FRAME = 140;
/** Rank swaps settle smoothly. */
const RANK_TAU_MS = 220;

type RaceState = {
  frameIndex: number;
  progress: number;
  bars: RankedBar[];
  maxValue: number;
  total: number;
  date: string;
  leader: RankedBar | null;
  day: number;
  dayTotal: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smoothstep — cleaner bar growth between days. */
const smoothstep = (t: number) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};

const sampleBars = (
  data: RaceData,
  index: number,
  blend: number,
  prevRank: Map<string, number>,
): RankedBar[] => {
  const a = data.frames[index];
  const b = data.frames[Math.min(index + 1, data.frames.length - 1)];
  if (!a || !b) return [];

  const t = smoothstep(blend);
  const values = new Map<string, number>();
  for (const model of data.models) {
    const av = a.values[model] ?? 0;
    const bv = b.values[model] ?? 0;
    const v = lerp(av, bv, t);
    if (v > 0) values.set(model, v);
  }

  return [...values.entries()]
    .sort((x, y) => {
      const d = y[1] - x[1];
      if (Math.abs(d) > 1) return d;
      return (prevRank.get(x[0]) ?? 99) - (prevRank.get(y[0]) ?? 99);
    })
    .slice(0, TOP_N)
    .map(([model, value], rank) => ({
      model,
      value,
      color: colorForModel(model),
      rank,
      y: rank * ROW_H,
    }));
};

const buildState = (
  data: RaceData,
  cursor: number,
  yMap: Map<string, number>,
  prevRank: Map<string, number>,
  dt: number,
): RaceState => {
  const max = Math.max(data.frames.length - 1, 1);
  const clamped = Math.min(Math.max(cursor, 0), max);
  const index = Math.floor(clamped);
  const blend = clamped - index;
  const targets = sampleBars(data, index, blend, prevRank);
  const frame = data.frames[index]!;
  const next = data.frames[Math.min(index + 1, data.frames.length - 1)]!;
  const maxValue = Math.max(targets[0]?.value ?? 1, 1);
  const total = lerp(frame.total, next.total, smoothstep(blend));
  const settle = 1 - Math.exp(-dt / RANK_TAU_MS);

  const nextRank = new Map<string, number>();
  const bars = targets.map((bar) => {
    nextRank.set(bar.model, bar.rank);
    const targetY = bar.rank * ROW_H;
    const prevY = yMap.get(bar.model) ?? targetY + ROW_H * 0.25;
    const y = lerp(prevY, targetY, settle);
    yMap.set(bar.model, y);
    return { ...bar, y };
  });

  for (const key of [...yMap.keys()]) {
    if (!nextRank.has(key)) yMap.delete(key);
  }
  prevRank.clear();
  for (const [k, v] of nextRank) prevRank.set(k, v);

  return {
    frameIndex: index,
    progress: clamped / max,
    bars,
    maxValue,
    total,
    // Snap date to the current day only — increments by one, no mid-blend flicker.
    date: frame.date,
    leader: bars[0] ?? null,
    day: index + 1,
    dayTotal: data.frames.length,
  };
};

/** Autoplaying race cursor — stops at the end until restart. */
export const useRacePlayback = (data: RaceData) => {
  const yMap = useRef(new Map<string, number>());
  const prevRank = useRef(new Map<string, number>());
  const [state, setState] = useState(() =>
    buildState(data, 0, yMap.current, prevRank.current, 1000),
  );
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);
  const cursorRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || finished) {
      lastRef.current = null;
      return;
    }

    let raf = 0;
    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now;
      const dt = Math.min(now - lastRef.current, 48);
      lastRef.current = now;
      cursorRef.current += dt / MS_PER_FRAME;
      const max = data.frames.length - 1;

      if (cursorRef.current >= max) {
        cursorRef.current = max;
        setState(buildState(data, cursorRef.current, yMap.current, prevRank.current, 1000));
        setPlaying(false);
        setFinished(true);
        return;
      }

      setState(buildState(data, cursorRef.current, yMap.current, prevRank.current, dt));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, playing, finished]);

  const toggle = () => {
    if (finished) return;
    setPlaying((p) => !p);
  };

  const restart = () => {
    cursorRef.current = 0;
    yMap.current.clear();
    prevRank.current.clear();
    lastRef.current = null;
    setFinished(false);
    setPlaying(true);
    setState(buildState(data, 0, yMap.current, prevRank.current, 1000));
  };

  const seek = (ratio: number) => {
    if (finished) return;
    const max = Math.max(data.frames.length - 1, 1);
    cursorRef.current = Math.min(Math.max(ratio, 0), 1) * max;
    yMap.current.clear();
    prevRank.current.clear();
    setState(buildState(data, cursorRef.current, yMap.current, prevRank.current, 1000));
  };

  return { state, playing, finished, toggle, restart, seek };
};

export { ROW_H };
