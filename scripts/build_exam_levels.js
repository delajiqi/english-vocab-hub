/*
 * build_exam_levels.js
 * 用与人教版同源的 kajweb/dict 词库，重建考试词库（CET-4/6、考研、TOEFL、SAT），
 * 替换旧的、从 54k 乱数据切出来的脏文件。
 *
 * 数据来源：kajweb/dict 各考试整册 NDJSON，已解压到
 *   data/syllabus/pep_zip/<BookId>/<BookId>.json
 *
 * 输出（与前端 FILES 映射一致）：
 *   CET4_2 -> cet4.json (CET-4)   CET6_2 -> cet6.json (CET-6)
 *   KaoYan_2 -> postgrad.json (Postgrad)
 *   TOEFL_2 -> toefl.json (TOEFL)  SAT_2 -> sat.json (SAT)
 *
 * 每个文件内部按单词去重；不同考试之间互不去重（各自是独立词表）。
 */

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../data');
const PEP = path.join(DATA, 'syllabus/pep_zip');

const EXAMS = [
  { out: 'cet4.json',     level: 'CET-4',    books: ['CET4_2'] },
  { out: 'cet6.json',     level: 'CET-6',    books: ['CET6_2'] },
  { out: 'postgrad.json', level: 'Postgrad', books: ['KaoYan_2'] },
  { out: 'toefl.json',    level: 'TOEFL',    books: ['TOEFL_2'] },
  { out: 'sat.json',      level: 'SAT',      books: ['SAT_2'] },
];

const POS_MAP = { a:'adj', adj:'adj', ad:'adv', adv:'adv', n:'n', v:'v', vt:'v', vi:'v',
  prep:'prep', conj:'conj', pron:'pron', num:'num', art:'art', int:'int', aux:'v', modal:'v' };
const normPos = p => { if(!p) return ''; const k=String(p).toLowerCase().replace(/\.$/,''); return POS_MAP[k]||k; };

function readBook(id) {
  const p = path.join(PEP, id, id + '.json');
  if (!fs.existsSync(p)) { console.warn('  missing book:', id); return []; }
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function pickSentence(sents) {
  if (!sents || !sents.length) return null;
  const full = sents.find(s => /[.!?？！]\s*$/.test(s.sContent || '') &&
    (s.sContent || '').split(/\s+/).length >= 4);
  return full || sents[0];
}

function buildMeaning(trans) {
  if (!trans || !trans.length) return { meaning: '', pos: '' };
  // 丢弃「人名/地名」等专有名词义项
  const kept = trans.filter(t => t.tranCn && !/人名|地名/.test(t.tranCn));
  const use = kept.length ? kept : trans.filter(t => t.tranCn);
  const parts = use.map(t => {
    const pos = normPos(t.pos);
    const cn = t.tranCn.trim().replace(/[，,、；;]\s*(人名|地名|\[?地名\]?)\s*$/, '');
    return (pos ? pos + '. ' : '') + cn;
  });
  return { meaning: parts.join('; '), pos: use.length ? normPos(use[0].pos) : '' };
}

function makeEntry(line) {
  const headWord = (line.headWord || '').trim();
  const c = line.content && line.content.word && line.content.word.content;
  if (!headWord || !c) return null;
  const phonetic = c.usphone ? '[' + c.usphone + ']' : (c.ukphone ? '[' + c.ukphone + ']' : '');
  const { meaning, pos } = buildMeaning(c.trans);
  const s = pickSentence(c.sentence && c.sentence.sentences);
  const speech = c.usspeech || c.ukspeech || '';
  return {
    word: headWord, phonetic, pos, meaning,
    example: s ? (s.sContent || '') : '',
    translation: s ? (s.sCn || '') : '',
    audio: speech ? 'https://dict.youdao.com/dictvoice?audio=' + speech : '',
  };
}

function run() {
  let totalId = 1;
  const summary = [];
  for (const { out, level, books } of EXAMS) {
    const entries = [];
    const seen = new Set();
    for (const b of books) {
      for (const line of readBook(b)) {
        const e = makeEntry(line);
        if (!e) continue;
        const key = e.word.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        e.level = level;
        e.category = 'general';
        e.id = totalId++;
        entries.push(e);
      }
    }
    fs.writeFileSync(path.join(DATA, out), JSON.stringify(entries, null, 2));
    const withEx = entries.filter(e => e.example).length;
    const withAudio = entries.filter(e => e.audio).length;
    const noMean = entries.filter(e => !e.meaning).length;
    summary.push(`${level.padEnd(9)} ${String(entries.length).padStart(5)} 词  例句 ${withEx}  音频 ${withAudio}  缺释义 ${noMean}  -> ${out}`);
  }
  console.log('考试词库重建完成：');
  summary.forEach(s => console.log('  ' + s));
}

run();
