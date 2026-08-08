# Cursor token race

Bar chart race of cumulative Cursor model token usage from a usage-events CSV export.

```sh
bun install
bun run dev
```

Open the URL in the terminal. Click the chart to pause/play; click the timeline to scrub.

Regenerate race data from a fresh export:

```sh
bun run scripts/build-race-data.ts /path/to/usage-events.csv
```
