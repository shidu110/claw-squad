/**
 * Role Config - ClawSquad v2.2
 * 
 * 角色 × CLI × API 映射配置
 * CEO 根据任务需求动态选择角色组合
 * 支持 20+ 角色，涵盖工程、研究、质量、辩论等场景
 */

export type Role =
  // === Engineering ===
  | 'architect'      // 系统架构设计
  | 'coder'          // 主力开发
  | 'coder-alt'      // 辅助开发 (不同模型/平台)
  | 'debugger'       // 调试专家
  | 'devops'         // 部署运维
  | 'security'       // 安全审计
  | 'performance'    // 性能优化
  // === Research & Analysis ===
  | 'researcher'     // 调研研究员
  | 'analyst'        // 数据分析师
  | 'planner'        // 规划师
  | 'advisor'        // 技术顾问
  // === Quality & Process ===
  | 'reviewer'       // 代码审查
  | 'tester'         // 测试工程师
  | 'qa'             // 质量保障
  | 'tech-writer'    // 技术文档
  | 'pm'             // 产品经理
  // === Meta & Debate ===
  | 'critic'         // 质疑者 (挑战假设)
  | 'devils-advocate'// 魔鬼代言人 (反驳共识)
  | 'optimist'       // 乐观派 (关注收益)
  | 'pessimist'      // 悲观派 (关注风险)
  | 'synthesizer'    // 综合者 (整合观点)
  | 'facilitator'    // 会议主持
  | 'guardian'        // 守护者 (风险/边界)
  // === Utility ===
  | 'utility'        // 通用工具
  | 'explorer'       // 代码探索
  | 'refactorer';    // 重构专家

export type CLITYPE = 'claude' | 'codex' | 'opencode' | 'gemini';
export type APIProvider = 'anthropic' | 'openai' | 'google' | 'flex';

export interface RoleDefinition {
  role: Role;
  category: 'engineering' | 'research' | 'quality' | 'meta' | 'utility';
  description: string;
  defaultCLI: CLITYPE;
  defaultModel: string;
  apiProvider: APIProvider;
  capabilities: string[];
  color: string;
  /** 角色在团队中的权重 (0-1) */
  weight: number;
}

export interface CLIConfig {
  type: CLITYPE;
  command: string;
  args: string[];
  apiKeyEnv: string;
  supportedModels: string[];
}

export interface AgentTemplate {
  id: string;
  name: string;
  role: Role;
  cli: CLITYPE;
  model: string;
  apiProvider: APIProvider;
  color: string;
}

/**
 * 角色分类
 */
export const ROLE_CATEGORIES = {
  engineering: '工程角色',
  research: '研究与分析',
  quality: '质量与流程',
  meta: '元角色 & 辩论',
  utility: '工具角色'
} as const;

/**
 * 完整角色定义 (20+ 角色)
 */
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  // ══════════════════════════════════════
  // Engineering
  // ══════════════════════════════════════
  architect: {
    role: 'architect',
    category: 'engineering',
    description: '系统架构师，负责高层设计、技术选型和架构决策',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['system-design', 'technology-selection', 'performance-analysis', 'scalability'],
    color: '#FF6B6B',
    weight: 1.0
  },
  coder: {
    role: 'coder',
    category: 'engineering',
    description: '主力程序员，负责功能实现和代码编写',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['code', 'debug', 'refactor', 'implement'],
    color: '#4ECDC4',
    weight: 1.0
  },
  'coder-alt': {
    role: 'coder-alt',
    category: 'engineering',
    description: '辅助开发，使用不同模型或平台（如 Codex/OpenAI）',
    defaultCLI: 'codex',
    defaultModel: 'gpt-5',
    apiProvider: 'siliconflow',
    capabilities: ['code', 'implement', 'alternative-approach'],
    color: '#45B7D1',
    weight: 0.9
  },
  debugger: {
    role: 'debugger',
    category: 'engineering',
    description: '调试专家，擅长定位和修复复杂问题',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['debug', 'root-cause', 'fix', 'trace'],
    color: '#FF9F43',
    weight: 0.8
  },
  devops: {
    role: 'devops',
    category: 'engineering',
    description: 'DevOps 工程师，负责部署、CI/CD 和基础设施',
    defaultCLI: 'claude',
    defaultModel: 'Pro/moonshotai/Kimi-K2-Instruct',
    apiProvider: 'siliconflow',
    capabilities: ['deploy', 'ci-cd', 'infrastructure', 'docker', 'kubernetes'],
    color: '#6C5CE7',
    weight: 0.7
  },
  security: {
    role: 'security',
    category: 'engineering',
    description: '安全专家，负责安全审计和漏洞检测',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['security-audit', 'vulnerability', 'pen-test', 'compliance'],
    color: '#E74C3C',
    weight: 0.8
  },
  performance: {
    role: 'performance',
    category: 'engineering',
    description: '性能工程师，负责性能分析和优化',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['profiling', 'optimization', 'benchmark', 'latency'],
    color: '#F39C12',
    weight: 0.8
  },

  // ══════════════════════════════════════
  // Research & Analysis
  // ══════════════════════════════════════
  researcher: {
    role: 'researcher',
    category: 'research',
    description: '研究员，负责调研最新技术和最佳实践',
    defaultCLI: 'gemini',
    defaultModel: 'Pro/moonshotai/Kimi-K2.5',
    apiProvider: 'siliconflow',
    capabilities: ['research', 'survey', 'paper-analysis', 'trend-analysis'],
    color: '#FFE66D',
    weight: 0.9
  },
  analyst: {
    role: 'analyst',
    category: 'research',
    description: '数据分析师，负责数据分析和解码',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['data-analysis', 'statistics', 'visualization', 'insights'],
    color: '#A8E6CF',
    weight: 0.8
  },
  planner: {
    role: 'planner',
    category: 'research',
    description: '规划师，负责任务分解和进度规划',
    defaultCLI: 'claude',
    defaultModel: 'Pro/moonshotai/Kimi-K2-Instruct',
    apiProvider: 'siliconflow',
    capabilities: ['planning', 'estimation', 'scheduling', 'roadmap'],
    color: '#88D8B0',
    weight: 0.7
  },
  advisor: {
    role: 'advisor',
    category: 'research',
    description: '技术顾问，提供专业建议和决策支持',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['consulting', 'best-practices', 'decision-support', 'review'],
    color: '#DDA0DD',
    weight: 0.9
  },

  // ══════════════════════════════════════
  // Quality & Process
  // ══════════════════════════════════════
  reviewer: {
    role: 'reviewer',
    category: 'quality',
    description: '代码审查员，负责代码质量和改进建议',
    defaultCLI: 'codex',
    defaultModel: 'Pro/moonshotai/Kimi-K2.5',
    apiProvider: 'siliconflow',
    capabilities: ['review', 'quality-check', 'suggestions', 'best-practices'],
    color: '#95E1D3',
    weight: 0.8
  },
  tester: {
    role: 'tester',
    category: 'quality',
    description: '测试工程师，负责测试用例和验证',
    defaultCLI: 'codex',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['testing', 'test-cases', 'validation', 'automation'],
    color: '#45B7D1',
    weight: 0.8
  },
  qa: {
    role: 'qa',
    category: 'quality',
    description: '质量保障，负责整体质量流程和标准',
    defaultCLI: 'claude',
    defaultModel: 'Pro/moonshotai/Kimi-K2-Instruct',
    apiProvider: 'siliconflow',
    capabilities: ['qa', 'standards', 'process-improvement', 'metrics'],
    color: '#81C784',
    weight: 0.7
  },
  'tech-writer': {
    role: 'tech-writer',
    category: 'quality',
    description: '技术文档工程师，负责文档编写',
    defaultCLI: 'claude',
    defaultModel: 'Pro/moonshotai/Kimi-K2-Instruct',
    apiProvider: 'siliconflow',
    capabilities: ['documentation', 'readme', 'api-docs', 'guides'],
    color: '#90A4AE',
    weight: 0.6
  },
  pm: {
    role: 'pm',
    category: 'quality',
    description: '产品经理，负责需求分析和优先级排序',
    defaultCLI: 'claude',
    defaultModel: 'Pro/moonshotai/Kimi-K2-Instruct',
    apiProvider: 'siliconflow',
    capabilities: ['requirements', 'prioritization', 'user-stories', 'roadmap'],
    color: '#FFB74D',
    weight: 0.7
  },

  // ══════════════════════════════════════
  // Meta & Debate (新增)
  // ══════════════════════════════════════
  critic: {
    role: 'critic',
    category: 'meta',
    description: '质疑者，挑战假设、发现问题、指出缺陷',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['critique', 'question-assumptions', 'identify-flaws', 'risk-analysis'],
    color: '#FF5722',
    weight: 0.9
  },
  'devils-advocate': {
    role: 'devils-advocate',
    category: 'meta',
    description: '魔鬼代言人，专门反驳和反对主流观点',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['counter-argument', 'challenge-consensus', 'worst-case', 'stress-test'],
    color: '#795548',
    weight: 0.8
  },
  optimist: {
    role: 'optimist',
    category: 'meta',
    description: '乐观派，关注收益、机会和积极面',
    defaultCLI: 'claude',
    defaultModel: 'Pro/moonshotai/Kimi-K2-Instruct',
    apiProvider: 'siliconflow',
    capabilities: ['opportunity', 'benefits', 'positive-analysis', 'motivation'],
    color: '#4CAF50',
    weight: 0.6
  },
  pessimist: {
    role: 'pessimist',
    category: 'meta',
    description: '悲观派，关注风险、危险和潜在问题',
    defaultCLI: 'claude',
    defaultModel: 'Pro/moonshotai/Kimi-K2-Instruct',
    apiProvider: 'siliconflow',
    capabilities: ['risk-analysis', 'worst-case', 'threat-modeling', 'concerns'],
    color: '#9E9E9E',
    weight: 0.6
  },
  synthesizer: {
    role: 'synthesizer',
    category: 'meta',
    description: '综合者，整合多方观点，形成共识方案',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['synthesis', 'integration', 'consensus', 'compromise', 'summary'],
    color: '#9C27B0',
    weight: 0.9
  },
  facilitator: {
    role: 'facilitator',
    category: 'meta',
    description: '会议主持，引导讨论、确保各方发声、推进决策',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['moderation', 'facilitation', 'consensus-building', 'time-management'],
    color: '#00BCD4',
    weight: 0.8
  },
  guardian: {
    role: 'guardian',
    category: 'meta',
    description: '守护者，关注边界条件、异常情况和 edge cases',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['edge-cases', 'boundary-conditions', 'exception-handling', 'robustness'],
    color: '#607D8B',
    weight: 0.8
  },

  // ══════════════════════════════════════
  // Utility
  // ══════════════════════════════════════
  utility: {
    role: 'utility',
    category: 'utility',
    description: '通用工具，处理文件操作、搜索等辅助任务',
    defaultCLI: 'opencode',
    defaultModel: 'default',
    apiProvider: 'flex',
    capabilities: ['file-operations', 'search', 'automation', 'scripts'],
    color: '#96CEB4',
    weight: 0.5
  },
  explorer: {
    role: 'explorer',
    category: 'utility',
    description: '代码探索专家，快速理解陌生代码库',
    defaultCLI: 'claude',
    defaultModel: 'Pro/moonshotai/Kimi-K2-Instruct',
    apiProvider: 'siliconflow',
    capabilities: ['code-exploration', 'understanding', 'mapping', 'documentation'],
    color: '#B0BEC5',
    weight: 0.7
  },
  refactorer: {
    role: 'refactorer',
    category: 'utility',
    description: '重构专家，改进代码结构而不改变功能',
    defaultCLI: 'claude',
    defaultModel: 'Pro/zai-org/GLM-5',
    apiProvider: 'siliconflow',
    capabilities: ['refactor', 'cleanup', 'design-patterns', 'technical-debt'],
    color: '#8BC34A',
    weight: 0.8
  }
};

/**
 * CLI 配置
 */
export const CLI_CONFIGS: Record<CLITYPE, Omit<CLIConfig, 'apiKeyEnv'>> = {
  claude: {
    type: 'claude',
    command: 'claude',
    args: ['--print', '--permission-mode', 'bypassPermissions'],
    supportedModels: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5']
  },
  codex: {
    type: 'codex',
    command: 'codex',
    args: ['--full-auto'],
    supportedModels: ['gpt-5', 'o4-mini', 'o3', 'gpt-4.1', 'gpt-4o']
  },
  opencode: {
    type: 'opencode',
    command: 'opencode',
    args: ['run'],
    supportedModels: ['default']
  },
  gemini: {
    type: 'gemini',
    command: 'gemini',
    args: [],
    supportedModels: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5']
  }
};

/**
 * API Provider → 环境变量映射
 */
export const API_ENV_VARS: Record<APIProvider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  flex: 'OPENAI_API_KEY'
};

/**
 * 辩论会议配置
 */
export interface DebateConfig {
  topic: string;
  participants: Role[];      // 参与者角色
  moderator?: Role;          // 主持人 (默认 facilitator)
  rounds: number;            // 辩论轮数
  timePerRound?: number;     // 每轮时间 (秒)
}

export const DEFAULT_DEBATE_CONFIG: Omit<DebateConfig, 'topic' | 'participants'> = {
  moderator: 'facilitator',
  rounds: 3,
  timePerRound: 120
};

/**
 * 辩论角色预设
 */
export const DEBATE_ROLES: Role[] = ['optimist', 'pessimist', 'critic', 'devils-advocate', 'synthesizer'];

/**
 * 任务类型 → 所需角色映射 (扩展版)
 */
export const TASK_ROLE_MAP: Record<string, Role[]> = {
  // Engineering
  'implement': ['architect', 'coder', 'reviewer'],
  'build': ['architect', 'coder', 'tester', 'reviewer'],
  'create': ['architect', 'coder', 'reviewer'],
  'develop': ['coder', 'reviewer', 'tester'],
  'debug': ['debugger', 'reviewer'],
  'fix': ['debugger', 'coder'],
  'optimize': ['performance', 'refactorer'],
  'refactor': ['refactorer', 'reviewer'],
  'deploy': ['devops', 'architect'],
  'security': ['security', 'architect'],
  'api': ['coder', 'tester', 'tech-writer'],
  'frontend': ['coder', 'reviewer'],
  'backend': ['architect', 'coder', 'tester'],
  'mobile': ['coder', 'tester', 'reviewer'],
  // Research
  'research': ['researcher', 'analyst'],
  'survey': ['researcher'],
  'analyze': ['analyst', 'researcher'],
  'evaluate': ['advisor', 'critic', 'analyst'],
  'plan': ['planner', 'pm', 'architect'],
  'estimate': ['planner', 'architect'],
  // Quality
  'test': ['tester', 'qa'],
  'audit': ['security', 'qa', 'reviewer'],
  'document': ['tech-writer'],
  'write': ['tech-writer', 'reviewer'],
  // Meta
  'discuss': ['facilitator', 'critic', 'synthesizer'],
  'debate': ['facilitator', 'optimist', 'pessimist', 'devils-advocate'],
  'decide': ['advisor', 'critic', 'guardian'],
  'critique': ['critic', 'devils-advocate'],
  'improve': ['critic', 'synthesizer', 'performance'],
  'review': ['reviewer', 'critic', 'guardian'],
  'understand': ['explorer', 'analyst'],
  'explore': ['explorer', 'researcher'],
  // Chinese
  '实现': ['architect', 'coder', 'reviewer'],
  '构建': ['architect', 'coder', 'tester'],
  '开发': ['coder', 'reviewer', 'tester'],
  '调试': ['debugger', 'reviewer'],
  '修复': ['debugger', 'coder'],
  '优化': ['performance', 'refactorer'],
  '重构': ['refactorer', 'reviewer'],
  '部署': ['devops', 'architect'],
  '安全': ['security', 'architect'],
  '调研': ['researcher', 'analyst'],
  '研究': ['researcher'],
  '分析': ['analyst', 'researcher'],
  '评估': ['advisor', 'critic', 'analyst'],
  '规划': ['planner', 'pm'],
  '审查': ['reviewer', 'critic'],
  '测试': ['tester', 'qa'],
  '审计': ['security', 'qa', 'reviewer'],
  '文档': ['tech-writer'],
  '辩论': ['facilitator', 'optimist', 'pessimist', 'devils-advocate'],
  '讨论': ['facilitator', 'critic', 'synthesizer'],
  '质疑': ['critic', 'devils-advocate'],
  '理解': ['explorer', 'analyst'],
};

/**
 * 根据任务描述推断所需角色
 */
export function inferRolesFromTask(taskDescription: string): Role[] {
  const desc = taskDescription.toLowerCase();
  const roles = new Set<Role>();

  for (const [keyword, roleList] of Object.entries(TASK_ROLE_MAP)) {
    if (desc.includes(keyword)) {
      roleList.forEach(r => roles.add(r));
    }
  }

  // 默认至少要有 coder
  if (roles.size === 0) {
    roles.add('coder');
  }

  return Array.from(roles);
}

/**
 * 创建 Agent 模板
 */
export function createAgentTemplate(role: Role, index: number = 1): AgentTemplate {
  const def = ROLE_DEFINITIONS[role];
  return {
    id: `${role}-${index}`,
    name: `${getRoleNameCN(role)}-${index}`,
    role,
    cli: def.defaultCLI,
    model: def.defaultModel,
    apiProvider: def.apiProvider,
    color: def.color
  };
}

/**
 * 获取角色配置
 */
export function getRoleConfig(role: Role): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

/**
 * 获取 CLI 启动命令
 */
export function getCLICmd(cli: CLITYPE): { command: string; args: string[] } {
  const config = CLI_CONFIGS[cli];
  return { command: config.command, args: config.args };
}

/**
 * 获取角色中文名
 */
export function getRoleNameCN(role: Role): string {
  const names: Record<Role, string> = {
    architect: '架构师',
    coder: '程序员',
    'coder-alt': '程序员B',
    debugger: '调试专家',
    devops: '运维',
    security: '安全',
    performance: '性能',
    researcher: '研究员',
    analyst: '分析师',
    planner: '规划师',
    advisor: '顾问',
    reviewer: '审查员',
    tester: '测试',
    qa: '质量',
    'tech-writer': '文档',
    pm: '产品',
    critic: '质疑者',
    'devils-advocate': '魔鬼',
    optimist: '乐观派',
    pessimist: '悲观派',
    synthesizer: '综合者',
    facilitator: '主持',
    guardian: '守护者',
    utility: '工具',
    explorer: '探索',
    refactorer: '重构'
  };
  return names[role] || role;
}

/**
 * 获取角色英文名
 */
export function getRoleNameEN(role: Role): string {
  return role;
}

/**
 * 按分类获取所有角色
 */
export function getRolesByCategory(category: RoleDefinition['category']): Role[] {
  const keys = Object.keys(ROLE_DEFINITIONS) as Role[];
  return keys.filter(r => ROLE_DEFINITIONS[r].category === category);
}

/**
 * 获取所有角色列表
 */
export function getAllRoles(): Role[] {
  return Object.keys(ROLE_DEFINITIONS) as Role[];
}
