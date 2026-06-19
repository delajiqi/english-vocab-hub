# Developer Notes & Maintenance Guide

## Overview
This document records the major changes, architectural decisions, and bug fixes applied to the `english-vocab-hub` project. It serves as a memory base for future agents and developers to quickly understand the current state of the codebase.

## 1. Data Structure & Grade Granularity

### ✅ CURRENT approach — `scripts/build_pep_levels.js` (按人教版教材分级)
The 小学/初中/高中 level files are now generated **directly from 人教版 (PEP) per-volume
textbook word lists**, so the grade division matches the actual textbooks unit-by-unit
(e.g. Primary starts with ruler/pencil/eraser = 三年级上 Unit 1; Junior-1 starts with
good/morning/hi/hello = 七上 Starter Unit; Senior-1 starts with add up/ignore/calm =
必修1 Unit 1).

Source: [kajweb/dict](https://github.com/kajweb/dict) per-book NDJSON, downloaded &
unzipped into `data/syllabus/pep_zip/<BookId>/<BookId>.json`. Each word line carries
headWord, usphone/ukphone, trans[] (pos + Chinese), example sentences, and Youdao audio
params (usspeech/ukspeech).

Volume → grade mapping (人教版旧课标):
- **Primary**  = 小学 3~6 年级 8 册
- **Junior-1/2/3** = 七年级(上+下) / 八年级(上+下) / 九年级(全册)
- **Senior-1** = 必修1,2 · **Senior-2** = 必修3,4,5 · **Senior-3** = 选修6~11
- Cross-grade dedup: a word is kept only in the grade where it **first** appears.

Output (~5,680 unique words, zero duplicates, every entry has a Chinese meaning):
`Primary 819 · Junior-1 445 · Junior-2 762 · Junior-3 489 · Senior-1 498 · Senior-2 895 · Senior-3 1772`.
Each entry also has an `audio` field = a Youdao dictvoice URL (real recorded/neural
pronunciation) — see §3.

NOTE: Senior-3 is large because it bundles 选修6~11. To rebalance or drop the rarely
taught 选修9~11, edit `LEVEL_BOOKS` in `scripts/build_pep_levels.js` and re-run.
Regenerate with: `node scripts/build_pep_levels.js`.

### Earlier approach — `scripts/build_levels.js` (标准大纲词频法, superseded)
Built the same 7 files from standard syllabus lists (小学大纲 / 中考 / 高考3500 in
`data/syllabus/*.txt`), splitting each band by COCA frequency. Correct and dedup'd, but
the intra-band grade split was frequency-based rather than textbook-accurate. Kept for
reference; superseded by the PEP build above.

### Exam banks — `scripts/build_exam_levels.js`
The exam vocabularies (CET-4/6, 考研, TOEFL, SAT) were rebuilt **from the same kajweb/dict
source** to replace the old files that had been sliced from the dirty 54k dump. Mapping:
`CET4_2 → cet4.json` · `CET6_2 → cet6.json` · `KaoYan_2 → postgrad.json` ·
`TOEFL_2 → toefl.json` · `SAT_2 → sat.json`. Each is de-duplicated, meanings cleaned of
人名/地名 senses, and every entry carries phonetic / POS / example / `audio`.
Counts: `CET-4 3739 · CET-6 2078 · Postgrad 4533 · TOEFL 9212 · SAT 4423`.
Regenerate with: `node scripts/build_exam_levels.js`.

### Source data location
`data/syllabus/` holds the raw inputs. The bulky textbook packs
`data/syllabus/pep_zip/` (~68MB of downloaded & unzipped kajweb books) are **git-ignored**;
re-download them with the PowerShell snippets used during setup (raw URLs are
`https://raw.githubusercontent.com/kajweb/dict/master/book/<timestamp>_<BookId>.zip`).
The small lists (`primary.txt`, `zhongkao.txt`, `highschool.txt`, `coca.txt`,
`booklists.json`) are kept in the repo.

### ⚠️ Superseded approach — DO NOT use `scripts/split_data.js`
The earlier `scripts/split_data.js` produced a **crude, wrong** division: it took the
raw 54k-row frequency dump, sorted everything by a single English frequency list, and
sliced it into equal chunks. Consequences:
- ~73% duplicate words (vocab.json had 54,356 rows but only 14,625 unique words).
- Function words like `the / of / and` landed in **Senior-1** (frequency sort applied per
  band, so the most common words floated to the top of every band).
- 500+ meanings carried proper-noun junk like `(Able)人名；(英)埃布尔`.
This file is kept only for history. **Do not run it.**

### Current approach (Date: 2026-06-15) — `scripts/build_levels.js`
Grades are now derived from **standard syllabus word lists**, not raw frequency.

Source lists live in `data/syllabus/` (downloaded from
[mahavivo/english-wordlists](https://github.com/mahavivo/english-wordlists)):
- `primary.txt`     小学英语大纲词汇 (plain words)
- `zhongkao.txt`    中考英语词汇表 (word + phonetic + POS + clean Chinese meaning)
- `highschool.txt`  高考英语词汇 ~3500 (plain words)
- `coca.txt`        COCA frequency list (used only to order words *within* a band)

Division principle (non-overlapping, matches learning progression):
- **Primary** = 小学 set
- **Junior**  = 中考 set − 小学 set → split by frequency into `Junior-1/2/3`
- **Senior**  = 高考 set − 中考 set − 小学 set → split by frequency into `Senior-1/2/3`

Enrichment:
- Phonetic / POS / meaning: prefer the clean 中考 list, fall back to `vocab.json`.
- Example / translation: joined from `vocab.json` by lowercased word (~96% coverage).
- Every meaning is cleaned of 人名/地名 proper-noun notes; POS is normalized to a small
  set (`n / v / adj / adv / prep / conj / pron / num / art / int`).
- IDs are reassigned sequentially and are unique across all level files.

Result (~3,679 unique words, zero duplicates):
`Primary 439 · Junior-1/2/3 ≈496 each · Senior-1/2/3 ≈584 each`.

### Maintenance Note
To regenerate the 小学/初中/高中 levels, run `node scripts/build_levels.js`.
It only rewrites `primary.json` and `junior-*.json` / `senior-*.json`.
The big exam banks (`cet4/cet6/postgrad/toefl/sat.json`) are **not** touched by this
script and still contain the older, un-cleaned data.

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
The browser's `SpeechSynthesisUtterance` sounds **robotic and too fast** — on Windows it
falls back to the old Microsoft Zira/David voices.

### Solution — real audio first, synthetic voice only as fallback
`src/flashcard.html` now plays **Youdao dictvoice** audio, which is real recorded / neural
pronunciation (`https://dict.youdao.com/dictvoice?audio=<text|usspeech>&type=2`,
`type=2` = US, `type=1` = UK):
- **Word**: plays the entry's `audio` field (from the textbook data's `usspeech`), or
  `dictvoice?audio=<word>` if absent.
- **Sentence**: plays `dictvoice?audio=<URL-encoded sentence>` (Youdao neural TTS).
- Implemented via `playClip(url, fallbackText, rate)` using an `Audio` element with
  `playbackRate ≈ 0.9` (slightly slower for clarity).
- **Fallback** `speakFallback()` runs only if the audio element fails (offline / blocked):
  it picks the most natural local voice (Win11 *Natural/Online*, Chrome *Google US English*)
  via `getVoices()` and speaks at `rate = 0.9`.
- The `🔊` sentence button is still injected into `back-example` with `e.stopPropagation()`
  so it doesn't flip the card.

NOTE: Youdao audio needs network access. It is not rate-limited for normal use but is an
external dependency; the synthetic fallback keeps the feature working offline.

## 4. Serving the Project
- The `package.json` serve script now runs from the **project root**:
  `http-server . -c-1 -o src/index.html`. This makes the `../data/*.json` paths in `FILES`
  resolve correctly both locally and on GitHub Pages (where `src/` and `data/` are siblings).
- The previous script rooted at `src/`, which broke `../data` resolution.

## 5. Frontend Filter Fix (Date: 2026-06-15)
### Problem
The flashcard "分类 (category)" dropdown always showed **"没有单词 / No words"**. Every word
in the dataset has `category: "general"`, but the dropdown filtered on values like
`noun / verb / adjective`, so it never matched anything.

### Solution
- Repurposed the dropdown into a **词性 (Part of Speech)** filter in `src/flashcard.html`.
  Options now map to the normalized `pos` field (`n / v / adj / adv / prep / conj / pron / num`),
  and `applyFilters()` filters on `w.pos` instead of `w.category`.
- The back-of-card badge (previously always "general") now shows the word's POS.
