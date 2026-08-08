const csvPath = process.argv[2] ?? `${process.env.HOME}/Downloads/usage-events-2026-08-08.csv`;
const outPath = new URL("../src/race/data.json", import.meta.url);

const text = await Bun.file(csvPath).text();
const lines = text.trim().split("\n");

const parse = (line: string) => {
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      cols.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  cols.push(cur);
  return cols;
};

const dayKey = (iso: string) => iso.slice(0, 10);

const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
};

const rows = lines.slice(1).map(parse);
const dayModels = new Map<string, Map<string, number>>();

for (const r of rows) {
  const day = dayKey(r[0]!);
  const model = r[4] || "unknown";
  const tokens = Number(r[10] || 0);
  if (!dayModels.has(day)) dayModels.set(day, new Map());
  const m = dayModels.get(day)!;
  m.set(model, (m.get(model) || 0) + tokens);
}

const first = [...dayModels.keys()].sort()[0]!;
const last = [...dayModels.keys()].sort().at(-1)!;
const days: string[] = [];
for (let cur = first; cur <= last; cur = addDays(cur, 1)) days.push(cur);

const cum = new Map<string, number>();
const frames: { date: string; total: number; values: Record<string, number> }[] = [];
const topSeen = new Set<string>();

for (const day of days) {
  const delta = dayModels.get(day);
  if (delta) {
    for (const [model, tokens] of delta) cum.set(model, (cum.get(model) || 0) + tokens);
  }
  const ranked = [...cum.entries()].sort((a, b) => b[1] - a[1]);
  for (const [m] of ranked.slice(0, 12)) topSeen.add(m);
  const values: Record<string, number> = {};
  for (const [m, t] of ranked.slice(0, 20)) values[m] = Math.round(t);
  const total = ranked.reduce((s, [, t]) => s + t, 0);
  frames.push({ date: day, total: Math.round(total), values });
}

const models = [...topSeen];
const trimmed = frames.map((f) => {
  const values: Record<string, number> = {};
  for (const m of models) values[m] = f.values[m] || 0;
  return { date: f.date, total: f.total, values };
});

const { colorsForModels } = await import("../src/race/colors");
const colors = colorsForModels(models);

const data = {
  title: "Cumulative token usage",
  start: trimmed[0]!.date,
  end: trimmed[trimmed.length - 1]!.date,
  models,
  colors,
  frames: trimmed,
};

await Bun.write(outPath, JSON.stringify(data));
console.log(`Wrote ${models.length} models × ${trimmed.length} days → ${outPath.pathname}`);
