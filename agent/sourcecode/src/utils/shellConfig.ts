/**
 * Utilities for managing shell configuration files (like .bashrc, .zshrc)
 * Used for managing codingagent aliases and PATH entries
 */

import { open, readFile, stat } from 'fs/promises'
import { homedir as osHomedir } from 'os'
import { join } from 'path'
import { isFsInaccessible } from './errors.js'
import { getLocalCodingAgentPath } from './localInstaller.js'

export const CODING_AGENT_ALIAS_REGEX = /^\s*alias\s+codingagent\s*=/

type EnvLike = Record<string, string | undefined>

type ShellConfigOptions = {
  env?: EnvLike
  homedir?: string
}

/**
 * Get the paths to shell configuration files
 * Respects ZDOTDIR for zsh users
 * @param options Optional overrides for testing (env, homedir)
 */
export function getShellConfigPaths(
  options?: ShellConfigOptions,
): Record<string, string> {
  const home = options?.homedir ?? osHomedir()
  const env = options?.env ?? process.env
  const zshConfigDir = env.ZDOTDIR || home
  return {
    zsh: join(zshConfigDir, '.zshrc'),
    bash: join(home, '.bashrc'),
    fish: join(home, '.config/fish/config.fish'),
  }
}

/**
 * Filter out installer-created codingagent aliases from an array of lines
 * Only removes aliases pointing to $HOME/.codingagent/local/codingagent
 * Preserves custom user aliases that point to other locations
 * Returns the filtered lines and whether our default installer alias was found
 */
export function filterCodingAgentAliases(lines: string[]): {
  filtered: string[]
  hadAlias: boolean
} {
  let hadAlias = false
  const filtered = lines.filter(line => {
    // Check if this is a codingagent alias
    if (CODING_AGENT_ALIAS_REGEX.test(line)) {
      // Extract the alias target - handle spaces, quotes, and various formats
      // First try with quotes
      let match = line.match(/alias\s+codingagent\s*=\s*["']([^"']+)["']/)
      if (!match) {
        // Try without quotes (capturing until end of line or comment)
        match = line.match(/alias\s+codingagent\s*=\s*([^#\n]+)/)
      }

      if (match && match[1]) {
        const target = match[1].trim()
        // Only remove if it points to the installer location
        // The installer always creates aliases with the full expanded path
        if (target === getLocalCodingAgentPath()) {
          hadAlias = true
          return false // Remove this line
        }
      }
      // Keep custom aliases that don't point to the installer location
    }
    return true
  })
  return { filtered, hadAlias }
}

/**
 * Read a file and split it into lines
 * Returns null if file doesn't exist or can't be read
 */
export async function readFileLines(
  filePath: string,
): Promise<string[] | null> {
  try {
    const content = await readFile(filePath, { encoding: 'utf8' })
    return content.split('\n')
  } catch (e: unknown) {
    if (isFsInaccessible(e)) return null
    throw e
  }
}

/**
 * Write lines back to a file
 */
export async function writeFileLines(
  filePath: string,
  lines: string[],
): Promise<void> {
  const fh = await open(filePath, 'w')
  try {
    await fh.writeFile(lines.join('\n'), { encoding: 'utf8' })
    await fh.datasync()
  } finally {
    await fh.close()
  }
}

/**
 * Check if a codingagent alias exists in any shell config file
 * Returns the alias target if found, null otherwise
 * @param options Optional overrides for testing (env, homedir)
 */
export async function findCodingAgentAlias(
  options?: ShellConfigOptions,
): Promise<string | null> {
  const configs = getShellConfigPaths(options)

  for (const configPath of Object.values(configs)) {
    const lines = await readFileLines(configPath)
    if (!lines) continue

    for (const line of lines) {
      if (CODING_AGENT_ALIAS_REGEX.test(line)) {
        // Extract the alias target
        const match = line.match(/alias\s+codingagent=["']?([^"'\s]+)/)
        if (match && match[1]) {
          return match[1]
        }
      }
    }
  }

  return null
}

/**
 * Check if a codingagent alias exists and points to a valid executable
 * Returns the alias target if valid, null otherwise
 * @param options Optional overrides for testing (env, homedir)
 */
export async function findValidCodingAgentAlias(
  options?: ShellConfigOptions,
): Promise<string | null> {
  const aliasTarget = await findCodingAgentAlias(options)
  if (!aliasTarget) return null

  const home = options?.homedir ?? osHomedir()

  // Expand ~ to home directory
  const expandedPath = aliasTarget.startsWith('~')
    ? aliasTarget.replace('~', home)
    : aliasTarget

  // Check if the target exists and is executable
  try {
    const stats = await stat(expandedPath)
    // Check if it's a file (could be executable or symlink)
    if (stats.isFile() || stats.isSymbolicLink()) {
      return aliasTarget
    }
  } catch {
    // Target doesn't exist or can't be accessed
  }

  return null
}
