export type RaceFrame = {
  date: string;
  total: number;
  values: Record<string, number>;
};

export type RaceData = {
  title: string;
  start: string;
  end: string;
  models: string[];
  colors: Record<string, string>;
  frames: RaceFrame[];
};

export type RankedBar = {
  model: string;
  value: number;
  color: string;
  rank: number;
  /** Smoothed vertical position in px — use for transform, not raw rank. */
  y: number;
};
