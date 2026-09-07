import type { Messages } from '../../../i18n/schema'
import { ACCEPTED_VIDEO_TYPES } from '../video-utils.ts'

export const renderVideoAudioSplitter = (messages: Messages): string => `
  <section class="tool-layout video-audio-splitter-layout" data-video-audio-splitter-root>
    <div class="tool-panel video-audio-splitter-panel video-audio-splitter-panel-main">
      <label class="tool-field">
        <span>${messages.videoAudioSplitter.uploadLabel}</span>
        <div class="video-audio-splitter-file-picker" data-video-audio-splitter-dropzone>
          <button type="button" class="tool-action video-audio-splitter-file-button" data-video-audio-splitter-browse>${messages.videoAudioSplitter.browseAction}</button>
          <span class="video-audio-splitter-file-name" data-video-audio-splitter-file-name>${messages.videoAudioSplitter.noFileSelected}</span>
        </div>
        <input class="video-audio-splitter-file-input" type="file" accept="${ACCEPTED_VIDEO_TYPES}" data-video-audio-splitter-file hidden />
      </label>
      <p class="tool-hint">${messages.videoAudioSplitter.uploadHintLabel}: ${ACCEPTED_VIDEO_TYPES.replaceAll(',', ' / ')}</p>

      <div class="video-audio-splitter-preview-block">
        <h2>${messages.videoAudioSplitter.previewLabel}</h2>
      <video class="video-audio-splitter-preview" data-video-audio-splitter-preview controls preload="metadata"></video>
      </div>
    </div>

    <div class="tool-panel video-audio-splitter-panel video-audio-splitter-panel-sidebar">
      <div class="video-audio-splitter-info">
        <h2>${messages.videoAudioSplitter.infoTitle}</h2>
        <dl class="video-audio-splitter-info-list">
          <div class="video-audio-splitter-info-row">
            <dt>${messages.videoAudioSplitter.durationLabel}</dt>
            <dd data-video-audio-splitter-duration>—</dd>
          </div>
          <div class="video-audio-splitter-info-row">
            <dt>${messages.videoAudioSplitter.formatLabel}</dt>
            <dd data-video-audio-splitter-format>—</dd>
          </div>
          <div class="video-audio-splitter-info-row">
            <dt>${messages.videoAudioSplitter.tracksLabel}</dt>
            <dd data-video-audio-splitter-tracks>—</dd>
          </div>
        </dl>
      </div>

      <p class="tool-status" data-video-audio-splitter-status>${messages.videoAudioSplitter.statusNoFile}</p>

      <button type="button" class="tool-action video-audio-splitter-download video-audio-splitter-download-audio" data-video-audio-splitter-audio-download disabled>${messages.videoAudioSplitter.audioDownloadAction}</button>
      <button type="button" class="tool-action video-audio-splitter-download video-audio-splitter-download-silent" data-video-audio-splitter-silent-download disabled>${messages.videoAudioSplitter.silentDownloadAction}</button>
    </div>
  </section>
`
