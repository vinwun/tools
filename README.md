# Tools

A TypeScript + Vite project for a collection of browser-based utility tools.

## Current Features

- Home dashboard with tool category cards: Image, PDF, Audio, Video, RNG, Time, Math, Text
- Category pages and tool subpages with path (`tools/<category>/<tool>/`)
- Internationalized UI text system with external dictionaries (`en`, `de`) and language switcher

## Tools

- `Image Tools`:
  - `Image Converter`: image conversion into `png` / `jpg` / `webp`
  - `Color Picker`: color field and Hex / RGB / HSL sync with copy-on-click
- `PDF Tools`:
  - `PDF Merge & Reorder & Split`: merge PDFs, move pages, extract pages / ranges
  - `PDF Text Extractor`: extract text from PDF documents as .md or .txt
- `Audio Tools`:
  - `Audio Converter`: audio conversion into `wav`
  - `Audio Trimmer`: audio trimmer with keep/remove mode and `wav` download
- `Video Tools`:
  - `Video Converter`: extract the audio track or strip it from videos
  - `Video Cutter`: video cutter on keyframe boundaries
- `RNG Tools`:
  - `Number Generator`: random numbers in a min/max range with integer / decimal mode
  - `String Generator`: pick from a list of strings with optional per-entry weights and unique mode
- `Time Tools`:
  - `Stopwatch`: measure elapsed time with lap controls
  - `Timer`: count down from a duration with completion alert
  - `Timezone Converter`: convert times between different time zones
- `Math Tools`:
  - `Prime Factorizer`: factor integers into primes with expanded and exponent forms
  - `Base Converter`: convert numbers between numeral systems
  - `Aspect Ratio Calculator`: convert width and height into aspect ratio and decimal
  - `Floating-Point Inspector`: convert floating-point numbers and their bit representations
  - `Matrix Multiplier`: multiply two matrices
- `Text Tools`:
  - `JSON Pretty Printer`: validate and pretty-print JSON with a collapsible preview and download
  - `Markdown Displayer`: display Markdown and download as HTML
  - `Text Counter`: count words, characters, and other statistics of a text
  - `Lorem Ipsum Generator`: generate placeholder text with a specific length
  - `Unicode Displayer`: display characters and code points for Unicode values
  - `Hidden Characters Inspector`: find zero-width, bidi and confusable characters
