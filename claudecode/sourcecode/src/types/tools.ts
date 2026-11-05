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
