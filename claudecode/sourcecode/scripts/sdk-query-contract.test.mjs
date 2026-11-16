import { expect, test } from 'bun:test'
import {
  query,
  unstable_v2_createSession,
  unstable_v2_prompt,
  unstable_v2_resumeSession,
} from '../src/entrypoints/agentSdkTypes.ts'

test('public query entrypoint fails explicitly until its runtime contract exists', () => {
  expect(() => query({ prompt: 'inspect the repository' })).toThrow(
    'query is not implemented in the SDK',
  )
})

test('unstable session entrypoints fail explicitly instead of returning fake sessions', async () => {
  expect(() => unstable_v2_createSession({})).toThrow(
    'unstable_v2_createSession is not implemented in the SDK',
  )
  expect(() => unstable_v2_resumeSession('session-id', {})).toThrow(
    'unstable_v2_resumeSession is not implemented in the SDK',
  )
  await expect(unstable_v2_prompt('inspect the repository', {})).rejects.toThrow(
    'unstable_v2_prompt is not implemented in the SDK',
  )
})
