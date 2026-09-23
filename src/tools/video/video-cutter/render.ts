import type { Messages } from '../../../i18n/schema'
import { formatAcceptList } from '../../foundations/files.ts'
import { renderFilePicker } from '../../foundations/file-picker/render.ts'
import { ACCEPTED_VIDEO_TYPES } from '../video-utils.ts'

export const renderVideoCutter = (messages: Messages): string => `
  <section class="tool-layout tool-layout-split video-cutter-layout" data-video-cutter-root>
    <div class="tool-panel video-cutter-panel video-cutter-panel-main">
      <div class="tool-field">
        <span data-video-cutter-upload-label>${messages.videoCutter.uploadLabel}</span>
        ${renderFilePicker({
          accept: ACCEPTED_VIDEO_TYPES,
          browseLabel: messages.videoCutter.browseAction,
          emptyLabel: messages.videoCutter.noFileSelected,
        })}
      </div>
      <p class="tool-hint" data-video-cutter-upload-hint>${messages.videoCutter.uploadHintLabel}: ${formatAcceptList(ACCEPTED_VIDEO_TYPES)}</p>

      <div class="video-cutter-preview-block">
        <h2 data-video-cutter-preview-heading>${messages.videoCutter.previewLabel}</h2>
        <video class="tool-media-preview" data-video-cutter-preview controls preload="metadata"></video>
      </div>
    </div>

    <div class="tool-panel video-cutter-panel video-cutter-panel-sidebar">
      <div class="video-cutter-range">
        <label class="tool-field" for="video-cutter-start-input">
          <span data-video-cutter-start-label>${messages.videoCutter.startLabel}</span>
          <div class="video-cutter-range-field">
            <button type="button" class="video-cutter-step-btn" data-video-cutter-start-down tabindex="-1" disabled>−</button>
            <input type="text" id="video-cutter-start-input" inputmode="decimal" placeholder="0" value="0,00" data-video-cutter-start disabled />
            <button type="button" class="video-cutter-step-btn" data-video-cutter-start-up tabindex="-1" disabled>+</button>
          </div>
        </label>
        <label class="tool-field" for="video-cutter-end-input">
          <span data-video-cutter-end-label>${messages.videoCutter.endLabel}</span>
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
          <span data-video-cutter-preview-duration-label>${messages.videoCutter.previewDurationLabel}</span>
          <input type="number" inputmode="decimal" min="1" step="1" value="1" data-video-cutter-preview-duration disabled />
          <span>s</span>
        </label>
      </div>

      <p class="tool-status" data-video-cutter-status>${messages.videoCutter.statusNoFile}</p>

      <button type="button" class="tool-action tool-download video-cutter-download" data-video-cutter-download disabled>${messages.videoCutter.downloadAction}</button>
    </div>
  </section>
`
