import { formatAcceptList } from '../files.ts'
import { renderFilePicker } from '../file-picker/render.ts'
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
        <div class="tool-field">
          <span data-file-converter-upload-label>${messages.uploadLabel}</span>
          ${renderFilePicker({
            accept: config.inputAccept,
            multiple: true,
            browseLabel: messages.browseAction,
            emptyLabel: messages.noFileSelected,
          })}
        </div>
        <p class="tool-hint" data-file-converter-upload-hint>${messages.uploadHintLabel}: ${formatAcceptList(config.inputAccept)}</p>
      </div>

      <label class="tool-field">
        <span data-file-converter-output-label>${messages.outputLabel}</span>
        <select data-file-converter-output>
          ${renderOutputOptions(config)}
        </select>
      </label>
    </div>

    <div class="tool-panel file-converter-panel file-converter-panel-result">
      <h2 data-file-converter-preview-title>${messages.previewTitle}</h2>
      <div class="file-converter-preview" data-file-converter-preview>
        <p class="file-converter-preview-message" data-file-converter-preview-message>${messages.statusNoFile}</p>
      </div>
      <button type="button" class="file-converter-download-button" data-file-converter-download disabled>${messages.downloadAllAction}</button>
    </div>
  </section>
`
