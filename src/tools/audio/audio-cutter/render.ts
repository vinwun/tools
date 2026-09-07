import type { Messages } from '../../../i18n/schema'
import {ACCEPTED_AUDIO_TYPES} from "../audio-utils.ts";

export const renderAudioCutter = (messages: Messages): string => `
  <section class="tool-layout audio-cutter-layout" data-audio-cutter-root>
    <div class="tool-panel audio-cutter-panel audio-cutter-panel-main">
      <label class="tool-field">
        <span>${messages.audioCutter.uploadLabel}</span>
        <div class="audio-cutter-file-picker" data-audio-cutter-dropzone>
          <button type="button" class="tool-action audio-cutter-file-button" data-audio-cutter-browse>${messages.audioCutter.browseAction}</button>
          <span class="audio-cutter-file-name" data-audio-cutter-file-name aria-live="polite">${messages.audioCutter.noFileSelected}</span>
        </div>
        <input class="audio-cutter-file-input" type="file" accept="${ACCEPTED_AUDIO_TYPES}" data-audio-cutter-file hidden />
      </label>
      <p class="tool-hint">${messages.audioCutter.uploadHintLabel}: ${ACCEPTED_AUDIO_TYPES.replaceAll(',', ' / ')}</p>

      <div class="audio-cutter-waveform-block">
        <div class="audio-cutter-waveform-header">
          <h2>${messages.audioCutter.waveformLabel}</h2>
          <p class="audio-cutter-selection-summary" data-audio-cutter-summary>${messages.audioCutter.statusNoFile}</p>
        </div>
        <div class="audio-cutter-waveform-shell">
          <canvas class="audio-cutter-waveform-canvas" data-audio-cutter-waveform aria-label="${messages.audioCutter.waveformLabel}"></canvas>
          <div class="audio-cutter-waveform-selection" data-audio-cutter-selection></div>
          <button type="button" class="audio-cutter-waveform-handle audio-cutter-waveform-playhead" data-audio-cutter-playhead aria-label="${messages.audioCutter.playheadLabel}"></button>
          <button type="button" class="audio-cutter-waveform-handle audio-cutter-waveform-handle-start" data-audio-cutter-start-handle aria-label="${messages.audioCutter.startLabel}"></button>
          <button type="button" class="audio-cutter-waveform-handle audio-cutter-waveform-handle-end" data-audio-cutter-end-handle aria-label="${messages.audioCutter.endLabel}"></button>
        </div>
        <p class="tool-hint">${messages.audioCutter.waveformHint}</p>
      </div>
    </div>

    <div class="tool-panel audio-cutter-panel audio-cutter-panel-sidebar">
      <fieldset class="audio-cutter-mode-fieldset">
        <legend>${messages.audioCutter.selectionModeLabel}</legend>
        <div class="audio-cutter-mode-options">
          <label class="audio-cutter-mode-option">
            <input type="radio" name="audio-cutter-mode" value="keep" data-audio-cutter-mode checked />
            <span>${messages.audioCutter.keepModeLabel}</span>
          </label>
          <label class="audio-cutter-mode-option">
            <input type="radio" name="audio-cutter-mode" value="remove" data-audio-cutter-mode />
            <span>${messages.audioCutter.removeModeLabel}</span>
          </label>
        </div>
      </fieldset>

      <div class="audio-cutter-time-grid">
        <label class="tool-field">
          <span>${messages.audioCutter.startLabel}</span>
          <input type="text" inputmode="decimal" spellcheck="false" placeholder="00:00.00" value="00:00.00" data-audio-cutter-start disabled />
        </label>
        <label class="tool-field">
          <span>${messages.audioCutter.endLabel}</span>
          <input type="text" inputmode="decimal" spellcheck="false" placeholder="00:00.00" value="00:00.00" data-audio-cutter-end disabled />
        </label>
      </div>

      <audio class="audio-cutter-preview" data-audio-cutter-preview controls preload="metadata"></audio>
      <p class="tool-status" data-audio-cutter-status>${messages.audioCutter.statusNoFile}</p>
      <a class="tool-action audio-cutter-download is-disabled" data-audio-cutter-download aria-disabled="true">${messages.audioCutter.downloadAction}</a>
    </div>
  </section>
`
