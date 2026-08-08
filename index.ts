import index from "./index.html";

const server = Bun.serve({
  port: Number(process.env.PORT) || 3456,
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Token race at ${server.url}`);
