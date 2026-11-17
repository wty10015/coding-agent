// Content for the codingagent-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpCodingAgentApi from './codingagent-api/csharp/codingagent-api.md'
import curlExamples from './codingagent-api/curl/examples.md'
import goCodingAgentApi from './codingagent-api/go/codingagent-api.md'
import javaCodingAgentApi from './codingagent-api/java/codingagent-api.md'
import phpCodingAgentApi from './codingagent-api/php/codingagent-api.md'
import pythonAgentSdkPatterns from './codingagent-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './codingagent-api/python/agent-sdk/README.md'
import pythonCodingAgentApiBatches from './codingagent-api/python/codingagent-api/batches.md'
import pythonCodingAgentApiFilesApi from './codingagent-api/python/codingagent-api/files-api.md'
import pythonCodingAgentApiReadme from './codingagent-api/python/codingagent-api/README.md'
import pythonCodingAgentApiStreaming from './codingagent-api/python/codingagent-api/streaming.md'
import pythonCodingAgentApiToolUse from './codingagent-api/python/codingagent-api/tool-use.md'
import rubyCodingAgentApi from './codingagent-api/ruby/codingagent-api.md'
import skillPrompt from './codingagent-api/SKILL.md'
import sharedErrorCodes from './codingagent-api/shared/error-codes.md'
import sharedLiveSources from './codingagent-api/shared/live-sources.md'
import sharedModels from './codingagent-api/shared/models.md'
import sharedPromptCaching from './codingagent-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './codingagent-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './codingagent-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './codingagent-api/typescript/agent-sdk/README.md'
import typescriptCodingAgentApiBatches from './codingagent-api/typescript/codingagent-api/batches.md'
import typescriptCodingAgentApiFilesApi from './codingagent-api/typescript/codingagent-api/files-api.md'
import typescriptCodingAgentApiReadme from './codingagent-api/typescript/codingagent-api/README.md'
import typescriptCodingAgentApiStreaming from './codingagent-api/typescript/codingagent-api/streaming.md'
import typescriptCodingAgentApiToolUse from './codingagent-api/typescript/codingagent-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - codingagent-api/SKILL.md (Current Models pricing table)
//   - codingagent-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  OPUS_ID: 'codingagent-opus-4-6',
  OPUS_NAME: 'CodingAgent Opus 4.6',
  SONNET_ID: 'codingagent-sonnet-4-6',
  SONNET_NAME: 'CodingAgent Sonnet 4.6',
  HAIKU_ID: 'codingagent-haiku-4-5',
  HAIKU_NAME: 'CodingAgent Haiku 4.5',
  // Previous Sonnet ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_SONNET_ID: 'codingagent-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/codingagent-api.md': csharpCodingAgentApi,
  'curl/examples.md': curlExamples,
  'go/codingagent-api.md': goCodingAgentApi,
  'java/codingagent-api.md': javaCodingAgentApi,
  'php/codingagent-api.md': phpCodingAgentApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/codingagent-api/README.md': pythonCodingAgentApiReadme,
  'python/codingagent-api/batches.md': pythonCodingAgentApiBatches,
  'python/codingagent-api/files-api.md': pythonCodingAgentApiFilesApi,
  'python/codingagent-api/streaming.md': pythonCodingAgentApiStreaming,
  'python/codingagent-api/tool-use.md': pythonCodingAgentApiToolUse,
  'ruby/codingagent-api.md': rubyCodingAgentApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/codingagent-api/README.md': typescriptCodingAgentApiReadme,
  'typescript/codingagent-api/batches.md': typescriptCodingAgentApiBatches,
  'typescript/codingagent-api/files-api.md': typescriptCodingAgentApiFilesApi,
  'typescript/codingagent-api/streaming.md': typescriptCodingAgentApiStreaming,
  'typescript/codingagent-api/tool-use.md': typescriptCodingAgentApiToolUse,
}
