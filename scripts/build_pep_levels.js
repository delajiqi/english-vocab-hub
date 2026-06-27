/*
 * build_pep_levels.js
 * 「完全按人教版教材」生成分级词库（小学 / 初一~初三 / 高一~高三）。
 *
 * 数据来源：kajweb/dict 仓库的人教版逐册词表（NDJSON），
 * 已下载解压到 data/syllabus/pep_zip/<BookId>/<BookId>.json。
 * 每行一个词，含：headWord、音标(usphone/ukphone)、释义(trans[].pos/tranCn)、
 * 例句(sentence.sentences)、有道发音参数(usspeech/ukspeech)。
 *
 * 卷册 → 年级映射（人教版）：
 *   Primary  = 小学 3~6 年级 8 册
 *   Junior-1 = 七年级上+下     Junior-2 = 八年级上+下     Junior-3 = 九年级全册
 *   Senior-1 = 必修1,2         Senior-2 = 必修3,4,5       Senior-3 = 选修6~11
 *
 * 跨级去重：按教材进度，单词只归入「首次出现」的年级。
 */

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../data');
const PEP = path.join(DATA, 'syllabus/pep_zip');

const LEVEL_BOOKS = {
  'Primary': ['PEPXiaoXue3_1','PEPXiaoXue3_2','PEPXiaoXue4_1','PEPXiaoXue4_2',
              'PEPXiaoXue5_1','PEPXiaoXue5_2','PEPXiaoXue6_1','PEPXiaoXue6_2'],
  'Junior-1': ['PEPChuZhong7_1','PEPChuZhong7_2'],
  'Junior-2': ['PEPChuZhong8_1','PEPChuZhong8_2'],
  'Junior-3': ['PEPChuZhong9_1'],
  'Senior-1': ['PEPGaoZhong_1','PEPGaoZhong_2'],
  'Senior-2': ['PEPGaoZhong_3','PEPGaoZhong_4','PEPGaoZhong_5'],
  'Senior-3': ['PEPGaoZhong_6','PEPGaoZhong_7','PEPGaoZhong_8',
               'PEPGaoZhong_9','PEPGaoZhong_10','PEPGaoZhong_11'],
};

const FILE_FOR = {
  'Primary': 'primary.json', 'Junior-1': 'junior-1.json', 'Junior-2': 'junior-2.json',
  'Junior-3': 'junior-3.json', 'Senior-1': 'senior-1.json', 'Senior-2': 'senior-2.json',
  'Senior-3': 'senior-3.json',
};

const POS_MAP = { a:'adj', adj:'adj', ad:'adv', adv:'adv', n:'n', v:'v', vt:'v', vi:'v',
  prep:'prep', conj:'conj', pron:'pron', num:'num', art:'art', int:'int', aux:'v', modal:'v' };
const normPos = p => { if(!p) return ''; const k=String(p).toLowerCase().replace(/\.$/,''); return POS_MAP[k]||k; };

function readBook(id) {
  const p = path.join(PEP, id, id + '.json');
  if (!fs.existsSync(p)) { console.warn('  missing book:', id); return []; }
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

// 从 sentence 列表里挑最像「完整句子」的一条
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
    word: headWord,
    phonetic,
    pos,
    meaning,
    example: s ? (s.sContent || '') : '',
    translation: s ? (s.sCn || '') : '',
    audio: speech ? 'https://dict.youdao.com/dictvoice?audio=' + speech : '',
  };
}

function run() {
  // 只在「本年级自己的教材」内去重，不跨阶段删词，
  // 这样每个年级的词数符合该阶段教材实际（高一≈630，高中三年≈3500）。
  let id = 1;
  const summary = [];
  let noMeaning = 0, noExample = 0;

  for (const [level, books] of Object.entries(LEVEL_BOOKS)) {
    const entries = [];
    const localSeen = new Set();
    for (const b of books) {
      for (const line of readBook(b)) {
        const e = makeEntry(line);
        if (!e) continue;
        const key = e.word.toLowerCase();
        if (localSeen.has(key)) continue;
        localSeen.add(key);
        e.level = level;
        e.category = 'general';
        e.id = id++;
        if (!e.meaning) noMeaning++;
        if (!e.example) noExample++;
        entries.push(e);
      }
    }
    fs.writeFileSync(path.join(DATA, FILE_FOR[level]), JSON.stringify(entries, null, 2));
    const withEx = entries.filter(e => e.example).length;
    const withAudio = entries.filter(e => e.audio).length;
    summary.push(`${level.padEnd(9)} ${String(entries.length).padStart(4)} 词  例句 ${withEx}  音频 ${withAudio}  -> ${FILE_FOR[level]}`);
  }

  console.log('按人教版教材生成完成：');
  summary.forEach(s => console.log('  ' + s));
  console.log(`  缺释义: ${noMeaning}  缺例句: ${noExample}  总词数: ${id - 1}`);
}

run();
