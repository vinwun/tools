import type { Messages } from '../../../i18n/schema'
import { formatAcceptList } from '../../foundations/files.ts'
import { renderFilePicker } from '../../foundations/file-picker/render.ts'
import { ACCEPTED_AUDIO_TYPES } from '../audio-utils.ts'

export const renderAudioCutter = (messages: Messages): string => `
  <section class="tool-layout tool-layout-split audio-cutter-layout" data-audio-cutter-root>
    <div class="tool-panel audio-cutter-panel audio-cutter-panel-main">
      <div class="tool-field">
        <span>${messages.audioCutter.uploadLabel}</span>
        ${renderFilePicker({
          accept: ACCEPTED_AUDIO_TYPES,
          browseLabel: messages.audioCutter.browseAction,
          emptyLabel: messages.audioCutter.noFileSelected,
        })}
      </div>
      <p class="tool-hint">${messages.audioCutter.uploadHintLabel}: ${formatAcceptList(ACCEPTED_AUDIO_TYPES)}</p>

      <div class="audio-cutter-waveform-block">
        <div class="tool-panel-header audio-cutter-waveform-header">
          <h2>${messages.audioCutter.waveformLabel}</h2>
          <p class="tool-hint" data-audio-cutter-summary>${messages.audioCutter.statusNoFile}</p>
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
      <a class="tool-action tool-download audio-cutter-download is-disabled" data-audio-cutter-download aria-disabled="true">${messages.audioCutter.downloadAction}</a>
    </div>
  </section>
`
