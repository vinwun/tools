import type { Messages } from '../../../i18n/schema'
import { DEFAULT_COLOR, rgbToHex, rgbToHsl } from './utils.ts'
import type { ColorState } from './types.ts'

export const renderColorPicker = (
  messages: Messages,
  state: ColorState = { rgb: DEFAULT_COLOR, hsl: rgbToHsl(DEFAULT_COLOR) },
): string => {
  const hex = rgbToHex(state.rgb)

  return `
    <section class="tool-layout color-picker-layout" data-color-picker-root>
      <section class="tool-panel color-picker-panel color-picker-panel-left">
        <div class="color-picker-side-box">
          <div class="color-picker-canvas-stack">
            <div class="color-picker-text-block">
              <h2 data-color-picker-text="squareLabel">${messages.colorPicker.squareLabel}</h2>
              <p class="tool-hint color-picker-hint" data-color-picker-text="squareHint">${messages.colorPicker.squareHint}</p>
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
            <legend data-color-picker-text="hexLabel">${messages.colorPicker.hexLabel}</legend>
            <div class="color-picker-hex-row">
              <label class="tool-field color-picker-hex-input-field" for="color-picker-hex-input">
                <span data-color-picker-text="hexInputLabel">${messages.colorPicker.hexInputLabel}</span>
                <input
                  id="color-picker-hex-input"
                  data-color-picker-hex
                  type="text"
                  inputmode="text"
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
            <legend data-color-picker-text="rgbGroupLabel">${messages.colorPicker.rgbGroupLabel}</legend>
            <div class="color-picker-grid">
              ${renderChannelFields(messages, [
                { key: 'r', labelKey: 'redLabel', max: 255, value: state.rgb.r },
                { key: 'g', labelKey: 'greenLabel', max: 255, value: state.rgb.g },
                { key: 'b', labelKey: 'blueLabel', max: 255, value: state.rgb.b },
              ])}
            </div>
          </fieldset>

          <fieldset class="color-picker-fieldset">
            <legend data-color-picker-text="hslGroupLabel">${messages.colorPicker.hslGroupLabel}</legend>
            <div class="color-picker-grid">
              ${renderChannelFields(messages, [
                { key: 'h', labelKey: 'hueLabel', max: 360, value: state.hsl.h },
                { key: 's', labelKey: 'saturationLabel', max: 100, value: state.hsl.s },
                { key: 'l', labelKey: 'lightnessLabel', max: 100, value: state.hsl.l },
              ])}
            </div>
          </fieldset>
        </div>
      </section>
    </section>
  `
}

type ChannelField = { key: string; labelKey: keyof Messages['colorPicker']; max: number; value: number }

const renderChannelFields = (messages: Messages, fields: readonly ChannelField[]): string =>
  fields
    .map(
      ({ key, labelKey, max, value }) => `
              <label class="tool-field">
                <span data-color-picker-text="${labelKey}">${messages.colorPicker[labelKey]}</span>
                <input data-color-picker-${key} type="number" min="0" max="${max}" step="1" value="${value}" />
              </label>`,
    )
    .join('')
