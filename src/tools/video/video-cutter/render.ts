import type { Messages } from '../../../i18n/schema'
import { ACCEPTED_VIDEO_TYPES } from '../video-utils.ts'

export const renderVideoCutter = (messages: Messages): string => `
  <section class="tool-layout video-cutter-layout" data-video-cutter-root>
    <div class="tool-panel video-cutter-panel video-cutter-panel-main">
      <label class="tool-field">
        <span>${messages.videoCutter.uploadLabel}</span>
        <div class="video-cutter-file-picker" data-video-cutter-dropzone>
          <button type="button" class="tool-action video-cutter-file-button" data-video-cutter-browse>${messages.videoCutter.browseAction}</button>
          <span class="video-cutter-file-name" data-video-cutter-file-name>${messages.videoCutter.noFileSelected}</span>
        </div>
        <input class="video-cutter-file-input" type="file" accept="${ACCEPTED_VIDEO_TYPES}" data-video-cutter-file hidden />
      </label>
      <p class="tool-hint">${messages.videoCutter.uploadHintLabel}: ${ACCEPTED_VIDEO_TYPES.replaceAll(',', ' / ')}</p>

      <div class="video-cutter-preview-block">
        <h2>${messages.videoCutter.previewLabel}</h2>
        <video class="video-cutter-preview" data-video-cutter-preview controls preload="metadata"></video>
      </div>
    </div>

    <div class="tool-panel video-cutter-panel video-cutter-panel-sidebar">
      <div class="video-cutter-range">
        <label class="tool-field" for="video-cutter-start-input">
          <span>${messages.videoCutter.startLabel}</span>
          <div class="video-cutter-range-field">
            <button type="button" class="video-cutter-step-btn" data-video-cutter-start-down tabindex="-1" disabled>−</button>
            <input type="text" id="video-cutter-start-input" inputmode="decimal" placeholder="0" value="0,00" data-video-cutter-start disabled />
            <button type="button" class="video-cutter-step-btn" data-video-cutter-start-up tabindex="-1" disabled>+</button>
          </div>
        </label>
        <label class="tool-field" for="video-cutter-end-input">
          <span>${messages.videoCutter.endLabel}</span>
          <div class="video-cutter-range-field">
            <button type="button" class="video-cutter-step-btn" data-video-cutter-end-down tabindex="-1" disabled>−</button>
            <input type="text" id="video-cutter-end-input" inputmode="decimal" placeholder="0" value="0,00" data-video-cutter-end disabled />
            <button type="button" class="video-cutter-step-btn" data-video-cutter-end-up tabindex="-1" disabled>+</button>
          </div>
        </label>
      </div>

      <div class="video-cutter-play-row">
        <button type="button" class="tool-action video-cutter-play-selection" data-video-cutter-play-selection disabled>${messages.videoCutter.playSelectionAction}</button>
        <span class="video-cutter-actual-start" data-video-cutter-actual-start></span>
      </div>

      <div class="video-cutter-ending-row">
        <button type="button" class="tool-action video-cutter-play-ending" data-video-cutter-play-ending disabled>${messages.videoCutter.playEndingAction}</button>
        <label class="video-cutter-preview-duration-field">
          <span>${messages.videoCutter.previewDurationLabel}</span>
          <input type="number" inputmode="decimal" min="1" step="1" value="1" data-video-cutter-preview-duration disabled />
          <span>s</span>
        </label>
      </div>

      <p class="tool-status" data-video-cutter-status>${messages.videoCutter.statusNoFile}</p>

      <button type="button" class="tool-action video-cutter-download" data-video-cutter-download disabled>${messages.videoCutter.downloadAction}</button>
    </div>
  </section>
`
