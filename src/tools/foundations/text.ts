// Splits into what a reader sees as one character ("👍🏽" is one, not four UTF-16 units).
export const splitGraphemes = (text: string): string[] =>
  'Segmenter' in Intl
    ? Array.from(new Intl.Segmenter().segment(text), (part) => part.segment)
    : Array.from(text)
