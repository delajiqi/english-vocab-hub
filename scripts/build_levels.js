/*
 * build_levels.js
 * 基于「标准大纲词表」生成分级词库（小学 / 初一~初三 / 高一~高三）。
 *
 * 数据来源（data/syllabus/，由 mahavivo/english-wordlists 下载）：
 *   - primary.txt     小学英语大纲词汇（纯单词）
 *   - zhongkao.txt    中考英语词汇表（含音标+词性+干净释义）
 *   - highschool.txt  高考英语词汇（纯单词，约3500）
 *   - coca.txt        COCA 词频表（用于段内排序）
 *
 * 分级原则（非重叠、符合学习progression）：
 *   Primary = 小学词
 *   Junior  = 中考词 − 小学词        → 按词频切成 Junior-1 / Junior-2 / Junior-3
 *   Senior  = 高考词 − 中考词 − 小学词 → 按词频切成 Senior-1 / Senior-2 / Senior-3
 *
 * 释义/音标/词性：优先用中考表（干净），缺失再用 vocab.json；
 * 例句/翻译：从 vocab.json 按单词匹配补充；
 * 所有释义会清洗掉「人名/地名」等专有名词注释。
 */

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../data');
const SYL = path.join(DATA, 'syllabus');

const readLines = f => fs.readFileSync(path.join(SYL, f), 'utf8').replace(/^﻿/, '').split(/\r?\n/);

// ---------- 释义清洗：移除含「人名/地名」的词性组 ----------
function cleanMeaning(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  // 按 "分号+空格+词性." 切成词性组，丢弃含专有名词注释的组
  const groups = s.split(/;\s+(?=[a-zA-Z&]+\.)/);
  const kept = groups.filter(g => !/人名|地名/.test(g));
  let out = (kept.length ? kept : groups).join('; ');
  // 去掉孤立的 (英)(美)(伊朗)... 等国别注释残留
  out = out.replace(/[（(][^（）()]{0,6}[)）]\s*[一-龥·]+(?=[；;,，]|$)/g, '').trim();
  out = out.replace(/[；;]\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  return out;
}

// ---------- 词性归一化 ----------
const POS_MAP = {
  'a': 'adj', 'adj': 'adj', 'ad': 'adv', 'adv': 'adv', 'n': 'n', 'v': 'v',
  'vt': 'v', 'vi': 'v', 'prep': 'prep', 'conj': 'conj', 'pron': 'pron',
  'num': 'num', 'art': 'art', 'int': 'int', 'aux': 'v', 'modal': 'v'
};
function normPos(rawMeaningOrPos) {
  if (!rawMeaningOrPos) return '';
  const m = String(rawMeaningOrPos).match(/^([a-zA-Z]+)/);
  if (!m) return '';
  const key = m[1].toLowerCase();
  return POS_MAP[key] || key;
}

// ---------- 解析中考表：word -> {phonetic, pos, meaning} ----------
function parseZhongkao() {
  const map = new Map();
  for (const raw of readLines('zhongkao.txt')) {
    const t = raw.trim();
    if (!t || t.length <= 2) continue;            // 跳过 "A" "B" 字母分隔
    const m = t.match(/^([a-zA-Z][a-zA-Z\-]*)\b/);
    if (!m) continue;
    const word = m[1].toLowerCase();
    let rest = t.slice(m[0].length).trim();
    // 去掉 (an) 之类的变体提示
    rest = rest.replace(/^\([^)]*\)\s*/, '');
    let phonetic = '';
    const ph = rest.match(/^\[([^\]]*)\]/);
    if (ph) { phonetic = '[' + ph[1] + ']'; rest = rest.slice(ph[0].length).trim(); }
    const meaning = cleanMeaning(rest);
    if (!map.has(word)) map.set(word, { phonetic, pos: normPos(rest), meaning });
  }
  return map;
}

// ---------- vocab.json：word -> 最佳富信息条目 ----------
function buildVocabMap() {
  const v = JSON.parse(fs.readFileSync(path.join(DATA, 'vocab.json'), 'utf8'));
  const map = new Map();
  for (const e of v) {
    const k = (e.word || '').toLowerCase();
    if (!k) continue;
    const prev = map.get(k);
    // 优先选「有例句」的条目
    if (!prev || (!prev.example && e.example)) map.set(k, e);
  }
  return map;
}

// ---------- 词频排名 ----------
function buildFreq() {
  const map = new Map();
  readLines('coca.txt').forEach((w, i) => {
    const k = w.trim().toLowerCase();
    if (k && !map.has(k)) map.set(k, i);
  });
  return map;
}

function plainWords(file) {
  return readLines(file)
    .map(s => s.trim().toLowerCase())
    .filter(w => /^[a-z][a-z\-']*$/.test(w));
}

// ---------- 组装单个词对象 ----------
function makeEntry(word, zk, vocab, level) {
  const z = zk.get(word);
  const v = vocab.get(word);
  const phonetic = (z && z.phonetic) || (v && v.phonetic) || '';
  let meaning = (z && z.meaning) || (v && cleanMeaning(v.meaning)) || '';
  if (!meaning && v) meaning = cleanMeaning(v.meaning);
  const pos = (z && z.pos) || normPos(v && v.meaning) || (v && v.pos) || '';
  return {
    word,
    phonetic,
    pos,
    meaning,
    example: (v && v.example) || '',
    translation: (v && v.translation) || '',
    level,
    category: 'general'
  };
}

function splitByFreq(words, freq, labels) {
  // 词频靠前(数值小)=更简单，排前面；未收录的排最后
  const sorted = [...words].sort((a, b) => {
    const fa = freq.has(a) ? freq.get(a) : 1e9 + a.length;
    const fb = freq.has(b) ? freq.get(b) : 1e9 + b.length;
    return fa - fb;
  });
  const out = {};
  const per = Math.ceil(sorted.length / labels.length);
  labels.forEach((lab, i) => { out[lab] = sorted.slice(i * per, (i + 1) * per); });
  return out;
}

function run() {
  const zk = parseZhongkao();
  const vocab = buildVocabMap();
  const freq = buildFreq();

  const primarySet = new Set(plainWords('primary.txt'));
  const zhongSet = new Set([...zk.keys(), ...plainWords('zhongkao.txt')]);
  const highSet = new Set(plainWords('highschool.txt'));

  const primary = [...primarySet];
  const junior = [...zhongSet].filter(w => !primarySet.has(w));
  const senior = [...highSet].filter(w => !zhongSet.has(w) && !primarySet.has(w));

  const juniorSplit = splitByFreq(junior, freq, ['Junior-1', 'Junior-2', 'Junior-3']);
  const seniorSplit = splitByFreq(senior, freq, ['Senior-1', 'Senior-2', 'Senior-3']);

  const banks = {
    'Primary': primary,
    ...juniorSplit,
    ...seniorSplit
  };

  const fileFor = { 'Primary': 'primary.json', 'Junior-1': 'junior-1.json',
    'Junior-2': 'junior-2.json', 'Junior-3': 'junior-3.json', 'Senior-1': 'senior-1.json',
    'Senior-2': 'senior-2.json', 'Senior-3': 'senior-3.json' };

  let id = 1;
  let missingMeaning = 0;
  const summary = [];
  for (const [level, words] of Object.entries(banks)) {
    const entries = words.map(w => {
      const e = makeEntry(w, zk, vocab, level);
      e.id = id++;
      if (!e.meaning) missingMeaning++;
      return e;
    });
    fs.writeFileSync(path.join(DATA, fileFor[level]), JSON.stringify(entries, null, 2));
    const withEx = entries.filter(e => e.example).length;
    summary.push(`${level.padEnd(9)} ${String(entries.length).padStart(4)} 词  例句 ${withEx}  -> ${fileFor[level]}`);
  }

  console.log('生成完成：');
  summary.forEach(s => console.log('  ' + s));
  console.log(`  缺释义条目: ${missingMeaning}`);
  console.log(`  总词数: ${id - 1}`);
}

run();
