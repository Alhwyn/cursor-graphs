/** Model colors from the product palette. */
export const MODEL_PALETTE = {
  opus: "#0d7490",
  fable: "#eaa400",
  sonnet: "#156634",
  composer: "#f44e01",
  composer1: "#f080d2",
  gemini: "#4f47e6",
  grok: "#0ca6e9",
  gpt55: "#c66a4a",
  rest: "#64758b",
} as const;

/** Map a Cursor model id to its chart color. */
export const colorForModel = (model: string): string => {
  const m = model.toLowerCase();

  // composer-1 only (not composer-1.5 / 2.x)
  if (m === "composer-1" || m.startsWith("composer-1-")) return MODEL_PALETTE.composer1;
  if (m.includes("composer")) return MODEL_PALETTE.composer;

  if (m.includes("fable")) return MODEL_PALETTE.fable;
  if (m.includes("opus")) return MODEL_PALETTE.opus;
  if (m.includes("sonnet")) return MODEL_PALETTE.sonnet;
  if (m.includes("grok")) return MODEL_PALETTE.grok;
  if (m.includes("gemini")) return MODEL_PALETTE.gemini;
  if (m.includes("gpt-5.5")) return MODEL_PALETTE.gpt55;
  if (m.includes("agent_review")) return MODEL_PALETTE.gpt55;

  return MODEL_PALETTE.rest;
};

/** Build a colors map for every model in the race dataset. */
export const colorsForModels = (models: string[]): Record<string, string> => {
  const colors: Record<string, string> = {};
  for (const model of models) colors[model] = colorForModel(model);
  return colors;
};
