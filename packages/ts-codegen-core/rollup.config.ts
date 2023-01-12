import path from "path";
// @ts-ignore
import rollupBabel from "rollup-plugin-babel";
// @ts-ignore
import rollupTypeScript from "rollup-plugin-typescript";

const pkg = require(path.join(process.cwd(), "package.json"));

module.exports = {
  input: "src/index.ts",
  output: [
    {
      dir: "dist/lib",
      format: "cjs",
    },
    {
      dir: "dist/module",
      format: "es",
    },
  ],
  external: [
    // @ts-ignore
    ...Object.keys(process.binding("natives")),
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    rollupTypeScript({
      target: "es5",
      module: "es6",
    }),
    rollupBabel({
      plugins: ["babel-plugin-pure-calls-annotation"],
      exclude: "node_modules/**",
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    }),
  ],
};
