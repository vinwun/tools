export type FilePickerConfig = {
  accept: string
  multiple?: boolean
  browseLabel: string
  emptyLabel: string
}

/**
 * Renders the browse-button / file-name row plus its hidden input. Tools keep their own
 * surrounding label, heading and hint markup, since that part genuinely differs between them.
 *
 * The row is a plain element rather than a `<label>` on purpose: an implicit label around a file
 * input opens the dialog on every click inside it, which would fire twice next to the browse
 * button's own handler.
 */
export const renderFilePicker = ({ accept, multiple = false, browseLabel, emptyLabel }: FilePickerConfig): string => `
  <div class="tool-file-picker" data-tool-file-picker>
    <button type="button" class="tool-action tool-file-picker-button" data-tool-file-picker-browse>${browseLabel}</button>
    <span class="tool-file-picker-name" data-tool-file-picker-name aria-live="polite">${emptyLabel}</span>
    <input
      class="tool-file-picker-input"
      type="file"
      accept="${accept}"
      ${multiple ? 'multiple' : ''}
      data-tool-file-picker-input
      hidden
    />
  </div>
`
