# 嵌入式工作流-①需求分析大师

### 将模糊想法转化为结构化硬件需求

---

> 用自然语言描述项目想法，AI 通过 3 轮推理 + 用户确认，输出 requirements.json

[它做什么](#它做什么) · [核心能力](#核心能力) · [输出文件](#输出文件) · [使用方式](#使用方式) · [技术架构](#技术架构)

---

## 它做什么

```
"我要用 STM32 做一个声控灯"
        ↓
┌─────────────────────────────┐
│  第 1 轮：需求分析           │  → 提取 MCU、模块、接口、电源
│  第 2 轮：自我质疑           │  → 检查电压/电流/引脚冲突
│  向用户提问（2-3 个关键问题）│  → 确认硬件选型
│  第 3 轮：生成文档           │  → 输出 requirements.json
└─────────────────────────────┘
        ↓
  requirements.json + requirements.md
```

## 核心能力

| 能力 | 说明 |
|------|------|
| **硬件感知** | 理解 STM32/ESP32/Arduino、电压等级、SPI/I2C/UART 接口、引脚分配 |
| **自动审查** | 检查电压匹配（3.3V vs 5V）、电流驱动能力、引脚复用冲突、总线地址冲突 |
| **精准提问** | 只问影响硬件选型的关键问题，不问废话 |
| **双格式输出** | 机器可读 JSON（供下游工具使用）+ 人类可读 Markdown |

## 输出文件

| 文件 | 用途 |
|------|------|
| `requirements.json` | 结构化数据，供 diagram-master 和 stm32-master 使用 |
| `requirements.md` | 人类可读版本，方便审阅和分享 |

## 输出示例

```json
{
  "projectName": "声控灯",
  "mcu": "STM32F103C8T6",
  "inputs": [
    { "module": "LD3320 语音识别模块", "interface": "SPI", "voltage": "3.3V", "pin": "PA5/PA6/PA7 (SPI1), PA4 (CS), PB0 (IRQ)" },
    { "module": "光敏电阻模块", "interface": "ADC", "voltage": "3.3V", "pin": "PA0 (ADC1_CH0)" }
  ],
  "outputs": [
    { "module": "LED", "interface": "GPIO", "voltage": "3.3V", "pin": "PA1", "note": "串联 220Ω 限流电阻" }
  ],
  "constraints": { "power": "USB 5V 供电，AMS1117-3.3 降压到 3.3V", "size": "无特殊要求", "cost": "中等" },
  "scenarios": ["夜间检测到语音指令\"开灯\"时点亮 LED", "白天光线充足时忽略语音指令"],
  "risks": ["LD3320 需要 SPI 通信，接线较多", "语音识别准确率受环境噪音影响"]
}
```

## 使用方式

**由 embedded-pipeline 自动调用，无需直接触发。** 流程：

1. 用户描述项目需求（如"做一个温度报警器"）
2. embedded-pipeline 选择工作目录 → 判断为新建模式 → 调用本 skill
3. AI 执行 3 轮推理，向用户提问 2-3 个关键选型问题
4. 用户回答后自动生成需求文档
5. 自动交给 diagram-master 生成图表

**禁止事项：** 完成需求分析后直接写代码、跳过图表生成阶段。

## 技术架构

```
index.js          ← 主入口，编排 3 轮流程
├── prompt.js     ← 3 个 prompt 生成函数
└── parser.js     ← 3 个输出解析函数
```

- 纯 Node.js，零外部依赖
- 支持编程调用（`runRequirementsEngineer()` / `generateRequirements()`）

## 工作流位置

```
embedded-pipeline（入口 + 目录选择 + 模式判断）
  │
  ├─ 新建模式 → ① requirements-master → ② diagram-master → ③ stm32-master
  │             (当前位置)
  │
  └─ 迭代模式 → iteration-master → (diagram-master) → stm32-master
```

本 skill 只在**新建模式**下被调用。迭代模式由 iteration-master 处理。
