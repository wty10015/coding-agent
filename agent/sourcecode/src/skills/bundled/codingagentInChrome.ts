import { BROWSER_TOOLS } from '@ant/codingagent-for-chrome-mcp'
import { BASE_CHROME_PROMPT } from '../../utils/codingagentInChrome/prompt.js'
import { shouldAutoEnableCodingAgentInChrome } from '../../utils/codingagentInChrome/setup.js'
import { registerBundledSkill } from '../bundledSkills.js'

const CODING_AGENT_IN_CHROME_MCP_TOOLS = BROWSER_TOOLS.map(
  tool => `mcp__codingagent-in-chrome__${tool.name}`,
)

const SKILL_ACTIVATION_MESSAGE = `
Now that this skill is invoked, you have access to Chrome browser automation tools. You can now use the mcp__codingagent-in-chrome__* tools to interact with web pages.

IMPORTANT: Start by calling mcp__codingagent-in-chrome__tabs_context_mcp to get information about the user's current browser tabs.
`

export function registerCodingAgentInChromeSkill(): void {
  registerBundledSkill({
    name: 'codingagent-in-chrome',
    description:
      'Automates your Chrome browser to interact with web pages - clicking elements, filling forms, capturing screenshots, reading console logs, and navigating sites. Opens pages in new tabs within your existing Chrome session. Requires site-level permissions before executing (configured in the extension).',
    whenToUse:
      'When the user wants to interact with web pages, automate browser tasks, capture screenshots, read console logs, or perform any browser-based actions. Always invoke BEFORE attempting to use any mcp__codingagent-in-chrome__* tools.',
    allowedTools: CODING_AGENT_IN_CHROME_MCP_TOOLS,
    userInvocable: true,
    isEnabled: () => shouldAutoEnableCodingAgentInChrome(),
    async getPromptForCommand(args) {
      let prompt = `${BASE_CHROME_PROMPT}\n${SKILL_ACTIVATION_MESSAGE}`
      if (args) {
        prompt += `\n## Task\n\n${args}`
      }
      return [{ type: 'text', text: prompt }]
    },
  })
}
