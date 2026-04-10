import type { ConverterMessages, FileConverterConfig } from './types.ts'

const renderOutputOptions = (config: FileConverterConfig): string =>
  config.outputFormats
    .map((format) => `<option value="${format.id}">${format.label}</option>`)
    .join('')

export const renderFileConverter = (
  config: FileConverterConfig,
  messages: ConverterMessages,
): string => `
  <section class="tool-layout file-converter-layout" data-file-converter-root="${config.id}">
    <div class="tool-panel file-converter-panel file-converter-panel-input">
      <div class="file-converter-input-header">
        <label class="tool-field">
          <span>${messages.uploadLabel}</span>
          <div class="file-converter-file-picker" data-file-converter-dropzone>
            <button type="button" class="file-converter-file-button" data-file-converter-file-button>${messages.browseAction}</button>
            <span class="file-converter-file-name" data-file-converter-file-name aria-live="polite">${messages.noFileSelected}</span>
          </div>
          <input class="file-converter-file-input" type="file" data-file-converter-file accept="${config.inputAccept}" multiple hidden />
        </label>
        <p class="tool-hint" data-file-converter-upload-hint>${messages.uploadHintLabel}: ${config.inputAccept.replaceAll(',', ' / ')}</p>
      </div>

      <label class="tool-field">
        <span>${messages.outputLabel}</span>
        <select data-file-converter-output>
          ${renderOutputOptions(config)}
        </select>
      </label>
    </div>

    <div class="tool-panel file-converter-panel file-converter-panel-result">
      <h2>${messages.previewTitle}</h2>
      <div class="file-converter-preview" data-file-converter-preview>
        <p class="file-converter-preview-message" data-file-converter-preview-message>${messages.statusNoFile}</p>
      </div>
      <a class="file-converter-download-link is-disabled" data-file-converter-download aria-disabled="true">${messages.downloadAllAction}</a>
    </div>
  </section>
`

