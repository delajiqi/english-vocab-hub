# Developer Notes & Maintenance Guide

## Overview
This document records the major changes, architectural decisions, and bug fixes applied to the `english-vocab-hub` project. It serves as a memory base for future agents and developers to quickly understand the current state of the codebase.

## 1. Data Structure & Grade Granularity (Date: 2026-06-15)
### Problem
Previously, the word lists were broadly categorized into `junior.json` and `senior.json`, lacking fine-grained progression (e.g., Primary, Junior-1, Junior-2, etc.).

### Solution
- Created a Node.js script `scripts/split_data.js`.
- It dynamically splits `junior.json` into: `primary.json` (first 800 basic words), `junior-1.json`, `junior-2.json`, `junior-3.json` based on word frequency.
- It splits `senior.json` into: `senior-1.json`, `senior-2.json`, `senior-3.json`.
- All HTML files (`src/index.html`, `src/flashcard.html`, `src/quiz.html`) had their `FILES` mapping and `LEVELS` array updated to reflect these new `.json` data sources.

### Maintenance Note
If more vocabulary is added in the future, please place the raw data in a temp file and re-run `node scripts/split_data.js` or directly update the split `.json` files to maintain this granularity.

## 2. UI / UX Fixes
### Problem
- The `<select>` dropdowns in `flashcard.html` had a white background in dark mode, rendering text invisible.
- The default loading state or an empty filtered deck would instantly display an ugly `No words` message.
- The **Shuffle (随机)** button only updated the text instantaneously, leading users to believe it wasn't working.

### Solution
- **CSS Select Box**: Added `.ctrl-select option { background-color: var(--bg); color: var(--text); }` in `flashcard.html` to inherit proper dark mode colors.
- **Empty State**: Added an `isLoading` flag. When fetching data, it displays `Loading...`. If the deck is truly empty after filtering, it displays `没有单词 (No words)`.
- **Shuffle Animation**: Added explicit visual feedback to the shuffle button (`✨ 已打乱!`) and a quick 200ms `scale(0.95)` and `opacity: 0` CSS transition to the card to give users a physical sense of "shuffling".

## 3. Audio & TTS (Text-To-Speech)
### Problem
The default `SpeechSynthesisUtterance` rate of `0.85` was too fast for language learners to catch pronunciation nuances. Example sentences lacked voice playback entirely.

### Solution
- **Speed Adjustment**: Set `utt.rate = 0.75;` across all `SpeechSynthesisUtterance` instantiations.
- **Sentence Playback**: In `flashcard.html`, dynamically injected a `🔊` button into the `back-example` div. Added a `playSentence(e)` function in the JS to handle example playback with `e.stopPropagation()` so it doesn't trigger a card flip.

## 4. Serving the Project
- **Important**: The `package.json` serve script is `http-server src -c-1 -o`. Since this runs the server with `src/` as the root, the paths `../data/*.json` in `FILES` might fail to resolve if the web server strictly prohibits traversing above the root.
- **Recommendation**: During local development, launch `npx http-server -p 8080 -c-1` from the **project root directory** (not `src/`) and access `http://127.0.0.1:8080/src/index.html` to ensure `../data` resolves correctly.
