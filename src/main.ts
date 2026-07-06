import { CodeblockPostProcessor, I18n, path, Plugin, PluginSettings, html, WorkspaceLeaf } from '@typora-community-plugin/core'
import { Markmap } from 'markmap-view'
import { renderMarkmap } from './markmap-renderer'
import * as Locale from './locales/lang.en.json'
import { MarkmapSettingTab } from './setting-tab'
import { MarkmapView } from './markmap-view'


interface MarkmapSettings {
  globalOptions: string
}

const DEFAULT_SETTINGS: MarkmapSettings = {
  globalOptions: 'autoFit: true',
}

export default class MarkmapPlugin extends Plugin<MarkmapSettings> {

  i18n = new I18n<typeof Locale>({
    localePath: path.join(this.manifest.dir!, 'locales')
  })

  mmOfCid: Record<string, Markmap> = {}

  onload() {
    const { app } = this

    this.registerCss('./katex.min.css')
    this.registerScript('./katex.min.js')

    this.registerSettings(
      new PluginSettings(app, this.manifest, {
        version: 1,
      }))

    this.settings.setDefault(DEFAULT_SETTINGS)

    this.registerSettingTab(new MarkmapSettingTab(this))

    this.register(
      app.workspace.on('file:open', () => this.reset()))

    this.registerMarkdownPostProcessor(
      CodeblockPostProcessor.from({
        lang: ['markmap', 'markdown markmap'],
        preview: async (code, pre) => {
          const cid = pre.getAttribute('cid')!
          const svg = (pre.querySelector('.md-diagram-panel-preview svg')
            ?? html`<svg style="width: 100%; max-height: 50vh"></svg>`) as any as SVGElement

          svg.style.height = pre.offsetHeight + 'px'

          renderMarkmap({
            globalOptions: this.settings.get('globalOptions'),
            markdown: code,
            getMarkmap: () => this.mmOfCid[cid] = this.mmOfCid[cid] ?? Markmap.create(svg),
          })

          return svg as any
        }
      }))

    this.register(app.viewManager.registerView('markmap', leaf => new MarkmapView(leaf, this)))

    this.registerCommand({
      id: 'show-active-markdown',
      title: this.i18n.t.viewEditingMarkdwon,
      scope: 'global',
      callback: () => {
        const { rootSplit } = app.workspace
        const markmapLeaf = rootSplit.findLeaf<WorkspaceLeaf<MarkmapView>>(leaf => leaf.view instanceof MarkmapView)
        if (markmapLeaf) return

        app.commands.run('core.workspace:split-right', [`typ://${MarkmapView.type}/Markmap Previewer`])
      },
    })
  }

  onunload() {
    this.reset()
  }

  registerScript(url: string) {
    this.register(this.importScript(url))
  }

  importScript(url: string) {
    const script = document.createElement('script')
    script.dataset.by = this.manifest.id
    script.src = 'file://' + path.join(this.manifest.dir!, url)
    document.head.appendChild(script)
    return () => script.remove()
  }

  registerCss(url: string) {
    this.register(this.importCss(url))
  }

  importCss(url: string) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.dataset.by = this.manifest.id
    link.href = 'file://' + path.join(this.manifest.dir!, url)
    document.head.appendChild(link)
    return () => link.remove()
  }

  reset() {
    Object.values(this.mmOfCid).forEach(v => v.destroy())
    this.mmOfCid = {}
  }
}
