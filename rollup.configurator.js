import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import inject from "@rollup/plugin-inject";

// import builtins from "rollup-plugin-node-builtins";
// import globals from "rollup-plugin-node-globals";

export default function(meta, options = {}) {
  const ns = meta.name.replace(/^@(.*)\/.*$/, '$1');
  const regexp = new RegExp(`^@(${ns})\\/(.*)$`, 'gi');
  const replace = (name) => name.replace(regexp, '$1.$2').replace(/[\/-]/gi, '_');
  const distFileName = meta.name.replace(regexp, '$1-$2');
  const config = {
    input: "src/index.js",
    external: (options.external || []).concat(Object.keys(meta.dependencies || {}).filter(key => regexp.test(key))),
    output: {
      file: `dist/${distFileName}.js`,
      name: replace(meta.name),
      format: "umd",
      indent: false,
      extend: true,
      banner: `// ${meta.name} v${meta.version} ${meta.homepage} Copyright ${(new Date).getFullYear()} ${meta.author.name}`,
      globals: Object.assign({}, options.globals || {}, ...Object.keys(meta.dependencies || {}).filter((name) => replace(name) !== name).map(name => ({[name]: replace(name)})))
    },
      plugins: [
      inject(Object.assign({}, options.globals)),
      // builtins(),
      // globals(),
      resolve({ preferBuiltins: false }),
      commonjs()
    ]
  };
  return [
    config,
    {
      ...config,
      output: {
        ...config.output,
        file: `dist/${distFileName}.min.js`
      },
      plugins: [
        ...config.plugins,
        terser({
          output: {
            preamble: config.output.banner
          }
        })
      ]
    }
  ];
}
