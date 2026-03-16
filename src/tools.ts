import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TasketApiClient } from './api-client.js';

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function apiError(err: any) {
  const msg = err?.response?.data ?? err?.message ?? 'Unknown error';
  return json({ error: msg });
}

export function registerAllTools(server: McpServer, api: TasketApiClient, token: string) {

  // ══════════════════════════════════════════════════════════════════
  // TASK OPERATIONS (7)
  // ══════════════════════════════════════════════════════════════════

  server.tool('create_task', 'Create a new task in a project with optional pipeline stages', {
    title: z.string().min(1).max(200),
    projectId: z.string(),
    description: z.string().optional(),
    priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
    dueDate: z.string().optional().describe('ISO date YYYY-MM-DD'),
    stages: z.array(z.object({ assigneeId: z.string(), label: z.string() })).optional(),
  }, async (args) => {
    try { return json(await api.createTask(args, token)); } catch (e) { return apiError(e); }
  });

  server.tool('get_task', 'Get full task details including pipeline, updates, and context', {
    taskId: z.string(),
  }, async ({ taskId }) => {
    try { return json(await api.getTask(taskId, token)); } catch (e) { return apiError(e); }
  });

  server.tool('list_tasks', 'List tasks with optional filters by project, status, or assignee', {
    projectId: z.string().optional(),
    status: z.enum(['not_started', 'in_progress', 'blocked', 'done']).optional(),
    assigneeId: z.string().optional(),
    limit: z.number().default(50),
  }, async (args) => {
    try { return json(await api.listTasks(args, token)); } catch (e) { return apiError(e); }
  });

  server.tool('search_tasks', 'Full-text search across task titles and descriptions', {
    query: z.string().min(1),
  }, async ({ query }) => {
    try { return json(await api.searchTasks(query, token)); } catch (e) { return apiError(e); }
  });

  server.tool('update_task', 'Update task fields (title, description, priority, due date)', {
    taskId: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
    dueDate: z.string().optional(),
  }, async ({ taskId, ...rest }) => {
    try { return json(await api.updateTask(taskId, rest, token)); } catch (e) { return apiError(e); }
  });

  server.tool('change_task_status', 'Change task status following the state machine', {
    taskId: z.string(),
    newStatus: z.enum(['not_started', 'in_progress', 'blocked', 'done']),
    blockedReason: z.string().min(10).optional(),
  }, async ({ taskId, ...rest }) => {
    try { return json(await api.changeTaskStatus(taskId, rest, token)); } catch (e) { return apiError(e); }
  });

  server.tool('archive_task', 'Archive (soft-delete) a task', {
    taskId: z.string(),
  }, async ({ taskId }) => {
    try { return json(await api.archiveTask(taskId, token)); } catch (e) { return apiError(e); }
  });

  // ══════════════════════════════════════════════════════════════════
  // PIPELINE OPERATIONS (3)
  // ══════════════════════════════════════════════════════════════════

  server.tool('get_pipeline', 'Get all pipeline stages for a task with assignee details', {
    taskId: z.string(),
  }, async ({ taskId }) => {
    try { return json(await api.getPipeline(taskId, token)); } catch (e) { return apiError(e); }
  });

  server.tool('set_pipeline', 'Set or replace pipeline stages for a task (only before pipeline has started)', {
    taskId: z.string(),
    stages: z.array(z.object({ assigneeId: z.string(), label: z.string() })).min(1),
  }, async ({ taskId, stages }) => {
    try { return json(await api.setPipeline(taskId, { stages }, token)); } catch (e) { return apiError(e); }
  });

  server.tool('advance_pipeline', 'Complete current stage and auto-route to the next assignee', {
    taskId: z.string(),
    completionNote: z.string().optional(),
  }, async ({ taskId, completionNote }) => {
    try { return json(await api.advancePipeline(taskId, { completionNote }, token)); } catch (e) { return apiError(e); }
  });

  // ══════════════════════════════════════════════════════════════════
  // UPDATE OPERATIONS (2)
  // ══════════════════════════════════════════════════════════════════

  server.tool('post_update', 'Post a progress update on a task. Resets the cadence timer. Min 20 characters.', {
    taskId: z.string(),
    body: z.string().min(20),
  }, async ({ taskId, body }) => {
    try { return json(await api.postUpdate(taskId, { body }, token)); } catch (e) { return apiError(e); }
  });

  server.tool('list_updates', 'List all progress updates for a task, newest first', {
    taskId: z.string(),
    limit: z.number().default(20),
  }, async ({ taskId, limit }) => {
    try { return json(await api.listUpdates(taskId, limit, token)); } catch (e) { return apiError(e); }
  });

  // ══════════════════════════════════════════════════════════════════
  // CONTEXT OPERATIONS (3)
  // ══════════════════════════════════════════════════════════════════

  server.tool('add_comment', 'Add a comment to a task', {
    taskId: z.string(),
    body: z.string().min(1),
  }, async ({ taskId, body }) => {
    try { return json(await api.addComment(taskId, { body }, token)); } catch (e) { return apiError(e); }
  });

  server.tool('add_decision_log', 'Record a formal decision with question, options, chosen option, and rationale', {
    taskId: z.string(),
    question: z.string(),
    options: z.array(z.string()).min(2),
    chosen: z.string(),
    rationale: z.string(),
    participants: z.array(z.string()).optional(),
  }, async ({ taskId, ...rest }) => {
    try { return json(await api.addDecision(taskId, rest, token)); } catch (e) { return apiError(e); }
  });

  server.tool('list_context', 'List context items (comments, decisions, meetings) for a task', {
    taskId: z.string(),
    type: z.enum(['comment', 'decision_log', 'file', 'meeting_summary']).optional(),
  }, async ({ taskId, type }) => {
    try { return json(await api.listContext(taskId, type, token)); } catch (e) { return apiError(e); }
  });

  // ══════════════════════════════════════════════════════════════════
  // PROJECT OPERATIONS (3)
  // ══════════════════════════════════════════════════════════════════

  server.tool('create_project', 'Create a new project in the workspace', {
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    icon: z.string().default('📋'),
    teamId: z.string(),
    cadenceFrequencyDays: z.number().min(1).max(14).default(2),
    cadenceGracePeriodHours: z.number().min(1).max(48).default(4),
  }, async (args) => {
    try { return json(await api.createProject(args, token)); } catch (e) { return apiError(e); }
  });

  server.tool('list_projects', 'List all active projects with task counts by status', {}, async () => {
    try { return json(await api.listProjects(token)); } catch (e) { return apiError(e); }
  });

  server.tool('get_project', 'Get project details with task breakdown', {
    projectId: z.string(),
  }, async ({ projectId }) => {
    try { return json(await api.getProject(projectId, token)); } catch (e) { return apiError(e); }
  });

  // ══════════════════════════════════════════════════════════════════
  // DASHBOARD OPERATIONS (2)
  // ══════════════════════════════════════════════════════════════════

  server.tool('get_dashboard', 'Workspace-wide stats: task counts, update compliance, entropy score', {}, async () => {
    try { return json(await api.getDashboard(token)); } catch (e) { return apiError(e); }
  });

  server.tool('get_silent_tasks', 'Get tasks with overdue updates — "Silent Tasks" that need attention', {}, async () => {
    try { return json(await api.getSilentTasks(token)); } catch (e) { return apiError(e); }
  });
}
