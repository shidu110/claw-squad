/**
 * ClawSquad - Unified App with Layout + Theme Switching + I18N
 * 4 layouts + 2 themes + I18N
 *
 * Features:
 * - xterm.js terminal integration
 * - API provider configuration (MiniMax/OpenAI/Anthropic)
 * - Real competition via http://localhost:3000/compete
 * - Referee scoring with ResultPanel
 * - Competition history with localStorage
 */
import { useState, useCallback } from 'react';
import { translations, type Locale } from './i18n/translations';
import { Folder, Key, History } from 'lucide-react';
import { themes, type Theme } from './themes/ThemeConfig';
import { SidebarLayout } from './layouts/SidebarLayout';
import { TopNavLayout } from './layouts/TopNavLayout';
import { WorkspaceModal } from './components/WorkspaceModal';
import { TerminalPanel } from './components/TerminalPanel';
import { APIConfigModal, type ProviderConfig } from './components/APIConfigModal';
import { ResultPanel, type CompetitionResult } from './components/ResultPanel';
import { HistoryModal } from './components/HistoryModal';

type Layout = 'sidebar' | 'topnav';
type Tab = 'teams' | 'terminal' | 'result';

interface Agent {
  id: string;
  role: string;
  status: 'idle' | 'running' | 'done' | 'error';
  cli: string;
  model: string;
}

const defaultTeamA: Agent[] = [
  { id: '1', role: 'Architect', status: 'idle', cli: 'claude', model: 'MiniMax-M2.7' },
  { id: '2', role: 'Coder', status: 'idle', cli: 'claude', model: 'MiniMax-M2.7' },
  { id: '3', role: 'Tester', status: 'idle', cli: 'claude', model: 'MiniMax-M2.7' },
];

const defaultTeamB: Agent[] = [
  { id: '4', role: 'Architect', status: 'idle', cli: 'claude', model: 'MiniMax-M2.7' },
  { id: '5', role: 'Coder', status: 'idle', cli: 'claude', model: 'MiniMax-M2.7' },
  { id: '6', role: 'Tester', status: 'idle', cli: 'claude', model: 'MiniMax-M2.7' },
];

// ─── localStorage helpers ───────────────────────────────────────────────
const HISTORY_KEY = 'clawsquad-competition-history';
const MAX_HISTORY = 50;

function loadHistory(): CompetitionResult[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: CompetitionResult[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

// ─── App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [layout, setLayout] = useState<Layout>('sidebar');
  const [themeName, setThemeName] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState<Tab>('teams');
  const [task, setTask] = useState('');
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<{ name: string; path: string } | null>(null);
  const [showAPIConfig, setShowAPIConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [apiConfigs, setApiConfigs] = useState<ProviderConfig[]>([]);
  const [history, setHistory] = useState<CompetitionResult[]>(() => loadHistory());

  // Competition state
  const [isCompeting, setIsCompeting] = useState(false);
  const [competitionResult, setCompetitionResult] = useState<CompetitionResult | null>(null);

  // Terminal output lines (for xterm display)
  const [teamAOutput, setTeamAOutput] = useState<string[]>([]);
  const [teamBOutput, setTeamBOutput] = useState<string[]>([]);

  // Fullscreen terminal
  const [fullscreenTerminal, setFullscreenTerminal] = useState<'A' | 'B' | null>(null);

  const t = translations[locale];
  const theme = themes[themeName];
  const isDark = themeName === 'dark';

  const statusColors = {
    idle: isDark ? 'bg-slate-500' : 'bg-gray-400',
    running: isDark ? 'bg-indigo-500 animate-pulse' : 'bg-blue-500 animate-pulse',
    done: 'bg-green-500',
    error: 'bg-red-500',
  };

  const addTerminalOutput = useCallback((team: 'A' | 'B', line: string) => {
    const prefixed = `\x1b[2m[${new Date().toLocaleTimeString()}]\x1b[0m ${line}`;
    if (team === 'A') {
      setTeamAOutput(prev => [...prev.slice(-200), prefixed]);
    } else {
      setTeamBOutput(prev => [...prev.slice(-200), prefixed]);
    }
  }, []);

  const clearTerminalOutput = useCallback((team: 'A' | 'B') => {
    if (team === 'A') setTeamAOutput([]);
    else setTeamBOutput([]);
  }, []);

  const startCompetition = async () => {
    if (!task.trim()) {
      alert('请输入任务');
      return;
    }

    setIsCompeting(true);
    setCompetitionResult(null);
    setTeamAOutput([]);
    setTeamBOutput([]);
    setActiveTab('terminal');

    try {
      addTerminalOutput('A', '\x1b[33m⚡ Starting competition...\x1b[0m');
      addTerminalOutput('B', '\x1b[33m⚡ Starting competition...\x1b[0m');

      // Set agents to running
      defaultTeamA.forEach(a => { a.status = 'running'; });
      defaultTeamB.forEach(a => { a.status = 'running'; });

      addTerminalOutput('A', `\x1b[36m◆ Team A agents initialized (${defaultTeamA.length} agents)\x1b[0m`);
      addTerminalOutput('B', `\x1b[36m◆ Team B agents initialized (${defaultTeamB.length} agents)\x1b[0m`);
      addTerminalOutput('A', `\x1b[90m📋 Task: ${task}\x1b[0m`);
      addTerminalOutput('B', `\x1b[90m📋 Task: ${task}\x1b[0m`);

      const enabledProviders = apiConfigs.filter(c => c.enabled);
      const providerNames = enabledProviders.length > 0
        ? enabledProviders.map(c => c.name).join(', ')
        : 'MiniMax (default)';

      addTerminalOutput('A', `\x1b[32m✓ Provider: ${providerNames}\x1b[0m`);
      addTerminalOutput('B', `\x1b[32m✓ Provider: ${providerNames}\x1b[0m`);

      // Call the compete API
      addTerminalOutput('A', '\x1b[35m🚀 Fetching /compete...\x1b[0m');
      addTerminalOutput('B', '\x1b[35m🚀 Fetching /compete...\x1b[0m');

      const startTime = Date.now();

      const response = await fetch('http://localhost:3000/compete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          workspace: currentWorkspace?.path || '/home/shidu10/ClawSquad',
          providers: enabledProviders,
        }),
      });

      const duration = Math.round((Date.now() - startTime) / 1000);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      addTerminalOutput('A', '\x1b[32m✓ Response received\x1b[0m');
      addTerminalOutput('B', '\x1b[32m✓ Response received\x1b[0m');

      // Parse response data
      const teamAData = data.teamA || {};
      const teamBData = data.teamB || {};
      const refereeData = data.referee || {};

      if (teamAData.output) {
        const outputLines = teamAData.output.split('\n').slice(-10);
        outputLines.forEach((line: string) => addTerminalOutput('A', line));
      }

      if (teamBData.output) {
        const outputLines = teamBData.output.split('\n').slice(-10);
        outputLines.forEach((line: string) => addTerminalOutput('B', line));
      }

      // Build competition result
      const result: CompetitionResult = {
        id: Date.now().toString(),
        task,
        timestamp: Date.now(),
        teamA: {
          agentId: 'team-a-subagents',
          agentRole: 'Subagent Mode',
          output: teamAData.output || '',
          duration: teamAData.duration || duration,
          score: refereeData.teamA ? {
            overall: refereeData.teamA.overall || 0,
            quality: refereeData.teamA.quality || 0,
            speed: refereeData.teamA.speed || 0,
            architecture: refereeData.teamA.architecture || 0,
            codeQuality: refereeData.teamA.codeQuality || 0,
            testCoverage: refereeData.teamA.testCoverage || 0,
            winner: (refereeData.winner as 'A' | 'B' | 'tie') || 'tie',
            feedback: refereeData.teamA.feedback || '',
            breakdown: refereeData.teamA.breakdown,
          } : undefined,
        },
        teamB: {
          agentId: 'team-b-cli',
          agentRole: 'CLI Mode',
          output: teamBData.output || '',
          duration: teamBData.duration || duration,
          score: refereeData.teamB ? {
            overall: refereeData.teamB.overall || 0,
            quality: refereeData.teamB.quality || 0,
            speed: refereeData.teamB.speed || 0,
            architecture: refereeData.teamB.architecture || 0,
            codeQuality: refereeData.teamB.codeQuality || 0,
            testCoverage: refereeData.teamB.testCoverage || 0,
            winner: (refereeData.winner as 'A' | 'B' | 'tie') || 'tie',
            feedback: refereeData.teamB.feedback || '',
            breakdown: refereeData.teamB.breakdown,
          } : undefined,
        },
        winner: (data.winner as 'A' | 'B' | 'tie') || (refereeData.winner as 'A' | 'B' | 'tie') || 'tie',
      };

      // Update agents status
      const winner = result.winner;
      defaultTeamA.forEach(a => { a.status = winner === 'A' ? 'done' : winner === 'B' ? 'error' : 'done'; });
      defaultTeamB.forEach(a => { a.status = winner === 'B' ? 'done' : winner === 'A' ? 'error' : 'done'; });

      // Announce winner
      if (winner === 'A') {
        addTerminalOutput('A', '\x1b[33m🏆 Team A Wins!\x1b[0m');
        addTerminalOutput('B', '\x1b[31m❌ Team B Lost\x1b[0m');
      } else if (winner === 'B') {
        addTerminalOutput('B', '\x1b[33m🏆 Team B Wins!\x1b[0m');
        addTerminalOutput('A', '\x1b[31m❌ Team A Lost\x1b[0m');
      } else {
        addTerminalOutput('A', '\x1b[36m🤝 It\'s a Tie!\x1b[0m');
        addTerminalOutput('B', '\x1b[36m🤝 It\'s a Tie!\x1b[0m');
      }

      addTerminalOutput('A', `\x1b[90m⏱ Duration: ${duration}s\x1b[0m`);
      addTerminalOutput('B', `\x1b[90m⏱ Duration: ${duration}s\x1b[0m`);

      setCompetitionResult(result);
      setActiveTab('result');

      // Save to history
      const newHistory = [result, ...history].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      saveHistory(newHistory);

    } catch (err) {
      const errorMsg = (err as Error).message;
      addTerminalOutput('A', `\x1b[31m✗ Competition failed: ${errorMsg}\x1b[0m`);
      addTerminalOutput('B', `\x1b[31m✗ Competition failed: ${errorMsg}\x1b[0m`);
      defaultTeamA.forEach(a => { a.status = 'error'; });
      defaultTeamB.forEach(a => { a.status = 'error'; });
    } finally {
      setIsCompeting(false);
    }
  };

  const handleLoadHistory = (result: CompetitionResult) => {
    setCompetitionResult(result);
    setTask(result.task);
    setTeamAOutput(result.teamA.output ? [`\x1b[2m[loaded from history]\x1b[0m ${result.teamA.output}`] : []);
    setTeamBOutput(result.teamB.output ? [`\x1b[2m[loaded from history]\x1b[0m ${result.teamB.output}`] : []);
    setActiveTab('result');
  };

  // ─── Render helpers ──────────────────────────────────────────────────────
  const renderTerminals = () => {
    if (fullscreenTerminal === 'A') {
      return (
        <TerminalPanel
          teamId="A"
          output={teamAOutput}
          theme={themeName}
          fullscreen
          onFullscreen={() => setFullscreenTerminal(null)}
          onClear={() => clearTerminalOutput('A')}
        />
      );
    }
    if (fullscreenTerminal === 'B') {
      return (
        <TerminalPanel
          teamId="B"
          output={teamBOutput}
          theme={themeName}
          fullscreen
          onFullscreen={() => setFullscreenTerminal(null)}
          onClear={() => clearTerminalOutput('B')}
        />
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        <TerminalPanel
          teamId="A"
          output={teamAOutput}
          theme={themeName}
          onFullscreen={() => setFullscreenTerminal('A')}
          onClear={() => clearTerminalOutput('A')}
        />
        <TerminalPanel
          teamId="B"
          output={teamBOutput}
          theme={themeName}
          onFullscreen={() => setFullscreenTerminal('B')}
          onClear={() => clearTerminalOutput('B')}
        />
      </div>
    );
  };

  const renderContent = () => {
    const commonTeamsSection = (
      <>
        {/* Task Input */}
        {layout === 'sidebar' ? (
          <div className={`${theme.card} border ${theme.cardBorder} rounded-xl p-4 mb-6`}>
            <label className={`block text-sm font-medium ${theme.accent} mb-2`}>
              {t.taskTitle}
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={t.taskPlaceholder}
              className={`w-full ${isDark ? 'bg-slate-900/70 border-indigo-500/40' : 'bg-gray-50 border-gray-300'} border rounded-lg p-3 ${theme.text} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none`}
              rows={2}
            />
          </div>
        ) : (
          <div className={`${theme.card} rounded-2xl p-6 mb-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${theme.text}`}>{t.taskTitle}</h2>
            </div>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={t.taskPlaceholder}
              className={`w-full border ${isDark ? 'bg-slate-900/70 border-indigo-500/40' : 'border-gray-300'} rounded-xl p-4 ${theme.text} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
              rows={3}
            />
          </div>
        )}

        {/* Start Competition Button */}
        <div className="flex justify-center mb-6 gap-3">
          <button
            onClick={startCompetition}
            disabled={isCompeting}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              isCompeting
                ? 'bg-gray-500 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg hover:shadow-indigo-500/30'
            }`}
          >
            {isCompeting ? '⚔️ 竞争中...' : '⚔️ 开始竞争'}
          </button>
        </div>

        {/* Competition Result */}
        {competitionResult && (
          <div className="mb-6">
            <ResultPanel result={competitionResult} theme={themeName} />
          </div>
        )}

        {/* Teams */}
        <div className={`mb-6`}>
          {layout === 'topnav' && (
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${theme.text}`}>{t.teams}</h2>
            </div>
          )}

          <div className={layout === 'sidebar' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
            {/* Team A */}
            <div className={`${theme.card} ${isDark ? 'border-2 border-indigo-500/50' : 'border-l-4 border-l-blue-500'} rounded-xl p-4`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-blue-100'}`}>
                  <span className={isDark ? 'text-white' : 'text-blue-600'}>A</span>
                </div>
                <div>
                  <h3 className="font-bold">{t.teamAlpha}</h3>
                  <p className={`text-xs ${theme.accent}`}>{t.subagentMode}</p>
                </div>
              </div>
              <div className={layout === 'sidebar' ? 'space-y-2' : 'grid grid-cols-3 gap-3'}>
                {defaultTeamA.map((agent) => (
                  <div key={agent.id} className={`${isDark ? 'bg-slate-900/50' : 'bg-gray-50'} rounded-lg p-2`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusColors[agent.status]}`} />
                      <span className="text-sm">{t[agent.role.toLowerCase() as keyof typeof t] || agent.role}</span>
                    </div>
                    <p className={`text-xs ${theme.textMuted} mt-1`}>{agent.model}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Team B */}
            <div className={`${theme.card} ${isDark ? 'border-2 border-purple-500/50' : 'border-l-4 border-l-gray-400'} rounded-xl p-4`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gray-100'}`}>
                  <span className={isDark ? 'text-white' : 'text-gray-600'}>B</span>
                </div>
                <div>
                  <h3 className="font-bold">{t.teamBeta}</h3>
                  <p className={`text-xs ${theme.textMuted}`}>{t.cliMode}</p>
                </div>
              </div>
              <div className={layout === 'sidebar' ? 'space-y-2' : 'grid grid-cols-3 gap-3'}>
                {defaultTeamB.map((agent) => (
                  <div key={agent.id} className={`${isDark ? 'bg-slate-900/50' : 'bg-gray-50'} rounded-lg p-2`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusColors[agent.status]}`} />
                      <span className="text-sm">{t[agent.role.toLowerCase() as keyof typeof t] || agent.role}</span>
                    </div>
                    <p className={`text-xs ${theme.textMuted} mt-1`}>{agent.model}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Terminals (inline) */}
        {!fullscreenTerminal && (
          <div className="mb-6">
            <h3 className={`text-sm font-medium mb-3 ${theme.textMuted}`}>Terminal Output</h3>
            <div className="grid grid-cols-2 gap-4">
              <TerminalPanel
                teamId="A"
                output={teamAOutput}
                theme={themeName}
                onFullscreen={() => setFullscreenTerminal('A')}
                onClear={() => clearTerminalOutput('A')}
              />
              <TerminalPanel
                teamId="B"
                output={teamBOutput}
                theme={themeName}
                onFullscreen={() => setFullscreenTerminal('B')}
                onClear={() => clearTerminalOutput('B')}
              />
            </div>
          </div>
        )}
      </>
    );

    if (layout === 'sidebar') {
      if (activeTab === 'teams') return commonTeamsSection;
      if (activeTab === 'terminal') {
        return (
          <div className="space-y-4">
            {renderTerminals()}
          </div>
        );
      }
      return (
        <div className="space-y-4">
          <ResultPanel result={competitionResult} theme={themeName} />
        </div>
      );
    }

    return commonTeamsSection;
  };

  return (
    <>
      {/* Control Bar */}
      <div
        className={`
          fixed top-0 left-0 right-0 z-50
          ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-200'}
          backdrop-blur border-b px-4 py-2
        `}
      >
        <div className="flex items-center justify-center gap-4">
          {/* Workspace */}
          <button
            onClick={() => setShowWorkspace(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              isDark
                ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span className="text-xs font-medium">
              {currentWorkspace ? currentWorkspace.name : '工作区'}
            </span>
          </button>

          <div className={`w-px h-6 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />

          {/* API Config */}
          <button
            onClick={() => setShowAPIConfig(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              isDark
                ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                : 'bg-green-100 hover:bg-green-200 text-green-700'
            }`}
          >
            <Key className="w-4 h-4" />
            <span className="text-xs font-medium">API</span>
          </button>

          {/* History */}
          <button
            onClick={() => setShowHistory(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              isDark
                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300'
                : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="text-xs font-medium">历史</span>
          </button>

          <div className={`w-px h-6 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />

          {/* Language */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocale('en')}
              className={`px-2 py-1 text-xs rounded ${
                locale === 'en' ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:bg-slate-700`
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale('zh')}
              className={`px-2 py-1 text-xs rounded ${
                locale === 'zh' ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:bg-slate-700`
              }`}
            >
              中文
            </button>
          </div>

          {/* Layout */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLayout('sidebar')}
              className={`px-3 py-1 text-xs rounded ${
                layout === 'sidebar' ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:bg-slate-700`
              }`}
            >
              {t.layoutSidebar}
            </button>
            <button
              onClick={() => setLayout('topnav')}
              className={`px-3 py-1 text-xs rounded ${
                layout === 'topnav' ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:bg-slate-700`
              }`}
            >
              {t.layoutTopnav}
            </button>
          </div>

          {/* Theme */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setThemeName('dark')}
              className={`px-3 py-1 text-xs rounded ${
                themeName === 'dark' ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:bg-slate-700`
              }`}
            >
              {t.themeDark}
            </button>
            <button
              onClick={() => setThemeName('light')}
              className={`px-3 py-1 text-xs rounded ${
                themeName === 'light' ? 'bg-blue-600 text-white' : `${theme.textMuted} hover:bg-slate-700`
              }`}
            >
              {t.themeLight}
            </button>
          </div>
        </div>
      </div>

      {/* App Content */}
      <div className={layout === 'sidebar' ? 'pt-10' : 'pt-16'}>
        {layout === 'sidebar' ? (
          <SidebarLayout
            theme={theme}
            t={t}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as Tab)}
          >
            {renderContent()}
          </SidebarLayout>
        ) : (
          <TopNavLayout theme={theme} t={t}>
            {renderContent()}
          </TopNavLayout>
        )}
      </div>

      {/* Modals */}
      <WorkspaceModal
        isOpen={showWorkspace}
        onClose={() => setShowWorkspace(false)}
        themeName={themeName}
        onSelect={(ws) => setCurrentWorkspace({ name: ws.name, path: ws.path })}
      />

      <APIConfigModal
        isOpen={showAPIConfig}
        onClose={() => setShowAPIConfig(false)}
        themeName={themeName}
        onSave={(configs) => setApiConfigs(configs)}
      />

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        themeName={themeName}
        onLoadResult={handleLoadHistory}
      />
    </>
  );
}
