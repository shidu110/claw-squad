/**
 * Layout A: Sidebar Navigation (IDE风格)
 */
import { Zap, Users, Terminal, ChevronRight, Settings } from 'lucide-react';
import type { ThemeConfig } from '../themes/ThemeConfig';
import type { Translations } from '../i18n/translations';

interface SidebarLayoutProps {
  theme: ThemeConfig;
  t: Translations;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function SidebarLayout({
  theme,
  t,
  activeTab,
  onTabChange,
  children,
}: SidebarLayoutProps) {
  const navItems = [
    { id: 'teams', icon: Users, label: t.teams },
    { id: 'terminal', icon: Terminal, label: t.terminal },
    { id: 'result', icon: Terminal, label: t.results },
  ];

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} flex`}>
      {/* Left Sidebar */}
      <aside className={`w-64 ${theme.navBg} border-r ${theme.cardBorder} flex flex-col`}>
        {/* Logo */}
        <div className={`p-5 border-b ${theme.cardBorder}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight">{t.appName}</h1>
              <p className="text-xs text-indigo-400">{t.version}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === item.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : `${theme.textMuted} hover:bg-slate-700/50 hover:text-white`
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom Settings */}
        <div className={`p-4 border-t ${theme.cardBorder}`}>
          <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${theme.textMuted} hover:bg-slate-700/50 hover:text-white transition-all`}>
            <Settings className="w-5 h-5" />
            <span className="font-medium">{t.settings}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header Bar */}
        <header className={`h-14 ${theme.headerBg} border-b ${theme.cardBorder} px-6 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <span className={`text-sm ${theme.textMuted}`}>{t.competing}</span>
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">
              {t.ready}
            </span>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20">
            {t.startCompetition}
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
