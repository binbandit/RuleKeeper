import { build } from "esbuild";
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  platform: "node",
  bundle: true,
  target: "node20",
  sourcemap: false,
  legalComments: "none"
});
