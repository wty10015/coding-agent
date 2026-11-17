import type { StdoutMessage } from 'src/entrypoints/sdk/controlTypes.js'

/** Shared contract consumed by RemoteIO for its stream transports. */
export interface Transport {
  connect(): Promise<void>
  write(message: StdoutMessage): Promise<void>
  close(): void
  setOnData(callback: (data: string) => void): void
  setOnClose(callback: (closeCode?: number) => void): void
}
