import * as child_process from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as esbuild from 'esbuild'
import typoraPlugin, { installDevPlugin, closeTypora } from 'esbuild-plugin-typora'
import { sassPlugin } from 'esbuild-sass-plugin'


const args = process.argv.slice(2)
const IS_PROD = args.includes('--prod')
const IS_DEV = !IS_PROD

await fs.rm('./dist', { recursive: true, force: true })

await fs.cp('./src/locales', './dist/locales', { recursive: true })
await fs.cp('./node_modules/katex/dist/katex.min.css', './dist/katex.min.css')

const woff2 = await fs.readdir('./node_modules/katex/dist/fonts')
  .then(files => files.filter(file => file.endsWith('.woff2')))
await Promise.all(woff2.map(file =>
  fs.cp(`./node_modules/katex/dist/fonts/${file}`, `./dist/fonts/${file}`, { recursive: true })
))

await esbuild.build({
  entryPoints: ['src/main.ts'],
  outdir: 'dist',
  format: 'esm',
  bundle: true,
  minify: IS_PROD,
  sourcemap: IS_DEV,
  plugins: [
    typoraPlugin({
      mode: IS_PROD ? 'production' : 'development'
    }),
    sassPlugin(),
  ],
})

if (IS_DEV) {

  await installDevPlugin()
  await closeTypora()
  child_process.exec('Typora ./test/vault/markdown.md')
}
