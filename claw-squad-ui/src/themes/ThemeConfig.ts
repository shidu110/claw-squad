/**
 * Themes - Dark (Tech) and Light (Minimal)
 */
export type Theme = 'dark' | 'light';

export interface ThemeConfig {
  bg: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSecondary: string;
  statusIdle: string;
  statusRunning: string;
  statusDone: string;
  statusError: string;
  headerBg: string;
  navBg: string;
  terminalBg: string;
}

export const themes: Record<Theme, ThemeConfig> = {
  dark: {
    bg: 'bg-slate-900',
    card: 'bg-slate-800/80',
    cardBorder: 'border-indigo-500/30',
    text: 'text-white',
    textMuted: 'text-slate-400',
    accent: 'text-indigo-400',
    accentSecondary: 'text-purple-400',
    statusIdle: 'bg-slate-500',
    statusRunning: 'bg-indigo-500 animate-pulse',
    statusDone: 'bg-green-500',
    statusError: 'bg-red-500',
    headerBg: 'bg-slate-800/50',
    navBg: 'bg-slate-800/80',
    terminalBg: 'bg-slate-950',
  },
  light: {
    bg: 'bg-gray-50',
    card: 'bg-white shadow-lg border border-gray-100',
    cardBorder: 'border-gray-200',
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    accent: 'text-blue-600',
    accentSecondary: 'text-gray-600',
    statusIdle: 'bg-gray-400',
    statusRunning: 'bg-blue-500 animate-pulse',
    statusDone: 'bg-green-500',
    statusError: 'bg-red-500',
    headerBg: 'bg-white',
    navBg: 'bg-white',
    terminalBg: 'bg-gray-900',
  }
};
