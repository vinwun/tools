import type { Messages } from '../../../i18n/schema.ts'
import { formatAcceptList } from '../../foundations/files.ts'
import { ACCEPTED_PDF_TYPES } from '../pdf-utils.ts'

export const renderPdfPageOrganizer = (messages: Messages): string => {
  const pdfMessages = messages.pdfPageOrganizer

  return `
    <section class="tool-layout pdf-page-organizer-layout" data-pdf-page-organizer-root>
      <div class="tool-panel pdf-page-organizer-panel pdf-page-organizer-panel-upload">
        <div class="pdf-page-organizer-panel-header">
          <div>
            <h2 data-pdf-page-organizer-upload-label>${pdfMessages.uploadLabel}</h2>
            <p class="tool-hint" data-pdf-page-organizer-drop-hint>${pdfMessages.dropHint}</p>
          </div>
          <div class="tool-actions">
            <button type="button" class="tool-action pdf-page-organizer-browse" data-tool-file-picker-browse>${pdfMessages.browseAction}</button>
            <button type="button" class="tool-action pdf-page-organizer-clear" data-pdf-page-organizer-clear disabled>${pdfMessages.clearAction}</button>
          </div>
        </div>

        <input class="pdf-page-organizer-file-input" type="file" accept="${ACCEPTED_PDF_TYPES}" data-tool-file-picker-input multiple hidden />
        <div class="pdf-page-organizer-dropzone" data-tool-file-picker>
          <span data-pdf-page-organizer-upload-hint>${pdfMessages.uploadHintLabel}: ${formatAcceptList(ACCEPTED_PDF_TYPES)}</span>
        </div>
      </div>

      <div class="tool-panel pdf-page-organizer-panel pdf-page-organizer-panel-workspace">
        <div class="pdf-page-organizer-workspace-header">
          <div>
            <h2 data-pdf-page-organizer-page-list-title>${pdfMessages.pageListTitle}</h2>
            <p class="tool-hint" data-pdf-page-organizer-summary>${pdfMessages.emptyState}</p>
          </div>
          <div class="pdf-page-organizer-selection-summary pdf-page-organizer-visible-on-pages" data-pdf-page-organizer-selection-summary>${pdfMessages.selectedSummary.replace('{count}', '0')}</div>
        </div>

        <p class="tool-hint pdf-page-organizer-guidance pdf-page-organizer-visible-on-pages" data-pdf-page-organizer-guidance>${pdfMessages.selectionHint}</p>

        <div class="pdf-page-organizer-list-shell" data-pdf-page-organizer-list-shell>
          <div class="pdf-page-organizer-page-list" data-pdf-page-organizer-page-list role="listbox" aria-label="${pdfMessages.pageListTitle}"></div>
          <div class="pdf-page-organizer-drop-end pdf-page-organizer-visible-on-pages" data-pdf-page-organizer-drop-end>${pdfMessages.moveToEndHint}</div>
        </div>

        <p class="tool-hint pdf-page-organizer-reorder-hint pdf-page-organizer-visible-on-pages" data-pdf-page-organizer-reorder-hint>${pdfMessages.reorderHint}</p>
      </div>

      <div class="tool-panel pdf-page-organizer-panel pdf-page-organizer-panel-actions">
        <div class="pdf-page-organizer-action-bar">
          <div class="pdf-page-organizer-action-group pdf-page-organizer-action-group-left">
            <button type="button" class="tool-action pdf-page-organizer-keep" data-pdf-page-organizer-keep disabled>${pdfMessages.keepSelectedAction}</button>
            <button type="button" class="tool-action pdf-page-organizer-remove" data-pdf-page-organizer-remove disabled>${pdfMessages.removeSelectedAction}</button>
          </div>
          <div class="pdf-page-organizer-action-group pdf-page-organizer-action-group-move">
            <button type="button" class="tool-action pdf-page-organizer-move" data-pdf-page-organizer-move-left disabled>${pdfMessages.moveLeftAction}</button>
            <button type="button" class="tool-action pdf-page-organizer-move" data-pdf-page-organizer-move-right disabled>${pdfMessages.moveRightAction}</button>
          </div>
          <div class="pdf-page-organizer-action-group pdf-page-organizer-action-group-right">
            <button type="button" class="tool-action" data-pdf-page-organizer-download disabled>${pdfMessages.downloadAction}</button>
          </div>
        </div>
      </div>
    </section>
  `
}
