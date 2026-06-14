const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../data');

// Fetch frequency list if needed
async function getFreqList() {
    return new Promise((resolve, reject) => {
        https.get('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const words = data.split('\n').map(w => w.trim()).filter(Boolean);
                const freqMap = new Map();
                words.forEach((w, i) => freqMap.set(w.toLowerCase(), i));
                resolve(freqMap);
            });
        }).on('error', (err) => {
            console.error('Failed to download freq list, using fallback length-based heuristic');
            resolve(new Map());
        });
    });
}

function getWordScore(wordStr, freqMap) {
    const w = wordStr.toLowerCase();
    let score = 0;
    if (freqMap.has(w)) {
        score = freqMap.get(w); // 0 is most common, 10000 is least common
    } else {
        score = 10000 + w.length * 100; // longer words are harder
    }
    return score;
}

async function run() {
    console.log('Loading freq map...');
    const freqMap = await getFreqList();
    
    console.log('Splitting Junior...');
    const juniorPath = path.join(DATA_DIR, 'junior.json');
    if (fs.existsSync(juniorPath)) {
        let juniorWords = JSON.parse(fs.readFileSync(juniorPath, 'utf8'));
        // Sort by difficulty (score)
        juniorWords.sort((a, b) => getWordScore(a.word, freqMap) - getWordScore(b.word, freqMap));
        
        // Primary: first 800 words
        const primary = juniorWords.slice(0, 800).map(w => ({...w, level: 'Primary'}));
        
        const remainingJunior = juniorWords.slice(800);
        const chunk = Math.ceil(remainingJunior.length / 3);
        
        const junior1 = remainingJunior.slice(0, chunk).map(w => ({...w, level: 'Junior-1'}));
        const junior2 = remainingJunior.slice(chunk, chunk * 2).map(w => ({...w, level: 'Junior-2'}));
        const junior3 = remainingJunior.slice(chunk * 2).map(w => ({...w, level: 'Junior-3'}));
        
        fs.writeFileSync(path.join(DATA_DIR, 'primary.json'), JSON.stringify(primary, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'junior-1.json'), JSON.stringify(junior1, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'junior-2.json'), JSON.stringify(junior2, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'junior-3.json'), JSON.stringify(junior3, null, 2));
        console.log(`Primary: ${primary.length}, Junior-1: ${junior1.length}, Junior-2: ${junior2.length}, Junior-3: ${junior3.length}`);
    }
    
    console.log('Splitting Senior...');
    const seniorPath = path.join(DATA_DIR, 'senior.json');
    if (fs.existsSync(seniorPath)) {
        let seniorWords = JSON.parse(fs.readFileSync(seniorPath, 'utf8'));
        seniorWords.sort((a, b) => getWordScore(a.word, freqMap) - getWordScore(b.word, freqMap));
        
        const chunk = Math.ceil(seniorWords.length / 3);
        const senior1 = seniorWords.slice(0, chunk).map(w => ({...w, level: 'Senior-1'}));
        const senior2 = seniorWords.slice(chunk, chunk * 2).map(w => ({...w, level: 'Senior-2'}));
        const senior3 = seniorWords.slice(chunk * 2).map(w => ({...w, level: 'Senior-3'}));
        
        fs.writeFileSync(path.join(DATA_DIR, 'senior-1.json'), JSON.stringify(senior1, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'senior-2.json'), JSON.stringify(senior2, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'senior-3.json'), JSON.stringify(senior3, null, 2));
        console.log(`Senior-1: ${senior1.length}, Senior-2: ${senior2.length}, Senior-3: ${senior3.length}`);
    }
    
    console.log('Done!');
}

run();
