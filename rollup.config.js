import typescript from "@rollup/plugin-typescript";

import { dts } from "rollup-plugin-dts";

import pkg from "./package.json" with { type: "json" };
import strip from "@rollup/plugin-strip";

export default [
  {
    input: pkg.source,

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
    output: [{ file: "dist/index.d.ts", format: "es" }],
  },
  {
    input: pkg.source,

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
      { file: pkg.main, format: "cjs" },
      { file: pkg.module, format: "esm" },
    ],
  },
];
