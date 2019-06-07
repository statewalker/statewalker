const path = require('path');
const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommonjs = require('rollup-plugin-commonjs');
const rollupAsync = require('rollup-plugin-async');

const packagesDir = path.resolve(__dirname, '../packages');
module.exports = {
  input: `${packagesDir}/tree/index.js`,
  output: {
    file: 'dist/statewalker.tree.js',
    format: 'iife',
    name : 'statewalker.tree',
  },
  external: [
  ],
  plugins: [
    rollupCommonjs(),
    rollupResolve({ modulesOnly: true }),
    rollupAsync()
  ]
};
