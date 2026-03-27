/**
 * TerminalPanel - Real terminal output using xterm.js
 * Integrates @xterm/xterm and @xterm/addon-fit
 */
import { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Maximize2, Minimize2, Trash2 } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  teamId: 'A' | 'B';
  output: string[];
  theme: 'dark' | 'light';
  fullscreen?: boolean;
  onFullscreen?: () => void;
  onClear?: () => void;
}

export function TerminalPanel({
  teamId,
  output,
  theme,
  fullscreen = false,
  onFullscreen,
  onClear,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const isDark = theme === 'dark';

  const darkTheme = {
    background: '#0a0e17',
    foreground: '#e0e7ff',
    cursor: '#818cf8',
    cursorAccent: '#0a0e17',
    selectionBackground: '#3730a3',
    black: '#1e1e2e',
    red: '#f87171',
    green: '#4ade80',
    yellow: '#fbbf24',
    blue: '#60a5fa',
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: '#e0e7ff',
    brightBlack: '#6b7280',
    brightRed: '#fca5a5',
    brightGreen: '#86efac',
    brightYellow: '#fcd34d',
    brightBlue: '#93c5fd',
    brightMagenta: '#d8b4fe',
    brightCyan: '#67e8f9',
    brightWhite: '#f8fafc',
  };

  const lightTheme = {
    background: '#f8fafc',
    foreground: '#1e293b',
    cursor: '#4f46e5',
    cursorAccent: '#f8fafc',
    selectionBackground: '#c7d2fe',
    black: '#1e293b',
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    blue: '#3b82f6',
    magenta: '#a855f7',
    cyan: '#06b6d4',
    white: '#f1f5f9',
    brightBlack: '#64748b',
    brightRed: '#f87171',
    brightGreen: '#4ade80',
    brightYellow: '#fcd34d',
    brightBlue: '#60a5fa',
    brightMagenta: '#c084fc',
    brightCyan: '#22d3ee',
    brightWhite: '#f8fafc',
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerminal({
      theme: isDark ? darkTheme : lightTheme,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln(`\x1b[36m◆ Team ${teamId} Terminal\x1b[0m`);
    term.writeln(`\x1b[90m───────────────────────────────────\x1b[0m`);
    term.writeln('');

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [teamId, isDark]);

  // Write new output lines
  useEffect(() => {
    const term = terminalRef.current;
    if (!term || output.length === 0) return;

    // Write only the latest output
    const lastLine = output[output.length - 1];
    if (lastLine) {
      term.writeln(lastLine);
      term.scrollToBottom();
    }
  }, [output]);

  const terminalHeight = fullscreen ? 'h-[calc(100vh-8rem)]' : 'h-48';

  return (
    <div
      className={`
        ${isDark ? 'bg-[#0a0e17]' : 'bg-[#f8fafc]'}
        rounded-xl border ${isDark ? 'border-indigo-500/30' : 'border-gray-200'}
        overflow-hidden flex flex-col
      `}
    >
      {/* Terminal Header */}
      <div
        className={`
          flex items-center justify-between px-4 py-2
          ${isDark ? 'bg-slate-800/80 border-b border-slate-700' : 'bg-gray-100 border-b border-gray-200'}
        `}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className={`text-xs font-medium ml-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Team {teamId}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onClear && (
            <button
              onClick={onClear}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'
              }`}
              title="Clear"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'
              }`}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div ref={containerRef} className={`flex-1 ${terminalHeight} p-2 overflow-hidden`} />
    </div>
  );
}
