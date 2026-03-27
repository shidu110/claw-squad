/**
 * I18N - Internationalization Support
 * 中文 / English
 */
export type Locale = 'zh' | 'en';

export interface Translations {
  // Header
  appName: string;
  version: string;
  
  // Navigation
  teams: string;
  terminal: string;
  results: string;
  settings: string;
  
  // Task
  taskTitle: string;
  taskPlaceholder: string;
  startCompetition: string;
  
  // Teams
  teamAlpha: string;
  teamBeta: string;
  subagentMode: string;
  cliMode: string;
  ready: string;
  competing: string;
  idle: string;
  
  // Agents
  architect: string;
  coder: string;
  tester: string;
  reviewer: string;
  devops: string;
  researcher: string;
  
  // Terminal
  teamAOutput: string;
  teamBOutput: string;
  
  // Result
  winner: string;
  scores: string;
  quality: string;
  speed: string;
  
  // Settings
  language: string;
  layout: string;
  theme: string;
  layoutSidebar: string;
  layoutTopnav: string;
  themeDark: string;
  themeLight: string;
}

export const translations: Record<Locale, Translations> = {
  en: {
    appName: 'ClawSquad',
    version: 'v1.0.0',
    teams: 'Teams',
    terminal: 'Terminal',
    results: 'Results',
    settings: 'Settings',
    taskTitle: 'Competition Task',
    taskPlaceholder: 'Define the competition task...',
    startCompetition: 'Start Competition',
    teamAlpha: 'Team Alpha',
    teamBeta: 'Team Beta',
    subagentMode: 'Subagent Mode',
    cliMode: 'CLI Mode',
    ready: 'Ready',
    competing: 'Competing',
    idle: 'idle',
    architect: 'Architect',
    coder: 'Coder',
    tester: 'Tester',
    reviewer: 'Reviewer',
    devops: 'DevOps',
    researcher: 'Researcher',
    teamAOutput: 'Team Alpha Output',
    teamBOutput: 'Team Beta Output',
    winner: 'Winner',
    scores: 'Scores',
    quality: 'Quality',
    speed: 'Speed',
    language: 'Language',
    layout: 'Layout',
    theme: 'Theme',
    layoutSidebar: 'Sidebar',
    layoutTopnav: 'Top Nav',
    themeDark: 'Dark',
    themeLight: 'Light',
  },
  zh: {
    appName: 'ClawSquad',
    version: 'v1.0.0',
    teams: '团队',
    terminal: '终端',
    results: '结果',
    settings: '设置',
    taskTitle: '竞争任务',
    taskPlaceholder: '定义竞争任务...',
    startCompetition: '开始竞争',
    teamAlpha: 'Alpha 团队',
    teamBeta: 'Beta 团队',
    subagentMode: '子代理模式',
    cliMode: 'CLI 模式',
    ready: '就绪',
    competing: '竞争中',
    idle: '空闲',
    architect: '架构师',
    coder: '程序员',
    tester: '测试员',
    reviewer: '审查员',
    devops: '运维',
    researcher: '研究员',
    teamAOutput: 'Alpha 团队输出',
    teamBOutput: 'Beta 团队输出',
    winner: '获胜者',
    scores: '评分',
    quality: '质量',
    speed: '速度',
    language: '语言',
    layout: '布局',
    theme: '主题',
    layoutSidebar: '侧边栏',
    layoutTopnav: '顶部导航',
    themeDark: '暗色',
    themeLight: '亮色',
  }
};
