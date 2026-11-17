import { useEffect, useState } from 'react'
import {
  type CodingAgentAILimits,
  currentLimits,
  statusListeners,
} from './codingagentAiLimits.js'

export function useCodingAgentAiLimits(): CodingAgentAILimits {
  const [limits, setLimits] = useState<CodingAgentAILimits>({ ...currentLimits })

  useEffect(() => {
    const listener = (newLimits: CodingAgentAILimits) => {
      setLimits({ ...newLimits })
    }
    statusListeners.add(listener)

    return () => {
      statusListeners.delete(listener)
    }
  }, [])

  return limits
}
