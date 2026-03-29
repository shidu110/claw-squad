/**
 * CEO Brain - ClawSquad v2.1
 * 
 * OpenClaw 作为 CEO，负责:
 * 1. 理解用户任务
 * 2. 分析任务 → 确定所需角色
 * 3. 动态组建 Worker Team
 * 4. 通过 Bridge Server 协调
 * 5. 收集结果 → 汇总输出
 */

import { TeamFactory, Team, Agent, Subtask, TeamStatus, AgentStatus } from './team-factory.js';
import { Role, inferRolesFromTask, createAgentTemplate, getRoleConfig, AgentTemplate } from './role-config.js';

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'analyzing' | 'forming' | 'executing' | 'reviewing' | 'improving' | 'completed' | 'failed';
  team?: Team;
  subtasks: Subtask[];
  reviewSubtasks?: Subtask[];      // 审查阶段
  improvementSubtasks?: Subtask[]; // 改进阶段
  results: Map<string, string>;    // agentId → result
  reviewResults?: Map<string, string>;  // 审查结果
  startedAt: Date;
  completedAt?: Date;
  summary?: string;
  finalSummary?: string;          // 最终总结（含改进）
}

export interface FormationResult {
  team: Team;
  assignments: Subtask[];
  unassignedRoles: Role[];
}

/**
 * CEO Brain - 任务分析、团队组建、任务协调
 */
export class CEOBrain {
  private teamFactory: TeamFactory;
  private activeTasks: Map<string, Task> = new Map();

  constructor(teamFactory: TeamFactory) {
    this.teamFactory = teamFactory;
  }

  /**
   * 处理用户任务
   * 
   * 流程:
   * 1. 分析任务 → 确定角色
   * 2. 组建团队 → 按角色分配 CLI/API
   * 3. 分解子任务 → 分配给 Agent
   * 4. 启动执行 → Bridge Server 分发
   */
  async processTask(taskDescription: string): Promise<Task> {
    const task: Task = {
      id: crypto.randomUUID(),
      description: taskDescription,
      status: 'analyzing',
      subtasks: [],
      results: new Map(),
      startedAt: new Date()
    };

    this.activeTasks.set(task.id, task);

    // Step 1: 分析任务 → 确定所需角色
    const requiredRoles = this.analyzeRoles(taskDescription);
    task.status = 'forming';

    // Step 2: 组建团队
    const formation = this.formTeam(task.id, taskDescription, requiredRoles);
    task.team = formation.team;
    task.subtasks = formation.assignments;

    // Step 3: 启动执行 (标记为 ready)
    this.teamFactory.updateTeamStatus(formation.team.id, 'ready');
    task.status = 'executing';

    return task;
  }

  /**
   * 分析任务 → 确定所需角色
   */
  analyzeRoles(taskDescription: string): Role[] {
    return inferRolesFromTask(taskDescription);
  }

  /**
   * 组建团队 - 动态分配角色和 CLI
   * 
   * 规则:
   * - 根据任务推断所需角色
   * - 必须包含: reviewer (代码审查)
   * - 必须包含: guardian (边界/异常守护)
   * - 可选: critic (质疑者，复杂任务时)
   */
  formTeam(taskId: string, taskDescription: string, roles: Role[]): FormationResult {
    // 创建 Team
    const teamName = `Team-${taskId.slice(0, 8)}`;
    const team = this.teamFactory.createTeam(teamName);
    team.taskId = taskId;

    const assignments: Subtask[] = [];
    const roleCount: Map<Role, number> = new Map();

    // 必须角色: reviewer
    const mandatoryRoles: Role[] = ['reviewer', 'guardian'];
    const allRoles = [...new Set([...roles, ...mandatoryRoles])];

    // 遍历所需角色，为每个角色创建 Agent
    for (const role of allRoles) {
      const count = roleCount.get(role) || 0;
      roleCount.set(role, count + 1);

      // 创建 Agent 模板
      const template = createAgentTemplate(role, count + 1);
      
      // 注册 Agent
      const agent = this.teamFactory.registerAgent(template);
      
      // 添加到 Team
      this.teamFactory.addAgentToTeam(team.id, agent.id);

      // 创建对应的 Subtask
      const subtask: Subtask = {
        id: crypto.randomUUID(),
        description: this.getSubtaskDescription(role, taskDescription),
        role,
        assignedTo: agent.id,
        status: 'pending'
      };
      assignments.push(subtask);
    }

    // 检查是否有未分配的角色 (缺少合适的 Agent)
    const assignedRoles = new Set(assignments.map(a => a.role));
    const unassignedRoles = allRoles.filter(r => !assignedRoles.has(r));

    return { team, assignments, unassignedRoles };
  }

  /**
   * 根据角色生成子任务描述
   */
  private getSubtaskDescription(role: Role, originalTask: string): string {
    switch (role) {
      case 'architect':
        return `设计架构: ${originalTask} 的系统架构和技术选型`;
      case 'coder':
        return `实现: ${originalTask} 的核心代码`;
      case 'researcher':
        return `调研: ${originalTask} 相关的最新技术和最佳实践`;
      case 'reviewer':
        return `审查: ${originalTask} 的代码质量和改进建议`;
      case 'tester':
        return `测试: ${originalTask} 的测试用例和验证`;
      case 'utility':
        return `工具: ${originalTask} 的文件操作和辅助工作`;
      default:
        return originalTask;
    }
  }

  /**
   * 分配 Subtask 给 Agent
   */
  assignSubtask(taskId: string, subtaskId: string, agentId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return false;

    subtask.assignedTo = agentId;
    subtask.status = 'assigned';

    // 更新 Agent 状态
    this.teamFactory.updateAgentStatus(agentId, 'busy');

    return true;
  }

  /**
   * 接收 Agent 的执行结果
   */
  receiveResult(taskId: string, agentId: string, result: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.results.set(agentId, result);

    // 更新 Agent 状态
    this.teamFactory.updateAgentStatus(agentId, 'completed');

    // 更新 Subtask 状态
    const subtask = task.subtasks.find(s => s.assignedTo === agentId);
    if (subtask) {
      subtask.status = 'done';
      subtask.result = result;
    }

    // 检查是否所有 Subtask 都完成
    const allDone = task.subtasks.every(s => s.status === 'done' || s.status === 'failed');
    if (allDone) {
      this.finalizeTask(taskId);
    }
  }

  /**
   * 完成 Task → 进入审查阶段
   * 
   * 流程: 执行 → 审查 → 改进 → 完成
   */
  private finalizeTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    // 生成执行阶段总结
    const summaries: string[] = [];
    for (const subtask of task.subtasks) {
      if (subtask.result) {
        summaries.push(`## ${subtask.role}\n${subtask.result}`);
      }
    }
    task.summary = summaries.join('\n\n');

    // 进入审查阶段
    task.status = 'reviewing';

    // 创建审查子任务
    const reviewSubtasks: Subtask[] = [];
    const team = task.team;
    if (team) {
      // 找到 reviewer 和 guardian
      for (const agent of team.agents) {
        if (agent.role === 'reviewer' || agent.role === 'guardian') {
          const reviewSubtask: Subtask = {
            id: crypto.randomUUID(),
            description: this.getReviewDescription(agent.role, task),
            role: agent.role,
            assignedTo: agent.id,
            status: 'pending'
          };
          reviewSubtasks.push(reviewSubtask);
          // 更新 Agent 状态为 busy
          this.teamFactory.updateAgentStatus(agent.id, 'busy');
        }
      }
    }
    task.reviewSubtasks = reviewSubtasks;

    // 如果没有找到 reviewer，创建默认审查任务
    if (reviewSubtasks.length === 0) {
      // 仍然标记为完成
      this.completeTask(taskId);
    }
  }

  /**
   * 获取审查任务描述
   */
  private getReviewDescription(role: Role, task: Task): string {
    const context = task.summary || '';
    switch (role) {
      case 'reviewer':
        return `审查以下实现的质量、代码规范和改进建议:\n\n${context}`;
      case 'guardian':
        return `检查以下实现的边界条件、异常处理和潜在风险:\n\n${context}`;
      case 'critic':
        return `质疑以下实现的问题和潜在缺陷:\n\n${context}`;
      default:
        return `审查: ${task.description}`;
    }
  }

  /**
   * 接收审查结果
   */
  receiveReviewResult(taskId: string, agentId: string, result: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task || !task.reviewSubtasks) return;

    // 记录审查结果
    if (!task.reviewResults) {
      task.reviewResults = new Map();
    }
    task.reviewResults.set(agentId, result);

    // 更新审查 Subtask 状态
    const reviewSubtask = task.reviewSubtasks.find(s => s.assignedTo === agentId);
    if (reviewSubtask) {
      reviewSubtask.status = 'done';
      reviewSubtask.result = result;
    }

    // 更新 Agent 状态
    this.teamFactory.updateAgentStatus(agentId, 'completed');

    // 检查是否所有审查都完成
    const allReviewDone = task.reviewSubtasks.every(
      s => s.status === 'done' || s.status === 'failed'
    );
    if (allReviewDone) {
      // 进入改进阶段
      this.startImprovementPhase(taskId);
    }
  }

  /**
   * 开始改进阶段
   * 根据审查结果，分配改进任务给相关 Agent
   */
  private startImprovementPhase(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.status = 'improving';

    // 汇总审查意见
    const reviewSummary: string[] = [];
    if (task.reviewResults) {
      for (const [agentId, result] of task.reviewResults) {
        const agent = task.team?.agents.find(a => a.id === agentId);
        reviewSummary.push(`### ${agent?.role || agentId} 审查意见:\n${result}`);
      }
    }

    // 找到 coder 角色，分配改进任务
    if (task.team) {
      const coders = task.team.agents.filter(a => a.role === 'coder' || a.role === 'coder-alt');
      const improvementSubtasks: Subtask[] = [];

      for (const coder of coders) {
        const improvementTask: Subtask = {
          id: crypto.randomUUID(),
          description: `根据审查意见改进实现:\n\n${reviewSummary.join('\n\n')}`,
          role: 'coder',
          assignedTo: coder.id,
          status: 'pending'
        };
        improvementSubtasks.push(improvementTask);
        // 更新 Agent 状态
        this.teamFactory.updateAgentStatus(coder.id, 'busy');
      }
      task.improvementSubtasks = improvementSubtasks;
    }

    // 如果没有 coder，直接完成
    if (!task.improvementSubtasks || task.improvementSubtasks.length === 0) {
      this.completeTask(taskId);
    }
  }

  /**
   * 接收改进结果
   */
  receiveImprovementResult(taskId: string, agentId: string, result: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task || !task.improvementSubtasks) return;

    // 记录改进结果
    task.results.set(agentId, result);

    // 更新改进 Subtask 状态
    const improvementSubtask = task.improvementSubtasks.find(s => s.assignedTo === agentId);
    if (improvementSubtask) {
      improvementSubtask.status = 'done';
      improvementSubtask.result = result;
    }

    // 更新 Agent 状态
    this.teamFactory.updateAgentStatus(agentId, 'completed');

    // 检查是否所有改进都完成
    const allImproved = task.improvementSubtasks.every(
      s => s.status === 'done' || s.status === 'failed'
    );
    if (allImproved) {
      this.completeTask(taskId);
    }
  }

  /**
   * 最终完成 Task
   */
  private completeTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.completedAt = new Date();

    // 生成最终总结
    const finalParts: string[] = [];

    // 原始实现总结
    if (task.summary) {
      finalParts.push(`## 实现结果\n\n${task.summary}`);
    }

    // 审查意见总结
    if (task.reviewResults) {
      const reviewParts: string[] = [];
      for (const [agentId, result] of task.reviewResults) {
        const agent = task.team?.agents.find(a => a.id === agentId);
        reviewParts.push(`### ${agent?.role || agentId}:\n${result}`);
      }
      finalParts.push(`## 审查意见\n\n${reviewParts.join('\n\n')}`);
    }

    // 改进总结
    if (task.improvementSubtasks) {
      const improved = task.improvementSubtasks.filter(s => s.result);
      if (improved.length > 0) {
        const improvementParts: string[] = [];
        for (const s of improved) {
          improvementParts.push(`### ${s.role}:\n${s.result}`);
        }
        finalParts.push(`## 改进结果\n\n${improvementParts.join('\n\n')}`);
      }
    }

    task.finalSummary = finalParts.join('\n\n---\n\n');

    // 更新 Team 状态
    if (task.team) {
      this.teamFactory.updateTeamStatus(task.team.id, 'completed');
    }
  }

  /**
   * 获取 Task 状态
   */
  getTaskStatus(taskId: string): {
    status: Task['status'];
    progress: { done: number; total: number };
    team?: ReturnType<TeamFactory['getTeamOverview']>;
    summary?: string;
  } | null {
    const task = this.activeTasks.get(taskId);
    if (!task) return null;

    const done = task.subtasks.filter(s => s.status === 'done').length;

    return {
      status: task.status,
      progress: { done, total: task.subtasks.length },
      team: task.team ? this.teamFactory.getTeamOverview(task.team.id) : undefined,
      summary: task.summary
    };
  }

  /**
   * 获取所有活跃任务
   */
  getActiveTasks(): Task[] {
    return Array.from(this.activeTasks.values()).filter(
      t => t.status !== 'completed' && t.status !== 'failed'
    );
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;

    task.status = 'failed';
    task.completedAt = new Date();

    // 断开所有 Agent
    if (task.team) {
      for (const agent of task.team.agents) {
        this.teamFactory.updateAgentStatus(agent.id, 'disconnected');
      }
      this.teamFactory.updateTeamStatus(task.team.id, 'failed');
    }

    return true;
  }

  /**
   * 建议的 CLI/模型组合 (用于提示)
   */
  suggestCLIForRole(role: Role): { cli: string; model: string; api: string } {
    const config = getRoleConfig(role);
    return {
      cli: config.defaultCLI,
      model: config.defaultModel,
      api: config.apiProvider
    };
  }
}

// 导出便捷函数
export function createCEOBrain(teamFactory?: TeamFactory): CEOBrain {
  return new CEOBrain(teamFactory || new TeamFactory());
}
