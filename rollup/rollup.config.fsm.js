const path = require('path');
const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommonjs = require('rollup-plugin-commonjs');
const rollupAsync = require('rollup-plugin-async');


const packagesDir = path.resolve(__dirname, '../packages');
module.exports = {
  input: `${packagesDir}/fsm/index.js`,
  output: {
    file: 'dist/statewalker.fsm.js',
    format: 'iife',
    name : 'statewalker.fsm',
    // exports: 'named',
    paths: {
      '@statewalker/tree' : './statewalker.tree',
    },
    globals : {
      '@statewalker/tree' : 'this.statewalker.tree',
    },
  },
  external: [
    '@statewalker/tree'
  ],
  plugins: [
    rollupCommonjs(),
    rollupResolve({ modulesOnly: true }),
    rollupAsync()
  ]
};
