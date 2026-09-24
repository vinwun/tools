import type { Messages } from '../../../i18n/schema.ts'
import type { LoremIpsumGeneratorState } from './types.ts'
import { createInitialLoremIpsumGeneratorState } from './utils.ts'

export const renderLoremIpsumGenerator = (
  messages: Messages,
  state: LoremIpsumGeneratorState = createInitialLoremIpsumGeneratorState(),
): string => {
  const loremMessages = messages.loremIpsumGenerator

  return `
    <section class="tool-layout lorem-ipsum-generator-layout" data-lorem-ipsum-generator-root>
      <form class="tool-panel lorem-ipsum-generator-panel" data-lorem-ipsum-generator-form novalidate>
        <fieldset class="tool-field lorem-ipsum-generator-fieldset">
          <legend data-lorem-ipsum-generator-settings-legend>${loremMessages.settingsLegend}</legend>

          <label class="tool-field" for="lorem-ipsum-generator-amount">
            <span data-lorem-ipsum-generator-amount-label>${loremMessages.amountLabel}</span>
            <input
              id="lorem-ipsum-generator-amount"
              type="number"
              min="1"
              max="10000"
              value="${state.amount}"
              data-lorem-ipsum-generator-amount-input
            />
          </label>

          <label class="tool-field" for="lorem-ipsum-generator-unit">
            <span data-lorem-ipsum-generator-unit-label>${loremMessages.unitLabel}</span>
            <select id="lorem-ipsum-generator-unit" data-lorem-ipsum-generator-unit-select>
              <option value="characters" data-lorem-ipsum-generator-unit-option-characters ${state.unit === 'characters' ? 'selected' : ''}>${loremMessages.unitCharacters}</option>
              <option value="words" data-lorem-ipsum-generator-unit-option-words ${state.unit === 'words' ? 'selected' : ''}>${loremMessages.unitWords}</option>
              <option value="sentences" data-lorem-ipsum-generator-unit-option-sentences ${state.unit === 'sentences' ? 'selected' : ''}>${loremMessages.unitSentences}</option>
              <option value="paragraphs" data-lorem-ipsum-generator-unit-option-paragraphs ${state.unit === 'paragraphs' ? 'selected' : ''}>${loremMessages.unitParagraphs}</option>
            </select>
          </label>

          <label class="lorem-ipsum-generator-checkbox" for="lorem-ipsum-generator-classic">
            <input
              id="lorem-ipsum-generator-classic"
              type="checkbox"
              data-lorem-ipsum-generator-classic-checkbox
              ${state.startWithClassic ? 'checked' : ''}
            />
            <span data-lorem-ipsum-generator-classic-label>${loremMessages.classicLabel}</span>
          </label>
        </fieldset>

        <div class="tool-actions lorem-ipsum-generator-actions">
          <button type="submit" class="tool-action" data-lorem-ipsum-generator-generate>${loremMessages.generateAction}</button>
        </div>
      </form>

      <section class="tool-panel lorem-ipsum-generator-panel">
        <div class="lorem-ipsum-generator-output-header">
          <h2 data-lorem-ipsum-generator-output-label>${loremMessages.outputLabel}</h2>
          <div class="tool-actions lorem-ipsum-generator-output-actions">
            <button type="button" class="tool-action" data-lorem-ipsum-generator-copy>${loremMessages.copyAction}</button>
            <button type="button" class="tool-action" data-lorem-ipsum-generator-clear>${loremMessages.clearAction}</button>
          </div>
        </div>
        <p class="tool-status" role="status" data-lorem-ipsum-generator-status></p>
        <textarea
          class="tool-textarea lorem-ipsum-generator-output"
          data-lorem-ipsum-generator-output
          rows="14"
          readonly
        >${state.outputValue}</textarea>
      </section>
    </section>
  `
}
