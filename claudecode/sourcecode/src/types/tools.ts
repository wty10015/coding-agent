import type { TaskType } from '../Task.js'
import type { AgentId } from './ids.js'
import type {
  NormalizedAssistantMessage,
  NormalizedUserMessage,
} from './message.js'

type AgentProgressMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage

export type AgentToolProgress = {
  type: 'agent_progress'
  message: AgentProgressMessage
  prompt: string
  agentId: AgentId
}

export type SkillToolProgress = {
  type: 'skill_progress'
  message: AgentProgressMessage
  prompt: string
  agentId: AgentId
}

export type MCPProgress =
  | {
      type: 'mcp_progress'
      status: 'started' | 'completed' | 'failed'
      serverName: string
      toolName: string
      elapsedTimeMs?: number
    }
  | {
      type: 'mcp_progress'
      status: 'progress'
      serverName: string
      toolName: string
      progress: number
      total?: number
      progressMessage?: string
    }

export type WebSearchProgress =
  | {
      type: 'query_update'
      query: string
    }
  | {
      type: 'search_results_received'
      resultCount: number
      query: string
    }

export type TaskOutputProgress = {
  type: 'waiting_for_task'
  taskDescription: string
  taskType: TaskType
}

export type BashProgress = {
  type: 'bash_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes?: number
  taskId?: string
  timeoutMs?: number
}

export type PowerShellProgress = {
  type: 'powershell_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes: number
  taskId?: string
  timeoutMs?: number
}

export type ShellProgress = BashProgress | PowerShellProgress
