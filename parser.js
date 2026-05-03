// skills/requirements-master/parser.js

/**
 * 解析第 1 轮分析输出
 * @param {string} text - AI 输出的分析文本
 * @returns {Object} 解析结果
 */
function parseAnalysis(text) {
  const result = {
    mcu: 'MCU',
    inputs: [],
    outputs: [],
    interfaces: [],
    power: '',
    wiring: '',
  };

  // 提取 MCU
  const mcuMatch = text.match(/##\s*主控芯片\s*\n(.+)/);
  if (mcuMatch) {
    result.mcu = mcuMatch[1].trim().split(/[（(]/)[0].trim();
  }

  // 提取输入模块
  const inputSection = extractSection(text, '输入模块');
  if (inputSection) {
    result.inputs = parseModuleLines(inputSection);
  }

  // 提取输出模块
  const outputSection = extractSection(text, '输出模块');
  if (outputSection) {
    result.outputs = parseModuleLines(outputSection);
  }

  // 提取通信接口
  const ifaceSection = extractSection(text, '通信接口');
  if (ifaceSection && !ifaceSection.includes('无')) {
    result.interfaces = ifaceSection.split('\n').map(s => s.trim()).filter(Boolean);
  }

  // 提取电源方案
  const powerSection = extractSection(text, '电源方案');
  if (powerSection) {
    result.power = powerSection.trim();
  }

  // 提取接线方案
  const wiringSection = extractSection(text, '接线方案');
  if (wiringSection) {
    result.wiring = wiringSection.trim();
  }

  return result;
}

/**
 * 解析第 2 轮质疑输出，提取需要用户确认的问题
 * @param {string} text - AI 输出的问题列表
 * @returns {Array} 问题列表
 */
function parseQuestions(text) {
  const questions = [];

  // 匹配以 - 或 * 开头的问题行
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[-*]\s+.+/) && !trimmed.includes('无重大')) {
      questions.push(trimmed.replace(/^[-*]\s+/, ''));
    }
  }

  // 如果没找到具体问题，返回默认确认问题
  if (questions.length === 0) {
    questions.push('以上分析是否准确？是否需要调整模块选型？');
  }

  return questions;
}

/**
 * 解析第 3 轮 JSON 输出
 * @param {string} text - AI 输出的 JSON 文本
 * @returns {Object|null} 解析结果，失败返回 null
 */
function parseRequirements(text) {
  // 尝试提取 JSON 块
  let jsonStr = text;

  // 如果包含代码块标记，提取其中内容
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  // 尝试找到 JSON 对象
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const data = JSON.parse(jsonStr);
    // 验证必要字段
    if (data.projectName && data.mcu) {
      return data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 辅助函数

function extractSection(text, sectionName) {
  const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`);
  const match = text.match(regex);
  return match ? match[1] : null;
}

function parseModuleLines(text) {
  const modules = [];
  const lines = text.split('\n');
  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 去掉列表标记: - DS18B20 或 * DS18B20 或 1. DS18B20
    trimmed = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
    if (!trimmed) continue;

    // 格式: 模块名 | 接口类型 | 工作电压
    const parts = trimmed.split('|').map(s => s.trim());
    if (parts.length >= 2 && parts[1]) {
      modules.push({
        module: parts[0],
        interface: parts[1] || 'GPIO',
        voltage: parts[2] || '3.3V',
      });
    } else if (parts[0]) {
      // 单模块名也保留，给默认值
      modules.push({
        module: parts[0],
        interface: 'GPIO',
        voltage: '3.3V',
      });
    }
  }
  return modules;
}

module.exports = {
  parseAnalysis,
  parseQuestions,
  parseRequirements,
};
