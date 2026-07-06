import fs from 'node:fs/promises'
import { defineConfig } from 'rollup'
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import scss from 'rollup-plugin-scss'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import virtual from '@rollup/plugin-virtual'
import { virtualModules } from 'rollup-plugin-typora'


const { compilerOptions } = JSON.parse(await fs.readFile('./tsconfig.json', 'utf8'))

const overrided = {
  "target": "ES5",
  "downlevelIteration": true,

  "module": undefined,
  "emitDeclarationOnly": undefined,
  "declaration": undefined,
  "declarationDir": undefined,
}

await fs.rm('./dist', { recursive: true, force: true })
await fs.mkdir('./dist')

await fs.cp('./src/locales', './dist/locales', { recursive: true })
await fs.cp('./node_modules/katex/dist/katex.min.js', './dist/katex.min.js')
await fs.cp('./node_modules/katex/dist/katex.min.css', './dist/katex.min.css')

const woff2 = await fs.readdir('./node_modules/katex/dist/fonts')
  .then(files => files.filter(file => file.endsWith('.woff2')))
await Promise.all(woff2.map(file =>
  fs.cp(`./node_modules/katex/dist/fonts/${file}`, `./dist/fonts/${file}`, { recursive: true })
))


export default defineConfig({
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'es',
  },
  plugins: [
    replace({
      preventAssignment: true,
      'process.env.IS_DEV': 'false',
    }),
    virtual(virtualModules),
    nodeResolve(),
    commonjs(),
    typescript({
      compilerOptions: {
        ...compilerOptions,
        ...overrided,
      },
    }),
    babel({
      babelHelpers: 'bundled',
      presets: [["@babel/preset-env", { "useBuiltIns": "entry", "corejs": 3 }]],
      exclude: [
        /\bcore-js\b/,
      ],
    }),
    json(),
    scss({
      fileName: 'style.css',
      processor: (css, map) => ({ css: css.replace(/\n+\s*/g, '') }),
    }),
    terser(),
  ],
})
