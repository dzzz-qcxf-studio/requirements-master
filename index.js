/**
 * Requirements Master - 独立入口
 *
 * 提供完整的 3 轮需求澄清流程：
 * 1. 分析用户需求 → 提取硬件要素
 * 2. 自我质疑 → 找出潜在问题
 * 3. 生成结构化需求文档 → requirements.json
 *
 * 用法：
 *   const re = require('C:/Users/ROG/.claude/skills/requirements-master');
 *   const result = re.runRequirementsEngineer('用STM32做温度报警器', askFn);
 */

const fs = require('fs');
const path = require('path');

const {
  getAnalysisPrompt,
  getQuestionPrompt,
  getOutputPrompt,
  formatModules,
} = require('./prompt.js');

const {
  parseAnalysis,
  parseQuestions,
  parseRequirements,
} = require('./parser.js');

/**
 * 保存需求文档到项目目录
 * @param {Object} requirements - 结构化需求
 * @param {string} outputDir - 输出目录
 */
function saveRequirements(requirements, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 保存 JSON
  const jsonPath = path.join(outputDir, 'requirements.json');
  fs.writeFileSync(jsonPath, JSON.stringify(requirements, null, 2), 'utf8');

  // 保存 Markdown
  const md = generateMarkdown(requirements);
  const mdPath = path.join(outputDir, 'requirements.md');
  fs.writeFileSync(mdPath, md, 'utf8');

  return { jsonPath, mdPath };
}

/**
 * 生成人类可读的 Markdown 需求文档
 */
function generateMarkdown(req) {
  let md = `# ${req.projectName} 需求文档\n\n`;
  md += `**MCU:** ${req.mcu}\n\n`;

  if (req.inputs && req.inputs.length > 0) {
    md += `## 输入模块\n\n`;
    md += `| 模块 | 接口 | 电压 | 引脚 |\n`;
    md += `|------|------|------|------|\n`;
    req.inputs.forEach(i => {
      md += `| ${i.module} | ${i.interface} | ${i.voltage} | ${i.pin || '-'} |\n`;
    });
    md += '\n';
  }

  if (req.outputs && req.outputs.length > 0) {
    md += `## 输出模块\n\n`;
    md += `| 模块 | 接口 | 电压 | 引脚 | 说明 |\n`;
    md += `|------|------|------|------|------|\n`;
    req.outputs.forEach(o => {
      md += `| ${o.module} | ${o.interface} | ${o.voltage} | ${o.pin || '-'} | ${o.note || '-'} |\n`;
    });
    md += '\n';
  }

  if (req.constraints) {
    md += `## 约束条件\n\n`;
    if (req.constraints.power) md += `- **电源:** ${req.constraints.power}\n`;
    if (req.constraints.size) md += `- **尺寸:** ${req.constraints.size}\n`;
    if (req.constraints.cost) md += `- **成本:** ${req.constraints.cost}\n`;
    md += '\n';
  }

  if (req.scenarios && req.scenarios.length > 0) {
    md += `## 使用场景\n\n`;
    req.scenarios.forEach(s => md += `- ${s}\n`);
    md += '\n';
  }

  if (req.risks && req.risks.length > 0) {
    md += `## 风险\n\n`;
    req.risks.forEach(r => md += `- ${r}\n`);
    md += '\n';
  }

  return md;
}

/**
 * 驱动完整的 3 轮需求澄清流程
 *
 * 调用方需提供 askFn(prompt) → Promise<string>，用于向 AI 发送 prompt 并获取回复。
 * 在 Claude Code 中，askFn 可以是内部推理函数。
 *
 * @param {string} userMessage - 用户需求描述
 * @param {Function} askFn - async (prompt: string) => string，发送 prompt 给 AI 并返回文本
 * @returns {Object} { questions, requirements, paths }
 */
async function runRequirementsEngineer(userMessage, askFn) {
  // Round 1: 分析需求
  const analysisPrompt = getAnalysisPrompt(userMessage);
  const analysisText = await askFn(analysisPrompt);
  const analysis = parseAnalysis(analysisText);

  // Round 2: 自我质疑
  const questionPrompt = getQuestionPrompt(userMessage, analysis);
  const questionText = await askFn(questionPrompt);
  const questions = parseQuestions(questionText);

  return { analysis, questions };
}

/**
 * 生成最终需求文档（在用户回答问题后调用）
 *
 * @param {string} userMessage - 用户需求
 * @param {Object} analysis - parseAnalysis 的结果
 * @param {Array} userAnswers - [{ q: '问题', a: '回答' }]
 * @param {Function} askFn - async (prompt: string) => string
 * @param {string} outputDir - 输出目录
 * @returns {Object} { requirements, paths }
 */
async function generateRequirements(userMessage, analysis, userAnswers, askFn, outputDir) {
  const outputPrompt = getOutputPrompt(userMessage, analysis, userAnswers);
  const outputText = await askFn(outputPrompt);
  const requirements = parseRequirements(outputText);

  if (!requirements) {
    throw new Error('无法解析需求文档 JSON，请检查 AI 输出格式');
  }

  const paths = saveRequirements(requirements, outputDir);
  return { requirements, paths };
}

module.exports = {
  // Prompt 生成
  getAnalysisPrompt,
  getQuestionPrompt,
  getOutputPrompt,
  formatModules,
  // 输出解析
  parseAnalysis,
  parseQuestions,
  parseRequirements,
  // 编排
  runRequirementsEngineer,
  generateRequirements,
  // 工具
  saveRequirements,
  generateMarkdown,
};
