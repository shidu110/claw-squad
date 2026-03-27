/**
 * Workspace Modal - 工作区管理弹窗
 */
import { useState, useEffect } from 'react';
import { X, Plus, Folder, Trash2, Check } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  path: string;
  type: 'local' | 'remote';
}

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeName: 'dark' | 'light';
  onSelect: (workspace: Workspace) => void;
}

export function WorkspaceModal({ isOpen, onClose, themeName, onSelect }: WorkspaceModalProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [activeWs, setActiveWs] = useState<string | null>(null);

  const isDark = themeName === 'dark';

  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem('clawsquad-workspaces');
    if (saved) {
      setWorkspaces(JSON.parse(saved));
    } else {
      const defaultWs: Workspace[] = [
        { id: '1', name: 'ClawSquad', path: '/home/shidu10/ClawSquad', type: 'local' }
      ];
      setWorkspaces(defaultWs);
      localStorage.setItem('clawsquad-workspaces', JSON.stringify(defaultWs));
    }
  }, [isOpen]);

  const saveWorkspaces = (list: Workspace[]) => {
    setWorkspaces(list);
    localStorage.setItem('clawsquad-workspaces', JSON.stringify(list));
  };

  const addWorkspace = () => {
    if (!newName.trim() || !newPath.trim()) return;
    const ws: Workspace = {
      id: Date.now().toString(),
      name: newName.trim(),
      path: newPath.trim(),
      type: 'local'
    };
    saveWorkspaces([...workspaces, ws]);
    setNewName('');
    setNewPath('');
    setShowAdd(false);
  };

  const deleteWorkspace = (id: string) => {
    saveWorkspaces(workspaces.filter(w => w.id !== id));
  };

  const selectWorkspace = (ws: Workspace) => {
    setActiveWs(ws.id);
    onSelect(ws);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl ${
        isDark ? 'bg-slate-800 border border-indigo-500/30' : 'bg-white border border-gray-200'
      }`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            工作区 Workspaces
          </h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-auto">
          {workspaces.length === 0 && !showAdd && (
            <p className={`text-center py-8 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              暂无工作区，点击下方添加
            </p>
          )}

          <div className="space-y-2 mb-4">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  isDark ? 'bg-slate-900/50 hover:bg-slate-900' : 'bg-gray-50 hover:bg-gray-100'
                } ${activeWs === ws.id ? (isDark ? 'border border-indigo-500/50' : 'ring-2 ring-blue-500') : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Folder className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-blue-500'}`} />
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{ws.name}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{ws.path}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeWs === ws.id && <Check className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-blue-500'}`} />}
                  <button onClick={() => selectWorkspace(ws)} className={`px-3 py-1 text-xs rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>选择</button>
                  <button onClick={() => deleteWorkspace(ws.id)} className={`p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-slate-400' : 'hover:bg-red-50 text-gray-400'}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>

          {showAdd && (
            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>名称</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My Project" className={`w-full px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800 border border-slate-600 text-white' : 'bg-white border border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>路径</label>
                  <input type="text" value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="/home/user/project" className={`w-full px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800 border border-slate-600 text-white' : 'bg-white border border-gray-300 text-gray-900'}`} />
                </div>
                <div className="flex gap-2">
                  <button onClick={addWorkspace} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">添加</button>
                  <button onClick={() => setShowAdd(false)} className={`px-4 py-2 text-sm rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>取消</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {!showAdd && (
          <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> 添加工作区
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
