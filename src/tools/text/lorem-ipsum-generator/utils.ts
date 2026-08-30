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

const applyClassic = (paragraphs: string[]): string[] => {
  if (paragraphs.length === 0) {
    return [CLASSIC_OPENING]
  }
  paragraphs[0] = `${CLASSIC_OPENING} ${paragraphs[0]}`
  return paragraphs
}

const generateCharacters = (amount: number): string => {
  const words: string[] = []
  let currentLength = 0
  while (currentLength < amount) {
    const word = randomWord()
    words.push(word)
    currentLength += word.length + 1
  }
  return words.join(' ').slice(0, amount).trim()
}

const generateFromParagraphs = (amount: number): string[] => {
  const paragraphs: string[] = []
  for (let index = 0; index < amount; index += 1) {
    const wordCount = randomInt(
      SENTENCE_MIN_WORDS * PARAGRAPH_MIN_SENTENCES,
      SENTENCE_MAX_WORDS * PARAGRAPH_MAX_SENTENCES,
    )
    const words = generateRandomWords(wordCount)
    paragraphs.push(groupIntoSentences(words).join(' '))
  }
  return paragraphs
}

const generateFromSentences = (amount: number): string[] => {
  const words: string[] = []
  for (let index = 0; index < amount; index += 1) {
    const count = randomInt(SENTENCE_MIN_WORDS, SENTENCE_MAX_WORDS)
    words.push(...generateRandomWords(count))
  }
  return groupIntoParagraphs(groupIntoSentences(words))
}

const generateFromWords = (amount: number): string[] =>
  groupIntoParagraphs(groupIntoSentences(generateRandomWords(amount)))

const generateFromCharacters = (amount: number): string[] =>
  groupIntoParagraphs(groupIntoSentences(generateCharacters(amount).split(/\s+/)))

export const generateLoremText = (
  amount: number,
  unit: LoremIpsumUnit,
  classic: boolean,
): string => {
  const generators: Record<LoremIpsumUnit, () => string[]> = {
    paragraphs: () => generateFromParagraphs(amount),
    sentences: () => generateFromSentences(amount),
    words: () => generateFromWords(amount),
    characters: () => generateFromCharacters(amount),
  }

  let paragraphs = generators[unit]()

  if (classic) {
    paragraphs = applyClassic(paragraphs)
  }

  return paragraphs.join('\n\n')
}
