/**
 * APIConfigModal - Configure AI Provider settings
 * Supports MiniMax, OpenAI, Anthropic and custom providers
 */
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Key, Globe } from 'lucide-react';

export type ProviderType = 'minimax' | 'openai' | 'anthropic' | 'custom';

export interface ProviderConfig {
  id: string;
  type: ProviderType;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface APIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeName: 'dark' | 'light';
  onSave: (configs: ProviderConfig[]) => void;
}

const PROVIDER_PRESETS: Record<ProviderType, Omit<ProviderConfig, 'id' | 'enabled'>> = {
  minimax: {
    type: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    apiKey: '',
    model: 'MiniMax-M2.7',
  },
  openai: {
    type: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
  },
  anthropic: {
    type: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
  },
  custom: {
    type: 'custom',
    name: 'Custom',
    baseUrl: '',
    apiKey: '',
    model: '',
  },
};

const STORAGE_KEY = 'clawsquad-api-configs';

export function APIConfigModal({ isOpen, onClose, themeName, onSave }: APIConfigModalProps) {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const isDark = themeName === 'dark';

  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setConfigs(JSON.parse(saved));
      } catch {
        setConfigs([]);
      }
    } else {
      // Default: MiniMax enabled
      const defaultConfigs: ProviderConfig[] = [
        {
          id: 'default-minimax',
          type: 'minimax',
          name: 'MiniMax',
          baseUrl: 'https://api.minimaxi.com/anthropic',
          apiKey: '',
          model: 'MiniMax-M2.7',
          enabled: true,
        },
      ];
      setConfigs(defaultConfigs);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfigs));
    }
  }, [isOpen]);

  const saveConfigs = (list: ProviderConfig[]) => {
    setConfigs(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    onSave(list);
  };

  const toggleEnabled = (id: string) => {
    saveConfigs(configs.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const updateConfig = (id: string, updates: Partial<ProviderConfig>) => {
    saveConfigs(configs.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteConfig = (id: string) => {
    saveConfigs(configs.filter(c => c.id !== id));
  };

  const addProvider = (type: ProviderType) => {
    const preset = PROVIDER_PRESETS[type];
    const newConfig: ProviderConfig = {
      ...preset,
      id: `${type}-${Date.now()}`,
      enabled: true,
    };
    saveConfigs([...configs, newConfig]);
    setShowAdd(false);
    setEditingId(newConfig.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] ${
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
              API 配置 / API Configuration
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Configure AI providers for competition agents
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {configs.length === 0 && !showAdd && (
            <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Key className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No API providers configured</p>
              <p className="text-xs mt-1">Click below to add a provider</p>
            </div>
          )}

          {configs.map((config) => (
            <div
              key={config.id}
              className={`
                rounded-xl border overflow-hidden
                ${isDark
                  ? 'bg-slate-900/50 border-slate-700'
                  : 'bg-gray-50 border-gray-200'
                }
                ${config.enabled
                  ? isDark ? 'border-indigo-500/40' : 'border-blue-300'
                  : isDark ? 'border-slate-700 opacity-60' : 'border-gray-200 opacity-60'
                }
              `}
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      config.type === 'minimax'
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                        : config.type === 'openai'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                        : config.type === 'anthropic'
                        ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                        : isDark
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {config.type === 'minimax' ? 'M' : config.type === 'openai' ? 'O' : config.type === 'anthropic' ? 'A' : 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {config.name}
                      </span>
                      {config.enabled && (
                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded">Active</span>
                      )}
                    </div>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {config.model || 'No model set'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleEnabled(config.id)}
                    className={`
                      relative w-10 h-5 rounded-full transition-colors
                      ${config.enabled ? 'bg-indigo-600' : isDark ? 'bg-slate-600' : 'bg-gray-300'}
                    `}
                  >
                    <div
                      className={`
                        absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                        ${config.enabled ? 'translate-x-5' : 'translate-x-0.5'}
                      `}
                    />
                  </button>
                  <button
                    onClick={() => setEditingId(editingId === config.id ? null : config.id)}
                    className={`px-2 py-1 text-xs rounded-lg ${
                      isDark
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {editingId === config.id ? '收起' : '编辑'}
                  </button>
                  <button
                    onClick={() => deleteConfig(config.id)}
                    className={`p-1.5 rounded-lg ${
                      isDark ? 'hover:bg-red-500/20 text-slate-400' : 'hover:bg-red-50 text-gray-400'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Editor */}
              {editingId === config.id && (
                <div className={`px-4 pb-4 pt-1 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Provider Name
                      </label>
                      <input
                        type="text"
                        value={config.name}
                        onChange={(e) => updateConfig(config.id, { name: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg text-sm ${
                          isDark
                            ? 'bg-slate-800 border border-slate-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Model
                      </label>
                      <input
                        type="text"
                        value={config.model}
                        onChange={(e) => updateConfig(config.id, { model: e.target.value })}
                        placeholder="e.g. MiniMax-M2.7"
                        className={`w-full px-3 py-2 rounded-lg text-sm ${
                          isDark
                            ? 'bg-slate-800 border border-slate-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        <Globe className="w-3 h-3 inline mr-1" />
                        Base URL
                      </label>
                      <input
                        type="text"
                        value={config.baseUrl}
                        onChange={(e) => updateConfig(config.id, { baseUrl: e.target.value })}
                        placeholder="https://api.example.com/v1"
                        className={`w-full px-3 py-2 rounded-lg text-sm ${
                          isDark
                            ? 'bg-slate-800 border border-slate-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        <Key className="w-3 h-3 inline mr-1" />
                        API Key
                      </label>
                      <input
                        type="password"
                        value={config.apiKey}
                        onChange={(e) => updateConfig(config.id, { apiKey: e.target.value })}
                        placeholder="sk-..."
                        className={`w-full px-3 py-2 rounded-lg text-sm ${
                          isDark
                            ? 'bg-slate-800 border border-slate-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Provider Form */}
          {showAdd && (
            <div
              className={`rounded-xl p-4 border ${
                isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${isDark ? 'text-indigo-300' : 'text-blue-700'}`}>
                  Add Provider
                </span>
                <button
                  onClick={() => setShowAdd(false)}
                  className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'} hover:underline`}
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PROVIDER_PRESETS) as ProviderType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => addProvider(type)}
                    className={`
                      px-4 py-2.5 rounded-lg text-sm font-medium border transition-all
                      ${isDark
                        ? 'bg-slate-800 border-slate-600 hover:border-indigo-500 text-slate-300 hover:bg-indigo-500/20'
                        : 'bg-white border-gray-300 hover:border-blue-400 text-gray-700 hover:bg-blue-50'
                      }
                    `}
                  >
                    {PROVIDER_PRESETS[type].name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}
        >
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add Provider
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
