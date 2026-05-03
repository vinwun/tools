# Tools

A TypeScript + Vite project for a collection of browser-based utility tools.

## Current Features

- Home dashboard with tool category cards: Image, PDF, Audio, RNG, Time, Math, Text
- Category pages and tool subpages with path (`tools/<category>/<tool>/`)
- Internationalized UI text system with external dictionaries (`en`, `de`) and language switcher

## Tools

- `Image Tools`:
  - `Image Converter`: image conversion into `png` / `jpg` / `webp`
  - `Color Picker`: color field and Hex / RGB / HSL sync with copy-on-click
- `PDF Tools`:
  - `PDF Merge & Reorder & Split`: merge PDFs, move pages, extract pages / ranges
- `Audio Tools`:
  - `Audio Converter`: audio conversion into `wav`
  - `Audio Trimmer`: audio trimmer with keep/remove mode and `wav` download
- `RNG Tools`:
  - `Number Generator`: random numbers in a min/max range with integer / decimal mode
  - `String Generator`: pick from a list of strings with optional per-entry weights and unique mode
- `Time Tools`:
  - `Stopwatch`: measure elapsed time with lap controls
  - `Timer`: count down from a duration with completion alert
  - `Timezone Converter`: convert times between different time zones
