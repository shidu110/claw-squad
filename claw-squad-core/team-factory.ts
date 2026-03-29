/**
 * Team Factory - ClawSquad v2.1
 * 
 * Agent 和 Team 的生命周期管理
 * 支持动态组队、角色分配
 */

import { Role, CLITYPE, AgentTemplate, createAgentTemplate } from './role-config.js';

export type AgentStatus = 'idle' | 'busy' | 'completed' | 'failed' | 'disconnected';
export type TeamStatus = 'forming' | 'ready' | 'executing' | 'completed' | 'failed';

export interface Agent {
  id: string;
  name: string;
  role: Role;
  cli: CLITYPE;
  model: string;
  apiProvider: string;
  status: AgentStatus;
  color: string;
  capabilities: string[];
  connectedAt: Date;
  taskId?: string;        // 当前任务 ID
  lastMessage?: string;   // 最后一次消息
}

export interface Team {
  id: string;
  name: string;
  status: TeamStatus;
  agents: Agent[];
  createdAt: Date;
  taskId?: string;
}

export interface Subtask {
  id: string;
  description: string;
  role: Role;           // 期望的角色
  assignedTo?: string;   // agentId
  status: 'pending' | 'assigned' | 'executing' | 'done' | 'failed';
  result?: string;
}

/**
 * Team Factory - 管理 Agent 和 Team 的生命周期
 */
export class TeamFactory {
  private teams: Map<string, Team> = new Map();
  private agents: Map<string, Agent> = new Map();

  /**
   * 创建 Team
   */
  createTeam(name: string): Team {
    const team: Team = {
      id: crypto.randomUUID(),
      name,
      status: 'forming',
      agents: [],
      createdAt: new Date()
    };
    this.teams.set(team.id, team);
    return team;
  }

  /**
   * 销毁 Team
   */
  destroyTeam(teamId: string): void {
    const team = this.teams.get(teamId);
    if (team) {
      // 断开所有 Agent
      team.agents.forEach(a => this.agents.delete(a.id));
      this.teams.delete(teamId);
    }
  }

  /**
   * 注册 Agent (单个 Worker)
   */
  registerAgent(template: AgentTemplate): Agent {
    const agent: Agent = {
      id: template.id,
      name: template.name,
      role: template.role,
      cli: template.cli,
      model: template.model,
      apiProvider: template.apiProvider,
      status: 'idle',
      color: template.color,
      capabilities: [],  // 后续从 role-config 填充
      connectedAt: new Date()
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  /**
   * 添加 Agent 到 Team
   */
  addAgentToTeam(teamId: string, agentId: string): Team | null {
    const team = this.teams.get(teamId);
    const agent = this.agents.get(agentId);
    if (!team || !agent) return null;

    if (!team.agents.find(a => a.id === agentId)) {
      team.agents.push(agent);
    }
    return team;
  }

  /**
   * 从 Team 移除 Agent
   */
  removeAgentFromTeam(teamId: string, agentId: string): Team | null {
    const team = this.teams.get(teamId);
    if (!team) return null;

    team.agents = team.agents.filter(a => a.id !== agentId);
    return team;
  }

  /**
   * 更新 Agent 状态
   */
  updateAgentStatus(agentId: string, status: AgentStatus): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    agent.status = status;
    return agent;
  }

  /**
   * 更新 Team 状态
   */
  updateTeamStatus(teamId: string, status: TeamStatus): Team | null {
    const team = this.teams.get(teamId);
    if (!team) return null;
    team.status = status;
    return team;
  }

  /**
   * 按角色查找空闲 Agent
   */
  findIdleAgentByRole(role: Role): Agent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.role === role && agent.status === 'idle') {
        return agent;
      }
    }
    return undefined;
  }

  /**
   * 查找所有空闲 Agent
   */
  findIdleAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.status === 'idle');
  }

  /**
   * 按角色统计
   */
  getAgentsByRole(role: Role): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.role === role);
  }

  /**
   * 获取 Team 概览
   */
  getTeamOverview(teamId: string): {
    id: string;
    name: string;
    status: TeamStatus;
    agents: Array<{ id: string; name: string; role: Role; status: AgentStatus; cli: CLITYPE }>;
    stats: { total: number; idle: number; busy: number; completed: number; failed: number };
  } | null {
    const team = this.teams.get(teamId);
    if (!team) return null;

    return {
      id: team.id,
      name: team.name,
      status: team.status,
      agents: team.agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        status: a.status,
        cli: a.cli
      })),
      stats: {
        total: team.agents.length,
        idle: team.agents.filter(a => a.status === 'idle').length,
        busy: team.agents.filter(a => a.status === 'busy').length,
        completed: team.agents.filter(a => a.status === 'completed').length,
        failed: team.agents.filter(a => a.status === 'failed').length
      }
    };
  }

  /**
   * 获取所有活跃 Team
   */
  getActiveTeams(): Team[] {
    return Array.from(this.teams.values()).filter(
      t => t.status === 'forming' || t.status === 'ready' || t.status === 'executing'
    );
  }

  /**
   * 获取所有 Agent
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 清理已完成的 Agent
   */
  cleanupCompleted(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [id, agent] of this.agents) {
      if (agent.status === 'completed' || agent.status === 'failed') {
        const age = now - agent.connectedAt.getTime();
        if (age > maxAgeMs) {
          this.agents.delete(id);
        }
      }
    }
  }
}

// 导出单例
export const teamFactory = new TeamFactory();
