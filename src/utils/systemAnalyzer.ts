import { normalizeSpaces } from './text';
import { freeChat } from './freeAI';

interface AnalysisResult {
  overview: string;
  courses: string;
  ops: string;
}

interface CrossAnalysisResult {
  patterns: string;
  unique: string;
  gaps: string;
}

// 每段 ~400 字 + 简短指令，URL 编码后 ~3800 字节，安全
const MAX_CONTENT = 400;

const DIMENSIONS = [
  {
    key: 'overview' as const,
    label: '文档概览',
    question: '你是培训管理专家。用一句话总结这份文档，然后简述它是什么（目的、对象、规模、时长）。信息不足就直说。\n',
  },
  {
    key: 'courses' as const,
    label: '关键洞察',
    question: '从培训管理者的视角，列出这份文档中3-5个最值得关注的点。每个点说明：1）是什么 2）为什么值得关注/可复用。用编号列表，信息不足就直说。\n',
  },
  {
    key: 'ops' as const,
    label: '可提取复用',
    question: '从这份文档中，能提取哪些可复用的东西？以"你想要什么 → 文档里有什么"的格式列出，比如方法论、模板、流程、制度。信息不足就直说。\n',
  },
];

export async function analyzeSystemDocument(content: string): Promise<AnalysisResult> {
  const truncated = content.length > MAX_CONTENT
    ? content.slice(0, MAX_CONTENT)
    : content;

  const results: AnalysisResult = { overview: '', courses: '', ops: '' };

  for (let i = 0; i < DIMENSIONS.length; i++) {
    const dim = DIMENSIONS[i];
    try {
      const prompt = dim.question + truncated;
      const text = await freeChat(prompt);
      results[dim.key] = normalizeSpaces(text) || dim.label + ': AI 返回为空，请重试';
    } catch (e: any) {
      results[dim.key] = dim.label + ': ' + (e?.message || '请求失败');
    }
  }

  return results;
}

export async function crossAnalyzeProjects(
  projects: Array<{ project: string; overview: string; courses: string; ops: string }>
): Promise<CrossAnalysisResult> {
  if (projects.length < 2) {
    throw new Error('至少需要 2 个项目才能提炼共性');
  }

  // 构建项目摘要，每个项目 ~200 字
  const summaries = projects.map((p) => {
    return `【${p.project}】\n概览：${p.overview.slice(0, 100)}\n关键点：${p.courses.slice(0, 100)}`;
  }).join('\n\n');

  const crossDimensions = [
    {
      key: 'patterns' as const,
      question: '你是培训体系设计专家。以下是多个培训项目的摘要，请找出它们之间的共同模式：\n\n1. 这些项目在结构上有什么共同点？（如：都包含XX环节、都用了XX方法）\n2. 反复出现的核心设计理念是什么？\n3. 如果能提炼出一个"母版框架"，它长什么样？\n\n项目摘要：\n',
    },
    {
      key: 'unique' as const,
      question: '基于这些培训项目，请找出各自的独特亮点：\n\n1. 哪些项目有特别创新的做法，值得单独拿出来说？\n2. 不同项目针对不同人群/场景，有哪些差异化设计？\n3. 哪些做法可以跨项目复用，形成"工具箱"？\n\n项目摘要：\n',
    },
    {
      key: 'gaps' as const,
      question: '基于这些项目，请分析能力覆盖的盲区：\n\n1. 哪些培训需求/能力维度没有被覆盖到？\n2. 目前的培训体系偏重什么，偏轻什么？\n3. 如果要补齐短板，下一步应该优先做什么？\n\n项目摘要：\n',
    },
  ];

  const results: CrossAnalysisResult = { patterns: '', unique: '', gaps: '' };

  for (let i = 0; i < crossDimensions.length; i++) {
    const dim = crossDimensions[i];
    try {
      const prompt = dim.question + summaries;
      const text = await freeChat(prompt);
      results[dim.key] = normalizeSpaces(text) || dim.key + ': AI 返回为空，请重试';
    } catch (e: any) {
      results[dim.key] = dim.key + ': ' + (e?.message || '请求失败');
    }
  }

  return results;
}
