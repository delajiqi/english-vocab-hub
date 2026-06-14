# English Vocab Hub 📚

> 帮助学生系统学习初高中英语单词的完整词汇库

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Data Format](https://img.shields.io/badge/data-JSON%20%26%20CSV-blue)](#数据格式)

## 📖 项目介绍

**English Vocab Hub** 是一个专为中国初高中学生设计的英语词汇学习平台。本项目提供：

- 📊 **完整的词汇库**：涵盖初一至高三所有必学单词
- 📋 **多种数据格式**：JSON 和 CSV 双格式支持
- 📚 **丰富的学习信息**：音标、词性、中文释义、例句
- 🎯 **可视化学习**：网页版学习工具（闪卡、测试模式）
- 🔄 **易于集成**：支持各种应用集成

## 📊 数据格式

### 数据结构

每个单词包含以下信息：

```json
{
  "id": 1,
  "word": "house",
  "phonetic": "[haʊs]",
  "pos": "n.",
  "meaning": "房子；住宅",
  "example": "I live in a small house near the school.",
  "translation": "我住在学校附近的一所小房子里。",
  "level": "Junior-1",
  "category": "daily-life"
}
```

### 所属等级说明

| 等级代码 | 说明 | 单词数量 |
|---------|------|--------|
| `Junior-1` | 初中一年级 | ~600 |
| `Junior-2` | 初中二年级 | ~700 |
| `Junior-3` | 初中三年级 | ~800 |
| `Senior-1` | 高中一年级 | ~800 |
| `Senior-2` | 高中二年级 | ~900 |
| `Senior-3` | 高中三年级 | ~1000 |

**总计：约 4,800+ 个核心单词**

## 📁 项目结构

```
english-vocab-hub/
├── README.md                 # 项目说明
├── LICENSE                   # 许可证
├── package.json             # 项目配置
├── data/
│   ├── vocab.json           # JSON 格式词汇库（推荐用于程序处理）
│   ├── vocab.csv            # CSV 格式词汇库（推荐用于 Excel）
│   ├── junior-1.json        # 初一词汇
│   ├── junior-2.json        # 初二词汇
│   ├── junior-3.json        # 初三词汇
│   ├── senior-1.json        # 高一词汇
│   ├── senior-2.json        # 高二词汇
│   └── senior-3.json        # 高三词汇
├── src/
│   ├── index.html           # 主页面（可视化学习工具）
│   ├── flashcard.html       # 闪卡模式
│   ├── quiz.html            # 测试模式
│   ├── search.html          # 搜索页面
│   └── js/
│       ├── app.js           # 主应用逻辑
│       ├── flashcard.js     # 闪卡功能
│       └── quiz.js          # 测试功能
├── scripts/
│   ├── generate-data.js     # 数据生成脚本
│   └── export-csv.js        # CSV 导出脚本
└── .gitignore
```

## 🚀 快速开始

### 1. 获取项目

```bash
git clone https://github.com/delajiqi/english-vocab-hub.git
cd english-vocab-hub
```

### 2. 查看数据

#### 方式一：JSON 格式（推荐用于程序处理）

```bash
cat data/vocab.json
```

#### 方式二：CSV 格式（推荐用于 Excel）

```bash
cat data/vocab.csv
```

### 3. 在线学习（Web 版）

打开 `src/index.html` 文件到浏览器，即可使用：
- 🎴 **闪卡模式**：逐个学习单词
- ✏️ **测试模式**：检验学习成果
- 🔍 **搜索功能**：快速查找单词

### 4. 集成到你的项目

**JavaScript/Node.js:**

```javascript
// 导入数据
const vocabData = require('./data/vocab.json');

// 按等级筛选
const junior1Words = vocabData.filter(item => item.level === 'Junior-1');

// 按分类筛选
const dailyLife = vocabData.filter(item => item.category === 'daily-life');

// 搜索单词
const searchWord = (word) => vocabData.find(item => item.word === word);
```

**Python:**

```python
import json
import csv

# 读取 JSON
with open('data/vocab.json', 'r', encoding='utf-8') as f:
    vocab_data = json.load(f)

# 读取 CSV
with open('data/vocab.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row)
```

## 📖 使用示例

### 获取某个等级的所有单词

```bash
# 查看初一单词
jq '.[] | select(.level=="Junior-1")' data/vocab.json | head -20
```

### 统计单词数量

```bash
# 统计各等级单词
jq 'group_by(.level) | map({level: .[0].level, count: length})' data/vocab.json
```

### 导出特定等级的数据

```bash
# 导出初一词汇为 CSV
jq '.[] | select(.level=="Junior-1")' data/vocab.json | jq -r '\([.word, .phonetic, .pos, .meaning, .example, .level] | @csv)' > junior-1.csv
```

## 🎯 功能特性

### ✅ 已实现

- [x] JSON 格式完整词汇库
- [x] CSV 格式完整词汇库
- [x] 按等级分类的词汇文件
- [x] 网页可视化界面
- [x] 闪卡学习模式
- [x] 测试评估功能
- [x] 搜索和筛选功能
- [x] 数据导出脚本

### 🔄 计划中的功能

- [ ] 移动端应用（React Native / Flutter）
- [ ] 发音音频文件
- [ ] 单词图片示例
- [ ] 更多学习模式（拼写、选择等）
- [ ] 学习进度跟踪
- [ ] 离线模式支持
- [ ] 导出为 Anki 卡组
- [ ] API 接口服务

## 📚 数据来源

词汇数据来自：

- 中国教育部《义务教育英语课程标准》
- 高中《普通高中英语课程标准》
- 各省中考和高考英语大纲
- 主流教学教材（人教版、外研版等）

## 🔧 技术栈

- **数据格式**：JSON, CSV
- **Web 界面**：HTML5, CSS3, Vanilla JavaScript
- **脚本**：Node.js
- **版本控制**：Git

## 📖 API 参考

### 数据格式定义

```typescript
interface Vocabulary {
  id: number;              // 唯一标识
  word: string;            // 英文单词
  phonetic: string;        // 音标（国际音标）
  pos: string;             // 词性（n., v., adj., adv., prep., conj., pron., int.）
  meaning: string;         // 中文释义
  example: string;         // 英文例句
  translation: string;     // 例句中文翻译
  level: string;           // 所属等级（Junior-1/2/3, Senior-1/2/3）
  category: string;        // 分类标签（daily-life, school, family 等）
}
```

## 💡 使用建议

### 适用场景

1. **学生学习**：使用网页版进行自主学习
2. **教师教学**：导入数据到教学平台
3. **应用开发**：集成数据到学习应用
4. **数据分析**：研究英语教学规律
5. **考试准备**：针对性备考

### 学习路径建议

- **阶段一**（初一）：学习基础日常用语（600词）
- **阶段二**（初二）：扩展校园和兴趣词汇（700词）
- **阶段三**（初三）：掌握中考词汇（800词）
- **阶段四**（高一）：学习学术和科技词汇（800词）
- **阶段五**（高二）：深化词汇理解和应用（900词）
- **阶段六**（高三）：完善高考词汇储备（1000词）

## 🤝 贡献指南

欢迎贡献！如果你发现错误或有改进建议：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 贡献方式

- 🐛 报告 bug
- 📝 添加新单词
- 🎨 改进界面
- 📖 完善文档
- 🔊 提供发音音频
- 🖼️ 提供单词配图

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📞 联系方式

- GitHub Issues：用于报告 bug 和功能建议
- Discussions：用于讨论和交流

## 🙏 致谢

感谢所有为教育做出贡献的教育工作者和学生！

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**

**Happy Learning! 🎓**
