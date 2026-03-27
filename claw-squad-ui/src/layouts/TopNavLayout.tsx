/**
 * Layout B: Top Navigation (仪表盘风格)
 */
import { Settings, Play } from 'lucide-react';
import type { ThemeConfig } from '../themes/ThemeConfig';
import type { Translations } from '../i18n/translations';

interface TopNavLayoutProps {
  theme: ThemeConfig;
  t: Translations;
  children: React.ReactNode;
}

export function TopNavLayout({
  theme,
  t,
  children,
}: TopNavLayoutProps) {
  return (
    <div className={`min-h-screen ${theme.bg}`}>
      {/* Top Navigation Bar */}
      <nav className={`${theme.navBg} shadow-sm border-b ${theme.cardBorder} px-6 py-4`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold">CS</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">{t.appName}</h1>
              <p className="text-xs text-gray-500">{t.version}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                {t.ready}
              </span>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md">
              <Play className="w-4 h-4" /> {t.startCompetition}
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
