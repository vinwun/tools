// Shared MP4 (ISO BMFF) parsing and lossless rewriting utilities used by the
// video-audio splitter (audio-track stripping) and the video cutter.

export type Mp4Box = {
  type: string
  start: number
  size: number
  headerSize: number
  end: number
}

export type Mp4Sample = {
  offset: number
  size: number
  duration: number
  compositionOffset: number
  isSync: boolean
  sampleDescriptionIndex: number
  chunkIndex: number
}

export type Mp4TrackInfo = {
  trackId: number
  handler: string
  mediaTimescale: number
  sampleEntryType: string
  encrypted: boolean
  samples: Mp4Sample[]
  trakBox: Mp4Box
}

export type Mp4Analysis = {
  bytes: Uint8Array
  ftyp: Mp4Box | null
  moov: Mp4Box | null
  fragmented: boolean
  movieTimescale: number
  tracks: Mp4TrackInfo[]
}

export type Mp4FailureReason =
  | 'emptyRange'
  | 'notMp4'
  | 'fragmented'
  | 'noTracks'
  | 'noVideoTrack'
  | 'unsupported'
  | 'tooLarge'
  | 'noVideoFragments'

export type Mp4Result =
  | { ok: true; bytes: ArrayBuffer }
  | { ok: false; reason: Mp4FailureReason }

export type CutSpec = {
  startSeconds: number
  endSeconds: number
}

const viewOf = (bytes: Uint8Array, offset: number): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset)

const readU16 = (bytes: Uint8Array, offset: number): number => viewOf(bytes, offset).getUint16(0, false)
const readU32 = (bytes: Uint8Array, offset: number): number => viewOf(bytes, offset).getUint32(0, false)
const readI32 = (bytes: Uint8Array, offset: number): number => viewOf(bytes, offset).getInt32(0, false)
const readU64 = (bytes: Uint8Array, offset: number): number => Number(viewOf(bytes, offset).getBigUint64(0, false))
const readFcc = (bytes: Uint8Array, offset: number): string =>
  String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0)
const boxVersion = (bytes: Uint8Array, box: Mp4Box): number => bytes[box.start + box.headerSize] ?? 0

const parseBoxes = (bytes: Uint8Array, start: number, end: number): Mp4Box[] => {
  const boxes: Mp4Box[] = []
  let offset = start

  while (offset + 8 <= end) {
    const size32 = readU32(bytes, offset)
    let size = size32
    let headerSize = 8

    if (size32 === 1) {
      size = readU64(bytes, offset + 8)
      headerSize = 16
    } else if (size32 === 0) {
      size = end - offset
    }

    if (size < headerSize) {
      break
    }

    boxes.push({ type: readFcc(bytes, offset + 4), start: offset, size, headerSize, end: offset + size })
    offset += size
  }

  return boxes
}

const parseTopLevel = (bytes: Uint8Array): Mp4Box[] => parseBoxes(bytes, 0, bytes.byteLength)

const childBoxes = (bytes: Uint8Array, box: Mp4Box): Mp4Box[] =>
  parseBoxes(bytes, box.start + box.headerSize, box.end)

const findBox = (boxes: readonly Mp4Box[], type: string): Mp4Box | null => {
  for (const box of boxes) {
    if (box.type === type) {
      return box
    }
  }
  return null
}

const findBoxes = (boxes: readonly Mp4Box[], type: string): Mp4Box[] => boxes.filter((box) => box.type === type)

const sameBox = (left: Mp4Box | null | undefined, right: Mp4Box | null | undefined): boolean =>
  Boolean(left && right && left.type === right.type && left.start === right.start)

const findDescendant = (bytes: Uint8Array, box: Mp4Box, path: readonly string[]): Mp4Box | null => {
  let current: Mp4Box | null = box
  for (const type of path) {
    if (!current) {
      return null
    }
    current = findBox(childBoxes(bytes, current), type)
  }
  return current
}

const readHeaderTimescale = (bytes: Uint8Array, box: Mp4Box): number => {
  const payloadOffset = boxVersion(bytes, box) === 1 ? 20 : 12
  return readU32(bytes, box.start + box.headerSize + payloadOffset)
}

const readTrackId = (bytes: Uint8Array, tkhd: Mp4Box): number => {
  const payloadOffset = boxVersion(bytes, tkhd) === 1 ? 20 : 12
  return readU32(bytes, tkhd.start + tkhd.headerSize + payloadOffset)
}

const readHandlerType = (bytes: Uint8Array, hdlr: Mp4Box): string => readFcc(bytes, hdlr.start + hdlr.headerSize + 8)

const exportBoxBytes = (bytes: Uint8Array, box: Mp4Box): Uint8Array => bytes.slice(box.start, box.end)

type StscEntry = { firstChunk: number; samplesPerChunk: number; sampleDescriptionIndex: number }

const parseRunEntries = (bytes: Uint8Array, box: Mp4Box): { count: number; value: number }[] => {
  const payload = box.start + box.headerSize
  const entryCount = readU32(bytes, payload + 4)
  const entries: { count: number; value: number }[] = []

  for (let index = 0; index < entryCount; index += 1) {
    entries.push({ count: readU32(bytes, payload + 8 + index * 8), value: readU32(bytes, payload + 12 + index * 8) })
  }

  return entries
}

const expandRunValues = (runs: readonly { count: number; value: number }[]): number[] => {
  const values: number[] = []
  for (const run of runs) {
    for (let index = 0; index < run.count; index += 1) {
      values.push(run.value)
    }
  }
  return values
}

const parseCompositionOffsets = (bytes: Uint8Array, ctts: Mp4Box): number[] => {
  const version = boxVersion(bytes, ctts)
  const payload = ctts.start + ctts.headerSize
  const entryCount = readU32(bytes, payload + 4)
  const values: number[] = []

  for (let index = 0; index < entryCount; index += 1) {
    const sampleCount = readU32(bytes, payload + 8 + index * 8)
    const value = version === 1 ? readI32(bytes, payload + 12 + index * 8) : readU32(bytes, payload + 12 + index * 8)
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      values.push(value)
    }
  }

  return values
}

const parseSampleSizes = (bytes: Uint8Array, stsz: Mp4Box | null, stz2: Mp4Box | null): number[] => {
  if (stsz) {
    const payload = stsz.start + stsz.headerSize
    const defaultSize = readU32(bytes, payload + 4)
    const sampleCount = readU32(bytes, payload + 8)

    if (defaultSize > 0) {
      return Array.from({ length: sampleCount }, () => defaultSize)
    }

    const sizes: number[] = []
    for (let index = 0; index < sampleCount; index += 1) {
      sizes.push(readU32(bytes, payload + 12 + index * 4))
    }
    return sizes
  }

  if (stz2) {
    const payload = stz2.start + stz2.headerSize
    const fieldSize = bytes[payload + 4] ?? 0
    const sampleCount = readU32(bytes, payload + 5)
    const sizes: number[] = []

    if (fieldSize === 16) {
      for (let index = 0; index < sampleCount; index += 1) {
        sizes.push(readU16(bytes, payload + 9 + index * 2))
      }
    } else if (fieldSize === 8) {
      for (let index = 0; index < sampleCount; index += 1) {
        sizes.push(bytes[payload + 9 + index] ?? 0)
      }
    } else if (fieldSize === 4) {
      const packed = Math.ceil(sampleCount / 2)
      for (let index = 0; index < packed; index += 1) {
        const packedValue = bytes[payload + 9 + index] ?? 0
        sizes.push(packedValue >> 4, packedValue & 0x0f)
      }
      sizes.length = sampleCount
    }

    return sizes
  }

  return []
}

const parseChunkOffsets = (bytes: Uint8Array, stco: Mp4Box | null, co64: Mp4Box | null): number[] => {
  const box = stco ?? co64
  if (!box) {
    return []
  }

  const payload = box.start + box.headerSize
  const entryCount = readU32(bytes, payload + 4)
  const offsets: number[] = []

  for (let index = 0; index < entryCount; index += 1) {
    offsets.push(co64 ? readU64(bytes, payload + 8 + index * 8) : readU32(bytes, payload + 8 + index * 4))
  }

  return offsets
}

const parseStsc = (bytes: Uint8Array, stsc: Mp4Box | null): StscEntry[] => {
  if (!stsc) {
    return []
  }

  const payload = stsc.start + stsc.headerSize
  const entryCount = readU32(bytes, payload + 4)
  const entries: StscEntry[] = []

  for (let index = 0; index < entryCount; index += 1) {
    entries.push({
      firstChunk: readU32(bytes, payload + 8 + index * 12),
      samplesPerChunk: readU32(bytes, payload + 12 + index * 12),
      sampleDescriptionIndex: readU32(bytes, payload + 16 + index * 12),
    })
  }

  return entries
}

const collectSamples = (
  sizes: readonly number[],
  durations: readonly number[],
  compositionOffsets: readonly number[],
  chunkOffsets: readonly number[],
  stsc: readonly StscEntry[],
  syncSamples: Set<number> | null,
): Mp4Sample[] => {
  const samples: Mp4Sample[] = []
  let sizeIndex = 0
  let stscPointer = 0

  for (let chunkIndex = 0; chunkIndex < chunkOffsets.length; chunkIndex += 1) {
    for (; stscPointer < stsc.length - 1 && (stsc[stscPointer + 1]?.firstChunk ?? 0) <= chunkIndex + 1; stscPointer += 1) {
      // Advance to the active sample-to-chunk entry for this chunk number.
    }

    const entry = stsc[stscPointer]
    if (!entry) {
      break
    }

    let sampleOffset = chunkOffsets[chunkIndex] ?? 0

    for (let chunkSampleIndex = 0; chunkSampleIndex < entry.samplesPerChunk; chunkSampleIndex += 1) {
      if (sizeIndex >= sizes.length) {
        break
      }

      const size = sizes[sizeIndex] ?? 0
      const duration = durations[sizeIndex] ?? 0
      const compositionOffset = compositionOffsets[sizeIndex] ?? 0
      const sampleNumber = sizeIndex + 1

      samples.push({
        offset: sampleOffset,
        size,
        duration,
        compositionOffset,
        isSync: syncSamples ? syncSamples.has(sampleNumber) : true,
        sampleDescriptionIndex: entry.sampleDescriptionIndex,
        chunkIndex,
      })

      sampleOffset += size
      sizeIndex += 1
    }
  }

  return samples
}

export const analyzeMp4 = (bytes: Uint8Array): Mp4Analysis => {
  const topBoxes = parseTopLevel(bytes)
  const ftyp = findBox(topBoxes, 'ftyp') ?? null
  const moov = findBox(topBoxes, 'moov') ?? null
  const moofBoxes = findBoxes(topBoxes, 'moof')
  const moovChildren = moov ? childBoxes(bytes, moov) : []
  const mvhd = findBox(moovChildren, 'mvhd')
  const fragmented = moofBoxes.length > 0 || Boolean(findBox(moovChildren, 'mvex'))

  const tracks: Mp4TrackInfo[] = []
  for (const trak of findBoxes(moovChildren, 'trak')) {
    const trakChildren = childBoxes(bytes, trak)
    const tkhd = findBox(trakChildren, 'tkhd')
    const mdia = findBox(trakChildren, 'mdia')
    if (!tkhd || !mdia) {
      continue
    }

    const mdiaChildren = childBoxes(bytes, mdia)
    const mdhd = findBox(mdiaChildren, 'mdhd')
    const hdlr = findBox(mdiaChildren, 'hdlr')
    const minf = findBox(mdiaChildren, 'minf')
    const stbl = minf ? findDescendant(bytes, minf, ['stbl']) : null
    const handler = hdlr ? readHandlerType(bytes, hdlr) : ''
    const mediaTimescale = mdhd ? readHeaderTimescale(bytes, mdhd) : 0
    const trackId = readTrackId(bytes, tkhd)

    let sampleEntryType = ''
    let encrypted = false
    let samples: Mp4Sample[] = []

    if (stbl) {
      const stblChildren = childBoxes(bytes, stbl)
      const stsd = findBox(stblChildren, 'stsd')
      if (stsd) {
        sampleEntryType = readFcc(bytes, stsd.start + stsd.headerSize + 12)
        encrypted = sampleEntryType.startsWith('enc')
      }

      const stts = findBox(stblChildren, 'stts')
      const ctts = findBox(stblChildren, 'ctts')
      const stsc = findBox(stblChildren, 'stsc')
      const stsz = findBox(stblChildren, 'stsz')
      const stz2 = findBox(stblChildren, 'stz2')
      const stco = findBox(stblChildren, 'stco')
      const co64 = findBox(stblChildren, 'co64')
      const stss = findBox(stblChildren, 'stss')

      const durations = stts ? expandRunValues(parseRunEntries(bytes, stts)) : []
      const compositionOffsets = ctts ? parseCompositionOffsets(bytes, ctts) : []
      const sizes = parseSampleSizes(bytes, stsz, stz2)
      const chunkOffsets = parseChunkOffsets(bytes, stco, co64)
      const stscEntries = parseStsc(bytes, stsc)

      let syncSamples: Set<number> | null = null
      if (stss) {
        const payload = stss.start + stss.headerSize
        const entryCount = readU32(bytes, payload + 4)
        syncSamples = new Set()
        for (let index = 0; index < entryCount; index += 1) {
          syncSamples.add(readU32(bytes, payload + 8 + index * 4))
        }
      }

      samples = collectSamples(sizes, durations, compositionOffsets, chunkOffsets, stscEntries, syncSamples)
    }

    tracks.push({ trackId, handler, mediaTimescale, sampleEntryType, encrypted, samples, trakBox: trak })
  }

  return {
    bytes,
    ftyp,
    moov,
    fragmented,
    movieTimescale: mvhd ? readHeaderTimescale(bytes, mvhd) : 0,
    tracks,
  }
}

export const getTrackDurationSeconds = (track: Mp4TrackInfo): number => {
  if (track.mediaTimescale <= 0) {
    return 0
  }
  const totalDuration = track.samples.reduce((sum, sample) => sum + sample.duration, 0)
  return totalDuration / track.mediaTimescale
}

export const getMaxDurationSeconds = (analysis: Mp4Analysis): number =>
  analysis.tracks.reduce((maximum, track) => Math.max(maximum, getTrackDurationSeconds(track)), 0)

export const pickVideoTrack = (analysis: Mp4Analysis): Mp4TrackInfo | null =>
  analysis.tracks.find((track) => track.handler === 'vide' && !track.encrypted) ?? null

// ---------------------------------------------------------------------------
// Byte builders
// ---------------------------------------------------------------------------

const u32b = (value: number): Uint8Array => {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, value >>> 0, false)
  return out
}

const i32b = (value: number): Uint8Array => {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setInt32(0, value, false)
  return out
}

const u64b = (value: number): Uint8Array => {
  const out = new Uint8Array(8)
  const view = new DataView(out.buffer)
  view.setUint32(0, Math.floor(value / 0x100000000), false)
  view.setUint32(4, value >>> 0, false)
  return out
}

const fccb = (value: string): Uint8Array =>
  Uint8Array.from([value.charCodeAt(0), value.charCodeAt(1), value.charCodeAt(2), value.charCodeAt(3)])

const concatBytes = (parts: readonly Uint8Array[]): Uint8Array => {
  let length = 0
  for (const part of parts) {
    length += part.length
  }

  const out = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }

  return out
}

const box = (type: string, payload: Uint8Array): Uint8Array => concatBytes([u32b(8 + payload.length), fccb(type), payload])

const fullbox = (type: string, version: number, flags: number, payload: Uint8Array): Uint8Array =>
  box(type, concatBytes([Uint8Array.of(version, (flags >> 16) & 0xff, (flags >> 8) & 0xff, flags & 0xff), payload]))

const synthesizeFtyp = (): Uint8Array =>
  box('ftyp', concatBytes([fccb('isom'), u32b(0), fccb('isom'), fccb('iso2'), fccb('mp41')]))

const patchDuration = (
  bytes: Uint8Array,
  target: Mp4Box,
  version: number,
  payloadOffset: number,
  duration: number,
): Uint8Array => {
  const out = bytes.slice(target.start, target.end)
  const view = new DataView(out.buffer)
  const position = target.headerSize + payloadOffset

  if (version === 1) {
    view.setBigUint64(position, BigInt(duration), false)
  } else {
    view.setUint32(position, duration >>> 0, false)
  }

  return out
}

const toRuns = (values: readonly number[]): { count: number; value: number }[] => {
  const runs: { count: number; value: number }[] = []
  for (const value of values) {
    const lastRun = runs[runs.length - 1]
    if (lastRun && lastRun.value === value) {
      lastRun.count += 1
    } else {
      runs.push({ count: 1, value })
    }
  }
  return runs
}

const buildRunsBox = (type: string, values: readonly number[]): Uint8Array => {
  const runs = toRuns(values)
  const parts: Uint8Array[] = [u32b(runs.length)]
  for (const run of runs) {
    parts.push(u32b(run.count), u32b(run.value))
  }

  return fullbox(type, 0, 0, concatBytes(parts))
}

const buildStts = (durations: readonly number[]): Uint8Array => buildRunsBox('stts', durations)

const buildStsc = (chunks: readonly { count: number; sampleDescriptionIndex: number }[]): Uint8Array => {
  const parts: Uint8Array[] = [u32b(chunks.length)]
  let firstChunk = 1
  for (const chunk of chunks) {
    parts.push(u32b(firstChunk), u32b(chunk.count), u32b(chunk.sampleDescriptionIndex))
    firstChunk += chunk.count
  }
  return fullbox('stsc', 0, 0, concatBytes(parts))
}

const buildStsz = (sizes: readonly number[]): Uint8Array => {
  const parts: Uint8Array[] = [u32b(0), u32b(sizes.length)]
  for (const size of sizes) {
    parts.push(u32b(size))
  }
  return fullbox('stsz', 0, 0, concatBytes(parts))
}

const buildChunkOffsets = (offsets: readonly number[], useCo64: boolean): Uint8Array => {
  const type = useCo64 ? 'co64' : 'stco'
  const parts: Uint8Array[] = [u32b(offsets.length)]
  for (const offset of offsets) {
    parts.push(useCo64 ? u64b(offset) : u32b(offset))
  }
  return fullbox(type, 0, 0, concatBytes(parts))
}

const buildCtts = (compositionOffsets: readonly number[]): Uint8Array | null => {
  if (compositionOffsets.every((offset) => offset === 0)) {
    return null
  }

  const version = compositionOffsets.some((offset) => offset < 0) ? 1 : 0
  const runs = toRuns(compositionOffsets)
  const parts: Uint8Array[] = [u32b(runs.length)]
  for (const run of runs) {
    parts.push(u32b(run.count), version === 1 ? i32b(run.value) : u32b(run.value))
  }

  return fullbox('ctts', version, 0, concatBytes(parts))
}

const buildStss = (syncSampleNumbers: readonly number[]): Uint8Array | null => {
  if (syncSampleNumbers.length === 0) {
    return null
  }

  const parts: Uint8Array[] = [u32b(syncSampleNumbers.length)]
  for (const sampleNumber of syncSampleNumbers) {
    parts.push(u32b(sampleNumber))
  }
  return fullbox('stss', 0, 0, concatBytes(parts))
}

type ByteRange = { start: number; end: number }

const rangesLength = (ranges: readonly ByteRange[]): number =>
  ranges.reduce((sum, range) => sum + (range.end - range.start), 0)

// One contiguous source range per chunk, in sample order.
const groupChunkRanges = (samples: readonly Mp4Sample[]): ByteRange[] => {
  const ranges: ByteRange[] = []
  samples.forEach((sample, index) => {
    const lastRange = ranges[ranges.length - 1]
    if (lastRange && sample.chunkIndex === samples[index - 1]?.chunkIndex) {
      lastRange.end = sample.offset + sample.size
    } else {
      ranges.push({ start: sample.offset, end: sample.offset + sample.size })
    }
  })
  return ranges
}

// Writes each group's boxes followed by one mdat holding the group's source ranges.
const writeMp4 = (
  source: Uint8Array,
  groups: readonly { boxes: readonly Uint8Array[]; ranges: readonly ByteRange[] }[],
): ArrayBuffer => {
  const totalLength = groups.reduce(
    (sum, group) => sum + group.boxes.reduce((boxSum, part) => boxSum + part.length, 0) + 8 + rangesLength(group.ranges),
    0,
  )
  const output = new Uint8Array(totalLength)
  let position = 0

  for (const group of groups) {
    for (const part of group.boxes) {
      output.set(part, position)
      position += part.length
    }

    output.set(u32b(8 + rangesLength(group.ranges)), position)
    output.set(fccb('mdat'), position + 4)
    position += 8

    for (const range of group.ranges) {
      output.set(source.subarray(range.start, range.end), position)
      position += range.end - range.start
    }
  }

  return output.buffer
}

// ---------------------------------------------------------------------------
// Lossless cut (non-fragmented MP4)
// ---------------------------------------------------------------------------

type CutTrackSpec = {
  track: Mp4TrackInfo
  chunks: { count: number; sampleDescriptionIndex: number }[]
  keptSamples: Mp4Sample[]
  sourceRanges: ByteRange[]
  segmentDuration: number
}

const buildCutTrak = (
  bytes: Uint8Array,
  spec: CutTrackSpec,
  getChunkOffset: (chunkIndex: number) => number,
): Uint8Array | null => {
  const { track, chunks, keptSamples } = spec

  const trakChildren = childBoxes(bytes, track.trakBox)
  const tkhd = findBox(trakChildren, 'tkhd')
  const mdia = findBox(trakChildren, 'mdia')
  if (!tkhd || !mdia) {
    return null
  }

  const tkhdVersion = boxVersion(bytes, tkhd)
  const tkhdPatched = patchDuration(bytes, tkhd, tkhdVersion, tkhdVersion === 1 ? 28 : 20, spec.segmentDuration)

  const mdiaChildren = childBoxes(bytes, mdia)
  const mdhd = findBox(mdiaChildren, 'mdhd')
  const hdlr = findBox(mdiaChildren, 'hdlr')
  const minf = findBox(mdiaChildren, 'minf')
  if (!mdhd || !hdlr || !minf) {
    return null
  }

  const mdhdVersion = boxVersion(bytes, mdhd)
  const totalMediaDuration = keptSamples.reduce((sum, sample) => sum + sample.duration, 0)
  const mdhdPatched = patchDuration(bytes, mdhd, mdhdVersion, mdhdVersion === 1 ? 24 : 16, totalMediaDuration)

  const minfChildren = childBoxes(bytes, minf)
  const stbl = findBox(minfChildren, 'stbl')
  if (!stbl) {
    return null
  }
  const stblChildren = childBoxes(bytes, stbl)
  const stsd = findBox(stblChildren, 'stsd')
  if (!stsd) {
    return null
  }

  const chunkOffsets = chunks.map((_, index) => getChunkOffset(index))
  const sizes = keptSamples.map((sample) => sample.size)
  const durations = keptSamples.map((sample) => sample.duration)
  const compositionOffsets = keptSamples.map((sample) => sample.compositionOffset)
  const hasNonSyncSamples = keptSamples.some((sample) => !sample.isSync)

  let stssBox: Uint8Array | null = null
  if (track.handler === 'vide' && hasNonSyncSamples) {
    const syncNumbers = keptSamples.flatMap((sample, index) => (sample.isSync ? [index + 1] : []))
    stssBox = buildStss(syncNumbers)
  }

  const stblBuilt = concatBytes(
    [
      exportBoxBytes(bytes, stsd),
      buildStts(durations),
      buildStsc(chunks),
      buildStsz(sizes),
      buildChunkOffsets(chunkOffsets, true),
      buildCtts(compositionOffsets),
      stssBox,
    ].filter((part): part is Uint8Array => part !== null),
  )

  const mdiaParts: Uint8Array[] = []
  for (const child of mdiaChildren) {
    if (child === mdhd) {
      mdiaParts.push(mdhdPatched)
    } else if (child === minf) {
      const minfParts: Uint8Array[] = []
      for (const minfChild of minfChildren) {
        if (sameBox(minfChild, stbl)) {
          minfParts.push(box('stbl', stblBuilt))
        } else {
          minfParts.push(exportBoxBytes(bytes, minfChild))
        }
      }
      mdiaParts.push(box('minf', concatBytes(minfParts)))
    } else {
      mdiaParts.push(exportBoxBytes(bytes, child))
    }
  }

  return box('trak', concatBytes([tkhdPatched, box('mdia', concatBytes(mdiaParts))]))
}

const buildCutMoov = (
  bytes: Uint8Array,
  analysis: Mp4Analysis,
  specByTrack: Map<Mp4TrackInfo, CutTrackSpec>,
  movieDuration: number,
  getTrackChunkOffsets: (track: Mp4TrackInfo, chunkCount: number) => number[],
): Uint8Array => {
  const moov = analysis.moov
  if (!moov) {
    return new Uint8Array(0)
  }

  const moovChildren = childBoxes(bytes, moov)
  const mvhd = findBox(moovChildren, 'mvhd')
  const parts: Uint8Array[] = []

  for (const child of moovChildren) {
    if (child === mvhd && mvhd) {
      const version = boxVersion(bytes, mvhd)
      parts.push(patchDuration(bytes, mvhd, version, version === 1 ? 24 : 16, movieDuration))
    } else if (child.type === 'trak') {
      const track = analysis.tracks.find((candidate) => sameBox(candidate.trakBox, child))
      const spec = track ? specByTrack.get(track) : undefined
      if (spec) {
        const trakBytes = buildCutTrak(bytes, spec, (chunkIndex) =>
          getTrackChunkOffsets(spec.track, spec.chunks.length)[chunkIndex] ?? 0,
        )
        if (trakBytes) {
          parts.push(trakBytes)
        }
      }
    } else if (child.type !== 'mvex') {
      parts.push(exportBoxBytes(bytes, child))
    }
  }

  return box('moov', concatBytes(parts))
}

export const getKeyframeStartSeconds = (
  analysis: Mp4Analysis,
  startSeconds: number,
): number => {
  let effective = startSeconds
  for (const track of analysis.tracks) {
    if (track.handler !== 'vide') {
      continue
    }
    const timescale = track.mediaTimescale || 1
    const startLimit = Math.max(0, Math.floor(startSeconds * timescale))

    let firstIndex = -1
    let runningTime = 0
    for (let index = 0; index < track.samples.length; index += 1) {
      const sample = track.samples[index] ?? { duration: 0 }
      const sampleEnd = runningTime + sample.duration
      runningTime = sampleEnd
      if (sampleEnd > startLimit) {
        firstIndex = index
        break
      }
    }
    if (firstIndex === -1) {
      continue
    }
    while (firstIndex > 0 && !track.samples[firstIndex]?.isSync) {
      firstIndex -= 1
    }
    const keyframeTime = track.samples.slice(0, firstIndex).reduce((sum, s) => sum + s.duration, 0) / timescale
    if (keyframeTime < effective) {
      effective = keyframeTime
    }
  }
  return effective
}

const buildCutSpecs = (
  analysis: Mp4Analysis,
  startSeconds: number,
  endSeconds: number,
  movieTimescale: number,
): { specs: CutTrackSpec[]; effectiveStartSeconds: number } => {
  const effectiveStartSeconds = getKeyframeStartSeconds(analysis, startSeconds)

  const specs: CutTrackSpec[] = []

  for (const track of analysis.tracks) {
    const timescale = track.mediaTimescale || movieTimescale || 1
    const startLimit = Math.max(0, Math.floor(effectiveStartSeconds * timescale))
    const endLimit = Math.max(startLimit, Math.ceil(endSeconds * timescale))

    let firstKeptIndex = -1
    let lastKeptIndex = -1
    let runningTime = 0

    for (let index = 0; index < track.samples.length; index += 1) {
      const sample = track.samples[index] ?? { duration: 0 }
      const sampleStart = runningTime
      const sampleEnd = sampleStart + sample.duration
      runningTime = sampleEnd

      if (sampleEnd > startLimit && sampleStart < endLimit) {
        if (firstKeptIndex === -1) {
          firstKeptIndex = index
        }
        lastKeptIndex = index
      }
    }

    if (firstKeptIndex !== -1 && lastKeptIndex !== -1) {
      const keptSamples = track.samples.slice(firstKeptIndex, lastKeptIndex + 1)
      const chunks: { count: number; sampleDescriptionIndex: number }[] = []
      for (const sample of keptSamples) {
        const lastChunk = chunks[chunks.length - 1]
        if (lastChunk && lastChunk.sampleDescriptionIndex === sample.sampleDescriptionIndex) {
          lastChunk.count += 1
        } else {
          chunks.push({ count: 1, sampleDescriptionIndex: sample.sampleDescriptionIndex })
        }
      }

      const totalKeptDuration = keptSamples.reduce((sum, sample) => sum + sample.duration, 0)

      specs.push({
        track,
        chunks,
        keptSamples,
        sourceRanges: groupChunkRanges(keptSamples),
        segmentDuration: Math.max(1, totalKeptDuration),
      })
    }
  }

  return { specs, effectiveStartSeconds }
}

export const cutMp4 = (source: Uint8Array, spec: CutSpec): Mp4Result => {
  if (!(spec.endSeconds > spec.startSeconds)) {
    return { ok: false, reason: 'emptyRange' }
  }

  const analysis = analyzeMp4(source)
  if (!analysis.moov) {
    return { ok: false, reason: 'notMp4' }
  }
  if (analysis.fragmented) {
    return { ok: false, reason: 'fragmented' }
  }
  if (analysis.tracks.length === 0) {
    return { ok: false, reason: 'noTracks' }
  }

  const duration = getMaxDurationSeconds(analysis)
  if (duration <= 0) {
    return { ok: false, reason: 'noTracks' }
  }

  const startSeconds = Math.max(0, spec.startSeconds)
  const endSeconds = Math.min(duration, spec.endSeconds)
  if (!(endSeconds > startSeconds)) {
    return { ok: false, reason: 'emptyRange' }
  }

  const movieTimescale = analysis.movieTimescale || 1000
  const { specs, effectiveStartSeconds } = buildCutSpecs(analysis, startSeconds, endSeconds, movieTimescale)
  if (specs.length === 0) {
    return { ok: false, reason: 'emptyRange' }
  }

  const movieDuration = Math.max(1, Math.round((endSeconds - effectiveStartSeconds) * movieTimescale))
  const specByTrack = new Map(specs.map((cutSpec) => [cutSpec.track, cutSpec]))

  const ftypBytes = analysis.ftyp ? exportBoxBytes(source, analysis.ftyp) : synthesizeFtyp()

  const allZeroChunkOffsets = (_track: Mp4TrackInfo, chunkCount: number): number[] =>
    Array.from({ length: chunkCount }, () => 0)
  const provisionalMoov = buildCutMoov(source, analysis, specByTrack, movieDuration, allZeroChunkOffsets)
  const moovLength = provisionalMoov.length

  let payloadPosition = ftypBytes.length + moovLength + 8
  const trackOffsets = new Map<Mp4TrackInfo, number[]>()

  for (const cutSpec of specs) {
    const offsets: number[] = []
    for (let index = 0; index < cutSpec.sourceRanges.length; index += 1) {
      offsets.push(payloadPosition)
      payloadPosition += cutSpec.sourceRanges[index]?.end ?? 0
      payloadPosition -= cutSpec.sourceRanges[index]?.start ?? 0
    }
    trackOffsets.set(cutSpec.track, offsets)
  }

  const moovBytes = buildCutMoov(source, analysis, specByTrack, movieDuration, (track, chunkCount) => {
    const offsets = trackOffsets.get(track)
    if (!offsets || offsets.length < chunkCount) {
      return Array.from({ length: chunkCount }, () => 0)
    }
    return offsets
  })

  const ranges = specs.flatMap((cutSpec) => cutSpec.sourceRanges)
  return { ok: true, bytes: writeMp4(source, [{ boxes: [ftypBytes, moovBytes], ranges }]) }
}

// ---------------------------------------------------------------------------
// Lossless audio-track stripping (non-fragmented MP4)
// ---------------------------------------------------------------------------

const buildMoovWithPatchedOffsets = (
  bytes: Uint8Array,
  analysis: Mp4Analysis,
  keptTracks: ReadonlySet<Mp4TrackInfo>,
  videoTrack: Mp4TrackInfo,
  chunkOffsets: readonly number[],
): Uint8Array => {
  const moov = analysis.moov
  if (!moov) {
    return new Uint8Array(0)
  }

  const parts: Uint8Array[] = []
  for (const child of childBoxes(bytes, moov)) {
    if (child.type === 'trak') {
      const track = analysis.tracks.find((candidate) => sameBox(candidate.trakBox, child))
      if (!track || !keptTracks.has(track)) {
        continue
      }

      if (track === videoTrack) {
        const stbl = findDescendant(bytes, child, ['mdia', 'minf', 'stbl'])
        const stco = stbl ? findBox(childBoxes(bytes, stbl), 'stco') : null
        const co64Address = stbl ? findBox(childBoxes(bytes, stbl), 'co64') : null
        const offsetTable = stco ?? co64Address
        if (offsetTable) {
          const clone = bytes.slice(child.start, child.end)
          const view = new DataView(clone.buffer)
          const entryBase = offsetTable.start + offsetTable.headerSize + 8
          const entrySize = co64Address ? 8 : 4

          for (let index = 0; index < chunkOffsets.length; index += 1) {
            const position = entryBase - child.start + index * entrySize
            if (co64Address) {
              view.setBigUint64(position, BigInt(chunkOffsets[index] ?? 0), false)
            } else {
              view.setUint32(position, (chunkOffsets[index] ?? 0) >>> 0, false)
            }
          }

          parts.push(clone)
          continue
        }
      }

      parts.push(exportBoxBytes(bytes, child))
    } else if (child.type !== 'mvex') {
      parts.push(exportBoxBytes(bytes, child))
    }
  }

  return box('moov', concatBytes(parts))
}

const stripNonFragmentedMp4 = (source: Uint8Array): Mp4Result => {
  const analysis = analyzeMp4(source)
  if (!analysis.moov) {
    return { ok: false, reason: 'notMp4' }
  }

  const videoTrack = pickVideoTrack(analysis)
  if (!videoTrack) {
    return { ok: false, reason: 'noVideoTrack' }
  }

  const ranges = groupChunkRanges(videoTrack.samples)
  const chunkCount = ranges.length
  if (chunkCount === 0) {
    return { ok: false, reason: 'unsupported' }
  }

  const keptTracks = new Set<Mp4TrackInfo>([videoTrack])
  const ftypBytes = analysis.ftyp ? exportBoxBytes(source, analysis.ftyp) : synthesizeFtyp()

  const zeroedOffsets = Array.from({ length: chunkCount }, () => 0)
  const provisionalMoov = buildMoovWithPatchedOffsets(source, analysis, keptTracks, videoTrack, zeroedOffsets)
  const moovLength = provisionalMoov.length

  let payloadPosition = ftypBytes.length + moovLength + 8
  const chunkOffsets: number[] = []
  for (const range of ranges) {
    chunkOffsets.push(payloadPosition)
    payloadPosition += range.end - range.start
  }

  for (const offset of chunkOffsets) {
    if (offset >= 0x100000000) {
      return { ok: false, reason: 'tooLarge' }
    }
  }

  const moovBytes = buildMoovWithPatchedOffsets(source, analysis, keptTracks, videoTrack, chunkOffsets)
  return { ok: true, bytes: writeMp4(source, [{ boxes: [ftypBytes, moovBytes], ranges }]) }
}

// ---------------------------------------------------------------------------
// Lossless audio-track stripping (fragmented MP4)
// ---------------------------------------------------------------------------

type TfhdValues = {
  flags: number
  trackId: number
  baseOffset: number | null
  sampleDescriptionIndex: number
  defaultDuration: number
  defaultSize: number
  defaultFlags: number
}

const TFHD_BASE_DATA_OFFSET = 0x000001
const TFHD_SAMPLE_DESCRIPTION_INDEX = 0x000002
const TFHD_DEFAULT_DURATION = 0x000008
const TFHD_DEFAULT_SIZE = 0x000010
const TFHD_DEFAULT_FLAGS = 0x000020
const TFHD_DEFAULT_BASE_IS_MOOF = 0x020000
const TRUN_DATA_OFFSET = 0x000001
const TRUN_FIRST_SAMPLE_FLAGS = 0x000004
const TRUN_SAMPLE_DURATION = 0x000100
const TRUN_SAMPLE_SIZE = 0x000200
const TRUN_SAMPLE_FLAGS = 0x000400
const TRUN_COMPOSITION_OFFSET = 0x000800

const readTfhdValues = (bytes: Uint8Array, tfhd: Mp4Box): TfhdValues => {
  const header = tfhd.start + tfhd.headerSize
  const flags = viewOf(bytes, header).getUint32(0, false) & 0x00ffffff
  const trackId = readU32(bytes, header + 4)
  let cursor = header + 8

  const baseOffset = flags & TFHD_BASE_DATA_OFFSET ? readU64(bytes, cursor) : null
  if (flags & TFHD_BASE_DATA_OFFSET) cursor += 8
  const sampleDescriptionIndex = flags & TFHD_SAMPLE_DESCRIPTION_INDEX ? readU32(bytes, cursor) : 0
  if (flags & TFHD_SAMPLE_DESCRIPTION_INDEX) cursor += 4
  const defaultDuration = flags & TFHD_DEFAULT_DURATION ? readU32(bytes, cursor) : 0
  if (flags & TFHD_DEFAULT_DURATION) cursor += 4
  const defaultSize = flags & TFHD_DEFAULT_SIZE ? readU32(bytes, cursor) : 0
  if (flags & TFHD_DEFAULT_SIZE) cursor += 4
  const defaultFlags = flags & TFHD_DEFAULT_FLAGS ? readU32(bytes, cursor) : 0
  if (flags & TFHD_DEFAULT_FLAGS) cursor += 4

  return { flags, trackId, baseOffset, sampleDescriptionIndex, defaultDuration, defaultSize, defaultFlags }
}

const buildTfhdForFragment = (values: TfhdValues, baseOffset: number): Uint8Array => {
  const flags = (values.flags & ~TFHD_DEFAULT_BASE_IS_MOOF) | TFHD_BASE_DATA_OFFSET
  const parts: Uint8Array[] = [u32b(values.trackId), u64b(baseOffset)]

  if (values.flags & TFHD_SAMPLE_DESCRIPTION_INDEX) parts.push(u32b(values.sampleDescriptionIndex))
  if (values.flags & TFHD_DEFAULT_DURATION) parts.push(u32b(values.defaultDuration))
  if (values.flags & TFHD_DEFAULT_SIZE) parts.push(u32b(values.defaultSize))
  if (values.flags & TFHD_DEFAULT_FLAGS) parts.push(u32b(values.defaultFlags))

  return fullbox('tfhd', 0, flags, concatBytes(parts))
}

type TrunFields = {
  version: number
  flags: number
  sampleCount: number
  dataOffsetPresent: boolean
  dataOffset: number
  tableStart: number
}

const parseTrunFields = (bytes: Uint8Array, trun: Mp4Box): TrunFields => {
  const base = trun.start + trun.headerSize
  const rawFlags = viewOf(bytes, base).getUint32(0, false)
  const dataOffsetPresent = Boolean(rawFlags & TRUN_DATA_OFFSET)

  return {
    version: bytes[base] ?? 0,
    flags: rawFlags & 0x00ffffff,
    sampleCount: readU32(bytes, base + 4),
    dataOffsetPresent,
    dataOffset: dataOffsetPresent ? readI32(bytes, base + 8) : 0,
    tableStart: base + 8 + (dataOffsetPresent ? 4 : 0),
  }
}

const trunSampleSizes = (bytes: Uint8Array, fields: TrunFields, defaultSize: number): number[] => {
  const sizes: number[] = []
  if (fields.sampleCount === 0) {
    return sizes
  }

  const hasSizeTable = Boolean(fields.flags & TRUN_SAMPLE_SIZE)
  if (!hasSizeTable && defaultSize <= 0) {
    return sizes
  }

  let cursor = fields.tableStart
  if (fields.flags & TRUN_FIRST_SAMPLE_FLAGS) cursor += 4

  for (let index = 0; index < fields.sampleCount; index += 1) {
    if (fields.flags & TRUN_SAMPLE_DURATION) cursor += 4
    if (hasSizeTable) {
      sizes.push(readU32(bytes, cursor))
      cursor += 4
    } else {
      sizes.push(defaultSize)
    }
    if (fields.flags & TRUN_SAMPLE_FLAGS) cursor += 4
    if (fields.flags & TRUN_COMPOSITION_OFFSET) cursor += 4
  }

  return sizes
}

const buildTrunForFragment = (bytes: Uint8Array, trun: Mp4Box): Uint8Array => {
  const fields = parseTrunFields(bytes, trun)
  const tableBytes = bytes.slice(fields.tableStart, trun.end)
  const flags = fields.flags & ~TRUN_DATA_OFFSET
  return fullbox('trun', fields.version, flags, concatBytes([u32b(fields.sampleCount), tableBytes]))
}

const stripFragmentedMp4 = (source: Uint8Array): Mp4Result => {
  const analysis = analyzeMp4(source)
  if (!analysis.moov) {
    return { ok: false, reason: 'notMp4' }
  }

  const videoTrack = pickVideoTrack(analysis)
  if (!videoTrack) {
    return { ok: false, reason: 'noVideoTrack' }
  }

  const videoTrackId = videoTrack.trackId
  const ftypBytes = analysis.ftyp ? exportBoxBytes(source, analysis.ftyp) : synthesizeFtyp()
  const moov = analysis.moov

  // Rebuild moov keeping only the video trak and the video trex inside mvex.
  const moovChildren = childBoxes(source, moov)
  const mvex = findBox(moovChildren, 'mvex')
  const moovParts: Uint8Array[] = []
  for (const child of moovChildren) {
    if (child.type === 'trak') {
      const track = analysis.tracks.find((candidate) => sameBox(candidate.trakBox, child))
      if (track && track.trackId === videoTrackId) {
        moovParts.push(exportBoxBytes(source, child))
      }
    } else if (child.type === 'mvex' && mvex) {
      const mvexParts: Uint8Array[] = []
      for (const mvexChild of childBoxes(source, mvex)) {
        if (mvexChild.type === 'trex') {
          const trexTrackId = readU32(source, mvexChild.start + mvexChild.headerSize + 4)
          if (trexTrackId !== videoTrackId) {
            continue
          }
        }
        mvexParts.push(exportBoxBytes(source, mvexChild))
      }
      moovParts.push(box('mvex', concatBytes(mvexParts)))
    } else if (child.type !== 'mvex') {
      moovParts.push(exportBoxBytes(source, child))
    }
  }
  const moovBytes = box('moov', concatBytes(moovParts))

  const moofBoxes = findBoxes(parseTopLevel(source), 'moof')

  type Fragment = {
    moof: Mp4Box
    ranges: ByteRange[]
  }

  const fragments: Fragment[] = []
  let errorReason: Mp4FailureReason | null = null

  for (const moof of moofBoxes) {
    const trafs = findBoxes(childBoxes(source, moof), 'traf')
    const ranges: ByteRange[] = []
    let dataEnd: number | null = null
    let detectedIssue = false

    for (const traf of trafs) {
      const trafChildren = childBoxes(source, traf)
      const tfhd = findBox(trafChildren, 'tfhd')
      if (!tfhd) {
        detectedIssue = true
        break
      }

      const values = readTfhdValues(source, tfhd)
      const isVideoTraf = values.trackId === videoTrackId
      const trafBase = values.baseOffset ?? (values.flags & TFHD_DEFAULT_BASE_IS_MOOF ? moof.start : (dataEnd ?? moof.start))
      const truns = findBoxes(trafChildren, 'trun')
      if (truns.length === 0) {
        continue
      }

      truns.forEach((trun, index) => {
        const fields = parseTrunFields(source, trun)
        const sizes = trunSampleSizes(source, fields, values.defaultSize)
        if (sizes.length !== fields.sampleCount) {
          detectedIssue = true
          return
        }

        let start: number
        if (index === 0 && fields.dataOffsetPresent) {
          start = trafBase + fields.dataOffset
        } else if (dataEnd !== null) {
          start = dataEnd
        } else {
          start = trafBase
        }

        const end = sizes.reduce((sum, size) => sum + size, start)
        if (isVideoTraf && end > start) {
          ranges.push({ start, end })
        }
        dataEnd = end
      })

      if (detectedIssue) {
        break
      }
    }

    if (detectedIssue) {
      errorReason = 'unsupported'
      break
    }

    if (ranges.length > 0) {
      fragments.push({ moof, ranges })
    }
  }

  if (errorReason) {
    return { ok: false, reason: errorReason }
  }
  if (fragments.length === 0) {
    return { ok: false, reason: 'noVideoFragments' }
  }

  const buildMoofBytes = (moof: Mp4Box, baseDataOffset: number): Uint8Array => {
    const moofChildren = childBoxes(source, moof)
    const mfhd = findBox(moofChildren, 'mfhd')
    const mfhdBytes = mfhd ? exportBoxBytes(source, mfhd) : new Uint8Array(0)
    const trafParts: Uint8Array[] = []

    for (const traf of findBoxes(moofChildren, 'traf')) {
      const trafChildren = childBoxes(source, traf)
      const tfhd = findBox(trafChildren, 'tfhd')
      if (!tfhd) {
        continue
      }
      const values = readTfhdValues(source, tfhd)
      if (values.trackId !== videoTrackId) {
        continue
      }
      const truns = findBoxes(trafChildren, 'trun')
      if (truns.length === 0) {
        continue
      }

      const tfdt = findBox(trafChildren, 'tfdt')
      const tfdtBytes = tfdt ? exportBoxBytes(source, tfdt) : null
      const trunBytes = truns.map((trun) => buildTrunForFragment(source, trun))
      trafParts.push(
        box('traf', concatBytes([buildTfhdForFragment(values, baseDataOffset), tfdtBytes, ...trunBytes].filter((part): part is Uint8Array => part !== null))),
      )
    }

    if (trafParts.length === 0) {
      return new Uint8Array(0)
    }

    return box('moof', concatBytes([mfhdBytes, ...trafParts]))
  }

  const moofLengths = fragments.map((fragment) => buildMoofBytes(fragment.moof, 0).length)

  const baseOffsets: number[] = []
  let cursor = ftypBytes.length + moovBytes.length
  fragments.forEach((fragment, index) => {
    const moofLength = moofLengths[index] ?? 0
    baseOffsets.push(cursor + moofLength + 8)
    cursor += moofLength + 8 + rangesLength(fragment.ranges)
  })

  const groups = fragments.map((fragment, index) => {
    const moofBytes = buildMoofBytes(fragment.moof, baseOffsets[index] ?? 0)
    return { boxes: index === 0 ? [ftypBytes, moovBytes, moofBytes] : [moofBytes], ranges: fragment.ranges }
  })
  return { ok: true, bytes: writeMp4(source, groups) }
}

export const stripAudioTracks = (source: Uint8Array): Mp4Result => {
  const analysis = analyzeMp4(source)
  if (!analysis.moov) {
    return { ok: false, reason: 'notMp4' }
  }

  try {
    return analysis.fragmented ? stripFragmentedMp4(source) : stripNonFragmentedMp4(source)
  } catch {
    return { ok: false, reason: 'unsupported' }
  }
}
