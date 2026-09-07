import type { Messages } from '../../../i18n/schema.ts'
import type { UnicodeConverterState } from './types.ts'
import {
  formatBinary,
  formatCodePointHex,
  formatOctal,
  formatUtf16,
  formatUtf8,
} from './utils.ts'

export const renderUnicodeConverter = (
  messages: Messages,
  state: UnicodeConverterState,
): string => {
  const m = messages.unicodeConverter
  const character = String.fromCodePoint(state.cp)
  return `
    <section class="tool-layout unicode-converter-layout" data-unicode-converter-root>
      <section class="tool-panel unicode-converter-panel">
        <input class="unicode-converter-character" data-unicode-converter-character type="text" value="${character}" spellcheck="false" autocomplete="off" />
        <div class="unicode-converter-grid">
          <label class="tool-field">
            <span data-unicode-converter-binary-label>${m.binaryLabel}</span>
            <input data-unicode-converter-binary type="text" value="${formatBinary(state.cp)}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-converter-octal-label>${m.octalLabel}</span>
            <input data-unicode-converter-octal type="text" value="${formatOctal(state.cp)}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-converter-decimal-label>${m.decimalLabel}</span>
            <input data-unicode-converter-decimal type="text" value="${state.cp}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-converter-codepoint-label>${m.codePointLabel}</span>
            <input data-unicode-converter-codepoint type="text" value="${formatCodePointHex(state.cp)}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-converter-utf8-label>${m.utf8Label}</span>
            <input data-unicode-converter-utf8 type="text" value="${formatUtf8(state.cp)}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-converter-utf16-label>${m.utf16Label}</span>
            <input data-unicode-converter-utf16 type="text" value="${formatUtf16(state.cp)}" spellcheck="false" />
          </label>
        </div>
        <div class="unicode-converter-info">
          <span class="unicode-converter-info-item">${m.categoryLabel}: <b data-unicode-converter-category></b></span>
          <span class="unicode-converter-info-item">${m.asciiLabel}: <b data-unicode-converter-ascii></b></span>
        </div>
      </section>
    </section>`
}
