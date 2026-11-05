import type { BetaUsage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

export type NonNullableUsage = {
  [Key in keyof BetaUsage]-?: NonNullable<BetaUsage[Key]>
}
