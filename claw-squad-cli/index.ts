#!/usr/bin/env node
/**
 * CLI Orchestrator Entry Point - ClawSquad v2.1
 */

import { CliOrchestrator } from './orchestrator.js';
import { TeamFactory } from '../claw-squad-core/team-factory.js';

// 创建 TeamFactory
const teamFactory = new TeamFactory();

// 创建 Orchestrator
const orchestrator = new CliOrchestrator(teamFactory, { bridgePort: 9876 });

// 启动
orchestrator.start();
