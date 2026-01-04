import * as vscode from 'vscode';
import axios from 'axios';
import { createHash } from 'crypto';
import { AuthManager } from '../auth/AuthManager';

const API_URL = 'http://localhost:4000';

interface ActiveTask {
  label: string;
  startTime: Date;
  pid: number | undefined;
}

interface ActiveTerminalCommand {
  commandLine: string;
  startTime: Date;
}

export class TaskRunsTracker {
  private disposables: vscode.Disposable[] = [];
  private activeTasks = new Map<string, ActiveTask>();
  private activeTerminalCommands = new Map<number, ActiveTerminalCommand>();

  // Patterns for detecting task kinds
  private testPatterns = [
    /\btest\b/i,
    /\bjest\b/i,
    /\bvitest\b/i,
    /\bmocha\b/i,
    /\bpytest\b/i,
    /\bkarma\b/i,
    /\bjasmine\b/i,
    /\bava\b/i,
    /\bnpm\s+(run\s+)?test\b/i,
    /\byarn\s+test\b/i,
    /\bpnpm\s+test\b/i,
  ];

  private buildPatterns = [
    /\bbuild\b/i,
    /\bcompile\b/i,
    /\btsc\b/i,
    /\bwebpack\b/i,
    /\brollup\b/i,
    /\bvite\b(?!.*test)/i, // vite but not vite test
    /\bgradle\s+build\b/i,
    /\bdotnet\s+build\b/i,
    /\bmake\b/i,
    /\bnpm\s+(run\s+)?build\b/i,
    /\byarn\s+build\b/i,
    /\bpnpm\s+build\b/i,
  ];

  private watchPatterns = [
    /--watch\b/i,
    /\bwatch\b/i,
    /--dev\b/i,
    /\bdev\b/i,
    /-w\b/,
    /webpack-dev-server/i,
    /vite\b(?!.*build)/i, // vite without build
  ];

  constructor(
    private authManager: AuthManager,
    private workspaceFolder?: vscode.WorkspaceFolder
  ) {
    this.init();
  }

  private init(): void {
    // Listen to task start events
    const startListener = vscode.tasks.onDidStartTaskProcess((event) => {
      this.handleTaskStart(event);
    });

    // Listen to task end events
    const endListener = vscode.tasks.onDidEndTaskProcess((event) => {
      this.handleTaskEnd(event);
    });

    // Listen to terminal shell execution (for commands run in terminal)
    const terminalStartListener = vscode.window.onDidStartTerminalShellExecution((event) => {
      this.handleTerminalCommandStart(event);
    });

    const terminalEndListener = vscode.window.onDidEndTerminalShellExecution((event) => {
      this.handleTerminalCommandEnd(event);
    });

    this.disposables.push(startListener, endListener, terminalStartListener, terminalEndListener);
  }

  private handleTaskStart(event: vscode.TaskProcessStartEvent): void {
    const task = event.execution.task;
    const label = this.normalizeLabel(task.name);
    const taskKey = this.getTaskKey(task, event.processId);

    const activeTask: ActiveTask = {
      label,
      startTime: new Date(),
      pid: event.processId,
    };

    this.activeTasks.set(taskKey, activeTask);
    console.log(`[TaskRuns] Task started: ${label} (pid: ${event.processId})`);
  }

  private async handleTaskEnd(event: vscode.TaskProcessEndEvent): Promise<void> {
    const task = event.execution.task;
    
    // Try to find the active task - we need to search by task name since we don't have processId in end event
    let activeTask: ActiveTask | undefined;
    let taskKey: string | undefined;
    
    for (const [key, active] of this.activeTasks.entries()) {
      if (key.startsWith(task.name + '|')) {
        activeTask = active;
        taskKey = key;
        break;
      }
    }

    if (!activeTask || !taskKey) {
      console.log(`[TaskRuns] Task end event without start: ${task.name}`);
      return;
    }

    this.activeTasks.delete(taskKey);

    const endTime = new Date();
    const durationSec = Math.floor((endTime.getTime() - activeTask.startTime.getTime()) / 1000);
    const exitCode = event.exitCode;

    // Determine result
    let result: 'pass' | 'fail' | 'cancelled';
    if (exitCode === undefined) {
      result = 'cancelled';
    } else if (exitCode === 0) {
      result = 'pass';
    } else {
      result = 'fail';
    }

    // Detect kind
    const kind = this.detectKind(activeTask.label);
    if (!kind) {
      console.log(`[TaskRuns] Could not detect kind for task: ${activeTask.label}`);
      return;
    }

    // Detect if watch-like
    const isWatchLike = this.isWatchLike(activeTask.label);

    // Send to backend
    await this.sendTaskRun({
      label: activeTask.label,
      kind,
      startTs: activeTask.startTime.toISOString(),
      endTs: endTime.toISOString(),
      durationSec,
      result,
      pid: activeTask.pid,
      isWatchLike,
    });

    console.log(
      `[TaskRuns] Task completed: ${activeTask.label} - ${kind} - ${result} (${durationSec}s)`
    );
  }

  private detectKind(label: string): 'test' | 'build' | null {
    // Check test patterns first
    for (const pattern of this.testPatterns) {
      if (pattern.test(label)) {
        return 'test';
      }
    }

    // Check build patterns
    for (const pattern of this.buildPatterns) {
      if (pattern.test(label)) {
        return 'build';
      }
    }

    return null;
  }

  private isWatchLike(label: string): boolean {
    for (const pattern of this.watchPatterns) {
      if (pattern.test(label)) {
        return true;
      }
    }
    return false;
  }

  private normalizeLabel(label: string): string {
    return label.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private getTaskKey(task: vscode.Task, pid: number | undefined): string {
    // Use task name + pid to uniquely identify a task execution
    return `${task.name}|${pid || 'no-pid'}`;
  }

  private async sendTaskRun(data: {
    label: string;
    kind: 'test' | 'build';
    startTs: string;
    endTs: string;
    durationSec: number;
    result: 'pass' | 'fail' | 'cancelled';
    pid: number | undefined;
    isWatchLike: boolean;
  }): Promise<void> {
    try {
      const user = this.authManager.getUser();
      if (!user) {
        return;
      }

      const workspaceId = this.workspaceFolder
        ? this.hashPath(this.workspaceFolder.uri.fsPath)
        : undefined;

      await axios.post(`${API_URL}/api/task-runs`, {
        userId: user.id,
        workspaceId,
        ...data,
      });

      console.log(`[TaskRuns] Run saved: ${data.kind} - ${data.label} - ${data.result}`);
    } catch (error) {
      console.error('[TaskRuns] Failed to send task run:', error);
    }
  }

  private hashPath(path: string): string {
    return createHash('sha256').update(path).digest('hex').substring(0, 16);
  }

  // Terminal command handlers
  private handleTerminalCommandStart(event: vscode.TerminalShellExecutionStartEvent): void {
    const commandLine = event.execution.commandLine.value;
    
    // Check if this is a build or test command
    const kind = this.detectKind(commandLine);
    if (!kind) {
      return; // Not a build or test command
    }

    const execId = event.execution.commandLine.value + '|' + Date.now();
    const activeCommand: ActiveTerminalCommand = {
      commandLine,
      startTime: new Date(),
    };

    // Use a unique key based on execution object
    const key = this.getTerminalCommandKey(event.execution);
    this.activeTerminalCommands.set(key, activeCommand);
    
    console.log(`[TaskRuns] Terminal command started: ${commandLine}`);
  }

  private async handleTerminalCommandEnd(event: vscode.TerminalShellExecutionEndEvent): Promise<void> {
    const key = this.getTerminalCommandKey(event.execution);
    const activeCommand = this.activeTerminalCommands.get(key);

    if (!activeCommand) {
      return;
    }

    this.activeTerminalCommands.delete(key);

    const endTime = new Date();
    const durationSec = Math.floor((endTime.getTime() - activeCommand.startTime.getTime()) / 1000);
    const exitCode = event.exitCode;

    // Determine result
    let result: 'pass' | 'fail' | 'cancelled';
    if (exitCode === undefined) {
      result = 'cancelled';
    } else if (exitCode === 0) {
      result = 'pass';
    } else {
      result = 'fail';
    }

    // Detect kind
    const kind = this.detectKind(activeCommand.commandLine);
    if (!kind) {
      return;
    }

    // Detect if watch-like
    const isWatchLike = this.isWatchLike(activeCommand.commandLine);

    // Send to backend
    await this.sendTaskRun({
      label: activeCommand.commandLine,
      kind,
      startTs: activeCommand.startTime.toISOString(),
      endTs: endTime.toISOString(),
      durationSec,
      result,
      pid: undefined,
      isWatchLike,
    });

    console.log(
      `[TaskRuns] Terminal command completed: ${activeCommand.commandLine} - ${kind} - ${result} (${durationSec}s)`
    );
  }

  private getTerminalCommandKey(execution: vscode.TerminalShellExecution): number {
    // Use the execution object's identity as a unique key
    // We'll use a counter-based approach since we can't get object identity directly
    return (execution as any).__taskRunsId || ((execution as any).__taskRunsId = Math.random());
  }

  public dispose(): void {
    // Clear active tasks
    this.activeTasks.clear();
    this.activeTerminalCommands.clear();

    // Dispose all listeners
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
