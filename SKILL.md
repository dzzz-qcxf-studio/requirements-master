---
name: requirements-master
description: 嵌入式项目需求工程师 — 通过 AI 推理 + 用户确认，将模糊的项目想法转化为结构化需求文档（requirements.json）
---

# Requirements Master

当用户描述嵌入式项目需求时，通过 3 轮内部推理 + 用户确认，生成结构化的需求文档。

## 触发条件

用户描述嵌入式项目需求时触发，例如：
- "我要用STM32做一个温度报警器"
- "帮我分析一下声控开灯的方案"
- "做一个智能浇花系统"

## 执行协议（Claude 必须严格按此执行）

### Step 1: 第 1 轮 — 需求分析（内部推理，不向用户展示）

1. 调用 `getAnalysisPrompt(userMessage)` 生成分析 prompt
2. **你（Claude）自己按照该 prompt 的要求进行推理**，输出以下格式的分析文本：

```
## 项目名称
温度报警器

## 主控芯片
STM32F103C8T6

## 输入模块
DS18B20 | OneWire | 3.3V

## 输出模块
有源蜂鸣器 | GPIO | 3.3V

## 通信接口
无

## 电源方案
USB 5V 供电，通过 AMS1117-3.3 降压到 3.3V

## 初步接线方案
DS18B20 数据线接 PA0，需要 4.7K 上拉电阻
蜂鸣器接 PA1
```

3. 调用 `parseAnalysis(analysisText)` 解析你的输出为结构化对象

### Step 2: 第 2 轮 — 自我质疑（内部推理，不向用户展示）

1. 调用 `getQuestionPrompt(userMessage, analysis)` 生成质疑 prompt
2. **你自己按照该 prompt 的要求进行推理**，审查：
   - 电压匹配（3.3V vs 5V）
   - 电流驱动能力（GPIO 能否直接驱动负载）
   - 引脚复用冲突
   - 通信总线地址冲突
   - 环境因素、成本
3. 调用 `parseQuestions(questionText)` 提取需要用户确认的问题列表

### Step 3: 向用户提问（2-3 个关键问题）

基于第 2 轮推理结果，**只问最有歧义的、影响硬件选型的问题**。格式：

"我分析了你的需求，有几个关键问题需要确认：
1. DS18B20 和 DHT11 你更倾向哪个？DS18B20 精度更高但只测温度
2. 蜂鸣器用有源还是无源？有源直接响，无源需要 PWM 驱动
3. 供电用 USB 5V 还是电池？会影响电源方案"

**等待用户回答后继续。**

### Step 4: 第 3 轮 — 生成需求文档

1. 将用户的回答组装为 `[{ q: '问题', a: '回答' }]` 格式
2. 调用 `getOutputPrompt(userMessage, analysis, userAnswers)` 生成最终 prompt
3. **你自己按照该 prompt 的要求进行推理**，输出严格的 JSON
4. 调用 `parseRequirements(outputText)` 解析 JSON
5. 如果解析失败（返回 null），检查输出格式并重试
6. 调用 `saveRequirements(requirements, outputDir)` 保存文件：
   - `requirements.json` — 结构化数据（供 diagram-master 等下游使用）
   - `requirements.md` — 人类可读版本

### Step 5: 确认并向用户展示

输出生成的需求摘要，告知用户文件位置。

## 输出格式（requirements.json）

```json
{
  "projectName": "温度报警器",
  "mcu": "STM32F103C8T6",
  "inputs": [
    { "module": "DS18B20", "interface": "OneWire", "voltage": "3.3V", "pin": "PA0" }
  ],
  "outputs": [
    { "module": "有源蜂鸣器", "interface": "GPIO", "voltage": "3.3V", "pin": "PA1" }
  ],
  "interfaces": [],
  "constraints": { "power": "USB 5V", "size": "无要求", "cost": "低成本" },
  "scenarios": ["温度超过阈值时蜂鸣器报警"],
  "risks": ["DS18B20 需要上拉电阻"]
}
```

## API（供外部代码调用）

### 编程调用

```javascript
const {
  getAnalysisPrompt, getQuestionPrompt, getOutputPrompt, formatModules,
  parseAnalysis, parseQuestions, parseRequirements,
  runRequirementsEngineer, generateRequirements, saveRequirements,
} = require('C:/Users/ROG/.claude/skills/requirements-master');

// 方式 1：分步调用（Claude Code 内部使用）
const analysisPrompt = getAnalysisPrompt('用STM32做温度报警器');
// → Claude 推理，得到 analysisText
const analysis = parseAnalysis(analysisText);

const questionPrompt = getQuestionPrompt('用STM32做温度报警器', analysis);
// → Claude 推理，得到 questionText
const questions = parseQuestions(questionText);
// → 向用户提问，得到 userAnswers

const outputPrompt = getOutputPrompt('用STM32做温度报警器', analysis, userAnswers);
// → Claude 推理，得到 outputText
const requirements = parseRequirements(outputText);
saveRequirements(requirements, outputDir);

// 方式 2：使用编排函数（需要提供 askFn）
const { analysis, questions } = await runRequirementsEngineer(
  '用STM32做温度报警器',
  async (prompt) => { /* 调用 AI 并返回文本 */ }
);
// 用户回答问题后...
const { requirements, paths } = await generateRequirements(
  '用STM32做温度报警器', analysis, userAnswers, askFn, outputDir
);
```

## 依赖

- `prompt.js` — prompt 模板（3 个 prompt 生成函数 + formatModules）
- `parser.js` — 输出解析器（3 个解析函数，支持多种格式变体）

## 工作流链

完成后交给 diagram-master 生成图表。
