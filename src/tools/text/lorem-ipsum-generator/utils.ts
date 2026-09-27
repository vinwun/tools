import type { LoremIpsumGeneratorState, LoremIpsumUnit } from './types.ts'

export const createInitialLoremIpsumGeneratorState = (): LoremIpsumGeneratorState => ({
  amount: 100,
  unit: 'words',
  startWithClassic: true,
  outputValue: '',
})

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim',
  'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi',
  'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit',
  'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt',
  'mollit', 'anim', 'id', 'est', 'laborum',
]

const CLASSIC_OPENING =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

const SENTENCE_MIN_WORDS = 8
const SENTENCE_MAX_WORDS = 12
const PARAGRAPH_MIN_SENTENCES = 5
const PARAGRAPH_MAX_SENTENCES = 7

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

const randomWord = (): string => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]

const randomInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1))

const generateRandomWords = (count: number): string[] =>
  Array.from({ length: count }, randomWord)

const groupIntoSentences = (words: string[]): string[] => {
  const sentences: string[] = []
  let cursor = 0
  while (cursor < words.length) {
    const count = Math.min(randomInt(SENTENCE_MIN_WORDS, SENTENCE_MAX_WORDS), words.length - cursor)
    sentences.push(`${capitalize(words.slice(cursor, cursor + count).join(' '))}.`)
    cursor += count
  }
  return sentences
}

const groupIntoParagraphs = (sentences: string[]): string[] => {
  const paragraphs: string[] = []
  let cursor = 0
  while (cursor < sentences.length) {
    const count = Math.min(randomInt(PARAGRAPH_MIN_SENTENCES, PARAGRAPH_MAX_SENTENCES), sentences.length - cursor)
    paragraphs.push(sentences.slice(cursor, cursor + count).join(' '))
    cursor += count
  }
  return paragraphs
}

const CLASSIC_WORDS = CLASSIC_OPENING.split(' ')

const randomSentence = (): string =>
  `${capitalize(generateRandomWords(randomInt(SENTENCE_MIN_WORDS, SENTENCE_MAX_WORDS)).join(' '))}.`

// The opening counts toward the requested amount, so 100 words stay 100 words.
const generateFromWords = (amount: number, classic: boolean): string[] => {
  const classicCount = classic ? Math.min(amount, CLASSIC_WORDS.length) : 0
  const opening = classicCount > 0 ? [`${CLASSIC_WORDS.slice(0, classicCount).join(' ').replace(/[,.]$/, '')}.`] : []
  return groupIntoParagraphs([...opening, ...groupIntoSentences(generateRandomWords(amount - classicCount))])
}

const generateFromSentences = (amount: number, classic: boolean): string[] => {
  const sentences = Array.from({ length: amount }, randomSentence)
  if (classic && amount > 0) {
    sentences[0] = CLASSIC_OPENING
  }
  return groupIntoParagraphs(sentences)
}

const generateFromParagraphs = (amount: number, classic: boolean): string[] => {
  const paragraphs = Array.from({ length: amount }, () =>
    Array.from({ length: randomInt(PARAGRAPH_MIN_SENTENCES, PARAGRAPH_MAX_SENTENCES) }, randomSentence).join(' '),
  )
  if (classic && amount > 0) {
    paragraphs[0] = `${CLASSIC_OPENING} ${paragraphs[0]}`
  }
  return paragraphs
}

export const generateLoremText = (
  amount: number,
  unit: LoremIpsumUnit,
  classic: boolean,
): string => {
  if (unit === 'characters') {
    // Built as words first and cut afterwards, so the added periods and breaks are counted too.
    return generateFromWords(Math.ceil(amount / 3) + 1, classic).join('\n\n').slice(0, amount).trimEnd()
  }

  const generators: Record<Exclude<LoremIpsumUnit, 'characters'>, () => string[]> = {
    paragraphs: () => generateFromParagraphs(amount, classic),
    sentences: () => generateFromSentences(amount, classic),
    words: () => generateFromWords(amount, classic),
  }
  return generators[unit]().join('\n\n')
}
