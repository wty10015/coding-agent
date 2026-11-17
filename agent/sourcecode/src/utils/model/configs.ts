import type { ModelName } from './model.js'
import type { APIProvider } from './providers.js'

export type ModelConfig = Record<APIProvider, ModelName>

// @[MODEL LAUNCH]: Add a new CODING_AGENT_*_CONFIG constant here. Double check the correct model strings
// here since the pattern may change.

export const CODING_AGENT_3_7_SONNET_CONFIG = {
  firstParty: 'codingagent-3-7-sonnet-20250219',
  bedrock: 'us.anthropic.codingagent-3-7-sonnet-20250219-v1:0',
  vertex: 'codingagent-3-7-sonnet@20250219',
  foundry: 'codingagent-3-7-sonnet',
} as const satisfies ModelConfig

export const CODING_AGENT_3_5_V2_SONNET_CONFIG = {
  firstParty: 'codingagent-3-5-sonnet-20241022',
  bedrock: 'anthropic.codingagent-3-5-sonnet-20241022-v2:0',
  vertex: 'codingagent-3-5-sonnet-v2@20241022',
  foundry: 'codingagent-3-5-sonnet',
} as const satisfies ModelConfig

export const CODING_AGENT_3_5_HAIKU_CONFIG = {
  firstParty: 'codingagent-3-5-haiku-20241022',
  bedrock: 'us.anthropic.codingagent-3-5-haiku-20241022-v1:0',
  vertex: 'codingagent-3-5-haiku@20241022',
  foundry: 'codingagent-3-5-haiku',
} as const satisfies ModelConfig

export const CODING_AGENT_HAIKU_4_5_CONFIG = {
  firstParty: 'codingagent-haiku-4-5-20251001',
  bedrock: 'us.anthropic.codingagent-haiku-4-5-20251001-v1:0',
  vertex: 'codingagent-haiku-4-5@20251001',
  foundry: 'codingagent-haiku-4-5',
} as const satisfies ModelConfig

export const CODING_AGENT_SONNET_4_CONFIG = {
  firstParty: 'codingagent-sonnet-4-20250514',
  bedrock: 'us.anthropic.codingagent-sonnet-4-20250514-v1:0',
  vertex: 'codingagent-sonnet-4@20250514',
  foundry: 'codingagent-sonnet-4',
} as const satisfies ModelConfig

export const CODING_AGENT_SONNET_4_5_CONFIG = {
  firstParty: 'codingagent-sonnet-4-5-20250929',
  bedrock: 'us.anthropic.codingagent-sonnet-4-5-20250929-v1:0',
  vertex: 'codingagent-sonnet-4-5@20250929',
  foundry: 'codingagent-sonnet-4-5',
} as const satisfies ModelConfig

export const CODING_AGENT_OPUS_4_CONFIG = {
  firstParty: 'codingagent-opus-4-20250514',
  bedrock: 'us.anthropic.codingagent-opus-4-20250514-v1:0',
  vertex: 'codingagent-opus-4@20250514',
  foundry: 'codingagent-opus-4',
} as const satisfies ModelConfig

export const CODING_AGENT_OPUS_4_1_CONFIG = {
  firstParty: 'codingagent-opus-4-1-20250805',
  bedrock: 'us.anthropic.codingagent-opus-4-1-20250805-v1:0',
  vertex: 'codingagent-opus-4-1@20250805',
  foundry: 'codingagent-opus-4-1',
} as const satisfies ModelConfig

export const CODING_AGENT_OPUS_4_5_CONFIG = {
  firstParty: 'codingagent-opus-4-5-20251101',
  bedrock: 'us.anthropic.codingagent-opus-4-5-20251101-v1:0',
  vertex: 'codingagent-opus-4-5@20251101',
  foundry: 'codingagent-opus-4-5',
} as const satisfies ModelConfig

export const CODING_AGENT_OPUS_4_6_CONFIG = {
  firstParty: 'codingagent-opus-4-6',
  bedrock: 'us.anthropic.codingagent-opus-4-6-v1',
  vertex: 'codingagent-opus-4-6',
  foundry: 'codingagent-opus-4-6',
} as const satisfies ModelConfig

export const CODING_AGENT_SONNET_4_6_CONFIG = {
  firstParty: 'codingagent-sonnet-4-6',
  bedrock: 'us.anthropic.codingagent-sonnet-4-6',
  vertex: 'codingagent-sonnet-4-6',
  foundry: 'codingagent-sonnet-4-6',
} as const satisfies ModelConfig

// @[MODEL LAUNCH]: Register the new config here.
export const ALL_MODEL_CONFIGS = {
  haiku35: CODING_AGENT_3_5_HAIKU_CONFIG,
  haiku45: CODING_AGENT_HAIKU_4_5_CONFIG,
  sonnet35: CODING_AGENT_3_5_V2_SONNET_CONFIG,
  sonnet37: CODING_AGENT_3_7_SONNET_CONFIG,
  sonnet40: CODING_AGENT_SONNET_4_CONFIG,
  sonnet45: CODING_AGENT_SONNET_4_5_CONFIG,
  sonnet46: CODING_AGENT_SONNET_4_6_CONFIG,
  opus40: CODING_AGENT_OPUS_4_CONFIG,
  opus41: CODING_AGENT_OPUS_4_1_CONFIG,
  opus45: CODING_AGENT_OPUS_4_5_CONFIG,
  opus46: CODING_AGENT_OPUS_4_6_CONFIG,
} as const satisfies Record<string, ModelConfig>

export type ModelKey = keyof typeof ALL_MODEL_CONFIGS

/** Union of all canonical first-party model IDs, e.g. 'codingagent-opus-4-6' | 'codingagent-sonnet-4-5-20250929' | … */
export type CanonicalModelId =
  (typeof ALL_MODEL_CONFIGS)[ModelKey]['firstParty']

/** Runtime list of canonical model IDs — used by comprehensiveness tests. */
export const CANONICAL_MODEL_IDS = Object.values(ALL_MODEL_CONFIGS).map(
  c => c.firstParty,
) as [CanonicalModelId, ...CanonicalModelId[]]

/** Map canonical ID → internal short key. Used to apply settings-based modelOverrides. */
export const CANONICAL_ID_TO_KEY: Record<CanonicalModelId, ModelKey> =
  Object.fromEntries(
    (Object.entries(ALL_MODEL_CONFIGS) as [ModelKey, ModelConfig][]).map(
      ([key, cfg]) => [cfg.firstParty, key],
    ),
  ) as Record<CanonicalModelId, ModelKey>
