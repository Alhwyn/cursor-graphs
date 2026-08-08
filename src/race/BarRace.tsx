import { useMemo, type MouseEvent } from "react";
import raceData from "./data.json";
import { formatMonthTick, formatRaceDate, formatTokens } from "./format";
import type { RaceData } from "./types";
import { ROW_H, useRacePlayback } from "./useRacePlayback";

const data = raceData as RaceData;
const TOP_N = 10;
const CHART_H = ROW_H * TOP_N;
const GRID_LINES = [0.2, 0.4, 0.6, 0.8, 1];

const monthTicks = (frames: RaceData["frames"]) => {
  const seen = new Set<string>();
  const ticks: { iso: string; ratio: number }[] = [];
  frames.forEach((frame, i) => {
    const key = frame.date.slice(0, 7);
    if (seen.has(key)) return;
    seen.add(key);
    ticks.push({ iso: frame.date, ratio: i / Math.max(frames.length - 1, 1) });
  });
  if (ticks.length <= 6) return ticks;
  return ticks.filter((_, i) => i % 2 === 0 || i === ticks.length - 1);
};

export const BarRace = () => {
  const { state, playing, finished, toggle, restart, seek } = useRacePlayback(data);
  const ticks = useMemo(() => monthTicks(data.frames), []);
  const spark = useMemo(() => {
    const max = Math.max(...data.frames.map((f) => f.total), 1);
    return data.frames
      .map((f, i) => {
        const x = (i / Math.max(data.frames.length - 1, 1)) * 100;
        const y = 100 - (f.total / max) * 88;
        return `${x},${y}`;
      })
      .join(" ");
  }, []);

  const onTrackClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - rect.left) / rect.width);
  };

  return (
    <div
      className={`race${finished ? " is-finished" : ""}`}
      onClick={finished ? undefined : toggle}
      role={finished ? undefined : "button"}
      tabIndex={finished ? undefined : 0}
      aria-label={finished ? undefined : playing ? "Pause race" : "Play race"}
      onKeyDown={
        finished
          ? undefined
          : (e) => {
              if (e.key === " " || e.key === "Enter") toggle();
            }
      }
    >
      <header className="race-head">
        <div className="race-title-block">
          <h1 className="race-date">{formatRaceDate(state.date)}</h1>
          <p className="race-subtitle">{data.title}</p>
        </div>
        <div className="race-meta">
          <strong>{formatTokens(state.total)} total</strong>
        </div>
      </header>

      <div className="race-chart" style={{ height: CHART_H }}>
        <div className="race-grid" aria-hidden>
          {GRID_LINES.map((n) => (
            <span key={n} style={{ left: `${n * 100}%` }} />
          ))}
        </div>

        {state.bars.map((bar) => {
          const width = `${(bar.value / state.maxValue) * 100}%`;
          return (
            <div
              key={bar.model}
              className="race-row"
              style={{
                transform: `translate3d(0, ${bar.y}px, 0)`,
                zIndex: 40 - Math.round(bar.y / ROW_H),
              }}
            >
              <div className="race-label">
                <span className="race-name">{bar.model}</span>
                <span className="race-mark" style={{ background: bar.color }} />
              </div>
              <div className="race-track">
                <div className="race-bar" style={{ width, background: bar.color }} />
                <span className="race-value">{formatTokens(bar.value)}</span>
              </div>
            </div>
          );
        })}

      </div>

      <footer className="race-foot" onClick={(e) => e.stopPropagation()}>
        <div className="race-timeline" onClick={finished ? undefined : onTrackClick}>
          <svg className="race-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polyline fill="none" stroke="rgba(38,37,30,0.16)" strokeWidth="1" points={spark} />
          </svg>
          <div className="race-progress" style={{ width: `${state.progress * 100}%` }} />
          <div className="race-playhead" style={{ left: `${state.progress * 100}%` }} />
          <div className="race-ticks">
            {ticks.map((t) => (
              <span key={t.iso} style={{ left: `${t.ratio * 100}%` }}>
                {formatMonthTick(t.iso)}
              </span>
            ))}
          </div>
        </div>
        {finished ? (
          <button type="button" className="race-refresh" onClick={restart}>
            Refresh
          </button>
        ) : null}
      </footer>
    </div>
  );
};
