export type TeamStatus = "forming" | "ready" | "competing" | "finished";
export type TeamType = "subagent" | "cli";
export type AgentStatus = "idle" | "active" | "completed" | "failed";

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  joinedAt: Date;
}

export interface Team {
  id: string;
  type: TeamType;
  roles: string[];
  status: TeamStatus;
  agents: Agent[];
  createdAt: Date;
}

export class TeamFactory {
  static createTeam(type: TeamType, roles: string[]): Team {
    return {
      id: crypto.randomUUID(),
      type,
      roles,
      status: "forming",
      agents: [],
      createdAt: new Date(),
    };
  }

  static addAgent(team: Team, name: string, role: string): Agent {
    const agent: Agent = {
      id: crypto.randomUUID(),
      name,
      role,
      status: "idle",
      joinedAt: new Date(),
    };
    return { ...team, agents: [...team.agents, agent] };
  }

  static removeAgent(team: Team, agentId: string): Team {
    return {
      ...team,
      agents: team.agents.filter((a) => a.id !== agentId),
    };
  }

  static updateTeamStatus(team: Team, status: TeamStatus): Team {
    return { ...team, status };
  }

  static updateAgentStatus(team: Team, agentId: string, status: AgentStatus): Team {
    return {
      ...team,
      agents: team.agents.map((a) => (a.id === agentId ? { ...a, status } : a)),
    };
  }
}
