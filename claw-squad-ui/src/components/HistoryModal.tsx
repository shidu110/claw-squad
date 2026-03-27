/**
 * HistoryModal - Competition history with localStorage persistence
 */
import { useState, useEffect } from 'react';
import { X, Clock, Trash2, Trophy, ChevronRight, BarChart3 } from 'lucide-react';
import type { CompetitionResult } from './ResultPanel';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeName: 'dark' | 'light';
  onLoadResult: (result: CompetitionResult) => void;
}

const STORAGE_KEY = 'clawsquad-competition-history';
const MAX_HISTORY_ITEMS = 50;

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = Date.now();
  const diff = now - ts;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryModal({ isOpen, onClose, themeName, onLoadResult }: HistoryModalProps) {
  const [history, setHistory] = useState<CompetitionResult[]>([]);
  const isDark = themeName === 'dark';

  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }
  }, [isOpen]);

  const saveHistory = (list: CompetitionResult[]) => {
    const trimmed = list.slice(0, MAX_HISTORY_ITEMS);
    setHistory(trimmed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  };

  const deleteEntry = (id: string) => {
    saveHistory(history.filter(h => h.id !== id));
  };

  const clearAll = () => {
    saveHistory([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative w-full max-w-3xl mx-4 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] ${
          isDark ? 'bg-slate-800 border border-indigo-500/30' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b shrink-0 ${
            isDark ? 'border-slate-700' : 'border-gray-200'
          }`}
        >
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              竞争历史 / Competition History
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {history.length} competition{history.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={clearAll}
                className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
                  isDark
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {history.length === 0 ? (
            <div className={`text-center py-16 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium">No competition history</p>
              <p className="text-xs mt-1">Start a competition to see results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`
                    group rounded-xl border transition-all cursor-pointer
                    ${isDark
                      ? 'bg-slate-900/50 border-slate-700 hover:border-indigo-500/50'
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                    }
                  `}
                  onClick={() => {
                    onLoadResult(item);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Winner indicator */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          item.winner === 'A'
                            ? 'bg-gradient-to-br from-indigo-500 to-blue-500'
                            : item.winner === 'B'
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                            : isDark
                            ? 'bg-slate-700'
                            : 'bg-gray-300'
                        }`}
                      >
                        <Trophy className="w-5 h-5 text-white" />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-sm font-semibold truncate ${
                              item.winner === 'A'
                                ? isDark ? 'text-indigo-300' : 'text-indigo-700'
                                : item.winner === 'B'
                                ? isDark ? 'text-purple-300' : 'text-purple-700'
                                : isDark ? 'text-slate-300' : 'text-gray-700'
                            }`}
                          >
                            {item.winner === 'tie'
                              ? '🤝 Tie'
                              : `🏆 Team ${item.winner}`}
                          </span>
                          {item.teamA.score && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                                isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                              }`}
                            >
                              A: {item.teamA.score.overall.toFixed(1)}
                            </span>
                          )}
                          {item.teamB.score && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                                isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'
                              }`}
                            >
                              B: {item.teamB.score.overall.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
                        >
                          {item.task || 'No task description'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTimestamp(item.timestamp)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEntry(item.id);
                        }}
                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDark ? 'hover:bg-red-500/20 text-slate-400' : 'hover:bg-red-50 text-gray-400'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
