import type { Messages } from '../../../i18n/schema.ts'
import type { MatrixMultiplierState } from './types.ts'
import { createInitialMatrixMultiplierState } from './utils.ts'

export const renderMatrixMultiplier = (
  messages: Messages,
  state: MatrixMultiplierState = createInitialMatrixMultiplierState(messages),
): string => {
  const matrixMessages = messages.matrixMultiplier

  return `
    <section class="tool-layout matrix-multiplier-layout" data-matrix-multiplier-root>
      <div class="tool-panel matrix-multiplier-panel">
        <div class="matrix-multiplier-inputs">
          <label class="tool-field" for="matrix-multiplier-a">
            <span data-matrix-multiplier-a-label>${matrixMessages.matrixALabel}</span>
            <textarea
              id="matrix-multiplier-a"
              data-matrix-multiplier-a
              class="matrix-multiplier-input"
              rows="6"
              spellcheck="false"
            >${state.matrixAValue}</textarea>
            <span class="matrix-multiplier-dimension" data-matrix-multiplier-a-dimensions>${state.matrixADimensionsText}</span>
          </label>

          <div class="matrix-multiplier-sign" aria-hidden="true">&times;</div>

          <label class="tool-field" for="matrix-multiplier-b">
            <span data-matrix-multiplier-b-label>${matrixMessages.matrixBLabel}</span>
            <textarea
              id="matrix-multiplier-b"
              data-matrix-multiplier-b
              class="matrix-multiplier-input"
              rows="6"
              spellcheck="false"
            >${state.matrixBValue}</textarea>
            <span class="matrix-multiplier-dimension" data-matrix-multiplier-b-dimensions>${state.matrixBDimensionsText}</span>
          </label>
        </div>
        <p class="tool-hint" data-matrix-multiplier-hint>${matrixMessages.matrixHint}</p>
      </div>

      <div class="tool-panel matrix-multiplier-panel">
        <label class="tool-field">
          <span data-matrix-multiplier-result-label>${matrixMessages.resultLabel}</span>
          <pre class="matrix-multiplier-output" data-matrix-multiplier-output>${state.outputText}</pre>
        </label>
        <p class="tool-status" role="status" data-matrix-multiplier-status>${state.statusText}</p>
      </div>
    </section>
  `
}
