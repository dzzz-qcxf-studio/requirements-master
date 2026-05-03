// skills/requirements-master/prompt.js

/**
 * 第 1 轮：初始分析 prompt
 * 让 AI 解析用户意图，提取硬件要素
 */
function getAnalysisPrompt(userMessage) {
  return `你是一位经验丰富的嵌入式系统工程师。用户描述了一个嵌入式项目需求，请你分析并提取关键硬件要素。

用户需求：${userMessage}

请按以下格式输出分析结果：

## 项目名称
（简短项目名）

## 主控芯片
（MCU 类型，如 STM32F103C8T6、ESP32、Arduino 等，如果用户未指定则推荐最合适的）

## 输入模块
（列出所有需要的传感器/输入设备，每个一行，格式：模块名 | 接口类型 | 工作电压）

## 输出模块
（列出所有需要的执行器/输出设备，每个一行，格式：模块名 | 接口类型 | 工作电压）

## 通信接口
（列出需要的通信协议：UART、I2C、SPI 等）

## 电源方案
（推荐的供电方式）

## 初步接线方案
（每个模块建议连接到 MCU 的哪个引脚，以及理由）
`;
}

/**
 * 格式化模块列表为可读字符串
 * @param {Array} modules - 模块数组，支持字符串或对象格式
 * @returns {string} 格式化后的模块列表
 */
function formatModules(modules) {
  if (!Array.isArray(modules) || modules.length === 0) return '无';
  return modules.map(m => {
    if (typeof m === 'string') return m;
    const parts = [m.module || m.name || '未知'];
    if (m.interface) parts.push(m.interface);
    if (m.voltage) parts.push(m.voltage);
    return parts.join(' | ');
  }).join('；');
}

/**
 * 第 2 轮：自我质疑 prompt
 * 让 AI 找出潜在问题和风险
 */
function getQuestionPrompt(userMessage, parsedAnalysis) {
  return `你是嵌入式项目评审专家。以下是一个项目的初步分析，请你找出潜在的硬件问题和风险。

用户需求：${userMessage}

初步分析：
- MCU: ${parsedAnalysis.mcu}
- 输入模块: ${formatModules(parsedAnalysis.inputs)}
- 输出模块: ${formatModules(parsedAnalysis.outputs)}

请从以下维度审查，输出发现的问题（没有问题则输出"无重大风险"）：

## 硬件兼容性
- 电压匹配（3.3V vs 5V）
- 电流驱动能力（GPIO 能否直接驱动负载）
- 引脚复用冲突

## 接口可行性
- 引脚数量是否足够
- 通信总线地址冲突
- 时序要求

## 环境因素
- 工作温度范围
- 功耗预算
- PCB 空间

## 成本风险
- 模块是否容易采购
- 是否有更经济的替代方案
`;
}

/**
 * 第 3 轮：输出最终需求文档 prompt
 */
function getOutputPrompt(userMessage, parsedAnalysis, userAnswers) {
  const answersStr = userAnswers.map(a => `- ${a.q}: ${a.a}`).join('\n');

  return `基于以下信息，生成一份结构化的嵌入式项目需求文档。

用户需求：${userMessage}

分析结果：
- MCU: ${parsedAnalysis.mcu}
- 输入: ${formatModules(parsedAnalysis.inputs)}
- 输出: ${formatModules(parsedAnalysis.outputs)}

用户确认：
${answersStr}

请严格按照以下 JSON 格式输出（只输出 JSON，不要其他内容）：

{
  "projectName": "项目名称",
  "mcu": "具体MCU型号",
  "inputs": [
    { "module": "模块名", "interface": "接口类型", "voltage": "工作电压", "pin": "建议引脚" }
  ],
  "outputs": [
    { "module": "模块名", "interface": "接口类型", "voltage": "工作电压", "pin": "建议引脚", "note": "特殊说明" }
  ],
  "constraints": {
    "power": "电源方案",
    "size": "尺寸要求",
    "cost": "成本要求"
  },
  "scenarios": [
    "使用场景1",
    "使用场景2"
  ],
  "risks": [
    "风险1",
    "风险2"
  ]
}
`;
}

module.exports = {
  getAnalysisPrompt,
  getQuestionPrompt,
  getOutputPrompt,
  formatModules,
};
