import type { Plugin } from 'vite'
import { publicPages } from './pages'

export function siteMetadata(siteUrl?: string): Plugin {
  const origin = siteUrl ? new URL(siteUrl).origin : undefined
  return {
    name: 'site-metadata',
    transformIndexHtml(html, { path }) {
      const page = publicPages.find((entry) => path === '/' + entry.file || path === entry.path)
      if (!origin || !page) return html
      return [{ tag: 'link', attrs: { rel: 'canonical', href: new URL(page.path, origin).href }, injectTo: 'head' }]
    },
    generateBundle() {
      this.emitFile({
        type: 'asset', fileName: 'robots.txt',
        source: 'User-agent: *\nAllow: /\n' + (origin ? 'Sitemap: ' + origin + '/sitemap.xml\n' : ''),
      })
      if (origin) {
        const entries = publicPages.map(({ path }) => '  <url><loc>' + new URL(path, origin).href + '</loc></url>')
        this.emitFile({
          type: 'asset', fileName: 'sitemap.xml',
          source: '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + entries.join('\n') + '\n</urlset>\n',
        })
      }
    },
  }
}
