import type { Messages } from '../../../i18n/schema.ts'
import type { UnicodeConverterState } from './types.ts'
import {
  createInitialUnicodeConverterState,
  formatBinary,
  formatCodePointHex,
  formatOctal,
  formatUtf16,
  formatUtf8,
} from './utils.ts'

export const renderUnicodeConverter = (
  messages: Messages,
  state: UnicodeConverterState = createInitialUnicodeConverterState(),
): string => {
  const m = messages.unicodeConverter
  const character = String.fromCodePoint(state.cp)
  const fields: { key: string; label: string; value: string | number }[] = [
    { key: 'binary', label: m.binaryLabel, value: formatBinary(state.cp) },
    { key: 'octal', label: m.octalLabel, value: formatOctal(state.cp) },
    { key: 'decimal', label: m.decimalLabel, value: state.cp },
    { key: 'codepoint', label: m.codePointLabel, value: formatCodePointHex(state.cp) },
    { key: 'utf8', label: m.utf8Label, value: formatUtf8(state.cp) },
    { key: 'utf16', label: m.utf16Label, value: formatUtf16(state.cp) },
  ]

  return `
    <section class="tool-layout unicode-converter-layout" data-unicode-converter-root>
      <section class="tool-panel unicode-converter-panel">
        <input class="unicode-converter-character" data-unicode-converter-character type="text" value="${character}" spellcheck="false" autocomplete="off" />
        <div class="unicode-converter-grid">
          ${fields
            .map(
              ({ key, label, value }) => `
          <label class="tool-field">
            <span data-unicode-converter-${key}-label>${label}</span>
            <input data-unicode-converter-${key} type="text" value="${value}" spellcheck="false" />
          </label>`,
            )
            .join('')}
        </div>
        <div class="unicode-converter-info">
          <span class="unicode-converter-info-item">${m.categoryLabel}: <b data-unicode-converter-category></b></span>
          <span class="unicode-converter-info-item">${m.asciiLabel}: <b data-unicode-converter-ascii></b></span>
        </div>
      </section>
    </section>`
}
