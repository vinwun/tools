import type { Messages } from '../../../i18n/schema.ts'
import type { UnicodeDisplayerState } from './types.ts'
import {
  formatBinary,
  formatCodePointHex,
  formatOctal,
  formatUtf16,
  formatUtf8,
} from './utils.ts'

export const renderUnicodeDisplayer = (
  messages: Messages,
  state: UnicodeDisplayerState,
): string => {
  const m = messages.unicodeDisplayer
  const character = String.fromCodePoint(state.cp)
  return `
    <section class="tool-layout unicode-displayer-layout" data-unicode-displayer-root>
      <section class="tool-panel unicode-displayer-panel">
        <input class="unicode-displayer-character" data-unicode-displayer-character type="text" value="${character}" spellcheck="false" autocomplete="off" />
        <div class="unicode-displayer-grid">
          <label class="tool-field">
            <span data-unicode-displayer-binary-label>${m.binaryLabel}</span>
            <input data-unicode-displayer-binary type="text" value="${formatBinary(state.cp)}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-displayer-octal-label>${m.octalLabel}</span>
            <input data-unicode-displayer-octal type="text" value="${formatOctal(state.cp)}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-displayer-decimal-label>${m.decimalLabel}</span>
            <input data-unicode-displayer-decimal type="text" value="${state.cp}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-displayer-codepoint-label>${m.codePointLabel}</span>
            <input data-unicode-displayer-codepoint type="text" value="${formatCodePointHex(state.cp)}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-displayer-utf8-label>${m.utf8Label}</span>
            <input data-unicode-displayer-utf8 type="text" value="${formatUtf8(state.cp)}" spellcheck="false" />
          </label>
          <label class="tool-field">
            <span data-unicode-displayer-utf16-label>${m.utf16Label}</span>
            <input data-unicode-displayer-utf16 type="text" value="${formatUtf16(state.cp)}" spellcheck="false" />
          </label>
        </div>
        <div class="unicode-displayer-info">
          <span class="unicode-displayer-info-item">${m.categoryLabel}: <b data-unicode-displayer-category></b></span>
          <span class="unicode-displayer-info-item">${m.asciiLabel}: <b data-unicode-displayer-ascii></b></span>
        </div>
      </section>
    </section>`
}
