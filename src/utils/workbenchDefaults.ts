import { Card } from '@/types/workbench'

const READING_GUIDE = `## 纳瓦尔宝典 — 读前引导

### 背景简介
纳瓦尔·拉维坎特（Naval Ravikant）是硅谷知名天使投资人，投过 Twitter、Uber 等公司。这本书不是他本人写的，而是 Eric Jorgenson 从他的推特、播客和访谈中提炼整理的精华，核心围绕两个主题：财富（如何不靠运气致富）和幸福（如何获得内心的平静）。

它不是一本传统的"方法论"书，更像一本思维格言集——每段话都很短，但信息密度很高，适合随手翻开读几段，然后停下来想一想。

### 3-5 个读前引导问题

1. 纳瓦尔说"财富是你睡着以后还能赚钱的东西"——你目前的工作中有哪些是可以"睡着后还在产生价值"的？

2. 他反复强调"杠杆"（代码、媒体、资本）——作为培训人，你的"杠杆"可能是什么？课程体系？学员社群？还是你本人就是一个品牌？

3. 纳瓦尔认为幸福是一种"默认状态"，是去掉欲望和焦虑之后剩下的东西——你上一次感到真正的平静是什么时候？是什么在干扰你？

4. 他说"具体的知识"（specific knowledge）是你天生擅长且社会愿意付费的东西——你觉得你的 specific knowledge 是什么？

5. 全书的底层逻辑是"判断力 > 努力"——你最近一次"很努力但方向错了"的经历是什么？

### 可以关联的已有知识
- 培训工作：纳瓦尔讲"教是最好的学"（跟费曼学习法一致），你在做培训时其实一直在用这个原则
- 中国哲学简史（你同时在读）：纳瓦尔受佛教和印度哲学影响很深，讲"欲望是痛苦的根源"，跟老子的"为学日益，为道日损"异曲同工
- 职业发展：书中关于"把自己产品化"的思路，跟你工作台里"也许有一天有可能"板块的转型思考直接相关
- 复盘习惯：纳瓦尔强调"清晰的思考"，跟你已经在做的 KISS 复盘法本质上是一回事——把模糊的感受变成清晰的认知

建议：不用从头读到尾，每天翻几页，有感触的句子摘到工作台里就行。`

export function getDefaultCards(pageId: string): Card[] {
  const defaults: Record<string, Card[]> = {
    system: [
      { id: 'sys-analyze', title: '📄 上传文档分析', type: 'analyze', fields: {}, fixed: true, analyzeType: 'system' },
      { id: 'sys-overview', title: '项目档案', type: 'content', fields: { project: '', main: '' }, listMode: true, entries: [] },
      { id: 'sys-courses', title: '课程 & 师资', type: 'content', fields: { project: '', main: '' }, listMode: true, entries: [] },
      { id: 'sys-ops', title: '制度 & 交付', type: 'content', fields: { project: '', main: '' }, listMode: true, entries: [] },
      { id: 'sys-patterns', title: '🎯 体系提炼', type: 'content', fields: { patterns: '上传 2 个以上项目后，点击"提炼共性"按钮，AI 会对比所有项目，提取共同模式。', unique: '提炼后，独特亮点和差异化做法会显示在这里。', gaps: '提炼后，能力覆盖盲区和培训需求缺口会显示在这里。' } },
    ],
    creative: [
      { id: 'cre-ideas', title: '创意灵感', type: 'content', fields: { main: '培训创意和灵感碎片。在对话里告诉AI你的需求，AI帮你生成创意。' }, listMode: true, entries: [] },
      { id: 'cre-games', title: '破冰游戏', type: 'content', fields: { name: '', desc: '', suitable: '' }, listMode: true, entries: [] },
      { id: 'cre-design', title: '激励方案', type: 'content', fields: { name: '', desc: '', effect: '' }, listMode: true, entries: [] },
    ],
    speeches: [
      { id: 'speech-coach', title: 'AI 工作方式', type: 'info', fields: { main: '点击下方卡片「复制提示词给AI」，粘贴到上方 AI 对话框，把领导讲话内容附在后面，AI 自动帮你提炼总结。比如："XX领导在YY项目开班时说了三点：重视人才、业务转型、学以致用"，AI 会帮你整理成结构化的记录，结果可以粘贴回下方卡片。' }, fixed: true },
      { id: 'skill-speech', title: '领导致辞提炼', type: 'coach', fields: { prompt: '帮我提炼以下领导讲话的核心观点、战略信号和培训期望。讲话内容：', result: 'AI 提炼结果会显示在这里...' } },
      { id: 'speech-list', title: '领导致辞记录', type: 'content', fields: { main: '记录领导讲话摘要。使用上方卡片提炼后粘贴过来。' }, listMode: true, entries: [] },
    ],
    community: [
      { id: 'comm-coach', title: 'AI 工作方式', type: 'info', fields: { main: '在下方模板卡片中粘贴各类型培训的历史通知文案（按培训前/中/后分别填写），然后在下方 Skill 卡片中生成通知，AI 会自动匹配对应模板的风格。' }, fixed: true },
      { id: 'comm-company-exec', title: '🏢 公司级干部培训模板', type: 'content', fields: { before: '粘贴培训前的通知文案（开班通知、课前准备提醒等）...', during: '粘贴培训中的通知文案（每日提醒、课程调整等）...', after: '粘贴培训后的通知文案（结业通知、后续跟进等）...' }, listMode: true, entries: [] },
      { id: 'comm-dept-exec', title: '🏛️ 部门级干部培训模板', type: 'content', fields: { before: '粘贴培训前的通知文案...', during: '粘贴培训中的通知文案...', after: '粘贴培训后的通知文案...' }, listMode: true, entries: [] },
      { id: 'comm-empowerment', title: '⚡ 赋能培训模板', type: 'content', fields: { before: '粘贴培训前的通知文案...', during: '粘贴培训中的通知文案...', after: '粘贴培训后的通知文案...' }, listMode: true, entries: [] },
      { id: 'comm-staff', title: '👥 员工培训模板', type: 'content', fields: { before: '粘贴培训前的通知文案...', during: '粘贴培训中的通知文案...', after: '粘贴培训后的通知文案...' }, listMode: true, entries: [] },
      { id: 'skill-notify', title: '社群通知 & 话术', type: 'skill', fields: { trigger: '生成通知 / 写话术 / 写邮件 / 开班通知', need: '项目名称、学员画像、场景', output: '小熊风格的企微通知/邮件/话术', example: '帮服务业务综合特训营第二期写一个开班通知' }, skillName: 'community-notify' },
      { id: 'comm-generated', title: '生成记录', type: 'content', fields: { main: '还没有生成记录。使用上方 Skill 卡片生成通知。' } },
    ],
    projects: [
      { id: 'proj-coach', title: '添加新项目', type: 'info', fields: { main: '在对话里告诉AI：项目名称、培训对象、培训时长、项目类型（领导力/专业技术/新人/服务/其他）、学到了什么。AI帮你自动分类并填入看板。点下方按钮复制提示词。' }, fixed: true },
      { id: 'proj-list', title: '项目列表', type: 'table', fields: {}, tableType: 'projects' },
    ],
    skills: [
      { id: 'skill-info', title: 'Skill 说明', type: 'info', fields: { main: 'Skill 卡片已分布到各对应的模块页面中：\n• PPT 自动生成 → 办公技能精进\n• 社群通知 & 话术 → 社群运营话术\n• 领导致辞提炼 → 领导致辞记录\n\n点击工具栏的「⚙️ AI 配置」配置 API 密钥。' }, fixed: true },
    ],
    theory: [
      { id: 'th-chat', title: '💬 AI 问答', type: 'chat', fields: {}, fixed: true },
      { id: 'th-model', title: '培训模型', type: 'content', fields: { main: `【ADDIE 模型】
分析→设计→开发→实施→评估，培训设计的经典五步法。

【柯氏四级评估】
L1 反应（学员满意度）→ L2 学习（知识技能提升）→ L3 行为（工作行为改变）→ L4 结果（业务绩效提升）。大多数培训只做到 L1/L2。

【70-20-10 法则】
70% 在岗实践 + 20% 社交学习 + 10% 正式培训 = 最有效的学习方式。

在对话框里问 AI 了解更多模型 👆` } },
      { id: 'th-method', title: '方法论', type: 'content', fields: { main: `【费曼学习法】
用最简单的语言把概念讲给别人听，讲不清楚的地方就是你没真懂的地方。培训师的日常就是在用费曼学习法。

【STAR 面试法】
Situation → Task → Action → Result，行为面试和案例复盘的标准框架。

【ORID 焦点讨论法】
Objective（客观事实）→ Reflective（感受反应）→ Interpretive（意义诠释）→ Decisional（决定行动），适合培训后的复盘引导。

在对话框里问 AI 了解更多方法论 👆` } },
    ],
    office: [
      { id: 'off-chat', title: '💬 AI 问答', type: 'chat', fields: {}, fixed: true },
      { id: 'skill-ppt', title: 'PPT 自动生成', type: 'skill', fields: { trigger: '生成PPT / 帮我改PPT', need: '项目名称、课表、讲师、学员名单', output: '替换好的 .pptx 文件', example: '生成PPT：服务业务综合特训营第二期' }, skillName: 'ppt-auto-generate' },
      { id: 'off-ppt', title: 'PPT 技能', type: 'content', fields: { main: `【排版原则】
- 对齐：所有元素有明确的对齐线，不要随意摆放
- 对比：标题和正文有明显字号差异（建议 1.5-2 倍）
- 重复：同一套 PPT 用统一的配色和字体
- 亲密：相关内容靠近，不同内容拉开距离

【配色工具】
coolors.co — 在线配色方案生成
Adobe Color — 从图片提取配色`,
      } },
      { id: 'off-excel', title: 'Excel 技能', type: 'content', fields: { main: `【常用快捷键】
Ctrl+T — 创建表格（自带筛选和格式）
Alt+= — 自动求和
Ctrl+; — 插入当前日期
F4 — 重复上一步操作（超实用）

【常用函数】
VLOOKUP / XLOOKUP — 跨表匹配数据
COUNTIF / SUMIF — 条件计数/求和
TEXTJOIN — 合并文本（比 & 好用）`,
      } },
      { id: 'off-writing', title: '写作技能', type: 'content', fields: { main: `【培训通知结构】
1. 温暖问候 + 项目背景
2. 培训时间、地点、对象
3. 课程亮点（3-5 点）
4. 需准备事项
5. 期待语 + 联系方式

【方案汇报结构】
背景 → 目标 → 方案 → 资源需求 → 预期效果 → 风险预案
用数据说话，少用形容词。`,
      } },
    ],
    tools: [
      { id: 'tool-chat', title: '💬 AI 问答', type: 'chat', fields: {}, fixed: true },
      { id: 'tool-ai', title: 'AI 工具', type: 'content', fields: { main: `【常用 AI 工具】
- ChatGPT / Claude — 通用对话、文案生成
- 通义千问 / Kimi — 国内可用，中文能力强
- 即梦 / Midjourney — AI 图片生成
- Gamma — AI 一键生成 PPT
- 秘塔 AI 搜索 — 无广告的 AI 搜索引擎

【培训场景】
- 用 AI 批量生成学员名单、分组方案
- 用 AI 润色课程大纲和讲师手册
- 用 AI 生成课后测试题`,
      } },
      { id: 'tool-digital', title: '数字化工具', type: 'content', fields: { main: `【协作工具】
- 飞书 / 钉钉 / 企微 — 日常沟通和文件协作
- 腾讯文档 / 飞书文档 — 多人实时协作编辑

【效率工具】
- Everything — Windows 文件秒搜
- Snipaste — 截图 + 贴图工具
- 语雀 / Notion — 知识库搭建

【自动化】
- 飞书多维表格 — 低代码搭建培训管理系统
- 简道云 — 零代码表单和流程`,
      } },
    ],
    'life-plan': [
      { id: 'plan-chat', title: '💬 AI 学习教练', type: 'chat', fields: {}, fixed: true },
      { id: 'plan-year', title: '📅 年度总目标', type: 'content', fields: { overview: '【年度目标概览】\n\n🗣️ 英语 — 1 年达到出国交流水平\n手段：新概念打语法 + Anki 积累词汇 + AI 教练练口语（核心），外刊精读+哲学简史（弹性）\n节奏：每天早上 20min + 晚上 80min（核心），弹性 50min\n阶段：输入为主（Q1-Q2）→ 输出过渡（Q3）→ 实战冲刺（Q4）\n\n📖 阅读 — 1 年读完 2 本\n书目：段永平投资问答录（先）→ 纳瓦尔宝典（后）\n节奏：每天碎片时间 10 页，重在摘录和思考\n\n💼 职业 — 培训设计/TD/OD 方向积累\n手段：每周接触一个行业观点 + 每月试着用一次\n产出：至少完成 1 个可复用的课程体系\n\n【每日节奏 ≈ 3.5 小时】\n🪨 核心 — 早上跟读 20min + 晚上英语（新概念+AI教练+Anki）80min\n💧 弹性 — 外刊精读 20min + 哲学简史 30min\n📖 碎片 — 阅读 30min\n📝 复盘 10min + 🏃 运动 30min', english: '英语目标：一年达到出国交流水平\n\n【三阶段总路径】\n\n一阶段（1-3月）打通耳朵嘴巴\n目标：能听懂慢速英语 80%，能用简单句表达日常需求\n重点：新概念第 2 册打语法 + 影子跟读练发音 + AI 教练基础对话\n里程碑：新概念 72 课完成\n\n二阶段（4-7月）建立表达体系\n目标：能听懂常速英语 60%，能进行 5 分钟连贯对话\n重点：新概念进第 3 册 + AI 教练场景对话 + 英文日记\n里程碑：新概念第 2 册全部完成 + 哲学简史 403 课听完\n\n三阶段（8-12月）实战模拟\n目标：能听懂常速英语 80%，能完成 15 分钟工作汇报\n重点：AI 教练工作汇报模拟 + 无字幕追剧 + 语言交换\n里程碑：能用英语做 15 分钟工作汇报\n\n---\n\n【每日执行】\n\n🪨 核心任务（≈ 80 分钟，雷打不动）\n☀️ 早上 20min — 友邻每日一句跟读 3 遍 + 影子跟读\n🌙 晚上 30min — 新概念 1 课听写/背诵\n🌙 晚上 15min — AI 英语教练场景对话\n🌙 晚上 15min — Anki 闪卡 30 张\n\n💧 弹性任务（有余力再做）\n🌙 外刊精读 1 篇（20min）\n🌙 哲学简史 2 课（30min）\n\n【为什么这样排？】\n出国交流需要的核心能力是说和听，不是读懂。\nAI 教练对话每天 15 分钟，比外刊精读 45 分钟对目标推动力大得多。\n所以口语进了核心，外刊挪到了弹性。\n\n【低谷期保底方案】\n只做：早上跟读 1 遍 + 晚上新概念 1 课 + AI 教练对话 5 分钟。\n进度条往前走一格，不归零。每周日用英语写 100 字周记。', reading: '阅读目标：1 年读完 2 本\n├─ 段永平投资问答录 ~500 页（先读）\n└─ 纳瓦尔宝典 ~250 页（后读）\n\n【达成路径】\n每天碎片时间读 10 页，做两件事：\n1. 有感触的句子摘到工作台\n2. 读完一章写 50 字感想\n\n10 页是目标，翻 1 页是底线。', career: '职业目标：培训设计、TD、OD 方向知识储备\n\n【达成路径】\n每周五下午 20 分钟：找一篇行业文章\n每月底：挑 1 条能用到下次培训的\n每项目结束：把方案整理成标准化模板\n\n一年目标：产出 1 个可复用的课程体系', other: '其他想学的：先把上面三个跑顺，不贪多。' } },
      { id: 'plan-quarters', title: '🗓️ 季度规划', type: 'content', fields: { quarter: '', goal: '' }, listMode: true, entries: [
        { quarter: 'Q1（1-3月）', goal: '新概念第 2 册完成 72 课听写/背诵，哲学简史听完 180 课，友邻外刊精读 90 篇' },
        { quarter: 'Q2（4-7月）', goal: '新概念第 2 册全部完成 + 进入第 3 册前 30 课，哲学简史听完，段永平读完' },
        { quarter: 'Q3（8-10月）', goal: '新概念第 3 册全部完成，纳瓦尔宝典读完' },
        { quarter: 'Q4（11-12月）', goal: '能用英语做 15 分钟工作汇报，无字幕听懂英文演讲 80%' },
      ] },
      { id: 'plan-milestones', title: '🎯 里程碑进度', type: 'content', fields: { milestone: '', done: 'false' }, listMode: true, entries: [
        { milestone: '新概念第 2 册 96 课全部完成（预计第 4 个月）', done: 'false' },
        { milestone: '哲学简史 403 课全部听完（预计第 6.5 个月）', done: 'false' },
        { milestone: '2 本阅读目标全部完成（预计第 8 个月）', done: 'false' },
        { milestone: '能用英语进行 15 分钟工作汇报（预计第 12 个月）', done: 'false' },
      ] },
      { id: 'plan-coach', title: 'AI 教练协作方式', type: 'info', fields: { main: '在上面👆对话框里告诉AI：你的当前水平、学习目标、时间安排。AI 会帮你评估目标是否合理、制定分阶段计划、定期检查进度。你不是一个人在学。' }, fixed: true },
    ],
    'life-english': [
      { id: 'eng-chat', title: '💬 AI 英语教练', type: 'chat', fields: {}, fixed: true },
      { id: 'eng-notes', title: '学习笔记本', type: 'notebook', fields: {}, notebooks: [
        { name: '新概念英语', lessons: [{ title: '第1课', content: '' }] },
        { name: '友邻外刊', lessons: [{ title: '第1篇', content: '' }] },
        { name: '哲学简史', lessons: [{ title: '第1课', content: '' }] },
      ] },
      { id: 'eng-weekly', title: '每周复盘', type: 'content', fields: { done: '本周完成了什么？', learned: '学到了什么新表达？', challenge: '遇到的困难？', next: '下周重点调整？' } },
      { id: 'eng-corrections', title: '📝 纠错 & 词汇收纳', type: 'skill', skillName: 'english-error-summary', listMode: true, fields: { category: '', note: '' }, entries: [] },
    ],
    'life-reading': [
      { id: 'read-coach1', title: '1. 读前引导', type: 'coach', fields: { prompt: '我准备开始读《纳瓦尔宝典》。请帮我简要介绍背景，给我3-5个读前引导问题，提示我可以和哪些已有的知识关联。', result: READING_GUIDE } },
      { id: 'read-naval', title: '纳瓦尔宝典', type: 'tab', fields: { chapter: '正在读哪一章？', quote: '触动你的句子', thought: '随便写点什么' }, tabGroup: 'reading', tabLabel: '纳瓦尔宝典', listMode: true, entries: [
        { chapter: '读前引导', quote: '他说"具体的知识"（specific knowledge）是你天生擅长且社会愿意付费的东西', thought: '纳瓦尔说的 specific knowledge 有三个特征：你做起来毫不费力、别人觉得很难、而且有人愿意为此付费。\n\n结合我对自己的了解，我身上有几件事可能符合：\n\n- 我特别擅长把复杂的事情结构化——从"想要一个工作台"到现在，我对"怎么把散乱的东西整理成系统"有一种本能\n- 我对沟通的节奏和分寸很敏感——我清楚"什么话对什么人该怎么说"\n- 我能在培训交付和学员管理之间快速切换，还能同时思考"我未来想做什么"——这种多线程的自我觉察能力，其实挺稀缺的\n\n真正值得花时间想的是：有没有一件事，我做的时候完全感觉不到费力，但别人总是夸我"好厉害"？那个东西，可能就是我的 specific knowledge。' },
        { chapter: '财富与杠杆', quote: '财富是你睡着以后还能赚钱的东西。如果不想一直靠出卖时间赚钱，你必须拥有杠杆。', thought: '纳瓦尔把杠杆分成三种：代码、媒体、资本。\n\n作为培训人，我的杠杆是什么？\n\n- 课程体系：做一次，可以给很多人用——这就是媒体杠杆\n- 学员社群：持续运营，每个人进来都会付费——这也是媒体杠杆\n- 我本人：个人品牌，别人认可我的专业能力——这个还是靠时间，不算睡后收入\n- 工作台本身：把方法论系统化了，未来可能变成可以卖的产品\n\n最容易上手的还是做课程体系——把已经做过的项目整理出来，变成标准化产品，就能睡着后赚钱。' },
        { chapter: '财富与杠杆', quote: '教是最好的学。如果真想搞懂一件事，就去教它。', thought: '完全同意。我这些年做培训，最大收获其实是：教别人一遍，我自己理解得更透彻了。\n\n这就是费曼学习法，纳瓦尔也这么说。其实现在这个工作台就是一种"教"的过程——我把我学到的东西整理出来，教给未来的自己。' },
        { chapter: '读比听快，做比看快', quote: '读比听快，做比看快。', thought: '这句话跟工作台、学英语、做培训都有关系。\n\n1. 学英语 — 被动听 30 分钟广播，信息密度远不如主动读一篇外刊然后写笔记。所以选择了"新概念听写/背诵"而不是"磨耳朵"式的被动输入。\n\n2. 工作台 — 从"想要一个工作台"到用 code 模式自己搭出来，没有花一个月看教程，直接动手做。看一百篇 React 教程不如自己改一个 bug。\n\n3. 做培训 — 学员听你讲一天，不如让他自己上手做一次练习。好的培训设计就是把"看"转化为"做"：案例研讨、角色扮演、实操演练。\n\n这句话可以拿来做培训设计的底层原则。' },
      ]},
      { id: 'read-philosophy', title: '中国哲学简史', type: 'tab', fields: { chapter: '正在读哪一章？', quote: '触动你的原文', thought: '随便写点什么' }, tabGroup: 'reading', tabLabel: '中国哲学简史', listMode: true, entries: [] },
      { id: 'read-general', title: '通用读书', type: 'tab', fields: { reading: '正在读什么书？', done: '读过的书', want: '想读清单' }, tabGroup: 'reading', tabLabel: '通用读书' },
      { id: 'read-coach2', title: '2. 读后提炼 & 多点串联', type: 'coach', fields: { prompt: '我读完了《纳瓦尔宝典》中关于财富的章节。请帮我提炼核心观点，并关联到其他书中类似的思想，结合我的工作给应用建议。' } },
    ],
    'life-review': [
      { id: 'review-chat', title: '💬 AI 复盘助手', type: 'chat', fields: {}, fixed: true },
      { id: 'review-kiss', title: 'KISS 复盘法', type: 'content', fields: { keep: 'Keep 保持：哪些做得好，继续保持？', improve: 'Improve 改进：哪些可以做得更好？', start: 'Start 开始：哪些需要开始做？', stop: 'Stop 停止：哪些应该停止做？' } },
      { id: 'review-weekly', title: '本周复盘', type: 'content', fields: { done: '本周完成了什么？', learned: '学到了什么？', challenge: '遇到了什么困难？', next: '下周重点是什么？' } },
      { id: 'review-monthly', title: '月度复盘', type: 'content', fields: { achievement: '本月最大的成就是什么？', growth: '本月最大的成长是什么？', gap: '发现了什么能力差距？', goal: '下个月的目标是什么？' } },
    ],
    inspire: [
      { id: 'inspire-coach', title: '让 AI 帮你探索自己', type: 'info', fields: { main: '告诉AI你的背景、兴趣和困惑，AI帮你分析：你真正擅长什么？你对什么有热情？有哪些方向值得探索？不是帮你找下一份工作，而是帮你找到自己。' }, fixed: true },
      { id: 'inspire-self', title: '我擅长什么', type: 'content', fields: { core: '什么事情你做起来轻松但别人觉得难？', unique: '什么东西是只有你有的——经验、视角、能力？', enjoy: '什么事情让你忘记时间？', avoid: '什么事情你完全不想做？' } },
      { id: 'inspire-passion', title: '我对什么有热情', type: 'content', fields: { interest: '不给你钱你也愿意做的事是什么？', curious: '最近有什么让你好奇、想深入了解的东西？', admire: '你羡慕什么样的人？他们身上有什么特质？', energy: '什么事情让你做完反而更有精力？' } },
      { id: 'inspire-explore', title: '我想尝试的方向', type: 'content', fields: { ideas: '想到的转型/尝试方向', info: '已经了解到的信息、需要什么条件', firstStep: '第一步可以做什么？', timeline: '打算什么时候开始探索？' } },
      { id: 'inspire-box', title: '灵感碎片', type: 'content', fields: { ideas: '突然冒出来的想法', see: '看到的机会、趋势、有意思的事', people: '想认识的人、想成为的样子', saying: '让你心动的句子或故事' } },
      { id: 'inspire-quotes', title: '🌟 金句 & 感悟', type: 'content', listMode: true, fields: {}, entries: [
        { quote: '学一天就有一天的沉淀，休息一天就养一天的气血，向上攀登一米就有一米的风景，所以两手空空，我们怎么做都是得到', en: 'Study a day and you gain a day\'s grounding; rest a day and you recharge a day\'s energy; climb one meter and you earn one meter of view. So even empty-handed, everything we do is a gain.', source: '视频号 · 2026-07-13', note: '道理：努力不会白费，休息也是在充电。' },
      ] },
    ],
  }
  return defaults[pageId] || [{ id: pageId + '-1', title: '新卡片', type: 'content', fields: { main: '在对话里告诉AI你想记录什么，AI帮你整理。' } }]
}
