import type { Messages } from '../../../i18n/schema'
import { DEFAULT_COLOR, rgbToHex, rgbToHsl } from './utils.ts'
import type { ColorState } from './types.ts'

const render = (messages: Messages, state: ColorState): string => {
  const hex = rgbToHex(state.rgb)

  return `
    <section class="tool-layout color-picker-layout" data-color-picker-root>
      <section class="tool-panel color-picker-panel color-picker-panel-left">
        <div class="color-picker-side-box">
          <div class="color-picker-canvas-stack">
            <div class="color-picker-text-block">
              <h2>${messages.colorPicker.squareLabel}</h2>
              <p class="color-picker-hint">${messages.colorPicker.squareHint}</p>
            </div>

            <div class="color-picker-canvas-shell color-picker-square-shell">
              <canvas
                class="color-picker-canvas color-picker-square-canvas"
                data-color-picker-spectrum
                aria-label="${messages.colorPicker.squareLabel}"
                tabindex="0"
              ></canvas>
              <span class="color-picker-handle color-picker-spectrum-handle" data-color-picker-spectrum-handle></span>
            </div>

            <div class="color-picker-canvas-shell color-picker-hue-shell">
              <canvas
                class="color-picker-canvas color-picker-hue-canvas"
                data-color-picker-hue
                aria-label="${messages.colorPicker.hueBarLabel}"
                tabindex="0"
              ></canvas>
              <span class="color-picker-handle color-picker-hue-handle" data-color-picker-hue-handle></span>
            </div>
          </div>
        </div>
      </section>

      <section class="tool-panel color-picker-panel color-picker-panel-right">
        <div class="color-picker-side-box">
          <fieldset class="color-picker-fieldset color-picker-hex-fieldset">
            <legend>${messages.colorPicker.hexLabel}</legend>
            <div class="color-picker-hex-row">
              <label class="tool-field color-picker-hex-input-field" for="color-picker-hex-input">
                <span>${messages.colorPicker.hexInputLabel}</span>
                <input
                  id="color-picker-hex-input"
                  data-color-picker-hex
                  type="text"
                  inputmode="text"
                  maxlength="7"
                  placeholder="${messages.colorPicker.hexInputPlaceholder}"
                  value="${hex}"
                  spellcheck="false"
                  autocapitalize="characters"
                  autocomplete="off"
                />
              </label>
              <button
                type="button"
                class="tool-action color-picker-copy-button"
                data-color-picker-copy
              >
                ${messages.colorPicker.copyHexAction}
              </button>
            </div>
            <div class="color-picker-copy-popup" data-color-picker-popup aria-live="polite"></div>
          </fieldset>

          <fieldset class="color-picker-fieldset">
            <legend>${messages.colorPicker.rgbGroupLabel}</legend>
            <div class="color-picker-grid">
              <label class="tool-field">
                <span>${messages.colorPicker.redLabel}</span>
                <input data-color-picker-r type="number" min="0" max="255" step="1" value="${state.rgb.r}" />
              </label>
              <label class="tool-field">
                <span>${messages.colorPicker.greenLabel}</span>
                <input data-color-picker-g type="number" min="0" max="255" step="1" value="${state.rgb.g}" />
              </label>
              <label class="tool-field">
                <span>${messages.colorPicker.blueLabel}</span>
                <input data-color-picker-b type="number" min="0" max="255" step="1" value="${state.rgb.b}" />
              </label>
            </div>
          </fieldset>

          <fieldset class="color-picker-fieldset">
            <legend>${messages.colorPicker.hslGroupLabel}</legend>
            <div class="color-picker-grid">
              <label class="tool-field">
                <span>${messages.colorPicker.hueLabel}</span>
                <input data-color-picker-h type="number" min="0" max="360" step="1" value="${state.hsl.h}" />
              </label>
              <label class="tool-field">
                <span>${messages.colorPicker.saturationLabel}</span>
                <input data-color-picker-s type="number" min="0" max="100" step="1" value="${state.hsl.s}" />
              </label>
              <label class="tool-field">
                <span>${messages.colorPicker.lightnessLabel}</span>
                <input data-color-picker-l type="number" min="0" max="100" step="1" value="${state.hsl.l}" />
              </label>
            </div>
          </fieldset>
        </div>
      </section>
    </section>
  `
}

export const renderColorPicker = (messages: Messages): string => render(messages, {
  rgb: DEFAULT_COLOR,
  hsl: rgbToHsl(DEFAULT_COLOR),
})
