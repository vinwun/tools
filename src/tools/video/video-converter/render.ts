import type { Messages } from '../../../i18n/schema'
import { ACCEPTED_VIDEO_TYPES } from '../video-utils.ts'

export const renderVideoConverter = (messages: Messages): string => `
  <section class="tool-layout video-converter-layout" data-video-converter-root>
    <div class="tool-panel video-converter-panel video-converter-panel-main">
      <label class="tool-field">
        <span>${messages.videoConverter.uploadLabel}</span>
        <div class="video-converter-file-picker" data-video-converter-dropzone>
          <button type="button" class="tool-action video-converter-file-button" data-video-converter-browse>${messages.videoConverter.browseAction}</button>
          <span class="video-converter-file-name" data-video-converter-file-name>${messages.videoConverter.noFileSelected}</span>
        </div>
        <input class="video-converter-file-input" type="file" accept="${ACCEPTED_VIDEO_TYPES}" data-video-converter-file hidden />
      </label>
      <p class="tool-hint">${messages.videoConverter.uploadHintLabel}: ${ACCEPTED_VIDEO_TYPES.replaceAll(',', ' / ')}</p>

      <div class="video-converter-preview-block">
        <h2>${messages.videoConverter.previewLabel}</h2>
      <video class="video-converter-preview" data-video-converter-preview controls preload="metadata"></video>
      </div>
    </div>

    <div class="tool-panel video-converter-panel video-converter-panel-sidebar">
      <div class="video-converter-info">
        <h2>${messages.videoConverter.infoTitle}</h2>
        <dl class="video-converter-info-list">
          <div class="video-converter-info-row">
            <dt>${messages.videoConverter.durationLabel}</dt>
            <dd data-video-converter-duration>—</dd>
          </div>
          <div class="video-converter-info-row">
            <dt>${messages.videoConverter.formatLabel}</dt>
            <dd data-video-converter-format>—</dd>
          </div>
          <div class="video-converter-info-row">
            <dt>${messages.videoConverter.tracksLabel}</dt>
            <dd data-video-converter-tracks>—</dd>
          </div>
        </dl>
      </div>

      <p class="tool-status" data-video-converter-status>${messages.videoConverter.statusNoFile}</p>

      <button type="button" class="tool-action video-converter-download video-converter-download-audio" data-video-converter-audio-download disabled>${messages.videoConverter.audioDownloadAction}</button>
      <button type="button" class="tool-action video-converter-download video-converter-download-silent" data-video-converter-silent-download disabled>${messages.videoConverter.silentDownloadAction}</button>
    </div>
  </section>
`
