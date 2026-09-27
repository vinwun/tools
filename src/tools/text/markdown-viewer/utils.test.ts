import { describe, expect, it } from 'vitest'
import { renderMarkdownToHtml } from './utils.ts'

describe('renderMarkdownToHtml', () => {
  it('keeps every level of nested lists', () => {
    expect(renderMarkdownToHtml('- a\n  - b\n    - c\n      - d')).toBe(
      '<ul><li>a<ul><li>b<ul><li>c<ul><li>d</li></ul></li></ul></li></ul></li></ul>',
    )
  })

  it('escapes link URLs once and allows relative links', () => {
    const html = renderMarkdownToHtml('[x](https://a.de/?a=1&b=2) [y](docs/a.md) [z](javascript:alert)')
    expect(html).toContain('href="https://a.de/?a=1&amp;b=2"')
    expect(html).toContain('href="docs/a.md"')
    expect(html).toContain('href="#"')
  })

  it('gives headings GitHub-style ids and keeps in-page links in the same tab', () => {
    expect(renderMarkdownToHtml('## Mein Kapitel!\n\n[Zum Kapitel](#mein-kapitel)')).toBe(
      '<h2 id="mein-kapitel">Mein Kapitel!</h2>\n<p><a href="#mein-kapitel">Zum Kapitel</a></p>',
    )
  })

  it('does not treat spaced asterisks as emphasis', () => {
    expect(renderMarkdownToHtml('2 * 3 * 4 and *yes*')).toBe('<p>2 * 3 * 4 and <em>yes</em></p>')
  })

  it('starts a table right after a paragraph', () => {
    expect(renderMarkdownToHtml('Intro\n| a | b |\n|---|---|\n| 1 | 2 |')).toBe(
      '<p>Intro</p>\n<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    )
  })
})
