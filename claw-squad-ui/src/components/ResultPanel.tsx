/**
 * ResultPanel - Display Referee scoring and competition results
 */
import { Trophy, Star, Clock, Crown, Medal } from 'lucide-react';

export interface RefereeScore {
  overall: number;        // 0-100
  quality: number;        // 0-100
  speed: number;         // 0-100
  architecture: number;   // 0-100
  codeQuality: number;    // 0-100
  testCoverage: number;   // 0-100
  winner: 'A' | 'B' | 'tie';
  feedback: string;
  breakdown?: {
    correctness: number;
    performance: number;
    maintainability: number;
  };
}

export interface CompetitionResult {
  id: string;
  task: string;
  timestamp: number;
  teamA: {
    agentId: string;
    agentRole: string;
    output: string;
    duration: number;
    score?: RefereeScore;
  };
  teamB: {
    agentId: string;
    agentRole: string;
    output: string;
    duration: number;
    score?: RefereeScore;
  };
  winner: 'A' | 'B' | 'tie';
}

interface ResultPanelProps {
  result: CompetitionResult | null;
  theme: 'dark' | 'light';
}

function ScoreBar({ value, label, color, isDark }: { value: number; label: string; color: string; isDark: boolean }) {
  const percentage = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{label}</span>
        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{value.toFixed(1)}</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function TeamResultCard({
  team,
  label,
  color,
  theme,
}: {
  team: CompetitionResult['teamA'] | CompetitionResult['teamB'];
  label: string;
  color: 'indigo' | 'purple';
  theme: 'dark' | 'light';
}) {
  const isDark = theme === 'dark';
  const colorMap = {
    indigo: {
      bg: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50',
      border: isDark ? 'border-indigo-500/40' : 'border-indigo-200',
      text: isDark ? 'text-indigo-300' : 'text-indigo-700',
      bar: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    },
    purple: {
      bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
      border: isDark ? 'border-purple-500/40' : 'border-purple-200',
      text: isDark ? 'text-purple-300' : 'text-purple-700',
      bar: 'bg-gradient-to-r from-purple-500 to-pink-500',
    },
  };
  const c = colorMap[color];
  const score = team.score;

  return (
    <div
      className={`
        rounded-2xl border p-5 space-y-4
        ${c.bg} ${c.border}
      `}
    >
      {/* Team Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
              color === 'indigo'
                ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white'
                : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
            }`}
          >
            {label}
          </div>
          <div>
            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{label} Team</p>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{team.agentRole}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <Clock className="w-3.5 h-3.5" />
          <span>{team.duration}s</span>
        </div>
      </div>

      {/* Output Preview */}
      {team.output && (
        <div className={`rounded-lg p-3 ${isDark ? 'bg-black/30' : 'bg-white/60'}`}>
          <pre className={`text-xs font-mono truncate ${isDark ? 'text-green-400' : 'text-green-700'} max-h-12 overflow-hidden`}>
            {team.output}
          </pre>
        </div>
      )}

      {/* Scores */}
      {score ? (
        <div className="space-y-3">
          {/* Overall Score */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${c.text}`}>Overall</span>
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${c.text}`}>{score.overall.toFixed(1)}</span>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>/100</span>
            </div>
          </div>
          <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div
              className={`h-full rounded-full ${c.bar}`}
              style={{ width: `${score.overall}%` }}
            />
          </div>

          {/* Sub-scores */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <ScoreBar value={score.quality} label="Quality" color={c.bar} isDark={isDark} />
            <ScoreBar value={score.speed} label="Speed" color={c.bar} isDark={isDark} />
            <ScoreBar value={score.architecture} label="Architecture" color={c.bar} isDark={isDark} />
            <ScoreBar value={score.codeQuality} label="Code" color={c.bar} isDark={isDark} />
            {score.testCoverage > 0 && (
              <ScoreBar value={score.testCoverage} label="Coverage" color={c.bar} isDark={isDark} />
            )}
          </div>

          {/* Feedback */}
          {score.feedback && (
            <div className={`mt-2 p-3 rounded-lg text-xs ${isDark ? 'bg-black/20' : 'bg-white/40'}`}>
              <p className={`font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                <Medal className="w-3 h-3 inline mr-1" />
                Referee Feedback
              </p>
              <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>{score.feedback}</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`text-center py-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          <p className="text-xs">No scoring available</p>
        </div>
      )}
    </div>
  );
}

export function ResultPanel({ result, theme }: ResultPanelProps) {
  const isDark = theme === 'dark';

  if (!result) {
    return (
      <div
        className={`
          rounded-2xl border p-8 text-center
          ${isDark ? 'bg-slate-800/50 border-indigo-500/20' : 'bg-white border-gray-200'}
        `}
      >
        <Trophy className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
        <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>No results yet — run a competition first</p>
      </div>
    );
  }

  const { teamA, teamB, winner } = result;

  return (
    <div className="space-y-4">
      {/* Winner Banner */}
      <div
        className={`
          rounded-2xl border-2 p-5 text-center
          ${winner === 'A'
            ? isDark ? 'bg-indigo-500/10 border-indigo-500/60' : 'bg-indigo-50 border-indigo-300'
            : winner === 'B'
            ? isDark ? 'bg-purple-500/10 border-purple-500/60' : 'bg-purple-50 border-purple-300'
            : isDark ? 'bg-slate-800/50 border-slate-500/40' : 'bg-gray-50 border-gray-300'
          }
        `}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Crown
            className={`w-7 h-7 ${
              winner === 'A'
                ? 'text-indigo-400'
                : winner === 'B'
                ? 'text-purple-400'
                : isDark
                ? 'text-slate-400'
                : 'text-gray-400'
            }`}
          />
          <span
            className={`text-xl font-bold ${
              winner === 'A'
                ? isDark ? 'text-indigo-300' : 'text-indigo-700'
                : winner === 'B'
                ? isDark ? 'text-purple-300' : 'text-purple-700'
                : isDark ? 'text-slate-300' : 'text-gray-600'
            }`}
          >
            {winner === 'tie' ? '🤝 Tie!' : `🏆 Team ${winner} Wins!`}
          </span>
          <Crown
            className={`w-7 h-7 ${
              winner === 'A'
                ? 'text-indigo-400'
                : winner === 'B'
                ? 'text-purple-400'
                : isDark
                ? 'text-slate-400'
                : 'text-gray-400'
            }`}
          />
        </div>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Competition: {result.task}
        </p>
      </div>

      {/* Team Cards */}
      <div className="grid grid-cols-2 gap-4">
        <TeamResultCard team={teamA} label="Team A" color="indigo" theme={theme} />
        <TeamResultCard team={teamB} label="Team B" color="purple" theme={theme} />
      </div>

      {/* Detailed Breakdown */}
      {teamA.score?.breakdown && (
        <div
          className={`
            rounded-xl border p-4
            ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}
          `}
        >
          <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Star className="w-4 h-4 inline mr-1 text-yellow-500" />
            Detailed Breakdown
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Correctness', value: teamA.score.breakdown.correctness },
              { label: 'Performance', value: teamA.score.breakdown.performance },
              { label: 'Maintainability', value: teamA.score.breakdown.maintainability },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {value.toFixed(1)}
                </p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
