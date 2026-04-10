import type { Messages } from '../../../i18n/schema'
import {ACCEPTED_AUDIO_TYPES} from "../audio-utils.ts";

export const renderAudioTrimmer = (messages: Messages): string => `
  <section class="tool-layout audio-trimmer-layout" data-audio-trimmer-root>
    <div class="tool-panel audio-trimmer-panel audio-trimmer-panel-main">
      <label class="tool-field">
        <span>${messages.audioTrimmer.uploadLabel}</span>
        <div class="audio-trimmer-file-picker" data-audio-trimmer-dropzone>
          <button type="button" class="tool-action audio-trimmer-file-button" data-audio-trimmer-browse>${messages.audioTrimmer.browseAction}</button>
          <span class="audio-trimmer-file-name" data-audio-trimmer-file-name aria-live="polite">${messages.audioTrimmer.noFileSelected}</span>
        </div>
        <input class="audio-trimmer-file-input" type="file" accept="${ACCEPTED_AUDIO_TYPES}" data-audio-trimmer-file hidden />
      </label>
      <p class="tool-hint">${messages.audioTrimmer.uploadHintLabel}: ${ACCEPTED_AUDIO_TYPES.replaceAll(',', ' / ')}</p>

      <div class="audio-trimmer-waveform-block">
        <div class="audio-trimmer-waveform-header">
          <h2>${messages.audioTrimmer.waveformLabel}</h2>
          <p class="audio-trimmer-selection-summary" data-audio-trimmer-summary>${messages.audioTrimmer.statusNoFile}</p>
        </div>
        <div class="audio-trimmer-waveform-shell">
          <canvas class="audio-trimmer-waveform-canvas" data-audio-trimmer-waveform aria-label="${messages.audioTrimmer.waveformLabel}"></canvas>
          <div class="audio-trimmer-waveform-selection" data-audio-trimmer-selection></div>
          <button type="button" class="audio-trimmer-waveform-handle audio-trimmer-waveform-handle-start" data-audio-trimmer-start-handle aria-label="${messages.audioTrimmer.startLabel}"></button>
          <button type="button" class="audio-trimmer-waveform-handle audio-trimmer-waveform-handle-end" data-audio-trimmer-end-handle aria-label="${messages.audioTrimmer.endLabel}"></button>
        </div>
        <p class="tool-hint">${messages.audioTrimmer.waveformHint}</p>
      </div>
    </div>

    <div class="tool-panel audio-trimmer-panel audio-trimmer-panel-sidebar">
      <fieldset class="audio-trimmer-mode-fieldset">
        <legend>${messages.audioTrimmer.selectionModeLabel}</legend>
        <div class="audio-trimmer-mode-options">
          <label class="audio-trimmer-mode-option">
            <input type="radio" name="audio-trimmer-mode" value="keep" data-audio-trimmer-mode checked />
            <span>${messages.audioTrimmer.keepModeLabel}</span>
          </label>
          <label class="audio-trimmer-mode-option">
            <input type="radio" name="audio-trimmer-mode" value="remove" data-audio-trimmer-mode />
            <span>${messages.audioTrimmer.removeModeLabel}</span>
          </label>
        </div>
      </fieldset>

      <div class="audio-trimmer-time-grid">
        <label class="tool-field">
          <span>${messages.audioTrimmer.startLabel}</span>
          <input type="text" inputmode="decimal" spellcheck="false" placeholder="00:00.00" value="00:00.00" data-audio-trimmer-start disabled />
        </label>
        <label class="tool-field">
          <span>${messages.audioTrimmer.endLabel}</span>
          <input type="text" inputmode="decimal" spellcheck="false" placeholder="00:00.00" value="00:00.00" data-audio-trimmer-end disabled />
        </label>
      </div>

      <audio class="audio-trimmer-preview" data-audio-trimmer-preview controls preload="metadata"></audio>
      <p class="tool-status" data-audio-trimmer-status>${messages.audioTrimmer.statusNoFile}</p>
      <a class="tool-action audio-trimmer-download is-disabled" data-audio-trimmer-download aria-disabled="true">${messages.audioTrimmer.downloadAction}</a>
    </div>
  </section>
`
