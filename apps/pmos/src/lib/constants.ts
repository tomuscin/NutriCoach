export const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  archived: 'Archived',
}

export const STATUS_COLORS: Record<string, string> = {
  backlog: 'text-text-tertiary',
  in_progress: 'text-status-in_progress',
  blocked: 'text-status-blocked',
  done: 'text-status-done',
  archived: 'text-status-archived',
}

export const STATUS_DOT: Record<string, string> = {
  backlog: 'bg-text-tertiary',
  in_progress: 'bg-status-in_progress',
  blocked: 'bg-status-blocked',
  done: 'bg-status-done',
  archived: 'bg-status-archived',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-priority-low',
  medium: 'text-priority-medium',
  high: 'text-priority-high',
}

export const ALIGNMENT_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const ALIGNMENT_COLORS: Record<string, string> = {
  high: 'text-alignment-high',
  medium: 'text-alignment-medium',
  low: 'text-alignment-low',
}
