export type MessageOrigin =
  | { kind: 'task-notification' }
  | { kind: 'coordinator' }
  | { kind: 'channel'; server: string }
  | { kind: 'human' }
