import typescript from "@rollup/plugin-typescript";

import { dts } from "rollup-plugin-dts";

import pkg from "./package.json" with { type: "json" };
import strip from "@rollup/plugin-strip";

const input = { index: pkg.source, examples: "src/examples.ts" };

export default [
  {
    input,

    plugins: [
      // Keep typescript step, so that path aliases are resolved
      typescript({
        compilerOptions: {
          sourceMap: false,
          declaration: false,
        },
      }),
      dts(),
    ],
    output: [
      {
        dir: "dist",
        format: "es",
        entryFileNames: "[name].d.ts",
        chunkFileNames: "[name]-[hash].d.ts",
      },
    ],
  },
  {
    input,

    plugins: [
      typescript({
        compilerOptions: {
          sourceMap: false,
          declaration: false,
        },
      }),
      strip({
        include: "src/lib/**/*.(ts|js|jsx)",
        functions: [
          "console.*",
          "assert.*",
        ],
        debugger: true,
      })
    ],
    output: [
      {
        dir: "dist",
        format: "cjs",
        entryFileNames: "[name].cjs",
        chunkFileNames: "[name]-[hash].cjs",
      },
      {
        dir: "dist",
        format: "esm",
        entryFileNames: "[name].esm.js",
        chunkFileNames: "[name]-[hash].esm.js",
      },
    ],
  },
];
