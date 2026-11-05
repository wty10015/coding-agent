import { c as _c } from "react/compiler-runtime";
// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { feature } from 'bun:bundle';
import { spawnSync } from 'child_process';
import { snapshotOutputTokensForTurn, getCurrentTurnTokenBudget, getTurnOutputTokens, getBudgetContinuationCount, getTotalInputTokens } from '../bootstrap/state.js';
import { parseTokenBudget } from '../utils/tokenBudget.js';
import { count } from '../utils/array.js';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import figures from 'figures';
// eslint-disable-next-line custom-rules/prefer-use-keybindings -- / n N Esc [ v are bare letters in transcript modal context, same class as g/G/j/k in ScrollKeybindingHandler
import { useInput } from '../ink.js';
import { useSearchInput } from '../hooks/useSearchInput.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useSearchHighlight } from '../ink/hooks/use-search-highlight.js';
import type { JumpHandle } from '../components/VirtualMessageList.js';
import { renderMessagesToPlainText } from '../utils/exportRenderer.js';
import { openFileInExternalEditor } from '../utils/editor.js';
import { writeFile } from 'fs/promises';
import { Box, Text, useStdin, useTheme, useTerminalFocus, useTerminalTitle, useTabStatus } from '../ink.js';
import type { TabStatusKind } from '../ink/hooks/use-tab-status.js';
import { CostThresholdDialog } from '../components/CostThresholdDialog.js';
import { IdleReturnDialog } from '../components/IdleReturnDialog.js';
import * as React from 'react';
import { useEffect, useMemo, useRef, useState, useCallback, useDeferredValue, useLayoutEffect, type RefObject } from 'react';
import { useNotifications } from '../context/notifications.js';
import { sendNotification } from '../services/notifier.js';
import { startPreventSleep, stopPreventSleep } from '../services/preventSleep.js';
import { useTerminalNotification } from '../ink/useTerminalNotification.js';
import { hasCursorUpViewportYankBug } from '../ink/terminal.js';
import { createFileStateCacheWithSizeLimit, mergeFileStateCaches, READ_FILE_STATE_CACHE_SIZE } from '../utils/fileStateCache.js';
import { updateLastInteractionTime, getLastInteractionTime, getOriginalCwd, getProjectRoot, getSessionId, switchSession, setCostStateForRestore, getTurnHookDurationMs, getTurnHookCount, resetTurnHookDuration, getTurnToolDurationMs, getTurnToolCount, resetTurnToolDuration, getTurnClassifierDurationMs, getTurnClassifierCount, resetTurnClassifierDuration } from '../bootstrap/state.js';
import { asSessionId, asAgentId } from '../types/ids.js';
import { logForDebugging } from '../utils/debug.js';
import { QueryGuard } from '../utils/QueryGuard.js';
import { isEnvTruthy } from '../utils/envUtils.js';
import { formatTokens, truncateToWidth } from '../utils/format.js';
import { consumeEarlyInput } from '../utils/earlyInput.js';
import { setMemberActive } from '../utils/swarm/teamHelpers.js';
import { isSwarmWorker, generateSandboxRequestId, sendSandboxPermissionRequestViaMailbox, sendSandboxPermissionResponseViaMailbox } from '../utils/swarm/permissionSync.js';
import { registerSandboxPermissionCallback } from '../hooks/useSwarmPermissionPoller.js';
import { getTeamName, getAgentName } from '../utils/teammate.js';
import { WorkerPendingPermission } from '../components/permissions/WorkerPendingPermission.js';
import { injectUserMessageToTeammate, getAllInProcessTeammateTasks } from '../tasks/InProcessTeammateTask/InProcessTeammateTask.js';
import { isLocalAgentTask, queuePendingMessage, appendMessageToLocalAgent, type LocalAgentTaskState } from '../tasks/LocalAgentTask/LocalAgentTask.js';
import { registerLeaderToolUseConfirmQueue, unregisterLeaderToolUseConfirmQueue, registerLeaderSetToolPermissionContext, unregisterLeaderSetToolPermissionContext } from '../utils/swarm/leaderPermissionBridge.js';
import { endInteractionSpan } from '../utils/telemetry/sessionTracing.js';
import { useLogMessages } from '../hooks/useLogMessages.js';
import { useReplBridge } from '../hooks/useReplBridge.js';
import { type Command, type CommandResultDisplay, type ResumeEntrypoint, getCommandName, isCommandEnabled } from '../commands.js';
import type { PromptInputMode, QueuedCommand, VimMode } from '../types/textInputTypes.js';
import { MessageSelector, selectableUserMessagesFilter, messagesAfterAreOnlySynthetic } from '../components/MessageSelector.js';
import { useIdeLogging } from '../hooks/useIdeLogging.js';
import { PermissionRequest, type ToolUseConfirm } from '../components/permissions/PermissionRequest.js';
import { ElicitationDialog } from '../components/mcp/ElicitationDialog.js';
import { PromptDialog } from '../components/hooks/PromptDialog.js';
import type { PromptRequest, PromptResponse } from '../types/hooks.js';
import PromptInput from '../components/PromptInput/PromptInput.js';
import { PromptInputQueuedCommands } from '../components/PromptInput/PromptInputQueuedCommands.js';
import { useRemoteSession } from '../hooks/useRemoteSession.js';
import { useDirectConnect } from '../hooks/useDirectConnect.js';
import type { DirectConnectConfig } from '../server/directConnectManager.js';
import { useSSHSession } from '../hooks/useSSHSession.js';
import { useAssistantHistory } from '../hooks/useAssistantHistory.js';
import type { SSHSession } from '../ssh/createSSHSession.js';
import { SkillImprovementSurvey } from '../components/SkillImprovementSurvey.js';
import { useSkillImprovementSurvey } from '../hooks/useSkillImprovementSurvey.js';
import { useMoreRight } from '../moreright/useMoreRight.js';
import { SpinnerWithVerb, BriefIdleStatus, type SpinnerMode } from '../components/Spinner.js';
import { getSystemPrompt } from '../constants/prompts.js';
import { buildEffectiveSystemPrompt } from '../utils/systemPrompt.js';
import { getSystemContext, getUserContext } from '../context.js';
import { getMemoryFiles } from '../utils/claudemd.js';
import { startBackgroundHousekeeping } from '../utils/backgroundHousekeeping.js';
import { getTotalCost, saveCurrentSessionCosts, resetCostState, getStoredSessionCosts } from '../cost-tracker.js';
import { useCostSummary } from '../costHook.js';
import { useFpsMetrics } from '../context/fpsMetrics.js';
import { useAfterFirstRender } from '../hooks/useAfterFirstRender.js';
import { useDeferredHookMessages } from '../hooks/useDeferredHookMessages.js';
import { addToHistory, removeLastFromHistory, expandPastedTextRefs, parseReferences } from '../history.js';
import { prependModeCharacterToInput } from '../components/PromptInput/inputModes.js';
import { prependToShellHistoryCache } from '../utils/suggestions/shellHistoryCompletion.js';
import { useApiKeyVerification } from '../hooks/useApiKeyVerification.js';
import { GlobalKeybindingHandlers } from '../hooks/useGlobalKeybindings.js';
import { CommandKeybindingHandlers } from '../hooks/useCommandKeybindings.js';
import { KeybindingSetup } from '../keybindings/KeybindingProviderSetup.js';
import { useShortcutDisplay } from '../keybindings/useShortcutDisplay.js';
import { getShortcutDisplay } from '../keybindings/shortcutFormat.js';
import { CancelRequestHandler } from '../hooks/useCancelRequest.js';
import { useBackgroundTaskNavigation } from '../hooks/useBackgroundTaskNavigation.js';
import { useSwarmInitialization } from '../hooks/useSwarmInitialization.js';
import { useTeammateViewAutoExit } from '../hooks/useTeammateViewAutoExit.js';
import { errorMessage } from '../utils/errors.js';
import { isHumanTurn } from '../utils/messagePredicates.js';
import { logError } from '../utils/log.js';
// Dead code elimination: conditional imports
/* eslint-disable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */
const useVoiceIntegration: typeof import('../hooks/useVoiceIntegration.js').useVoiceIntegration = feature('VOICE_MODE') ? require('../hooks/useVoiceIntegration.js').useVoiceIntegration : () => ({
  stripTrailing: () => 0,
  handleKeyEvent: () => {},
  resetAnchor: () => {}
});
const VoiceKeybindingHandler: typeof import('../hooks/useVoiceIntegration.js').VoiceKeybindingHandler = feature('VOICE_MODE') ? require('../hooks/useVoiceIntegration.js').VoiceKeybindingHandler : () => null;
// Frustration detection is ant-only (dogfooding). Conditional require so external
// builds eliminate the module entirely (including its two O(n) useMemos that run
// on every messages change, plus the GrowthBook fetch).
const useFrustrationDetection: typeof import('../components/FeedbackSurvey/useFrustrationDetection.js').useFrustrationDetection = "external" === 'ant' ? require('../components/FeedbackSurvey/useFrustrationDetection.js').useFrustrationDetection : () => ({
  state: 'closed',
  handleTranscriptSelect: () => {}
});
// Ant-only org warning. Conditional require so the org UUID list is
// eliminated from external builds (one UUID is on excluded-strings).
const useAntOrgWarningNotification: typeof import('../hooks/notifs/useAntOrgWarningNotification.js').useAntOrgWarningNotification = "external" === 'ant' ? require('../hooks/notifs/useAntOrgWarningNotification.js').useAntOrgWarningNotification : () => {};
// Dead code elimination: conditional import for coordinator mode
const getCoordinatorUserContext: (mcpClients: ReadonlyArray<{
  name: string;
}>, scratchpadDir?: string) => {
  [k: string]: string;
} = feature('COORDINATOR_MODE') ? require('../coordinator/coordinatorMode.js').getCoordinatorUserContext : () => ({});
/* eslint-enable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */
import useCanUseTool from '../hooks/useCanUseTool.js';
import type { ToolPermissionContext, Tool } from '../Tool.js';
import { applyPermissionUpdate, applyPermissionUpdates, persistPermissionUpdate } from '../utils/permissions/PermissionUpdate.js';
import { buildPermissionUpdates } from '../components/permissions/ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.js';
import { stripDangerousPermissionsForAutoMode } from '../utils/permissions/permissionSetup.js';
import { getScratchpadDir, isScratchpadEnabled } from '../utils/permissions/filesystem.js';
import { WEB_FETCH_TOOL_NAME } from '../tools/WebFetchTool/prompt.js';
import { SLEEP_TOOL_NAME } from '../tools/SleepTool/prompt.js';
import { clearSpeculativeChecks } from '../tools/BashTool/bashPermissions.js';
import type { AutoUpdaterResult } from '../utils/autoUpdater.js';
import { getGlobalConfig, saveGlobalConfig, getGlobalConfigWriteCount } from '../utils/config.js';
import { hasConsoleBillingAccess } from '../utils/billing.js';
import { logEvent, type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from 'src/services/analytics/index.js';
import { getFeatureValue_CACHED_MAY_BE_STALE } from 'src/services/analytics/growthbook.js';
import { textForResubmit, handleMessageFromStream, type StreamingToolUse, type StreamingThinking, isCompactBoundaryMessage, getMessagesAfterCompactBoundary, getContentText, createUserMessage, createAssistantMessage, createTurnDurationMessage, createAgentsKilledMessage, createApiMetricsMessage, createSystemMessage, createCommandInputMessage, formatCommandInputTags } from '../utils/messages.js';
import { generateSessionTitle } from '../utils/sessionTitle.js';
import { BASH_INPUT_TAG, COMMAND_MESSAGE_TAG, COMMAND_NAME_TAG, LOCAL_COMMAND_STDOUT_TAG } from '../constants/xml.js';
import { escapeXml } from '../utils/xml.js';
import type { ThinkingConfig } from '../utils/thinking.js';
import { gracefulShutdownSync } from '../utils/gracefulShutdown.js';
import { handlePromptSubmit, type PromptInputHelpers } from '../utils/handlePromptSubmit.js';
import { useQueueProcessor } from '../hooks/useQueueProcessor.js';
import { useMailboxBridge } from '../hooks/useMailboxBridge.js';
import { queryCheckpoint, logQueryProfileReport } from '../utils/queryProfiler.js';
import type { Message as MessageType, UserMessage, ProgressMessage, HookResultMessage } from '../types/message.js';
import type { PartialCompactDirection } from '../types/partialCompactDirection.js';
import { query } from '../query.js';
import { mergeClients, useMergedClients } from '../hooks/useMergedClients.js';
import { getQuerySourceForREPL } from '../utils/promptCategory.js';
import { useMergedTools } from '../hooks/useMergedTools.js';
import { mergeAndFilterTools } from '../utils/toolPool.js';
import { useMergedCommands } from '../hooks/useMergedCommands.js';
import { useSkillsChange } from '../hooks/useSkillsChange.js';
import { useManagePlugins } from '../hooks/useManagePlugins.js';
import { Messages } from '../components/Messages.js';
import { TaskListV2 } from '../components/TaskListV2.js';
import { TeammateViewHeader } from '../components/TeammateViewHeader.js';
import { useTasksV2WithCollapseEffect } from '../hooks/useTasksV2.js';
import { maybeMarkProjectOnboardingComplete } from '../projectOnboardingState.js';
import type { MCPServerConnection } from '../services/mcp/types.js';
import type { ScopedMcpServerConfig } from '../services/mcp/types.js';
import { randomUUID, type UUID } from 'crypto';
import { processSessionStartHooks } from '../utils/sessionStart.js';
import { executeSessionEndHooks, getSessionEndHookTimeoutMs } from '../utils/hooks.js';
import { type IDESelection, useIdeSelection } from '../hooks/useIdeSelection.js';
import { getTools, assembleToolPool } from '../tools.js';
import type { AgentDefinition } from '../tools/AgentTool/loadAgentsDir.js';
import { resolveAgentTools } from '../tools/AgentTool/agentToolUtils.js';
import { resumeAgentBackground } from '../tools/AgentTool/resumeAgent.js';
import { useMainLoopModel } from '../hooks/useMainLoopModel.js';
import { useAppState, useSetAppState, useAppStateStore } from '../state/AppState.js';
import type { ContentBlockParam, ImageBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs';
import type { ProcessUserInputContext } from '../utils/processUserInput/processUserInput.js';
import type { PastedContent } from '../utils/config.js';
import { copyPlanForFork, copyPlanForResume, getPlanSlug, setPlanSlug } from '../utils/plans.js';
import { clearSessionMetadata, resetSessionFilePointer, adoptResumedSessionFile, removeTranscriptMessage, restoreSessionMetadata, getCurrentSessionTitle, isEphemeralToolProgress, isLoggableMessage, saveWorktreeState, getAgentTranscript } from '../utils/sessionStorage.js';
import { deserializeMessages } from '../utils/conversationRecovery.js';
import { extractReadFilesFromMessages, extractBashToolsFromMessages } from '../utils/queryHelpers.js';
import { resetMicrocompactState } from '../services/compact/microCompact.js';
import { runPostCompactCleanup } from '../services/compact/postCompactCleanup.js';
import { provisionContentReplacementState, reconstructContentReplacementState, type ContentReplacementRecord } from '../utils/toolResultStorage.js';
import { partialCompactConversation } from '../services/compact/compact.js';
import type { LogOption } from '../types/logs.js';
import type { AgentColorName } from '../tools/AgentTool/agentColorManager.js';
import { fileHistoryMakeSnapshot, type FileHistoryState, fileHistoryRewind, type FileHistorySnapshot, copyFileHistoryForResume, fileHistoryEnabled, fileHistoryHasAnyChanges } from '../utils/fileHistory.js';
import { type AttributionState, incrementPromptCount } from '../utils/commitAttribution.js';
import { recordAttributionSnapshot } from '../utils/sessionStorage.js';
import { computeStandaloneAgentContext, restoreAgentFromSession, restoreSessionStateFromLog, restoreWorktreeForResume, exitRestoredWorktree } from '../utils/sessionRestore.js';
import { isBgSession, updateSessionName, updateSessionActivity } from '../utils/concurrentSessions.js';
import { isInProcessTeammateTask, type InProcessTeammateTaskState } from '../tasks/InProcessTeammateTask/types.js';
import { restoreRemoteAgentTasks } from '../tasks/RemoteAgentTask/RemoteAgentTask.js';
import { useInboxPoller } from '../hooks/useInboxPoller.js';
// Dead code elimination: conditional import for loop mode
/* eslint-disable @typescript-eslint/no-require-imports */
const proactiveModule = feature('PROACTIVE') || feature('KAIROS') ? require('../proactive/index.js') : null;
const PROACTIVE_NO_OP_SUBSCRIBE = (_cb: () => void) => () => {};
const PROACTIVE_FALSE = () => false;
const SUGGEST_BG_PR_NOOP = (_p: string, _n: string): boolean => false;
const useProactive = feature('PROACTIVE') || feature('KAIROS') ? require('../proactive/useProactive.js').useProactive : null;
const useScheduledTasks = feature('AGENT_TRIGGERS') ? require('../hooks/useScheduledTasks.js').useScheduledTasks : null;
/* eslint-enable @typescript-eslint/no-require-imports */
import { isAgentSwarmsEnabled } from '../utils/agentSwarmsEnabled.js';
import { useTaskListWatcher } from '../hooks/useTaskListWatcher.js';
import type { SandboxAskCallback, NetworkHostPattern } from '../utils/sandbox/sandbox-adapter.js';
import { type IDEExtensionInstallationStatus, closeOpenDiffs, getConnectedIdeClient, type IdeType } from '../utils/ide.js';
import { useIDEIntegration } from '../hooks/useIDEIntegration.js';
import exit from '../commands/exit/index.js';
import { ExitFlow } from '../components/ExitFlow.js';
import { getCurrentWorktreeSession } from '../utils/worktree.js';
import { popAllEditable, enqueue, type SetAppState, getCommandQueue, getCommandQueueLength, removeByFilter } from '../utils/messageQueueManager.js';
import { useCommandQueue } from '../hooks/useCommandQueue.js';
import { SessionBackgroundHint } from '../components/SessionBackgroundHint.js';
import { startBackgroundSession } from '../tasks/LocalMainSessionTask.js';
import { useSessionBackgrounding } from '../hooks/useSessionBackgrounding.js';
import { diagnosticTracker } from '../services/diagnosticTracking.js';
import { handleSpeculationAccept, type ActiveSpeculationState } from '../services/PromptSuggestion/speculation.js';
import { IdeOnboardingDialog } from '../components/IdeOnboardingDialog.js';
import { EffortCallout, shouldShowEffortCallout } from '../components/EffortCallout.js';
import type { EffortValue } from '../utils/effort.js';
import { RemoteCallout } from '../components/RemoteCallout.js';
/* eslint-disable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */
const AntModelSwitchCallout = "external" === 'ant' ? require('../components/AntModelSwitchCallout.js').AntModelSwitchCallout : null;
const shouldShowAntModelSwitch = "external" === 'ant' ? require('../components/AntModelSwitchCallout.js').shouldShowModelSwitchCallout : (): boolean => false;
const UndercoverAutoCallout = "external" === 'ant' ? require('../components/UndercoverAutoCallout.js').UndercoverAutoCallout : null;
/* eslint-enable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */
import { activityManager } from '../utils/activityManager.js';
import { createAbortController } from '../utils/abortController.js';
import { MCPConnectionManager } from 'src/services/mcp/MCPConnectionManager.js';
import { useFeedbackSurvey } from 'src/components/FeedbackSurvey/useFeedbackSurvey.js';
import { useMemorySurvey } from 'src/components/FeedbackSurvey/useMemorySurvey.js';
import { usePostCompactSurvey } from 'src/components/FeedbackSurvey/usePostCompactSurvey.js';
import { FeedbackSurvey } from 'src/components/FeedbackSurvey/FeedbackSurvey.js';
import { useInstallMessages } from 'src/hooks/notifs/useInstallMessages.js';
import { useAwaySummary } from 'src/hooks/useAwaySummary.js';
import { useChromeExtensionNotification } from 'src/hooks/useChromeExtensionNotification.js';
import { useOfficialMarketplaceNotification } from 'src/hooks/useOfficialMarketplaceNotification.js';
import { usePromptsFromClaudeInChrome } from 'src/hooks/usePromptsFromClaudeInChrome.js';
import { getTipToShowOnSpinner, recordShownTip } from 'src/services/tips/tipScheduler.js';
import type { Theme } from 'src/utils/theme.js';
import { checkAndDisableBypassPermissionsIfNeeded, checkAndDisableAutoModeIfNeeded, useKickOffCheckAndDisableBypassPermissionsIfNeeded, useKickOffCheckAndDisableAutoModeIfNeeded } from 'src/utils/permissions/bypassPermissionsKillswitch.js';
import { SandboxManager } from 'src/utils/sandbox/sandbox-adapter.js';
import { SANDBOX_NETWORK_ACCESS_TOOL_NAME } from 'src/cli/structuredIO.js';
import { useFileHistorySnapshotInit } from 'src/hooks/useFileHistorySnapshotInit.js';
import { SandboxPermissionRequest } from 'src/components/permissions/SandboxPermissionRequest.js';
import { SandboxViolationExpandedView } from 'src/components/SandboxViolationExpandedView.js';
import { useSettingsErrors } from 'src/hooks/notifs/useSettingsErrors.js';
import { useMcpConnectivityStatus } from 'src/hooks/notifs/useMcpConnectivityStatus.js';
import { useAutoModeUnavailableNotification } from 'src/hooks/notifs/useAutoModeUnavailableNotification.js';
import { AUTO_MODE_DESCRIPTION } from 'src/components/AutoModeOptInDialog.js';
import { useLspInitializationNotification } from 'src/hooks/notifs/useLspInitializationNotification.js';
import { useLspPluginRecommendation } from 'src/hooks/useLspPluginRecommendation.js';
import { LspRecommendationMenu } from 'src/components/LspRecommendation/LspRecommendationMenu.js';
import { useClaudeCodeHintRecommendation } from 'src/hooks/useClaudeCodeHintRecommendation.js';
import { PluginHintMenu } from 'src/components/ClaudeCodeHint/PluginHintMenu.js';
import { DesktopUpsellStartup, shouldShowDesktopUpsellStartup } from 'src/components/DesktopUpsell/DesktopUpsellStartup.js';
import { usePluginInstallationStatus } from 'src/hooks/notifs/usePluginInstallationStatus.js';
import { usePluginAutoupdateNotification } from 'src/hooks/notifs/usePluginAutoupdateNotification.js';
import { performStartupChecks } from 'src/utils/plugins/performStartupChecks.js';
import { UserTextMessage } from 'src/components/messages/UserTextMessage.js';
import { AwsAuthStatusBox } from '../components/AwsAuthStatusBox.js';
import { useRateLimitWarningNotification } from 'src/hooks/notifs/useRateLimitWarningNotification.js';
import { useDeprecationWarningNotification } from 'src/hooks/notifs/useDeprecationWarningNotification.js';
import { useNpmDeprecationNotification } from 'src/hooks/notifs/useNpmDeprecationNotification.js';
import { useIDEStatusIndicator } from 'src/hooks/notifs/useIDEStatusIndicator.js';
import { useModelMigrationNotifications } from 'src/hooks/notifs/useModelMigrationNotifications.js';
import { useCanSwitchToExistingSubscription } from 'src/hooks/notifs/useCanSwitchToExistingSubscription.js';
import { useTeammateLifecycleNotification } from 'src/hooks/notifs/useTeammateShutdownNotification.js';
import { useFastModeNotification } from 'src/hooks/notifs/useFastModeNotification.js';
import { AutoRunIssueNotification, shouldAutoRunIssue, getAutoRunIssueReasonText, getAutoRunCommand, type AutoRunIssueReason } from '../utils/autoRunIssue.js';
import type { HookProgress } from '../types/hooks.js';
/* eslint-disable @typescript-eslint/no-require-imports */
// Keep the import behind the same literal condition as the existing render.
const TungstenLiveMonitor =
  "external" === 'ant'
    ? require('../tools/TungstenTool/TungstenLiveMonitor.js').TungstenLiveMonitor
    : null;
const WebBrowserPanelModule = feature('WEB_BROWSER_TOOL') ? require('../tools/WebBrowserTool/WebBrowserPanel.js') as typeof import('../tools/WebBrowserTool/WebBrowserPanel.js') : null;
/* eslint-enable @typescript-eslint/no-require-imports */
import { IssueFlagBanner } from '../components/PromptInput/IssueFlagBanner.js';
import { useIssueFlagBanner } from '../hooks/useIssueFlagBanner.js';
import { CompanionSprite, CompanionFloatingBubble, MIN_COLS_FOR_FULL_SPRITE } from '../buddy/CompanionSprite.js';
import { DevBar } from '../components/DevBar.js';
// Session manager removed - using AppState now
import type { RemoteSessionConfig } from '../remote/RemoteSessionManager.js';
import { REMOTE_SAFE_COMMANDS } from '../commands.js';
import type { RemoteMessageContent } from '../utils/teleport/api.js';
import { FullscreenLayout, useUnseenDivider, computeUnseenDivider } from '../components/FullscreenLayout.js';
import { isFullscreenEnvEnabled, maybeGetTmuxMouseHint, isMouseTrackingEnabled } from '../utils/fullscreen.js';
import { AlternateScreen } from '../ink/components/AlternateScreen.js';
import { ScrollKeybindingHandler } from '../components/ScrollKeybindingHandler.js';
import { useMessageActions, MessageActionsKeybindings, MessageActionsBar, type MessageActionsState, type MessageActionsNav, type MessageActionCaps } from '../components/messageActions.js';
import { setClipboard } from '../ink/termio/osc.js';
import type { ScrollBoxHandle } from '../ink/components/ScrollBox.js';
import { createAttachmentMessage, getQueuedCommandAttachments } from '../utils/attachments.js';

// Stable empty array for hooks that accept MCPServerConnection[] — avoids
// creating a new [] literal on every render in remote mode, which would
// cause useEffect dependency changes and infinite re-render loops.
const EMPTY_MCP_CLIENTS: MCPServerConnection[] = [];

// Stable stub for useAssistantHistory's non-KAIROS branch — avoids a new
// function identity each render, which would break composedOnScroll's memo.
const HISTORY_STUB = {
  maybeLoadOlder: (_: ScrollBoxHandle) => {}
};
// Window after a user-initiated scroll during which type-into-empty does NOT
// repin to bottom. Josh Rosen's workflow: Claude emits long output → scroll
// up to read the start → start typing → before this fix, snapped to bottom.
// https://anthropic.slack.com/archives/C07VBSHV7EV/p1773545449871739
const RECENT_SCROLL_REPIN_WINDOW_MS = 3000;

// Use LRU cache to prevent unbounded memory growth
// 100 files should be sufficient for most coding sessions while preventing
// memory issues when working across many files in large projects

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
}

/**
 * Small component to display transcript mode footer with dynamic keybinding.
 * Must be rendered inside KeybindingSetup to access keybinding context.
 */
function TranscriptModeFooter(t0) {
  const $ = _c(9);
  const {
    showAllInTranscript,
    virtualScroll,
    searchBadge,
    suppressShowAll: t1,
    status
  } = t0;
  const suppressShowAll = t1 === undefined ? false : t1;
  const toggleShortcut = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  const showAllShortcut = useShortcutDisplay("transcript:toggleShowAll", "Transcript", "ctrl+e");
  const t2 = searchBadge ? " \xB7 n/N to navigate" : virtualScroll ? ` · ${figures.arrowUp}${figures.arrowDown} scroll · home/end top/bottom` : suppressShowAll ? "" : ` · ${showAllShortcut} to ${showAllInTranscript ? "collapse" : "show all"}`;
  let t3;
  if ($[0] !== t2 || $[1] !== toggleShortcut) {
    t3 = <Text dimColor={true}>Showing detailed transcript · {toggleShortcut} to toggle{t2}</Text>;
    $[0] = t2;
    $[1] = toggleShortcut;
    $[2] = t3;
  } else {
    t3 = $[2];
  }
  let t4;
  if ($[3] !== searchBadge || $[4] !== status) {
    t4 = status ? <><Box flexGrow={1} /><Text>{status} </Text></> : searchBadge ? <><Box flexGrow={1} /><Text dimColor={true}>{searchBadge.current}/{searchBadge.count}{"  "}</Text></> : null;
    $[3] = searchBadge;
    $[4] = status;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  let t5;
  if ($[6] !== t3 || $[7] !== t4) {
    t5 = <Box noSelect={true} alignItems="center" alignSelf="center" borderTopDimColor={true} borderBottom={false} borderLeft={false} borderRight={false} borderStyle="single" marginTop={1} paddingLeft={2} width="100%">{t3}{t4}</Box>;
    $[6] = t3;
    $[7] = t4;
    $[8] = t5;
  } else {
    t5 = $[8];
  }
  return t5;
}

/** less-style / bar. 1-row, same border-top styling as TranscriptModeFooter
 *  so swapping them in the bottom slot doesn't shift ScrollBox height.
 *  useSearchInput handles readline editing; we report query changes and
 *  render the counter. Incremental — re-search + highlight per keystroke. */
function TranscriptSearchBar({
  jumpRef,
  count,
  current,
  onClose,
  onCancel,
  setHighlight,
  initialQuery
}: {
  jumpRef: RefObject<JumpHandle | null>;
  count: number;
  current: number;
  /** Enter — commit. Query persists for n/N. */
  onClose: (lastQuery: string) => void;
  /** Esc/ctrl+c/ctrl+g — undo to pre-/ state. */
  onCancel: () => void;
  setHighlight: (query: string) => void;
  // Seed with the previous query (less: / shows last pattern). Mount-fire
  // of the effect re-scans with the same query — idempotent (same matches,
  // nearest-ptr, same highlights). User can edit or clear.
  initialQuery: string;
}): React.ReactNode {
  const {
    query,
    cursorOffset
  } = useSearchInput({
    isActive: true,
    initialQuery,
    onExit: () => onClose(query),
    onCancel
  });
  // Index warm-up runs before the query effect so it measures the real
  // cost — otherwise setSearchQuery fills the cache first and warm
  // reports ~0ms while the user felt the actual lag.
  // First / in a transcript session pays the extractSearchText cost.
  // Subsequent / return 0 immediately (indexWarmed ref in VML).
  // Transcript is frozen at ctrl+o so the cache stays valid.
  // Initial 'building' so warmDone is false on mount — the [query] effect
  // waits for the warm effect's first resolve instead of racing it. With
  // null initial, warmDone would be true on mount → [query] fires →
  // setSearchQuery fills cache → warm reports ~0ms while the user felt
  // the real lag.
  const [indexStatus, setIndexStatus] = React.useState<'building' | {
    ms: number;
  } | null>('building');
  React.useEffect(() => {
    let alive = true;
    const warm = jumpRef.current?.warmSearchIndex;
    if (!warm) {
      setIndexStatus(null); // VML not mounted yet — rare, skip indicator
      return;
    }
    setIndexStatus('building');
    warm().then(ms => {
      if (!alive) return;
      // <20ms = imperceptible. No point showing "indexed in 3ms".
      if (ms < 20) {
        setIndexStatus(null);
      } else {
        setIndexStatus({
          ms
        });
        setTimeout(() => alive && setIndexStatus(null), 2000);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only: bar opens once per /
  // Gate the query effect on warm completion. setHighlight stays instant
  // (screen-space overlay, no indexing). setSearchQuery (the scan) waits.
  const warmDone = indexStatus !== 'building';
  useEffect(() => {
    if (!warmDone) return;
    jumpRef.current?.setSearchQuery(query);
    setHighlight(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, warmDone]);
  const off = cursorOffset;
  const cursorChar = off < query.length ? query[off] : ' ';
  return <Box borderTopDimColor borderBottom={false} borderLeft={false} borderRight={false} borderStyle="single" marginTop={1} paddingLeft={2} width="100%"
  // applySearchHighlight scans the whole screen buffer. The query
  // text rendered here IS on screen — /foo matches its own 'foo' in
  // the bar. With no content matches that's the ONLY visible match →
  // gets CURRENT → underlined. noSelect makes searchHighlight.ts:76
  // skip these cells (same exclusion as gutters). You can't text-
  // select the bar either; it's transient chrome, fine.
  noSelect>
      <Text>/</Text>
      <Text>{query.slice(0, off)}</Text>
      <Text inverse>{cursorChar}</Text>
      {off < query.length && <Text>{query.slice(off + 1)}</Text>}
      <Box flexGrow={1} />
      {indexStatus === 'building' ? <Text dimColor>indexing… </Text> : indexStatus ? <Text dimColor>indexed in {indexStatus.ms}ms </Text> : count === 0 && query ? <Text color="error">no matches </Text> : count > 0 ?
    // Engine-counted (indexOf on extractSearchText). May drift from
    // render-count for ghost/phantom messages — badge is a rough
    // location hint. scanElement gives exact per-message positions
    // but counting ALL would cost ~1-3ms × matched-messages.
    <Text dimColor>
          {current}/{count}
          {'  '}
        </Text> : null}
    </Box>;
}
const TITLE_ANIMATION_FRAMES = ['⠂', '⠐'];
const TITLE_STATIC_PREFIX = '✳';
const TITLE_ANIMATION_INTERVAL_MS = 960;

/**
 * Sets the terminal tab title, with an animated prefix glyph while a query
 * is running. Isolated from REPL so the 960ms animation tick re-renders only
 * this leaf component (which returns null — pure side-effect) instead of the
 * entire REPL tree. Before extraction, the tick was ~1 REPL render/sec for
 * the duration of every turn, dragging PromptInput and friends along.
 */
function AnimatedTerminalTitle(t0) {
  const $ = _c(6);
  const {
    isAnimating,
    title,
    disabled,
    noPrefix
  } = t0;
  const terminalFocused = useTerminalFocus();
  const [frame, setFrame] = useState(0);
  let t1;
  let t2;
  if ($[0] !== disabled || $[1] !== isAnimating || $[2] !== noPrefix || $[3] !== terminalFocused) {
    t1 = () => {
      if (disabled || noPrefix || !isAnimating || !terminalFocused) {
        return;
      }
      const interval = setInterval(_temp2, TITLE_ANIMATION_INTERVAL_MS, setFrame);
      return () => clearInterval(interval);
    };
    t2 = [disabled, noPrefix, isAnimating, terminalFocused];
    $[0] = disabled;
    $[1] = isAnimating;
    $[2] = noPrefix;
    $[3] = terminalFocused;
    $[4] = t1;
    $[5] = t2;
  } else {
    t1 = $[4];
    t2 = $[5];
  }
  useEffect(t1, t2);
  const prefix = isAnimating ? TITLE_ANIMATION_FRAMES[frame] ?? TITLE_STATIC_PREFIX : TITLE_STATIC_PREFIX;
  useTerminalTitle(disabled ? null : noPrefix ? title : `${prefix} ${title}`);
  return null;
}
function _temp2(setFrame_0) {
  return setFrame_0(_temp);
}
function _temp(f) {
  return (f + 1) % TITLE_ANIMATION_FRAMES.length;
}
export type Props = {
  commands: Command[];
  debug: boolean;
  initialTools: Tool[];
  // Initial messages to populate the REPL with
  initialMessages?: MessageType[];
  // Deferred hook messages promise — REPL renders immediately and injects
  // hook messages when they resolve. Awaited before the first API call.
  pendingHookMessages?: Promise<HookResultMessage[]>;
  initialFileHistorySnapshots?: FileHistorySnapshot[];
  // Content-replacement records from a resumed session's transcript — used to
  // reconstruct contentReplacementState so the same results are re-replaced
  initialContentReplacements?: ContentReplacementRecord[];
  // Initial agent context for session resume (name/color set via /rename or /color)
  initialAgentName?: string;
  initialAgentColor?: AgentColorName;
  mcpClients?: MCPServerConnection[];
  dynamicMcpConfig?: Record<string, ScopedMcpServerConfig>;
  autoConnectIdeFlag?: boolean;
  strictMcpConfig?: boolean;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  // Optional callback invoked before query execution
  // Called after user message is added to conversation but before API call
  // Return false to prevent query execution
  onBeforeQuery?: (input: string, newMessages: MessageType[]) => Promise<boolean>;
  // Optional callback when a turn completes (model finishes responding)
  onTurnComplete?: (messages: MessageType[]) => void | Promise<void>;
  // When true, disables REPL input (hides prompt and prevents message selector)
  disabled?: boolean;
  // Optional agent definition to use for the main thread
  mainThreadAgentDefinition?: AgentDefinition;
  // When true, disables all slash commands
  disableSlashCommands?: boolean;
  // Task list id: when set, enables tasks mode that watches a task list and auto-processes tasks.
  taskListId?: string;
  // Remote session config for --remote mode (uses CCR as execution engine)
  remoteSessionConfig?: RemoteSessionConfig;
  // Direct connect config for `claude connect` mode (connects to a claude server)
  directConnectConfig?: DirectConnectConfig;
  // SSH session for `claude ssh` mode (local REPL, remote tools over ssh)
  sshSession?: SSHSession;
  // Thinking configuration to use when thinking is enabled
  thinkingConfig: ThinkingConfig;
};
export type Screen = 'prompt' | 'transcript';
export function REPL({
  commands: initialCommands,
  debug,
  initialTools,
  initialMessages,
  pendingHookMessages,
  initialFileHistorySnapshots,
  initialContentReplacements,
  initialAgentName,
  initialAgentColor,
  mcpClients: initialMcpClients,
  dynamicMcpConfig: initialDynamicMcpConfig,
  autoConnectIdeFlag,
  strictMcpConfig = false,
  systemPrompt: customSystemPrompt,
  appendSystemPrompt,
  onBeforeQuery,
  onTurnComplete,
  disabled = false,
  mainThreadAgentDefinition: initialMainThreadAgentDefinition,
  disableSlashCommands = false,
  taskListId,
  remoteSessionConfig,
  directConnectConfig,
  sshSession,
  thinkingConfig
}: Props): React.ReactNode {
  const isRemoteSession = !!remoteSessionConfig;

  // Env-var gates hoisted to mount-time — isEnvTruthy does toLowerCase+trim+
  // includes, and these were on the render path (hot during PageUp spam).
  const titleDisabled = useMemo(() => isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE), []);
  const moreRightEnabled = useMemo(() => "external" === 'ant' && isEnvTruthy(process.env.CLAUDE_MORERIGHT), []);
  const disableVirtualScroll = useMemo(() => isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL), []);
  const disableMessageActions = feature('MESSAGE_ACTIONS') ?
  // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
  useMemo(() => isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_MESSAGE_ACTIONS), []) : false;

  // Log REPL mount/unmount lifecycle
  useEffect(() => {
    logForDebugging(`[REPL:mount] REPL mounted, disabled=${disabled}`);
    return () => logForDebugging(`[REPL:unmount] REPL unmounting`);
  }, [disabled]);

  // Agent definition is state so /resume can update it mid-session
  const [mainThreadAgentDefinition, setMainThreadAgentDefinition] = useState(initialMainThreadAgentDefinition);
  const toolPermissionContext = useAppState(s => s.toolPermissionContext);
  const verbose = useAppState(s => s.verbose);
  const mcp = useAppState(s => s.mcp);
  const plugins = useAppState(s => s.plugins);
  const agentDefinitions = useAppState(s => s.agentDefinitions);
  const fileHistory = useAppState(s => s.fileHistory);
  const initialMessage = useAppState(s => s.initialMessage);
  const queuedCommands = useCommandQueue();
  // feature() is a build-time constant — dead code elimination removes the hook
  // call entirely in external builds, so this is safe despite looking conditional.
  // These fields contain excluded strings that must not appear in external builds.
  const spinnerTip = useAppState(s => s.spinnerTip);
  const showExpandedTodos = useAppState(s => s.expandedView) === 'tasks';
  const pendingWorkerRequest = useAppState(s => s.pendingWorkerRequest);
  const pendingSandboxRequest = useAppState(s => s.pendingSandboxRequest);
  const teamContext = useAppState(s => s.teamContext);
  const tasks = useAppState(s => s.tasks);
  const workerSandboxPermissions = useAppState(s => s.workerSandboxPermissions);
  const elicitation = useAppState(s => s.elicitation);
  const ultraplanPendingChoice = useAppState(s => s.ultraplanPendingChoice);
  const ultraplanLaunchPending = useAppState(s => s.ultraplanLaunchPending);
  const viewingAgentTaskId = useAppState(s => s.viewingAgentTaskId);
  const setAppState = useSetAppState();

  // Bootstrap: retained local_agent that hasn't loaded disk yet → read
  // sidechain JSONL and UUID-merge with whatever stream has appended so far.
  // Stream appends immediately on retain (no defer); bootstrap fills the
  // prefix. Disk-write-before-yield means live is always a suffix of disk.
  const viewedLocalAgent = viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined;
  const needsBootstrap = isLocalAgentTask(viewedLocalAgent) && viewedLocalAgent.retain && !viewedLocalAgent.diskLoaded;
  useEffect(() => {
    if (!viewingAgentTaskId || !needsBootstrap) return;
    const taskId = viewingAgentTaskId;
    void getAgentTranscript(asAgentId(taskId)).then(result => {
      setAppState(prev => {
        const t = prev.tasks[taskId];
        if (!isLocalAgentTask(t) || t.diskLoaded || !t.retain) return prev;
        const live = t.messages ?? [];
        const liveUuids = new Set(live.map(m => m.uuid));
        const diskOnly = result ? result.messages.filter(m => !liveUuids.has(m.uuid)) : [];
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [taskId]: {
              ...t,
              messages: [...diskOnly, ...live],
              diskLoaded: true
            }
          }
        };
      });
    });
  }, [viewingAgentTaskId, needsBootstrap, setAppState]);
  const store = useAppStateStore();
  const terminal = useTerminalNotification();
  const mainLoopModel = useMainLoopModel();

  // Note: standaloneAgentContext is initialized in main.tsx (via initialState) or
  // ResumeConversation.tsx (via setAppState before rendering REPL) to avoid
  // useEffect-based state initialization on mount (per CLAUDE.md guidelines)

  // Local state for commands (hot-reloadable when skill files change)
  const [localCommands, setLocalCommands] = useState(initialCommands);

  // Watch for skill file changes and reload all commands
  useSkillsChange(isRemoteSession ? undefined : getProjectRoot(), setLocalCommands);

  // Track proactive mode for tools dependency - SleepTool filters by proactive state
  const proactiveActive = React.useSyncExternalStore(proactiveModule?.subscribeToProactiveChanges ?? PROACTIVE_NO_OP_SUBSCRIBE, proactiveModule?.isProactiveActive ?? PROACTIVE_FALSE);

  // BriefTool.isEnabled() reads getUserMsgOptIn() from bootstrap state, which
  // /brief flips mid-session alongside isBriefOnly. The memo below needs a
  // React-visible dep to re-run getTools() when that happens; isBriefOnly is
  // the AppState mirror that triggers the re-render. Without this, toggling
  // /brief mid-session leaves the stale tool list (no SendUserMessage) and
  // the model emits plain text the brief filter hides.
  const isBriefOnly = useAppState(s => s.isBriefOnly);
  const localTools = useMemo(() => getTools(toolPermissionContext), [toolPermissionContext, proactiveActive, isBriefOnly]);
  useKickOffCheckAndDisableBypassPermissionsIfNeeded();
  useKickOffCheckAndDisableAutoModeIfNeeded();
  const [dynamicMcpConfig, setDynamicMcpConfig] = useState<Record<string, ScopedMcpServerConfig> | undefined>(initialDynamicMcpConfig);
  const onChangeDynamicMcpConfig = useCallback((config: Record<string, ScopedMcpServerConfig>) => {
    setDynamicMcpConfig(config);
  }, [setDynamicMcpConfig]);
  const [screen, setScreen] = useState<Screen>('prompt');
  const [showAllInTranscript, setShowAllInTranscript] = useState(false);
  // [ forces the dump-to-scrollback path inside transcript mode. Separate
  // from CLAUDE_CODE_NO_FLICKER=0 (which is process-lifetime) — this is
  // ephemeral, reset on transcript exit. Diagnostic escape hatch so
  // terminal/tmux native cmd-F can search the full flat render.
  const [dumpMode, setDumpMode] = useState(false);
  // v-for-editor render progress. Inline in the footer — notifications
  // render inside PromptInput which isn't mounted in transcript.
  const [editorStatus, setEditorStatus] = useState('');
  // Incremented on transcript exit. Async v-render captures this at start;
  // each status write no-ops if stale (user left transcript mid-render —
  // the stable setState would otherwise stamp a ghost toast into the next
  // session). Also clears any pending 4s auto-clear.
  const editorGenRef = useRef(0);
  const editorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editorRenderingRef = useRef(false);
  const {
    addNotification,
    removeNotification
  } = useNotifications();

  // eslint-disable-next-line prefer-const
  let trySuggestBgPRIntercept = SUGGEST_BG_PR_NOOP;
  const mcpClients = useMergedClients(initialMcpClients, mcp.clients);

  // IDE integration
  const [ideSelection, setIDESelection] = useState<IDESelection | undefined>(undefined);
  const [ideToInstallExtension, setIDEToInstallExtension] = useState<IdeType | null>(null);
  const [ideInstallationStatus, setIDEInstallationStatus] = useState<IDEExtensionInstallationStatus | null>(null);
  const [showIdeOnboarding, setShowIdeOnboarding] = useState(false);
  // Dead code elimination: model switch callout state (ant-only)
  const [showModelSwitchCallout, setShowModelSwitchCallout] = useState(() => {
    if ("external" === 'ant') {
      return shouldShowAntModelSwitch();
    }
    return false;
  });
  const [showEffortCallout, setShowEffortCallout] = useState(() => shouldShowEffortCallout(mainLoopModel));
  const showRemoteCallout = useAppState(s => s.showRemoteCallout);
  const [showDesktopUpsellStartup, setShowDesktopUpsellStartup] = useState(() => shouldShowDesktopUpsellStartup());
  // notifications
  useModelMigrationNotifications();
  useCanSwitchToExistingSubscription();
  useIDEStatusIndicator({
    ideSelection,
    mcpClients,
    ideInstallationStatus
  });
  useMcpConnectivityStatus({
    mcpClients
  });
  useAutoModeUnavailableNotification();
  usePluginInstallationStatus();
  usePluginAutoupdateNotification();
  useSettingsErrors();
  useRateLimitWarningNotification(mainLoopModel);
  useFastModeNotification();
  useDeprecationWarningNotification(mainLoopModel);
  useNpmDeprecationNotification();
  useAntOrgWarningNotification();
  useInstallMessages();
  useChromeExtensionNotification();
  useOfficialMarketplaceNotification();
  useLspInitializationNotification();
  useTeammateLifecycleNotification();
  const {
    recommendation: lspRecommendation,
    handleResponse: handleLspResponse
  } = useLspPluginRecommendation();
  const {
    recommendation: hintRecommendation,
    handleResponse: handleHintResponse
  } = useClaudeCodeHintRecommendation();

  // Memoize the combined initial tools array to prevent reference changes
  const combinedInitialTools = useMemo(() => {
    return [...localTools, ...initialTools];
  }, [localTools, initialTools]);

  // Initialize plugin management
  useManagePlugins({
    enabled: !isRemoteSession
  });
  const tasksV2 = useTasksV2WithCollapseEffect();

  // Start background plugin installations

  // SECURITY: This code is guaranteed to run ONLY after the "trust this folder" dialog
  // has been confirmed by the user. The trust dialog is shown in cli.tsx (line ~387)
  // before the REPL component is rendered. The dialog blocks execution until the user
  // accepts, and only then is the REPL component mounted and this effect runs.
  // This ensures that plugin installations from repository and user settings only
  // happen after explicit user consent to trust the current working directory.
  useEffect(() => {
    if (isRemoteSession) return;
    void performStartupChecks(setAppState);
  }, [setAppState, isRemoteSession]);

  // Allow Claude in Chrome MCP to send prompts through MCP notifications
  // and sync permission mode changes to the Chrome extension
  usePromptsFromClaudeInChrome(isRemoteSession ? EMPTY_MCP_CLIENTS : mcpClients, toolPermissionContext.mode);

  // Initialize swarm features: teammate hooks and context
  // Handles both fresh spawns and resumed teammate sessions
  useSwarmInitialization(setAppState, initialMessages, {
    enabled: !isRemoteSession
  });
  const mergedTools = useMergedTools(combinedInitialTools, mcp.tools, toolPermissionContext);

  // Apply agent tool restrictions if mainThreadAgentDefinition is set
  const {
    tools,
    allowedAgentTypes
  } = useMemo(() => {
    if (!mainThreadAgentDefinition) {
      return {
        tools: mergedTools,
        allowedAgentTypes: undefined as string[] | undefined
      };
    }
    const resolved = resolveAgentTools(mainThreadAgentDefinition, mergedTools, false, true);
    return {
      tools: resolved.resolvedTools,
      allowedAgentTypes: resolved.allowedAgentTypes
    };
  }, [mainThreadAgentDefinition, mergedTools]);

  // Merge commands from local state, plugins, and MCP
  const commandsWithPlugins = useMergedCommands(localCommands, plugins.commands as Command[]);
  const mergedCommands = useMergedCommands(commandsWithPlugins, mcp.commands as Command[]);
  // Filter out all commands if disableSlashCommands is true
  const commands = useMemo(() => disableSlashCommands ? [] : mergedCommands, [disableSlashCommands, mergedCommands]);
  useIdeLogging(isRemoteSession ? EMPTY_MCP_CLIENTS : mcp.clients);
  useIdeSelection(isRemoteSession ? EMPTY_MCP_CLIENTS : mcp.clients, setIDESelection);
  const [streamMode, setStreamMode] = useState<SpinnerMode>('responding');
  // Ref mirror so onSubmit can read the latest value without adding
  // streamMode to its deps. streamMode flips between
  // requesting/responding/tool-use ~10x per turn during streaming; having it
  // in onSubmit's deps was recreating onSubmit on every flip, which
  // cascaded into PromptInput prop churn and downstream useCallback/useMemo
  // invalidation. The only consumers inside callbacks are debug logging and
  // telemetry (handlePromptSubmit.ts), so a stale-by-one-render value is
  // harmless — but ref mirrors sync on every render anyway so it's fresh.
  const streamModeRef = useRef(streamMode);
  streamModeRef.current = streamMode;
  const [streamingToolUses, setStreamingToolUses] = useState<StreamingToolUse[]>([]);
  const [streamingThinking, setStreamingThinking] = useState<StreamingThinking | null>(null);

  // Auto-hide streaming thinking after 30 seconds of being completed
  useEffect(() => {
    if (streamingThinking && !streamingThinking.isStreaming && streamingThinking.streamingEndedAt) {
      const elapsed = Date.now() - streamingThinking.streamingEndedAt;
      const remaining = 30000 - elapsed;
      if (remaining > 0) {
        const timer = setTimeout(setStreamingThinking, remaining, null);
        return () => clearTimeout(timer);
      } else {
        setStreamingThinking(null);
      }
    }
  }, [streamingThinking]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // Ref that always points to the current abort controller, used by the
  // REPL bridge to abort the active query when a remote interrupt arrives.
  const abortControllerRef = useRef<AbortController | null>(null);
  abortControllerRef.current = abortController;

  // Ref for the bridge result callback — set after useReplBridge initializes,
  // read in the onQuery finally block to notify mobile clients that a turn ended.
  const sendBridgeResultRef = useRef<() => void>(() => {});

  // Ref for the synchronous restore callback — set after restoreMessageSync is
  // defined, read in the onQuery finally block for auto-restore on interrupt.
  const restoreMessageSyncRef = useRef<(m: UserMessage) => void>(() => {});

  // Ref to the fullscreen layout's scroll box for keyboard scrolling.
  // Null when fullscreen mode is disabled (ref never attached).
  const scrollRef = useRef<ScrollBoxHandle>(null);
  // Separate ref for the modal slot's inner ScrollBox — passed through
  // FullscreenLayout → ModalContext so Tabs can attach it to its own
  // ScrollBox for tall content (e.g. /status's MCP-server list). NOT
  // keyboard-driven — ScrollKeybindingHandler stays on the outer ref so
  // PgUp/PgDn/wheel always scroll the transcript behind the modal.
  // Plumbing kept for future modal-scroll wiring.
  const modalScrollRef = useRef<ScrollBoxHandle>(null);
  // Timestamp of the last user-initiated scroll (wheel, PgUp/PgDn, ctrl+u,
  // End/Home, G, drag-to-scroll). Stamped in composedOnScroll — the single
  // chokepoint ScrollKeybindingHandler calls for every user scroll action.
  // Programmatic scrolls (repinScroll's scrollToBottom, sticky auto-follow)
  // do NOT go through composedOnScroll, so they don't stamp this. Ref not
  // state: no re-render on every wheel tick.
  const lastUserScrollTsRef = useRef(0);

  // Synchronous state machine for the query lifecycle. Replaces the
  // error-prone dual-state pattern where isLoading (React state, async
  // batched) and isQueryRunning (ref, sync) could desync. See QueryGuard.ts.
  const queryGuard = React.useRef(new QueryGuard()).current;

  // Subscribe to the guard — true during dispatching or running.
  // This is the single source of truth for "is a local query in flight".
  const isQueryActive = React.useSyncExternalStore(queryGuard.subscribe, queryGuard.getSnapshot);

  // Separate loading flag for operations outside the local query guard:
  // remote sessions (useRemoteSession / useDirectConnect) and foregrounded
  // background tasks (useSessionBackgrounding). These don't route through
  // onQuery / queryGuard, so they need their own spinner-visibility state.
  // Initialize true if remote mode with initial prompt (CCR processing it).
  const [isExternalLoading, setIsExternalLoadingRaw] = React.useState(remoteSessionConfig?.hasInitialPrompt ?? false);

  // Derived: any loading source active. Read-only — no setter. Local query
  // loading is driven by queryGuard (reserve/tryStart/end/cancelReservation),
  // external loading by setIsExternalLoading.
  const isLoading = isQueryActive || isExternalLoading;

  // Elapsed time is computed by SpinnerWithVerb from these refs on each
  // animation frame, avoiding a useInterval that re-renders the entire REPL.
  const [userInputOnProcessing, setUserInputOnProcessingRaw] = React.useState<string | undefined>(undefined);
  // messagesRef.current.length at the moment userInputOnProcessing was set.
  // The placeholder hides once displayedMessages grows past this — i.e. the
  // real user message has landed in the visible transcript.
  const userInputBaselineRef = React.useRef(0);
  // True while the submitted prompt is being processed but its user message
  // hasn't reached setMessages yet. setMessages uses this to keep the
  // baseline in sync when unrelated async messages (bridge status, hook
  // results, scheduled tasks) land during that window.
  const userMessagePendingRef = React.useRef(false);

  // Wall-clock time tracking refs for accurate elapsed time calculation
  const loadingStartTimeRef = React.useRef<number>(0);
  const totalPausedMsRef = React.useRef(0);
  const pauseStartTimeRef = React.useRef<number | null>(null);
  const resetTimingRefs = React.useCallback(() => {
    loadingStartTimeRef.current = Date.now();
    totalPausedMsRef.current = 0;
    pauseStartTimeRef.current = null;
  }, []);

  // Reset timing refs inline when isQueryActive transitions false→true.
  // queryGuard.reserve() (in executeUserInput) fires BEFORE processUserInput's
  // first await, but the ref reset in onQuery's try block runs AFTER. During
  // that gap, React renders the spinner with loadingStartTimeRef=0, computing
  // elapsedTimeMs = Date.now() - 0 ≈ 56 years. This inline reset runs on the
  // first render where isQueryActive is observed true — the same render that
  // first shows the spinner — so the ref is correct by the time the spinner
  // reads it. See INC-4549.
  const wasQueryActiveRef = React.useRef(false);
  if (isQueryActive && !wasQueryActiveRef.current) {
    resetTimingRefs();
  }
  wasQueryActiveRef.current = isQueryActive;

  // Wrapper for setIsExternalLoading that resets timing refs on transition
  // to true — SpinnerWithVerb reads these for elapsed time, so they must be
  // reset for remote sessions / foregrounded tasks too (not just local
  // queries, which reset them in onQuery). Without this, a remote-only
  // session would show ~56 years elapsed (Date.now() - 0).
  const setIsExternalLoading = React.useCallback((value: boolean) => {
    setIsExternalLoadingRaw(value);
    if (value) resetTimingRefs();
  }, [resetTimingRefs]);

  // Start time of the first turn that had swarm teammates running
  // Used to compute total elapsed time (including teammate execution) for the deferred message
  const swarmStartTimeRef = React.useRef<number | null>(null);
  const swarmBudgetInfoRef = React.useRef<{
    tokens: number;
    limit: number;
    nudges: number;
  } | undefined>(undefined);

  // Ref to track current focusedInputDialog for use in callbacks
  // This avoids stale closures when checking dialog state in timer callbacks
  const focusedInputDialogRef = React.useRef<ReturnType<typeof getFocusedInputDialog>>(undefined);

  // How long after the last keystroke before deferred dialogs are shown
  const PROMPT_SUPPRESSION_MS = 1500;
  // True when user is actively typing — defers interrupt dialogs so keystrokes
  // don't accidentally dismiss or answer a permission prompt the user hasn't read yet.
  const [isPromptInputActive, setIsPromptInputActive] = React.useState(false);
  const [autoUpdaterResult, setAutoUpdaterResult] = useState<AutoUpdaterResult | null>(null);
  useEffect(() => {
    if (autoUpdaterResult?.notifications) {
      autoUpdaterResult.notifications.forEach(notification => {
        addNotification({
          key: 'auto-updater-notification',
          text: notification,
          priority: 'low'
        });
      });
    }
  }, [autoUpdaterResult, addNotification]);

  // tmux + fullscreen + `mouse off`: one-time hint that wheel won't scroll.
  // We no longer mutate tmux's session-scoped mouse option (it poisoned
  // sibling panes); tmux users already know this tradeoff from vim/less.
  useEffect(() => {
    if (isFullscreenEnvEnabled()) {
      void maybeGetTmuxMouseHint().then(hint => {
        if (hint) {
          addNotification({
            key: 'tmux-mouse-hint',
            text: hint,
            priority: 'low'
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showUndercoverCallout, setShowUndercoverCallout] = useState(false);
  useEffect(() => {
    if ("external" === 'ant') {
      void (async () => {
        // Wait for repo classification to settle (memoized, no-op if primed).
        const {
          isInternalModelRepo
        } = await import('../utils/commitAttribution.js');
        await isInternalModelRepo();
        const {
          shouldShowUndercoverAutoNotice
        } = await import('../utils/undercover.js');
        if (shouldShowUndercoverAutoNotice()) {
          setShowUndercoverCallout(true);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [toolJSX, setToolJSXInternal] = useState<{
    jsx: React.ReactNode | null;
    shouldHidePromptInput: boolean;
    shouldContinueAnimation?: true;
    showSpinner?: boolean;
    isLocalJSXCommand?: boolean;
    isImmediate?: boolean;
  } | null>(null);

  // Track local JSX commands separately so tools can't overwrite them.
  // This enables "immediate" commands (like /btw) to persist while Claude is processing.
  const localJSXCommandRef = useRef<{
    jsx: React.ReactNode | null;
    shouldHidePromptInput: boolean;
    shouldContinueAnimation?: true;
    showSpinner?: boolean;
    isLocalJSXCommand: true;
  } | null>(null);

  // Wrapper for setToolJSX that preserves local JSX commands (like /btw).
  // When a local JSX command is active, we ignore updates from tools
  // unless they explicitly set clearLocalJSX: true (from onDone callbacks).
  //
  // TO ADD A NEW IMMEDIATE COMMAND:
  // 1. Set `immediate: true` in the command definition
  // 2. Set `isLocalJSXCommand: true` when calling setToolJSX in the command's JSX
  // 3. In the onDone callback, use `setToolJSX({ jsx: null, shouldHidePromptInput: false, clearLocalJSX: true })`
  //    to explicitly clear the overlay when the user dismisses it
  const setToolJSX = useCallback((args: {
    jsx: React.ReactNode | null;
    shouldHidePromptInput: boolean;
    shouldContinueAnimation?: true;
    showSpinner?: boolean;
    isLocalJSXCommand?: boolean;
    clearLocalJSX?: boolean;
  } | null) => {
    // If setting a local JSX command, store it in the ref
    if (args?.isLocalJSXCommand) {
      const {
        clearLocalJSX: _,
        ...rest
      } = args;
      localJSXCommandRef.current = {
        ...rest,
        isLocalJSXCommand: true
      };
      setToolJSXInternal(rest);
      return;
    }

    // If there's an active local JSX command in the ref
    if (localJSXCommandRef.current) {
      // Allow clearing only if explicitly requested (from onDone callbacks)
      if (args?.clearLocalJSX) {
        localJSXCommandRef.current = null;
        setToolJSXInternal(null);
        return;
      }
      // Otherwise, keep the local JSX command visible - ignore tool updates
      return;
    }

    // No active local JSX command, allow any update
    if (args?.clearLocalJSX) {
      setToolJSXInternal(null);
      return;
    }
    setToolJSXInternal(args);
  }, []);
  const [toolUseConfirmQueue, setToolUseConfirmQueue] = useState<ToolUseConfirm[]>([]);
  // Sticky footer JSX registered by permission request components (currently
  // only ExitPlanModePermissionRequest). Renders in FullscreenLayout's `bottom`
  // slot so response options stay visible while the user scrolls a long plan.
  const [permissionStickyFooter, setPermissionStickyFooter] = useState<React.ReactNode | null>(null);
  const [sandboxPermissionRequestQueue, setSandboxPermissionRequestQueue] = useState<Array<{
    hostPattern: NetworkHostPattern;
    resolvePromise: (allowConnection: boolean) => void;
  }>>([]);
  const [promptQueue, setPromptQueue] = useState<Array<{
    request: PromptRequest;
    title: string;
    toolInputSummary?: string | null;
    resolve: (response: PromptResponse) => void;
    reject: (error: Error) => void;
  }>>([]);

  // Track bridge cleanup functions for sandbox permission requests so the
  // local dialog handler can cancel the remote prompt when the local user
  // responds first. Keyed by host to support concurrent same-host requests.
  const sandboxBridgeCleanupRef = useRef<Map<string, Array<() => void>>>(new Map());

  // -- Terminal title management
  // Session title (set via /rename or restored on resume) wins over
  // the agent name, which wins over the Haiku-extracted topic;
  // all fall back to the product name.
  const terminalTitleFromRename = useAppState(s => s.settings.terminalTitleFromRename) !== false;
  const sessionTitle = terminalTitleFromRename ? getCurrentSessionTitle(getSessionId()) : undefined;
  const [haikuTitle, setHaikuTitle] = useState<string>();
  // Gates the one-shot Haiku call that generates the tab title. Seeded true
  // on resume (initialMessages present) so we don't re-title a resumed
  // session from mid-conversation context.
  const haikuTitleAttemptedRef = useRef((initialMessages?.length ?? 0) > 0);
  const agentTitle = mainThreadAgentDefinition?.agentType;
  const terminalTitle = sessionTitle ?? agentTitle ?? haikuTitle ?? 'Claude Code';
  const isWaitingForApproval = toolUseConfirmQueue.length > 0 || promptQueue.length > 0 || pendingWorkerRequest || pendingSandboxRequest;
  // Local-jsx commands (like /plugin, /config) show user-facing dialogs that
  // wait for input. Require jsx != null — if the flag is stuck true but jsx
  // is null, treat as not-showing so TextInput focus and queue processor
  // aren't deadlocked by a phantom overlay.
  const isShowingLocalJSXCommand = toolJSX?.isLocalJSXCommand === true && toolJSX?.jsx != null;
  const titleIsAnimating = isLoading && !isWaitingForApproval && !isShowingLocalJSXCommand;
  // Title animation state lives in <AnimatedTerminalTitle> so the 960ms tick
  // doesn't re-render REPL. titleDisabled/terminalTitle are still computed
  // here because onQueryImpl reads them (background session description,
  // haiku title extraction gate).

  // Prevent macOS from sleeping while Claude is working
  useEffect(() => {
    if (isLoading && !isWaitingForApproval && !isShowingLocalJSXCommand) {
      startPreventSleep();
      return () => stopPreventSleep();
    }
  }, [isLoading, isWaitingForApproval, isShowingLocalJSXCommand]);
  const sessionStatus: TabStatusKind = isWaitingForApproval || isShowingLocalJSXCommand ? 'waiting' : isLoading ? 'busy' : 'idle';
  const waitingFor = sessionStatus !== 'waiting' ? undefined : toolUseConfirmQueue.length > 0 ? `approve ${toolUseConfirmQueue[0]!.tool.name}` : pendingWorkerRequest ? 'worker request' : pendingSandboxRequest ? 'sandbox request' : isShowingLocalJSXCommand ? 'dialog open' : 'input needed';

  // Push status to the PID file for `claude ps`. Fire-and-forget; ps falls
  // back to transcript-tail derivation when this is missing/stale.
  useEffect(() => {
    if (feature('BG_SESSIONS')) {
      void updateSessionActivity({
        status: sessionStatus,
        waitingFor
      });
    }
  }, [sessionStatus, waitingFor]);

  // 3P default: off — OSC 21337 is ant-only while the spec stabilizes.
  // Gated so we can roll back if the sidebar indicator conflicts with
  // the title spinner in terminals that render both. When the flag is
  // on, the user-facing config setting controls whether it's active.
  const tabStatusGateEnabled = getFeatureValue_CACHED_MAY_BE_STALE('tengu_terminal_sidebar', false);
  const showStatusInTerminalTab = tabStatusGateEnabled && (getGlobalConfig().showStatusInTerminalTab ?? false);
  useTabStatus(titleDisabled || !showStatusInTerminalTab ? null : sessionStatus);

  // Register the leader's setToolUseConfirmQueue for in-process teammates
  useEffect(() => {
    registerLeaderToolUseConfirmQueue(setToolUseConfirmQueue);
    return () => unregisterLeaderToolUseConfirmQueue();
  }, [setToolUseConfirmQueue]);
  const [messages, rawSetMessages] = useState<MessageType[]>(initialMessages ?? []);
  const messagesRef = useRef(messages);
  // Stores the willowMode variant that was shown (or false if no hint shown).
  // Captured at hint_shown time so hint_converted telemetry reports the same
  // variant — the GrowthBook value shouldn't change mid-session, but reading
  // it once guarantees consistency between the paired events.
  const idleHintShownRef = useRef<string | false>(false);
  // Wrap setMessages so messagesRef is always current the instant the
  // call returns — not when React later processes the batch.  Apply the
  // updater eagerly against the ref, then hand React the computed value
  // (not the function).  rawSetMessages batching becomes last-write-wins,
  // and the last write is correct because each call composes against the
  // already-updated ref.  This is the Zustand pattern: ref is source of
  // truth, React state is the render projection.  Without this, paths
  // that queue functional updaters then synchronously read the ref
  // (e.g. handleSpeculationAccept → onQuery) see stale data.
  const setMessages = useCallback((action: React.SetStateAction<MessageType[]>) => {
    const prev = messagesRef.current;
    const next = typeof action === 'function' ? action(messagesRef.current) : action;
    messagesRef.current = next;
    if (next.length < userInputBaselineRef.current) {
      // Shrank (compact/rewind/clear) — clamp so placeholderText's length
      // check can't go stale.
      userInputBaselineRef.current = 0;
    } else if (next.length > prev.length && userMessagePendingRef.current) {
      // Grew while the submitted user message hasn't landed yet. If the
      // added messages don't include it (bridge status, hook results,
      // scheduled tasks landing async during processUserInputBase), bump
      // baseline so the placeholder stays visible. Once the user message
      // lands, stop tracking — later additions (assistant stream) should
      // not re-show the placeholder.
      const delta = next.length - prev.length;
      const added = prev.length === 0 || next[0] === prev[0] ? next.slice(-delta) : next.slice(0, delta);
      if (added.some(isHumanTurn)) {
        userMessagePendingRef.current = false;
      } else {
        userInputBaselineRef.current = next.length;
      }
    }
    rawSetMessages(next);
  }, []);
  // Capture the baseline message count alongside the placeholder text so
  // the render can hide it once displayedMessages grows past the baseline.
  const setUserInputOnProcessing = useCallback((input: string | undefined) => {
    if (input !== undefined) {
      userInputBaselineRef.current = messagesRef.current.length;
      userMessagePendingRef.current = true;
    } else {
      userMessagePendingRef.current = false;
    }
    setUserInputOnProcessingRaw(input);
  }, []);
  // Fullscreen: track the unseen-divider position. dividerIndex changes
  // only ~twice/scroll-session (first scroll-away + repin). pillVisible
  // and stickyPrompt now live in FullscreenLayout — they subscribe to
  // ScrollBox directly so per-frame scroll never re-renders REPL.
  const {
    dividerIndex,
    dividerYRef,
    onScrollAway,
    onRepin,
    jumpToNew,
    shiftDivider
  } = useUnseenDivider(messages.length);
  if (feature('AWAY_SUMMARY')) {
    // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
    useAwaySummary(messages, setMessages, isLoading);
  }
  const [cursor, setCursor] = useState<MessageActionsState | null>(null);
  const cursorNavRef = useRef<MessageActionsNav | null>(null);
  // Memoized so Messages' React.memo holds.
  const unseenDivider = useMemo(() => computeUnseenDivider(messages, dividerIndex),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- length change covers appends; useUnseenDivider's count-drop guard clears dividerIndex on replace/rewind
  [dividerIndex, messages.length]);
  // Re-pin scroll to bottom and clear the unseen-messages baseline. Called
  // on any user-driven return-to-live action (submit, type-into-empty,
  // overlay appear/dismiss).
  const repinScroll = useCallback(() => {
    scrollRef.current?.scrollToBottom();
    onRepin();
    setCursor(null);
  }, [onRepin, setCursor]);
  // Backstop for the submit-handler repin at onSubmit. If a buffered stdin
  // event (wheel/drag) races between handler-fire and state-commit, the
  // handler's scrollToBottom can be undone. This effect fires on the render
  // where the user's message actually lands — tied to React's commit cycle,
  // so it can't race with stdin. Keyed on lastMsg identity (not messages.length)
  // so useAssistantHistory's prepends don't spuriously repin.
  const lastMsg = messages.at(-1);
  const lastMsgIsHuman = lastMsg != null && isHumanTurn(lastMsg);
  useEffect(() => {
    if (lastMsgIsHuman) {
      repinScroll();
    }
  }, [lastMsgIsHuman, lastMsg, repinScroll]);
  // Assistant-chat: lazy-load remote history on scroll-up. No-op unless
  // KAIROS build + config.viewerOnly. feature() is build-time constant so
  // the branch is dead-code-eliminated in non-KAIROS builds (same pattern
  // as useUnseenDivider above).
  const {
    maybeLoadOlder
  } = feature('KAIROS') ?
  // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
  useAssistantHistory({
    config: remoteSessionConfig,
    setMessages,
    scrollRef,
    onPrepend: shiftDivider
  }) : HISTORY_STUB;
  // Compose useUnseenDivider's callbacks with the lazy-load trigger.
  const composedOnScroll = useCallback((sticky: boolean, handle: ScrollBoxHandle) => {
    lastUserScrollTsRef.current = Date.now();
    if (sticky) {
      onRepin();
    } else {
      onScrollAway(handle);
      if (feature('KAIROS')) maybeLoadOlder(handle);
      // Dismiss the companion bubble on scroll — it's absolute-positioned
      // at bottom-right and covers transcript content. Scrolling = user is
      // trying to read something under it.
      if (feature('BUDDY')) {
        setAppState(prev => prev.companionReaction === undefined ? prev : {
          ...prev,
          companionReaction: undefined
        });
      }
    }
  }, [onRepin, onScrollAway, maybeLoadOlder, setAppState]);
  // Deferred SessionStart hook messages — REPL renders immediately and
  // hook messages are injected when they resolve. awaitPendingHooks()
  // must be called before the first API call so the model sees hook context.
  const awaitPendingHooks = useDeferredHookMessages(pendingHookMessages, setMessages);

  // Deferred messages for the Messages component — renders at transition
  // priority so the reconciler yields every 5ms, keeping input responsive
  // while the expensive message processing pipeline runs.
  const deferredMessages = useDeferredValue(messages);
  const deferredBehind = messages.length - deferredMessages.length;
  if (deferredBehind > 0) {
    logForDebugging(`[useDeferredValue] Messages deferred by ${deferredBehind} (${deferredMessages.length}→${messages.length})`);
  }

  // Frozen state for transcript mode - stores lengths instead of cloning arrays for memory efficiency
  const [frozenTranscriptState, setFrozenTranscriptState] = useState<{
    messagesLength: number;
    streamingToolUsesLength: number;
  } | null>(null);
  // Initialize input with any early input that was captured before REPL was ready.
  // Using lazy initialization ensures cursor offset is set correctly in PromptInput.
  const [inputValue, setInputValueRaw] = useState(() => consumeEarlyInput());
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;
  const insertTextRef = useRef<{
    insert: (text: string) => void;
    setInputWithCursor: (value: string, cursor: number) => void;
    cursorOffset: number;
  } | null>(null);

  // Wrap setInputValue to co-locate suppression state updates.
  // Both setState calls happen in the same synchronous context so React
  // batches them into a single render, eliminating the extra render that
  // the previous useEffect → setState pattern caused.
  const setInputValue = useCallback((value: string) => {
    if (trySuggestBgPRIntercept(inputValueRef.current, value)) return;
    // In fullscreen mode, typing into an empty prompt re-pins scroll to
    // bottom. Only fires on empty→non-empty so scrolling up to reference
    // something while composing a message doesn't yank the view back on
    // every keystroke. Restores the pre-fullscreen muscle memory of
    // typing to snap back to the end of the conversation.
    // Skipped if the user scrolled within the last 3s — they're actively
    // reading, not lost. lastUserScrollTsRef starts at 0 so the first-
    // ever keypress (no scroll yet) always repins.
    if (inputValueRef.current === '' && value !== '' && Date.now() - lastUserScrollTsRef.current >= RECENT_SCROLL_REPIN_WINDOW_MS) {
      repinScroll();
    }
    // Sync ref immediately (like setMessages) so callers that read
    // inputValueRef before React commits — e.g. the auto-restore finally
    // block's `=== ''` guard — see the fresh value, not the stale render.
    inputValueRef.current = value;
    setInputValueRaw(value);
    setIsPromptInputActive(value.trim().length > 0);
  }, [setIsPromptInputActive, repinScroll, trySuggestBgPRIntercept]);

  // Schedule a timeout to stop suppressing dialogs after the user stops typing.
  // Only manages the timeout — the immediate activation is handled by setInputValue above.
  useEffect(() => {
    if (inputValue.trim().length === 0) return;
    const timer = setTimeout(setIsPromptInputActive, PROMPT_SUPPRESSION_MS, false);
    return () => clearTimeout(timer);
  }, [inputValue]);
  const [inputMode, setInputMode] = useState<PromptInputMode>('prompt');
  const [stashedPrompt, setStashedPrompt] = useState<{
    text: string;
    cursorOffset: number;
    pastedContents: Record<number, PastedContent>;
  } | undefined>();

  // Callback to filter commands based on CCR's available slash commands
  const handleRemoteInit = useCallback((remoteSlashCommands: string[]) => {
    const remoteCommandSet = new Set(remoteSlashCommands);
    // Keep commands that CCR lists OR that are in the local-safe set
    setLocalCommands(prev => prev.filter(cmd => remoteCommandSet.has(cmd.name) || REMOTE_SAFE_COMMANDS.has(cmd)));
  }, [setLocalCommands]);
  const [inProgressToolUseIDs, setInProgressToolUseIDs] = useState<Set<string>>(new Set());
  const hasInterruptibleToolInProgressRef = useRef(false);

  // Remote session hook - manages WebSocket connection and message handling for --remote mode
  const remoteSession = useRemoteSession({
    config: remoteSessionConfig,
    setMessages,
    setIsLoading: setIsExternalLoading,
    onInit: handleRemoteInit,
    setToolUseConfirmQueue,
    tools: combinedInitialTools,
    setStreamingToolUses,
    setStreamMode,
    setInProgressToolUseIDs
  });

  // Direct connect hook - manages WebSocket to a claude server for `claude connect` mode
  const directConnect = useDirectConnect({
    config: directConnectConfig,
    setMessages,
    setIsLoading: setIsExternalLoading,
    setToolUseConfirmQueue,
    tools: combinedInitialTools
  });

  // SSH session hook - manages ssh child process for `claude ssh` mode.
  // Same callback shape as useDirectConnect; only the transport under the
  // hood differs (ChildProcess stdin/stdout vs WebSocket).
  const sshRemote = useSSHSession({
    session: sshSession,
    setMessages,
    setIsLoading: setIsExternalLoading,
    setToolUseConfirmQueue,
    tools: combinedInitialTools
  });

  // Use whichever remote mode is active
  const activeRemote = sshRemote.isRemoteMode ? sshRemote : directConnect.isRemoteMode ? directConnect : remoteSession;
  const [pastedContents, setPastedContents] = useState<Record<number, PastedContent>>({});
  const [submitCount, setSubmitCount] = useState(0);
  // Ref instead of state to avoid triggering React re-renders on every
  // streaming text_delta. The spinner reads this via its animation timer.
  const responseLengthRef = useRef(0);
  // API performance metrics ref for ant-only spinner display (TTFT/OTPS).
  // Accumulates metrics from all API requests in a turn for P50 aggregation.
  const apiMetricsRef = useRef<Array<{
    ttftMs: number;
    firstTokenTime: number;
    lastTokenTime: number;
    responseLengthBaseline: number;
    // Tracks responseLengthRef at the time of the last content addition.
    // Updated by both streaming deltas and subagent message content.
    // lastTokenTime is also updated at the same time, so the OTPS
    // denominator correctly includes subagent processing time.
    endResponseLength: number;
  }>>([]);
  const setResponseLength = useCallback((f: (prev: number) => number) => {
    const prev = responseLengthRef.current;
    responseLengthRef.current = f(prev);
    // When content is added (not a compaction reset), update the latest
    // metrics entry so OTPS reflects all content generation activity.
    // Updating lastTokenTime here ensures the denominator includes both
    // streaming time AND subagent execution time, preventing inflation.
    if (responseLengthRef.current > prev) {
      const entries = apiMetricsRef.current;
      if (entries.length > 0) {
        const lastEntry = entries.at(-1)!;
        lastEntry.lastTokenTime = Date.now();
        lastEntry.endResponseLength = responseLengthRef.current;
      }
    }
  }, []);

  // Streaming text display: set state directly per delta (Ink's 16ms render
  // throttle batches rapid updates). Cleared on message arrival (messages.ts)
  // so displayedMessages switches from deferredMessages to messages atomically.
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const reducedMotion = useAppState(s => s.settings.prefersReducedMotion) ?? false;
  const showStreamingText = !reducedMotion && !hasCursorUpViewportYankBug();
  const onStreamingText = useCallback((f: (current: string | null) => string | null) => {
    if (!showStreamingText) return;
    setStreamingText(f);
  }, [showStreamingText]);

  // Hide the in-progress source line so text streams line-by-line, not
  // char-by-char. lastIndexOf returns -1 when no newline, giving '' → null.
  // Guard on showStreamingText so toggling reducedMotion mid-stream
  // immediately hides the streaming preview.
  const visibleStreamingText = streamingText && showStreamingText ? streamingText.substring(0, streamingText.lastIndexOf('\n') + 1) || null : null;
  const [lastQueryCompletionTime, setLastQueryCompletionTime] = useState(0);
  const [spinnerMessage, setSpinnerMessage] = useState<string | null>(null);
  const [spinnerColor, setSpinnerColor] = useState<keyof Theme | null>(null);
  const [spinnerShimmerColor, setSpinnerShimmerColor] = useState<keyof Theme | null>(null);
  const [isMessageSelectorVisible, setIsMessageSelectorVisible] = useState(false);
  const [messageSelectorPreselect, setMessageSelectorPreselect] = useState<UserMessage | undefined>(undefined);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [conversationId, setConversationId] = useState(randomUUID());

  // Idle-return dialog: shown when user submits after a long idle gap
  const [idleReturnPending, setIdleReturnPending] = useState<{
    input: string;
    idleMinutes: number;
  } | null>(null);
  const skipIdleCheckRef = useRef(false);
  const lastQueryCompletionTimeRef = useRef(lastQueryCompletionTime);
  lastQueryCompletionTimeRef.current = lastQueryCompletionTime;

  // Aggregate tool result budget: per-conversation decision tracking.
  // When the GrowthBook flag is on, query.ts enforces the budget; when
  // off (undefined), enforcement is skipped entirely. Stale entries after
  // /clear, rewind, or compact are harmless (tool_use_ids are UUIDs, stale
  // keys are never looked up). Memory is bounded by total replacement count
  // × ~2KB preview over the REPL lifetime — negligible.
  //
  // Lazy init via useState initializer — useRef(expr) evaluates expr on every
  // render (React ignores it after first, but the computation still runs).
  // For large resumed sessions, reconstruction does O(messages × blocks)
  // work; we only want that once.
  const [contentReplacementStateRef] = useState(() => ({
    current: provisionContentReplacementState(initialMessages, initialContentReplacements)
  }));
  const [haveShownCostDialog, setHaveShownCostDialog] = useState(getGlobalConfig().hasAcknowledgedCostThreshold);
  const [vimMode, setVimMode] = useState<VimMode>('INSERT');
  const [showBashesDialog, setShowBashesDialog] = useState<string | boolean>(false);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // showBashesDialog is REPL-level so it survives PromptInput unmounting.
  // When ultraplan approval fires while the pill dialog is open, PromptInput
  // unmounts (focusedInputDialog → 'ultraplan-choice') but this stays true;
  // after accepting, PromptInput remounts into an empty "No tasks" dialog
  // (the completed ultraplan task has been filtered out). Close it here.
  useEffect(() => {
    if (ultraplanPendingChoice && showBashesDialog) {
      setShowBashesDialog(false);
    }
  }, [ultraplanPendingChoice, showBashesDialog]);
  const isTerminalFocused = useTerminalFocus();
  const terminalFocusRef = useRef(isTerminalFocused);
  terminalFocusRef.current = isTerminalFocused;
  const [theme] = useTheme();

  // resetLoadingState runs twice per turn (onQueryImpl tail + onQuery finally).
  // Without this guard, both calls pick a tip → two recordShownTip → two
  // saveGlobalConfig writes back-to-back. Reset at submit in onSubmit.
  const tipPickedThisTurnRef = React.useRef(false);
  const pickNewSpinnerTip = useCallback(() => {
    if (tipPickedThisTurnRef.current) return;
    tipPickedThisTurnRef.current = true;
    const newMessages = messagesRef.current.slice(bashToolsProcessedIdx.current);
    for (const tool of extractBashToolsFromMessages(newMessages)) {
      bashTools.current.add(tool);
    }
    bashToolsProcessedIdx.current = messagesRef.current.length;
    void getTipToShowOnSpinner({
      theme,
      readFileState: readFileState.current,
      bashTools: bashTools.current
    }).then(async tip => {
      if (tip) {
        const content = await tip.content({
          theme
        });
        setAppState(prev => ({
          ...prev,
          spinnerTip: content
        }));
        recordShownTip(tip);
      } else {
        setAppState(prev => {
          if (prev.spinnerTip === undefined) return prev;
          return {
            ...prev,
            spinnerTip: undefined
          };
        });
      }
    });
  }, [setAppState, theme]);

  // Resets UI loading state. Does NOT call onTurnComplete - that should be
  // called explicitly only when a query turn actually completes.
  const resetLoadingState = useCallback(() => {
    // isLoading is now derived from queryGuard — no setter call needed.
    // queryGuard.end() (onQuery finally) or cancelReservation() (executeUserInput
    // finally) have already transitioned the guard to idle by the time this runs.
    // External loading (remote/backgrounding) is reset separately by those hooks.
    setIsExternalLoading(false);
    setUserInputOnProcessing(undefined);
    responseLengthRef.current = 0;
    apiMetricsRef.current = [];
    setStreamingText(null);
    setStreamingToolUses([]);
    setSpinnerMessage(null);
    setSpinnerColor(null);
    setSpinnerShimmerColor(null);
    pickNewSpinnerTip();
    endInteractionSpan();
    // Speculative bash classifier checks are only valid for the current
    // turn's commands — clear after each turn to avoid accumulating
    // Promise chains for unconsumed checks (denied/aborted paths).
    clearSpeculativeChecks();
  }, [pickNewSpinnerTip]);

  // Session backgrounding — hook is below, after getToolUseContext

  const hasRunningTeammates = useMemo(() => getAllInProcessTeammateTasks(tasks).some(t => t.status === 'running'), [tasks]);

  // Show deferred turn duration message once all swarm teammates finish
  useEffect(() => {
    if (!hasRunningTeammates && swarmStartTimeRef.current !== null) {
      const totalMs = Date.now() - swarmStartTimeRef.current;
      const deferredBudget = swarmBudgetInfoRef.current;
      swarmStartTimeRef.current = null;
      swarmBudgetInfoRef.current = undefined;
      setMessages(prev => [...prev, createTurnDurationMessage(totalMs, deferredBudget,
      // Count only what recordTranscript will persist — ephemeral
      // progress ticks and non-ant attachments are filtered by
      // isLoggableMessage and never reach disk. Using raw prev.length
      // would make checkResumeConsistency report false delta<0 for
      // every turn that ran a progress-emitting tool.
      count(prev, isLoggableMessage))]);
    }
  }, [hasRunningTeammates, setMessages]);

  // Show auto permissions warning when entering auto mode
  // (either via Shift+Tab toggle or on startup). Debounced to avoid
  // flashing when the user is cycling through modes quickly.
  // Only shown 3 times total across sessions.
  const safeYoloMessageShownRef = useRef(false);
  useEffect(() => {
    if (feature('TRANSCRIPT_CLASSIFIER')) {
      if (toolPermissionContext.mode !== 'auto') {
        safeYoloMessageShownRef.current = false;
        return;
      }
      if (safeYoloMessageShownRef.current) return;
      const config = getGlobalConfig();
      const count = config.autoPermissionsNotificationCount ?? 0;
      if (count >= 3) return;
      const timer = setTimeout((ref, setMessages) => {
        ref.current = true;
        saveGlobalConfig(prev => {
          const prevCount = prev.autoPermissionsNotificationCount ?? 0;
          if (prevCount >= 3) return prev;
          return {
            ...prev,
            autoPermissionsNotificationCount: prevCount + 1
          };
        });
        setMessages(prev => [...prev, createSystemMessage(AUTO_MODE_DESCRIPTION, 'warning')]);
      }, 800, safeYoloMessageShownRef, setMessages);
      return () => clearTimeout(timer);
    }
  }, [toolPermissionContext.mode, setMessages]);

  // If worktree creation was slow and sparse-checkout isn't configured,
  // nudge the user toward settings.worktree.sparsePaths.
  const worktreeTipShownRef = useRef(false);
  useEffect(() => {
    if (worktreeTipShownRef.current) return;
    const wt = getCurrentWorktreeSession();
    if (!wt?.creationDurationMs || wt.usedSparsePaths) return;
    if (wt.creationDurationMs < 15_000) return;
    worktreeTipShownRef.current = true;
    const secs = Math.round(wt.creationDurationMs / 1000);
    setMessages(prev => [...prev, createSystemMessage(`Worktree creation took ${secs}s. For large repos, set \`worktree.sparsePaths\` in .claude/settings.json to check out only the directories you need — e.g. \`{"worktree": {"sparsePaths": ["src", "packages/foo"]}}\`.`, 'info')]);
  }, [setMessages]);

  // Hide spinner when the only in-progress tool is Sleep
  const onlySleepToolActive = useMemo(() => {
    const lastAssistant = messages.findLast(m => m.type === 'assistant');
    if (lastAssistant?.type !== 'assistant') return false;
    const inProgressToolUses = lastAssistant.message.content.filter(b => b.type === 'tool_use' && inProgressToolUseIDs.has(b.id));
    return inProgressToolUses.length > 0 && inProgressToolUses.every(b => b.type === 'tool_use' && b.name === SLEEP_TOOL_NAME);
  }, [messages, inProgressToolUseIDs]);
  const {
    onBeforeQuery: mrOnBeforeQuery,
    onTurnComplete: mrOnTurnComplete,
    render: mrRender
  } = useMoreRight({
    enabled: moreRightEnabled,
    setMessages,
    inputValue,
    setInputValue,
    setToolJSX
  });
  const showSpinner = (!toolJSX || toolJSX.showSpinner === true) && toolUseConfirmQueue.length === 0 && promptQueue.length === 0 && (
  // Show spinner during input processing, API call, while teammates are running,
  // or while pending task notifications are queued (prevents spinner bounce between consecutive notifications)
  isLoading || userInputOnProcessing || hasRunningTeammates ||
  // Keep spinner visible while task notifications are queued for processing.
  // Without this, the spinner briefly disappears between consecutive notifications
  // (e.g., multiple background agents completing in rapid succession) because
  // isLoading goes false momentarily between processing each one.
  getCommandQueueLength() > 0) &&
  // Hide spinner when waiting for leader to approve permission request
  !pendingWorkerRequest && !onlySleepToolActive && (
  // Hide spinner when streaming text is visible (the text IS the feedback),
  // but keep it when isBriefOnly suppresses the streaming text display
  !visibleStreamingText || isBriefOnly);

  // Check if any permission or ask question prompt is currently visible
  // This is used to prevent the survey from opening while prompts are active
  const hasActivePrompt = toolUseConfirmQueue.length > 0 || promptQueue.length > 0 || sandboxPermissionRequestQueue.length > 0 || elicitation.queue.length > 0 || workerSandboxPermissions.queue.length > 0;
  const feedbackSurveyOriginal = useFeedbackSurvey(messages, isLoading, submitCount, 'session', hasActivePrompt);
  const skillImprovementSurvey = useSkillImprovementSurvey(setMessages);
  const showIssueFlagBanner = useIssueFlagBanner(messages, submitCount);

  // Wrap feedback survey handler to trigger auto-run /issue
  const feedbackSurvey = useMemo(() => ({
    ...feedbackSurveyOriginal,
    handleSelect: (selected: 'dismissed' | 'bad' | 'fine' | 'good') => {
      // Reset the ref when a new survey response comes in
      didAutoRunIssueRef.current = false;
      const showedTranscriptPrompt = feedbackSurveyOriginal.handleSelect(selected);
      // Auto-run /issue for "bad" if transcript prompt wasn't shown
      if (selected === 'bad' && !showedTranscriptPrompt && shouldAutoRunIssue('feedback_survey_bad')) {
        setAutoRunIssueReason('feedback_survey_bad');
        didAutoRunIssueRef.current = true;
      }
    }
  }), [feedbackSurveyOriginal]);

  // Post-compact survey: shown after compaction if feature gate is enabled
  const postCompactSurvey = usePostCompactSurvey(messages, isLoading, hasActivePrompt, {
    enabled: !isRemoteSession
  });

  // Memory survey: shown when the assistant mentions memory and a memory file
  // was read this conversation
  const memorySurvey = useMemorySurvey(messages, isLoading, hasActivePrompt, {
    enabled: !isRemoteSession
  });

  // Frustration detection: show transcript sharing prompt after detecting frustrated messages
  const frustrationDetection = useFrustrationDetection(messages, isLoading, hasActivePrompt, feedbackSurvey.state !== 'closed' || postCompactSurvey.state !== 'closed' || memorySurvey.state !== 'closed');

  // Initialize IDE integration
  useIDEIntegration({
    autoConnectIdeFlag,
    ideToInstallExtension,
    setDynamicMcpConfig,
    setShowIdeOnboarding,
    setIDEInstallationState: setIDEInstallationStatus
  });
  useFileHistorySnapshotInit(initialFileHistorySnapshots, fileHistory, fileHistoryState => setAppState(prev => ({
    ...prev,
    fileHistory: fileHistoryState
  })));
  const resume = useCallback(async (sessionId: UUID, log: LogOption, entrypoint: ResumeEntrypoint) => {
    const resumeStart = performance.now();
    try {
      // Deserialize messages to properly clean up the conversation
      // This filters unresolved tool uses and adds a synthetic assistant message if needed
      const messages = deserializeMessages(log.messages);

      // Match coordinator/normal mode to the resumed session
      if (feature('COORDINATOR_MODE')) {
        /* eslint-disable @typescript-eslint/no-require-imports */
        const coordinatorModule = require('../coordinator/coordinatorMode.js') as typeof import('../coordinator/coordinatorMode.js');
        /* eslint-enable @typescript-eslint/no-require-imports */
        const warning = coordinatorModule.matchSessionMode(log.mode);
        if (warning) {
          // Re-derive agent definitions after mode switch so built-in agents
          // reflect the new coordinator/normal mode
          /* eslint-disable @typescript-eslint/no-require-imports */
          const {
            getAgentDefinitionsWithOverrides,
            getActiveAgentsFromList
          } = require('../tools/AgentTool/loadAgentsDir.js') as typeof import('../tools/AgentTool/loadAgentsDir.js');
          /* eslint-enable @typescript-eslint/no-require-imports */
          getAgentDefinitionsWithOverrides.cache.clear?.();
          const freshAgentDefs = await getAgentDefinitionsWithOverrides(getOriginalCwd());
          setAppState(prev => ({
            ...prev,
            agentDefinitions: {
              ...freshAgentDefs,
              allAgents: freshAgentDefs.allAgents,
              activeAgents: getActiveAgentsFromList(freshAgentDefs.allAgents)
            }
          }));
          messages.push(createSystemMessage(warning, 'warning'));
        }
      }

      // Fire SessionEnd hooks for the current session before starting the
      // resumed one, mirroring the /clear flow in conversation.ts.
      const sessionEndTimeoutMs = getSessionEndHookTimeoutMs();
      await executeSessionEndHooks('resume', {
        getAppState: () => store.getState(),
        setAppState,
        signal: AbortSignal.timeout(sessionEndTimeoutMs),
        timeoutMs: sessionEndTimeoutMs
      });

      // Process session start hooks for resume
      const hookMessages = await processSessionStartHooks('resume', {
        sessionId,
        agentType: mainThreadAgentDefinition?.agentType,
        model: mainLoopModel
      });

      // Append hook messages to the conversation
      messages.push(...hookMessages);
      // For forks, generate a new plan slug and copy the plan content so the
      // original and forked sessions don't clobber each other's plan files.
      // For regular resumes, reuse the original session's plan slug.
      if (entrypoint === 'fork') {
        void copyPlanForFork(log, asSessionId(sessionId));
      } else {
        void copyPlanForResume(log, asSessionId(sessionId));
      }

      // Restore file history and attribution state from the resumed conversation
      restoreSessionStateFromLog(log, setAppState);
      if (log.fileHistorySnapshots) {
        void copyFileHistoryForResume(log);
      }

      // Restore agent setting from the resumed conversation
      // Always reset to the new session's values (or clear if none),
      // matching the standaloneAgentContext pattern below
      const {
        agentDefinition: restoredAgent
      } = restoreAgentFromSession(log.agentSetting, initialMainThreadAgentDefinition, agentDefinitions);
      setMainThreadAgentDefinition(restoredAgent);
      setAppState(prev => ({
        ...prev,
        agent: restoredAgent?.agentType
      }));

      // Restore standalone agent context from the resumed conversation
      // Always reset to the new session's values (or clear if none)
      setAppState(prev => ({
        ...prev,
        standaloneAgentContext: computeStandaloneAgentContext(log.agentName, log.agentColor)
      }));
      void updateSessionName(log.agentName);

      // Restore read file state from the message history
      restoreReadFileState(messages, log.projectPath ?? getOriginalCwd());

      // Clear any active loading state (no queryId since we're not in a query)
      resetLoadingState();
      setAbortController(null);
      setConversationId(sessionId);

      // Get target session's costs BEFORE saving current session
      // (saveCurrentSessionCosts overwrites the config, so we need to read first)
      const targetSessionCosts = getStoredSessionCosts(sessionId);

      // Save current session's costs before switching to avoid losing accumulated costs
      saveCurrentSessionCosts();

      // Reset cost state for clean slate before restoring target session
      resetCostState();

      // Switch session (id + project dir atomically). fullPath may point to
      // a different project (cross-worktree, /branch); null derives from
      // current originalCwd.
      switchSession(asSessionId(sessionId), log.fullPath ? dirname(log.fullPath) : null);
      // Rename asciicast recording to match the resumed session ID
      const {
        renameRecordingForSession
      } = await import('../utils/asciicast.js');
      await renameRecordingForSession();
      await resetSessionFilePointer();

      // Clear then restore session metadata so it's re-appended on exit via
      // reAppendSessionMetadata. clearSessionMetadata must be called first:
      // restoreSessionMetadata only sets-if-truthy, so without the clear,
      // a session without an agent name would inherit the previous session's
      // cached name and write it to the wrong transcript on first message.
      clearSessionMetadata();
      restoreSessionMetadata(log);
      // Resumed sessions shouldn't re-title from mid-conversation context
      // (same reasoning as the useRef seed), and the previous session's
      // Haiku title shouldn't carry over.
      haikuTitleAttemptedRef.current = true;
      setHaikuTitle(undefined);

      // Exit any worktree a prior /resume entered, then cd into the one
      // this session was in. Without the exit, resuming from worktree B
      // to non-worktree C leaves cwd/currentWorktreeSession stale;
      // resuming B→C where C is also a worktree fails entirely
      // (getCurrentWorktreeSession guard blocks the switch).
      //
      // Skipped for /branch: forkLog doesn't carry worktreeSession, so
      // this would kick the user out of a worktree they're still working
      // in. Same fork skip as processResumedConversation for the adopt —
      // fork materializes its own file via recordTranscript on REPL mount.
      if (entrypoint !== 'fork') {
        exitRestoredWorktree();
        restoreWorktreeForResume(log.worktreeSession);
        adoptResumedSessionFile();
        void restoreRemoteAgentTasks({
          abortController: new AbortController(),
          getAppState: () => store.getState(),
          setAppState
        });
      } else {
        // Fork: same re-persist as /clear (conversation.ts). The clear
        // above wiped currentSessionWorktree, forkLog doesn't carry it,
        // and the process is still in the same worktree.
        const ws = getCurrentWorktreeSession();
        if (ws) saveWorktreeState(ws);
      }

      // Persist the current mode so future resumes know what mode this session was in
      if (feature('COORDINATOR_MODE')) {
        /* eslint-disable @typescript-eslint/no-require-imports */
        const {
          saveMode
        } = require('../utils/sessionStorage.js');
        const {
          isCoordinatorMode
        } = require('../coordinator/coordinatorMode.js') as typeof import('../coordinator/coordinatorMode.js');
        /* eslint-enable @typescript-eslint/no-require-imports */
        saveMode(isCoordinatorMode() ? 'coordinator' : 'normal');
      }

      // Restore target session's costs from the data we read earlier
      if (targetSessionCosts) {
        setCostStateForRestore(targetSessionCosts);
      }

      // Reconstruct replacement state for the resumed session. Runs after
      // setSessionId so any NEW replacements post-resume write to the
      // resumed session's tool-results dir. Gated on ref.current: the
      // initial mount already read the feature flag, so we don't re-read
      // it here (mid-session flag flips stay unobservable in both
      // directions).
      //
      // Skipped for in-session /branch: the existing ref is already correct
      // (branch preserves tool_use_ids), so there's no need to reconstruct.
      // createFork() does write content-replacement entries to the forked
      // JSONL with the fork's sessionId, so `claude -r {forkId}` also works.
      if (contentReplacementStateRef.current && entrypoint !== 'fork') {
        contentReplacementStateRef.current = reconstructContentReplacementState(messages, log.contentReplacements ?? []);
      }

      // Reset messages to the provided initial messages
      // Use a callback to ensure we're not dependent on stale state
      setMessages(() => messages);

      // Clear any active tool JSX
      setToolJSX(null);

      // Clear input to ensure no residual state
      setInputValue('');
      logEvent('tengu_session_resumed', {
        entrypoint: entrypoint as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        success: true,
        resume_duration_ms: Math.round(performance.now() - resumeStart)
      });
    } catch (error) {
      logEvent('tengu_session_resumed', {
        entrypoint: entrypoint as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        success: false
      });
      throw error;
    }
  }, [resetLoadingState, setAppState]);

  // Lazy init: useRef(createX()) would call createX on every render and
  // discard the result. LRUCache construction inside FileStateCache is
  // expensive (~170ms), so we use useState's lazy initializer to create
  // it exactly once, then feed that stable reference into useRef.
  const [initialReadFileState] = useState(() => createFileStateCacheWithSizeLimit(READ_FILE_STATE_CACHE_SIZE));
  const readFileState = useRef(initialReadFileState);
  const bashTools = useRef(new Set<string>());
  const bashToolsProcessedIdx = useRef(0);
  // Session-scoped skill discovery tracking (feeds was_discovered on
  // tengu_skill_tool_invocation). Must persist across getToolUseContext
  // rebuilds within a session: turn-0 discovery writes via processUserInput
  // before onQuery builds its own context, and discovery on turn N must
  // still attribute a SkillTool call on turn N+k. Cleared in clearConversation.
  const discoveredSkillNamesRef = useRef(new Set<string>());
  // Session-level dedup for nested_memory CLAUDE.md attachments.
  // readFileState is a 100-entry LRU; once it evicts a CLAUDE.md path,
  // the next discovery cycle re-injects it. Cleared in clearConversation.
  const loadedNestedMemoryPathsRef = useRef(new Set<string>());

  // Helper to restore read file state from messages (used for resume flows)
  // This allows Claude to edit files that were read in previous sessions
  const restoreReadFileState = useCallback((messages: MessageType[], cwd: string) => {
    const extracted = extractReadFilesFromMessages(messages, cwd, READ_FILE_STATE_CACHE_SIZE);
    readFileState.current = mergeFileStateCaches(readFileState.current, extracted);
    for (const tool of extractBashToolsFromMessages(messages)) {
      bashTools.current.add(tool);
    }
  }, []);

  // Extract read file state from initialMessages on mount
  // This handles CLI flag resume (--resume-session) and ResumeConversation screen
  // where messages are passed as props rather than through the resume callback
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      restoreReadFileState(initialMessages, getOriginalCwd());
      void restoreRemoteAgentTasks({
        abortController: new AbortController(),
        getAppState: () => store.getState(),
        setAppState
      });
    }
    // Only run on mount - initialMessages shouldn't change during component lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const {
    status: apiKeyStatus,
    reverify
  } = useApiKeyVerification();

  // Auto-run /issue state
  const [autoRunIssueReason, setAutoRunIssueReason] = useState<AutoRunIssueReason | null>(null);
  // Ref to track if autoRunIssue was triggered this survey cycle,
  // so we can suppress the [1] follow-up prompt even after
  // autoRunIssueReason is cleared.
  const didAutoRunIssueRef = useRef(false);

  // State for exit feedback flow
  const [exitFlow, setExitFlow] = useState<React.ReactNode>(null);
  const [isExiting, setIsExiting] = useState(false);

  // Calculate if cost dialog should be shown
  const showingCostDialog = !isLoading && showCostDialog;

  // Determine which dialog should have focus (if any)
  // Permission and interactive dialogs can show even when toolJSX is set,
  // as long as shouldContinueAnimation is true. This prevents deadlocks when
  // agents set background hints while waiting for user interaction.
  function getFocusedInputDialog(): 'message-selector' | 'sandbox-permission' | 'tool-permission' | 'prompt' | 'worker-sandbox-permission' | 'elicitation' | 'cost' | 'idle-return' | 'init-onboarding' | 'ide-onboarding' | 'model-switch' | 'undercover-callout' | 'effort-callout' | 'remote-callout' | 'lsp-recommendation' | 'plugin-hint' | 'desktop-upsell' | 'ultraplan-choice' | 'ultraplan-launch' | undefined {
    // Exit states always take precedence
    if (isExiting || exitFlow) return undefined;

    // High priority dialogs (always show regardless of typing)
    if (isMessageSelectorVisible) return 'message-selector';

    // Suppress interrupt dialogs while user is actively typing
    if (isPromptInputActive) return undefined;
    if (sandboxPermissionRequestQueue[0]) return 'sandbox-permission';

    // Permission/interactive dialogs (show unless blocked by toolJSX)
    const allowDialogsWithAnimation = !toolJSX || toolJSX.shouldContinueAnimation;
    if (allowDialogsWithAnimation && toolUseConfirmQueue[0]) return 'tool-permission';
    if (allowDialogsWithAnimation && promptQueue[0]) return 'prompt';
    // Worker sandbox permission prompts (network access) from swarm workers
    if (allowDialogsWithAnimation && workerSandboxPermissions.queue[0]) return 'worker-sandbox-permission';
    if (allowDialogsWithAnimation && elicitation.queue[0]) return 'elicitation';
    if (allowDialogsWithAnimation && showingCostDialog) return 'cost';
    if (allowDialogsWithAnimation && idleReturnPending) return 'idle-return';
    if (feature('ULTRAPLAN') && allowDialogsWithAnimation && !isLoading && ultraplanPendingChoice) return 'ultraplan-choice';
    if (feature('ULTRAPLAN') && allowDialogsWithAnimation && !isLoading && ultraplanLaunchPending) return 'ultraplan-launch';

    // Onboarding dialogs (special conditions)
    if (allowDialogsWithAnimation && showIdeOnboarding) return 'ide-onboarding';

    // Model switch callout (ant-only, eliminated from external builds)
    if ("external" === 'ant' && allowDialogsWithAnimation && showModelSwitchCallout) return 'model-switch';

    // Undercover auto-enable explainer (ant-only, eliminated from external builds)
    if ("external" === 'ant' && allowDialogsWithAnimation && showUndercoverCallout) return 'undercover-callout';

    // Effort callout (shown once for Opus 4.6 users when effort is enabled)
    if (allowDialogsWithAnimation && showEffortCallout) return 'effort-callout';

    // Remote callout (shown once before first bridge enable)
    if (allowDialogsWithAnimation && showRemoteCallout) return 'remote-callout';

    // LSP plugin recommendation (lowest priority - non-blocking suggestion)
    if (allowDialogsWithAnimation && lspRecommendation) return 'lsp-recommendation';

    // Plugin hint from CLI/SDK stderr (same priority band as LSP rec)
    if (allowDialogsWithAnimation && hintRecommendation) return 'plugin-hint';

    // Desktop app upsell (max 3 launches, lowest priority)
    if (allowDialogsWithAnimation && showDesktopUpsellStartup) return 'desktop-upsell';
    return undefined;
  }
  const focusedInputDialog = getFocusedInputDialog();

  // True when permission prompts exist but are hidden because the user is typing
  const hasSuppressedDialogs = isPromptInputActive && (sandboxPermissionRequestQueue[0] || toolUseConfirmQueue[0] || promptQueue[0] || workerSandboxPermissions.queue[0] || elicitation.queue[0] || showingCostDialog);

  // Keep ref in sync so timer callbacks can read the current value
  focusedInputDialogRef.current = focusedInputDialog;

  // Immediately capture pause/resume when focusedInputDialog changes
  // This ensures accurate timing even under high system load, rather than
  // relying on the 100ms polling interval to detect state changes
  useEffect(() => {
    if (!isLoading) return;
    const isPaused = focusedInputDialog === 'tool-permission';
    const now = Date.now();
    if (isPaused && pauseStartTimeRef.current === null) {
      // Just entered pause state - record the exact moment
      pauseStartTimeRef.current = now;
    } else if (!isPaused && pauseStartTimeRef.current !== null) {
      // Just exited pause state - accumulate paused time immediately
      totalPausedMsRef.current += now - pauseStartTimeRef.current;
      pauseStartTimeRef.current = null;
    }
  }, [focusedInputDialog, isLoading]);

  // Re-pin scroll to bottom whenever the permission overlay appears or
  // dismisses. Overlay now renders below messages inside the same
  // ScrollBox (no remount), so we need an explicit scrollToBottom for:
  //  - appear: user may have been scrolled up (sticky broken) — the
  //    dialog is blocking and must be visible
  //  - dismiss: user may have scrolled up to read context during the
  //    overlay, and onScroll was suppressed so the pill state is stale
  // useLayoutEffect so the re-pin commits before the Ink frame renders —
  // no 1-frame flash of the wrong scroll position.
  const prevDialogRef = useRef(focusedInputDialog);
  useLayoutEffect(() => {
    const was = prevDialogRef.current === 'tool-permission';
    const now = focusedInputDialog === 'tool-permission';
    if (was !== now) repinScroll();
    prevDialogRef.current = focusedInputDialog;
  }, [focusedInputDialog, repinScroll]);
  function onCancel() {
    if (focusedInputDialog === 'elicitation') {
      // Elicitation dialog handles its own Escape, and closing it shouldn't affect any loading state.
      return;
    }
    logForDebugging(`[onCancel] focusedInputDialog=${focusedInputDialog} streamMode=${streamMode}`);

    // Pause proactive mode so the user gets control back.
    // It will resume when they submit their next input (see onSubmit).
    if (feature('PROACTIVE') || feature('KAIROS')) {
      proactiveModule?.pauseProactive();
    }
    queryGuard.forceEnd();
    skipIdleCheckRef.current = false;

    // Preserve partially-streamed text so the user can read what was
    // generated before pressing Esc. Pushed before resetLoadingState clears
    // streamingText, and before query.ts yields the async interrupt marker,
    // giving final order [user, partial-assistant, [Request interrupted by user]].
    if (streamingText?.trim()) {
      setMessages(prev => [...prev, createAssistantMessage({
        content: streamingText
      })]);
    }
    resetLoadingState();

    // Clear any active token budget so the backstop doesn't fire on
    // a stale budget if the query generator hasn't exited yet.
    if (feature('TOKEN_BUDGET')) {
      snapshotOutputTokensForTurn(null);
    }
    if (focusedInputDialog === 'tool-permission') {
      // Tool use confirm handles the abort signal itself
      toolUseConfirmQueue[0]?.onAbort();
      setToolUseConfirmQueue([]);
    } else if (focusedInputDialog === 'prompt') {
      // Reject all pending prompts and clear the queue
      for (const item of promptQueue) {
        item.reject(new Error('Prompt cancelled by user'));
      }
      setPromptQueue([]);
      abortController?.abort('user-cancel');
    } else if (activeRemote.isRemoteMode) {
      // Remote mode: send interrupt signal to CCR
      activeRemote.cancelRequest();
    } else {
      abortController?.abort('user-cancel');
    }

    // Clear the controller so subsequent Escape presses don't see a stale
    // aborted signal. Without this, canCancelRunningTask is false (signal
    // defined but .aborted === true), so isActive becomes false if no other
    // activating conditions hold — leaving the Escape keybinding inactive.
    setAbortController(null);

    // forceEnd() skips the finally path — fire directly (aborted=true).
    void mrOnTurnComplete(messagesRef.current, true);
  }

  // Function to handle queued command when canceling a permission request
  const handleQueuedCommandOnCancel = useCallback(() => {
    const result = popAllEditable(inputValue, 0);
    if (!result) return;
    setInputValue(result.text);
    setInputMode('prompt');

    // Restore images from queued commands to pastedContents
    if (result.images.length > 0) {
      setPastedContents(prev => {
        const newContents = {
          ...prev
        };
        for (const image of result.images) {
          newContents[image.id] = image;
        }
        return newContents;
      });
    }
  }, [setInputValue, setInputMode, inputValue, setPastedContents]);

  // CancelRequestHandler props - rendered inside KeybindingSetup
  const cancelRequestProps = {
    setToolUseConfirmQueue,
    onCancel,
    onAgentsKilled: () => setMessages(prev => [...prev, createAgentsKilledMessage()]),
    isMessageSelectorVisible: isMessageSelectorVisible || !!showBashesDialog,
    screen,
    abortSignal: abortController?.signal,
    popCommandFromQueue: handleQueuedCommandOnCancel,
    vimMode,
    isLocalJSXCommand: toolJSX?.isLocalJSXCommand,
    isSearchingHistory,
    isHelpOpen,
    inputMode,
    inputValue,
    streamMode
  };
  useEffect(() => {
    const totalCost = getTotalCost();
    if (totalCost >= 5 /* $5 */ && !showCostDialog && !haveShownCostDialog) {
      logEvent('tengu_cost_threshold_reached', {});
      // Mark as shown even if the dialog won't render (no console billing
      // access). Otherwise this effect re-fires on every message change for
      // the rest of the session — 200k+ spurious events observed.
      setHaveShownCostDialog(true);
      if (hasConsoleBillingAccess()) {
        setShowCostDialog(true);
      }
    }
  }, [messages, showCostDialog, haveShownCostDialog]);
  const sandboxAskCallback: SandboxAskCallback = useCallback(async (hostPattern: NetworkHostPattern) => {
    // If running as a swarm worker, forward the request to the leader via mailbox
    if (isAgentSwarmsEnabled() && isSwarmWorker()) {
      const requestId = generateSandboxRequestId();

      // Send the request to the leader via mailbox
      const sent = await sendSandboxPermissionRequestViaMailbox(hostPattern.host, requestId);
      return new Promise(resolveShouldAllowHost => {
        if (!sent) {
          // If we couldn't send via mailbox, fall back to local handling
          setSandboxPermissionRequestQueue(prev => [...prev, {
            hostPattern,
            resolvePromise: resolveShouldAllowHost
          }]);
          return;
        }

        // Register the callback for when the leader responds
        registerSandboxPermissionCallback({
          requestId,
          host: hostPattern.host,
          resolve: resolveShouldAllowHost
        });

        // Update AppState to show pending indicator
        setAppState(prev => ({
          ...prev,
          pendingSandboxRequest: {
            requestId,
            host: hostPattern.host
          }
        }));
      });
    }

    // Normal flow for non-workers: show local UI and optionally race
    // against the REPL bridge (Remote Control) if connected.
    return new Promise(resolveShouldAllowHost => {
      let resolved = false;
      function resolveOnce(allow: boolean): void {
        if (resolved) return;
        resolved = true;
        resolveShouldAllowHost(allow);
      }

      // Queue the local sandbox permission dialog
      setSandboxPermissionRequestQueue(prev => [...prev, {
        hostPattern,
        resolvePromise: resolveOnce
      }]);

      // When the REPL bridge is connected, also forward the sandbox
      // permission request as a can_use_tool control_request so the
      // remote user (e.g. on claude.ai) can approve it too.
      if (feature('BRIDGE_MODE')) {
        const bridgeCallbacks = store.getState().replBridgePermissionCallbacks;
        if (bridgeCallbacks) {
          const bridgeRequestId = randomUUID();
          bridgeCallbacks.sendRequest(bridgeRequestId, SANDBOX_NETWORK_ACCESS_TOOL_NAME, {
            host: hostPattern.host
          }, randomUUID(), `Allow network connection to ${hostPattern.host}?`);
          const unsubscribe = bridgeCallbacks.onResponse(bridgeRequestId, response => {
            unsubscribe();
            const allow = response.behavior === 'allow';
            // Resolve ALL pending requests for the same host, not just
            // this one — mirrors the local dialog handler pattern.
            setSandboxPermissionRequestQueue(queue => {
              queue.filter(item => item.hostPattern.host === hostPattern.host).forEach(item => item.resolvePromise(allow));
              return queue.filter(item => item.hostPattern.host !== hostPattern.host);
            });
            // Clean up all sibling bridge subscriptions for this host
            // (other concurrent same-host requests) before deleting.
            const siblingCleanups = sandboxBridgeCleanupRef.current.get(hostPattern.host);
            if (siblingCleanups) {
              for (const fn of siblingCleanups) {
                fn();
              }
              sandboxBridgeCleanupRef.current.delete(hostPattern.host);
            }
          });

          // Register cleanup so the local dialog handler can cancel
          // the remote prompt and unsubscribe when the local user
          // responds first.
          const cleanup = () => {
            unsubscribe();
            bridgeCallbacks.cancelRequest(bridgeRequestId);
          };
          const existing = sandboxBridgeCleanupRef.current.get(hostPattern.host) ?? [];
          existing.push(cleanup);
          sandboxBridgeCleanupRef.current.set(hostPattern.host, existing);
        }
      }
    });
  }, [setAppState, store]);

  // #34044: if user explicitly set sandbox.enabled=true but deps are missing,
  // isSandboxingEnabled() returns false silently. Surface the reason once at
  // mount so users know their security config isn't being enforced. Full
  // reason goes to debug log; notification points to /sandbox for details.
  // addNotification is stable (useCallback) so the effect fires once.
  useEffect(() => {
    const reason = SandboxManager.getSandboxUnavailableReason();
    if (!reason) return;
    if (SandboxManager.isSandboxRequired()) {
      process.stderr.write(`\nError: sandbox required but unavailable: ${reason}\n` + `  sandbox.failIfUnavailable is set — refusing to start without a working sandbox.\n\n`);
      gracefulShutdownSync(1, 'other');
      return;
    }
    logForDebugging(`sandbox disabled: ${reason}`, {
      level: 'warn'
    });
    addNotification({
      key: 'sandbox-unavailable',
      jsx: <>
          <Text color="warning">sandbox disabled</Text>
          <Text dimColor> · /sandbox</Text>
        </>,
      priority: 'medium'
    });
  }, [addNotification]);
  if (SandboxManager.isSandboxingEnabled()) {
    // If sandboxing is enabled (setting.sandbox is defined, initialise the manager)
    SandboxManager.initialize(sandboxAskCallback).catch(err => {
      // Initialization/validation failed - display error and exit
      process.stderr.write(`\n❌ Sandbox Error: ${errorMessage(err)}\n`);
      gracefulShutdownSync(1, 'other');
    });
  }
  const setToolPermissionContext = useCallback((context: ToolPermissionContext, options?: {
    preserveMode?: boolean;
  }) => {
    setAppState(prev => ({
      ...prev,
      toolPermissionContext: {
        ...context,
        // Preserve the coordinator's mode only when explicitly requested.
        // Workers' getAppState() returns a transformed context with mode
        // 'acceptEdits' that must not leak into the coordinator's actual
        // state via permission-rule updates — those call sites pass
        // { preserveMode: true }. User-initiated mode changes (e.g.,
        // selecting "allow all edits") must NOT be overridden.
        mode: options?.preserveMode ? prev.toolPermissionContext.mode : context.mode
      }
    }));

    // When permission context changes, recheck all queued items
    // This handles the case where approving item1 with "don't ask again"
    // should auto-approve other queued items that now match the updated rules
    setImmediate(setToolUseConfirmQueue => {
      // Use setToolUseConfirmQueue callback to get current queue state
      // instead of capturing it in the closure, to avoid stale closure issues
      setToolUseConfirmQueue(currentQueue => {
        currentQueue.forEach(item => {
          void item.recheckPermission();
        });
        return currentQueue;
      });
    }, setToolUseConfirmQueue);
  }, [setAppState, setToolUseConfirmQueue]);

  // Register the leader's setToolPermissionContext for in-process teammates
  useEffect(() => {
    registerLeaderSetToolPermissionContext(setToolPermissionContext);
    return () => unregisterLeaderSetToolPermissionContext();
  }, [setToolPermissionContext]);
  const canUseTool = useCanUseTool(setToolUseConfirmQueue, setToolPermissionContext);
  const requestPrompt = useCallback((title: string, toolInputSummary?: string | null) => (request: PromptRequest): Promise<PromptResponse> => new Promise<PromptResponse>((resolve, reject) => {
    setPromptQueue(prev => [...prev, {
      request,
      title,
      toolInputSummary,
      resolve,
      reject
    }]);
  }), []);
  const getToolUseContext = useCallback((messages: MessageType[], newMessages: MessageType[], abortController: AbortController, mainLoopModel: string): ProcessUserInputContext => {
    // Read mutable values fresh from the store rather than closure-capturing
    // useAppState() snapshots. Same values today (closure is refreshed by the
    // render between turns); decouples freshness from React's render cycle for
    // a future headless conversation loop. Same pattern refreshTools() uses.
    const s = store.getState();

    // Compute tools fresh from store.getState() rather than the closure-
    // captured `tools`. useManageMCPConnections populates appState.mcp
    // async as servers connect — the store may have newer MCP state than
    // the closure captured at render time. Also doubles as refreshTools()
    // for mid-query tool list updates.
    const computeTools = () => {
      const state = store.getState();
      const assembled = assembleToolPool(state.toolPermissionContext, state.mcp.tools);
      const merged = mergeAndFilterTools(combinedInitialTools, assembled, state.toolPermissionContext.mode);
      if (!mainThreadAgentDefinition) return merged;
      return resolveAgentTools(mainThreadAgentDefinition, merged, false, true).resolvedTools;
    };
    return {
      abortController,
      options: {
        commands,
        tools: computeTools(),
        debug,
        verbose: s.verbose,
        mainLoopModel,
        thinkingConfig: s.thinkingEnabled !== false ? thinkingConfig : {
          type: 'disabled'
        },
        // Merge fresh from store rather than closing over useMergedClients'
        // memoized output. initialMcpClients is a prop (session-constant).
        mcpClients: mergeClients(initialMcpClients, s.mcp.clients),
        mcpResources: s.mcp.resources,
        ideInstallationStatus: ideInstallationStatus,
        isNonInteractiveSession: false,
        dynamicMcpConfig,
        theme,
        agentDefinitions: allowedAgentTypes ? {
          ...s.agentDefinitions,
          allowedAgentTypes
        } : s.agentDefinitions,
        customSystemPrompt,
        appendSystemPrompt,
        refreshTools: computeTools
      },
      getAppState: () => store.getState(),
      setAppState,
      messages,
      setMessages,
      updateFileHistoryState(updater: (prev: FileHistoryState) => FileHistoryState) {
        // Perf: skip the setState when the updater returns the same reference
        // (e.g. fileHistoryTrackEdit returns `state` when the file is already
        // tracked). Otherwise every no-op call would notify all store listeners.
        setAppState(prev => {
          const updated = updater(prev.fileHistory);
          if (updated === prev.fileHistory) return prev;
          return {
            ...prev,
            fileHistory: updated
          };
        });
      },
      updateAttributionState(updater: (prev: AttributionState) => AttributionState) {
        setAppState(prev => {
          const updated = updater(prev.attribution);
          if (updated === prev.attribution) return prev;
          return {
            ...prev,
            attribution: updated
          };
        });
      },
      openMessageSelector: () => {
        if (!disabled) {
          setIsMessageSelectorVisible(true);
        }
      },
      onChangeAPIKey: reverify,
      readFileState: readFileState.current,
      setToolJSX,
      addNotification,
      appendSystemMessage: msg => setMessages(prev => [...prev, msg]),
      sendOSNotification: opts => {
        void sendNotification(opts, terminal);
      },
      onChangeDynamicMcpConfig,
      onInstallIDEExtension: setIDEToInstallExtension,
      nestedMemoryAttachmentTriggers: new Set<string>(),
      loadedNestedMemoryPaths: loadedNestedMemoryPathsRef.current,
      dynamicSkillDirTriggers: new Set<string>(),
      discoveredSkillNames: discoveredSkillNamesRef.current,
      setResponseLength,
      pushApiMetricsEntry: "external" === 'ant' ? (ttftMs: number) => {
        const now = Date.now();
        const baseline = responseLengthRef.current;
        apiMetricsRef.current.push({
          ttftMs,
          firstTokenTime: now,
          lastTokenTime: now,
          responseLengthBaseline: baseline,
          endResponseLength: baseline
        });
      } : undefined,
      setStreamMode,
      onCompactProgress: event => {
        switch (event.type) {
          case 'hooks_start':
            setSpinnerColor('claudeBlue_FOR_SYSTEM_SPINNER');
            setSpinnerShimmerColor('claudeBlueShimmer_FOR_SYSTEM_SPINNER');
            setSpinnerMessage(event.hookType === 'pre_compact' ? 'Running PreCompact hooks\u2026' : event.hookType === 'post_compact' ? 'Running PostCompact hooks\u2026' : 'Running SessionStart hooks\u2026');
            break;
          case 'compact_start':
            setSpinnerMessage('Compacting conversation');
            break;
          case 'compact_end':
            setSpinnerMessage(null);
            setSpinnerColor(null);
            setSpinnerShimmerColor(null);
            break;
        }
      },
      setInProgressToolUseIDs,
      setHasInterruptibleToolInProgress: (v: boolean) => {
        hasInterruptibleToolInProgressRef.current = v;
      },
      resume,
      setConversationId,
      requestPrompt: feature('HOOK_PROMPTS') ? requestPrompt : undefined,
      contentReplacementState: contentReplacementStateRef.current
    };
  }, [commands, combinedInitialTools, mainThreadAgentDefinition, debug, initialMcpClients, ideInstallationStatus, dynamicMcpConfig, theme, allowedAgentTypes, store, setAppState, reverify, addNotification, setMessages, onChangeDynamicMcpConfig, resume, requestPrompt, disabled, customSystemPrompt, appendSystemPrompt, setConversationId]);

  // Session backgrounding (Ctrl+B to background/foreground)
  const handleBackgroundQuery = useCallback(() => {
    // Stop the foreground query so the background one takes over
    abortController?.abort('background');
    // Aborting subagents may produce task-completed notifications.
    // Clear task notifications so the queue processor doesn't immediately
    // start a new foreground query; forward them to the background session.
    const removedNotifications = removeByFilter(cmd => cmd.mode === 'task-notification');
    void (async () => {
      const toolUseContext = getToolUseContext(messagesRef.current, [], new AbortController(), mainLoopModel);
      const [defaultSystemPrompt, userContext, systemContext] = await Promise.all([getSystemPrompt(toolUseContext.options.tools, mainLoopModel, Array.from(toolPermissionContext.additionalWorkingDirectories.keys()), toolUseContext.options.mcpClients), getUserContext(), getSystemContext()]);
      const systemPrompt = buildEffectiveSystemPrompt({
        mainThreadAgentDefinition,
        toolUseContext,
        customSystemPrompt,
        defaultSystemPrompt,
        appendSystemPrompt
      });
      toolUseContext.renderedSystemPrompt = systemPrompt;
      const notificationAttachments = await getQueuedCommandAttachments(removedNotifications).catch(() => []);
      const notificationMessages = notificationAttachments.map(createAttachmentMessage);

      // Deduplicate: if the query loop already yielded a notification into
      // messagesRef before we removed it from the queue, skip duplicates.
      // We use prompt text for dedup because source_uuid is not set on
      // task-notification QueuedCommands (enqueuePendingNotification callers
      // don't pass uuid), so it would always be undefined.
      const existingPrompts = new Set<string>();
      for (const m of messagesRef.current) {
        if (m.type === 'attachment' && m.attachment.type === 'queued_command' && m.attachment.commandMode === 'task-notification' && typeof m.attachment.prompt === 'string') {
          existingPrompts.add(m.attachment.prompt);
        }
      }
      const uniqueNotifications = notificationMessages.filter(m => m.attachment.type === 'queued_command' && (typeof m.attachment.prompt !== 'string' || !existingPrompts.has(m.attachment.prompt)));
      startBackgroundSession({
        messages: [...messagesRef.current, ...uniqueNotifications],
        queryParams: {
          systemPrompt,
          userContext,
          systemContext,
          canUseTool,
          toolUseContext,
          querySource: getQuerySourceForREPL()
        },
        description: terminalTitle,
        setAppState,
        agentDefinition: mainThreadAgentDefinition
      });
    })();
  }, [abortController, mainLoopModel, toolPermissionContext, mainThreadAgentDefinition, getToolUseContext, customSystemPrompt, appendSystemPrompt, canUseTool, setAppState]);
  const {
    handleBackgroundSession
  } = useSessionBackgrounding({
    setMessages,
    setIsLoading: setIsExternalLoading,
    resetLoadingState,
    setAbortController,
    onBackgroundQuery: handleBackgroundQuery
  });
  const onQueryEvent = useCallback((event: Parameters<typeof handleMessageFromStream>[0]) => {
    handleMessageFromStream(event, newMessage => {
      if (isCompactBoundaryMessage(newMessage)) {
        // Fullscreen: keep pre-compact messages for scrollback. query.ts
        // slices at the boundary for API calls, Messages.tsx skips the
        // boundary filter in fullscreen, and useLogMessages treats this
        // as an incremental append (first uuid unchanged). Cap at one
        // compact-interval of scrollback — normalizeMessages/applyGrouping
        // are O(n) per render, so drop everything before the previous
        // boundary to keep n bounded across multi-day sessions.
        if (isFullscreenEnvEnabled()) {
          setMessages(old => [...getMessagesAfterCompactBoundary(old, {
            includeSnipped: true
          }), newMessage]);
        } else {
          setMessages(() => [newMessage]);
        }
        // Bump conversationId so Messages.tsx row keys change and
        // stale memoized rows remount with post-compact content.
        setConversationId(randomUUID());
        // Compaction succeeded — clear the context-blocked flag so ticks resume
        if (feature('PROACTIVE') || feature('KAIROS')) {
          proactiveModule?.setContextBlocked(false);
        }
      } else if (newMessage.type === 'progress' && isEphemeralToolProgress(newMessage.data.type)) {
        // Replace the previous ephemeral progress tick for the same tool
        // call instead of appending. Sleep/Bash emit a tick per second and
        // only the last one is rendered; appending blows up the messages
        // array (13k+ observed) and the transcript (120MB of sleep_progress
        // lines). useLogMessages tracks length, so same-length replacement
        // also skips the transcript write.
        // agent_progress / hook_progress / skill_progress are NOT ephemeral
        // — each carries distinct state the UI needs (e.g. subagent tool
        // history). Replacing those leaves the AgentTool UI stuck at
        // "Initializing…" because it renders the full progress trail.
        setMessages(oldMessages => {
          const last = oldMessages.at(-1);
          if (last?.type === 'progress' && last.parentToolUseID === newMessage.parentToolUseID && last.data.type === newMessage.data.type) {
            const copy = oldMessages.slice();
            copy[copy.length - 1] = newMessage;
            return copy;
          }
          return [...oldMessages, newMessage];
        });
      } else {
        setMessages(oldMessages => [...oldMessages, newMessage]);
      }
      // Block ticks on API errors to prevent tick → error → tick
      // runaway loops (e.g., auth failure, rate limit, blocking limit).
      // Cleared on compact boundary (above) or successful response (below).
      if (feature('PROACTIVE') || feature('KAIROS')) {
        if (newMessage.type === 'assistant' && 'isApiErrorMessage' in newMessage && newMessage.isApiErrorMessage) {
          proactiveModule?.setContextBlocked(true);
        } else if (newMessage.type === 'assistant') {
          proactiveModule?.setContextBlocked(false);
        }
      }
    }, newContent => {
      // setResponseLength handles updating both responseLengthRef (for
      // spinner animation) and apiMetricsRef (endResponseLength/lastTokenTime
      // for OTPS). No separate metrics update needed here.
      setResponseLength(length => length + newContent.length);
    }, setStreamMode, setStreamingToolUses, tombstonedMessage => {
      setMessages(oldMessages => oldMessages.filter(m => m !== tombstonedMessage));
      void removeTranscriptMessage(tombstonedMessage.uuid);
    }, setStreamingThinking, metrics => {
      const now = Date.now();
      const baseline = responseLengthRef.current;
      apiMetricsRef.current.push({
        ...metrics,
        firstTokenTime: now,
        lastTokenTime: now,
        responseLengthBaseline: baseline,
        endResponseLength: baseline
      });
    }, onStreamingText);
  }, [setMessages, setResponseLength, setStreamMode, setStreamingToolUses, setStreamingThinking, onStreamingText]);
  const onQueryImpl = useCallback(async (messagesIncludingNewMessages: MessageType[], newMessages: MessageType[], abortController: AbortController, shouldQuery: boolean, additionalAllowedTools: string[], mainLoopModelParam: string, effort?: EffortValue) => {
    // Prepare IDE integration for new prompt. Read mcpClients fresh from
    // store — useManageMCPConnections may have populated it since the
    // render that captured this closure (same pattern as computeTools).
    if (shouldQuery) {
      const freshClients = mergeClients(initialMcpClients, store.getState().mcp.clients);
      void diagnosticTracker.handleQueryStart(freshClients);
      const ideClient = getConnectedIdeClient(freshClients);
      if (ideClient) {
        void closeOpenDiffs(ideClient);
      }
    }

    // Mark onboarding as complete when any user message is sent to Claude
    void maybeMarkProjectOnboardingComplete();

    // Extract a session title from the first real user message. One-shot
    // via ref (was tengu_birch_mist experiment: first-message-only to save
    // Haiku calls). The ref replaces the old `messages.length <= 1` check,
    // which was broken by SessionStart hook messages (prepended via
    // useDeferredHookMessages) and attachment messages (appended by
    // processTextPrompt) — both pushed length past 1 on turn one, so the
    // title silently fell through to the "Claude Code" default.
    if (!titleDisabled && !sessionTitle && !agentTitle && !haikuTitleAttemptedRef.current) {
      const firstUserMessage = newMessages.find(m => m.type === 'user' && !m.isMeta);
      const text = firstUserMessage?.type === 'user' ? getContentText(firstUserMessage.message.content) : null;
      // Skip synthetic breadcrumbs — slash-command output, prompt-skill
      // expansions (/commit → <command-message>), local-command headers
      // (/help → <command-name>), and bash-mode (!cmd → <bash-input>).
      // None of these are the user's topic; wait for real prose.
      if (text && !text.startsWith(`<${LOCAL_COMMAND_STDOUT_TAG}>`) && !text.startsWith(`<${COMMAND_MESSAGE_TAG}>`) && !text.startsWith(`<${COMMAND_NAME_TAG}>`) && !text.startsWith(`<${BASH_INPUT_TAG}>`)) {
        haikuTitleAttemptedRef.current = true;
        void generateSessionTitle(text, new AbortController().signal).then(title => {
          if (title) setHaikuTitle(title);else haikuTitleAttemptedRef.current = false;
        }, () => {
          haikuTitleAttemptedRef.current = false;
        });
      }
    }

    // Apply slash-command-scoped allowedTools (from skill frontmatter) to the
    // store once per turn. This also covers the reset: the next non-skill turn
    // passes [] and clears it. Must run before the !shouldQuery gate: forked
    // commands (executeForkedSlashCommand) return shouldQuery=false, and
    // createGetAppStateWithAllowedTools in forkedAgent.ts reads this field, so
    // stale skill tools would otherwise leak into forked agent permissions.
    // Previously this write was hidden inside getToolUseContext's getAppState
    // (~85 calls/turn); hoisting it here makes getAppState a pure read and stops
    // ephemeral contexts (permission dialog, BackgroundTasksDialog) from
    // accidentally clearing it mid-turn.
    store.setState(prev => {
      const cur = prev.toolPermissionContext.alwaysAllowRules.command;
      if (cur === additionalAllowedTools || cur?.length === additionalAllowedTools.length && cur.every((v, i) => v === additionalAllowedTools[i])) {
        return prev;
      }
      return {
        ...prev,
        toolPermissionContext: {
          ...prev.toolPermissionContext,
          alwaysAllowRules: {
            ...prev.toolPermissionContext.alwaysAllowRules,
            command: additionalAllowedTools
          }
        }
      };
    });

    // The last message is an assistant message if the user input was a bash command,
    // or if the user input was an invalid slash command.
    if (!shouldQuery) {
      // Manual /compact sets messages directly (shouldQuery=false) bypassing
      // handleMessageFromStream. Clear context-blocked if a compact boundary
      // is present so proactive ticks resume after compaction.
      if (newMessages.some(isCompactBoundaryMessage)) {
        // Bump conversationId so Messages.tsx row keys change and
        // stale memoized rows remount with post-compact content.
        setConversationId(randomUUID());
        if (feature('PROACTIVE') || feature('KAIROS')) {
          proactiveModule?.setContextBlocked(false);
        }
      }
      resetLoadingState();
      setAbortController(null);
      return;
    }
    const toolUseContext = getToolUseContext(messagesIncludingNewMessages, newMessages, abortController, mainLoopModelParam);
    // getToolUseContext reads tools/mcpClients fresh from store.getState()
    // (via computeTools/mergeClients). Use those rather than the closure-
    // captured `tools`/`mcpClients` — useManageMCPConnections may have
    // flushed new MCP state between the render that captured this closure
    // and now. Turn 1 via processInitialMessage is the main beneficiary.
    const {
      tools: freshTools,
      mcpClients: freshMcpClients
    } = toolUseContext.options;

    // Scope the skill's effort override to this turn's context only —
    // wrapping getAppState keeps the override out of the global store so
    // background agents and UI subscribers (Spinner, LogoV2) never see it.
    if (effort !== undefined) {
      const previousGetAppState = toolUseContext.getAppState;
      toolUseContext.getAppState = () => ({
        ...previousGetAppState(),
        effortValue: effort
      });
    }
    queryCheckpoint('query_context_loading_start');
    const [,, defaultSystemPrompt, baseUserContext, systemContext] = await Promise.all([
    // IMPORTANT: do this after setMessages() above, to avoid UI jank
    checkAndDisableBypassPermissionsIfNeeded(toolPermissionContext, setAppState),
    // Gated on TRANSCRIPT_CLASSIFIER so GrowthBook kill switch runs wherever auto mode is built in
    feature('TRANSCRIPT_CLASSIFIER') ? checkAndDisableAutoModeIfNeeded(toolPermissionContext, setAppState, store.getState().fastMode) : undefined, getSystemPrompt(freshTools, mainLoopModelParam, Array.from(toolPermissionContext.additionalWorkingDirectories.keys()), freshMcpClients), getUserContext(), getSystemContext()]);
    const userContext = {
      ...baseUserContext,
      ...getCoordinatorUserContext(freshMcpClients, isScratchpadEnabled() ? getScratchpadDir() : undefined),
      ...((feature('PROACTIVE') || feature('KAIROS')) && proactiveModule?.isProactiveActive() && !terminalFocusRef.current ? {
        terminalFocus: 'The terminal is unfocused \u2014 the user is not actively watching.'
      } : {})
    };
    queryCheckpoint('query_context_loading_end');
    const systemPrompt = buildEffectiveSystemPrompt({
      mainThreadAgentDefinition,
      toolUseContext,
      customSystemPrompt,
      defaultSystemPrompt,
      appendSystemPrompt
    });
    toolUseContext.renderedSystemPrompt = systemPrompt;
    queryCheckpoint('query_query_start');
    resetTurnHookDuration();
    resetTurnToolDuration();
    resetTurnClassifierDuration();
    for await (const event of query({
      messages: messagesIncludingNewMessages,
      systemPrompt,
      userContext,
      systemContext,
      canUseTool,
      toolUseContext,
      querySource: getQuerySourceForREPL()
    })) {
      onQueryEvent(event);
    }
    if (feature('BUDDY')) {
      void fireCompanionObserver(messagesRef.current, reaction => setAppState(prev => prev.companionReaction === reaction ? prev : {
        ...prev,
        companionReaction: reaction
      }));
    }
    queryCheckpoint('query_end');

    // Capture ant-only API metrics before resetLoadingState clears the ref.
    // For multi-request turns (tool use loops), compute P50 across all requests.
    if ("external" === 'ant' && apiMetricsRef.current.length > 0) {
      const entries = apiMetricsRef.current;
      const ttfts = entries.map(e => e.ttftMs);
      // Compute per-request OTPS using only active streaming time and
      // streaming-only content. endResponseLength tracks content added by
      // streaming deltas only, excluding subagent/compaction inflation.
      const otpsValues = entries.map(e => {
        const delta = Math.round((e.endResponseLength - e.responseLengthBaseline) / 4);
        const samplingMs = e.lastTokenTime - e.firstTokenTime;
        return samplingMs > 0 ? Math.round(delta / (samplingMs / 1000)) : 0;
      });
      const isMultiRequest = entries.length > 1;
      const hookMs = getTurnHookDurationMs();
      const hookCount = getTurnHookCount();
      const toolMs = getTurnToolDurationMs();
      const toolCount = getTurnToolCount();
      const classifierMs = getTurnClassifierDurationMs();
      const classifierCount = getTurnClassifierCount();
      const turnMs = Date.now() - loadingStartTimeRef.current;
      setMessages(prev => [...prev, createApiMetricsMessage({
        ttftMs: isMultiRequest ? median(ttfts) : ttfts[0]!,
        otps: isMultiRequest ? median(otpsValues) : otpsValues[0]!,
        isP50: isMultiRequest,
        hookDurationMs: hookMs > 0 ? hookMs : undefined,
        hookCount: hookCount > 0 ? hookCount : undefined,
        turnDurationMs: turnMs > 0 ? turnMs : undefined,
        toolDurationMs: toolMs > 0 ? toolMs : undefined,
        toolCount: toolCount > 0 ? toolCount : undefined,
        classifierDurationMs: classifierMs > 0 ? classifierMs : undefined,
        classifierCount: classifierCount > 0 ? classifierCount : undefined,
        configWriteCount: getGlobalConfigWriteCount()
      })]);
    }
    resetLoadingState();

    // Log query profiling report if enabled
    logQueryProfileReport();

    // Signal that a query turn has completed successfully
    await onTurnComplete?.(messagesRef.current);
  }, [initialMcpClients, resetLoadingState, getToolUseContext, toolPermissionContext, setAppState, customSystemPrompt, onTurnComplete, appendSystemPrompt, canUseTool, mainThreadAgentDefinition, onQueryEvent, sessionTitle, titleDisabled]);
  const onQuery = useCallback(async (newMessages: MessageType[], abortController: AbortController, shouldQuery: boolean, additionalAllowedTools: string[], mainLoopModelParam: string, onBeforeQueryCallback?: (input: string, newMessages: MessageType[]) => Promise<boolean>, input?: string, effort?: EffortValue): Promise<void> => {
    // If this is a teammate, mark them as active when starting a turn
    if (isAgentSwarmsEnabled()) {
      const teamName = getTeamName();
      const agentName = getAgentName();
      if (teamName && agentName) {
        // Fire and forget - turn starts immediately, write happens in background
        void setMemberActive(teamName, agentName, true);
      }
    }

    // Concurrent guard via state machine. tryStart() atomically checks
    // and transitions idle→running, returning the generation number.
    // Returns null if already running — no separate check-then-set.
    const thisGeneration = queryGuard.tryStart();
    if (thisGeneration === null) {
      logEvent('tengu_concurrent_onquery_detected', {});

      // Extract and enqueue user message text, skipping meta messages
      // (e.g. expanded skill content, tick prompts) that should not be
      // replayed as user-visible text.
      newMessages.filter((m): m is UserMessage => m.type === 'user' && !m.isMeta).map(_ => getContentText(_.message.content)).filter(_ => _ !== null).forEach((msg, i) => {
        enqueue({
          value: msg,
          mode: 'prompt'
        });
        if (i === 0) {
          logEvent('tengu_concurrent_onquery_enqueued', {});
        }
      });
      return;
    }
    try {
      // isLoading is derived from queryGuard — tryStart() above already
      // transitioned dispatching→running, so no setter call needed here.
      resetTimingRefs();
      setMessages(oldMessages => [...oldMessages, ...newMessages]);
      responseLengthRef.current = 0;
      if (feature('TOKEN_BUDGET')) {
        const parsedBudget = input ? parseTokenBudget(input) : null;
        snapshotOutputTokensForTurn(parsedBudget ?? getCurrentTurnTokenBudget());
      }
      apiMetricsRef.current = [];
      setStreamingToolUses([]);
      setStreamingText(null);

      // messagesRef is updated synchronously by the setMessages wrapper
      // above, so it already includes newMessages from the append at the
      // top of this try block.  No reconstruction needed, no waiting for
      // React's scheduler (previously cost 20-56ms per prompt; the 56ms
      // case was a GC pause caught during the await).
      const latestMessages = messagesRef.current;
      if (input) {
        await mrOnBeforeQuery(input, latestMessages, newMessages.length);
      }

      // Pass full conversation history to callback
      if (onBeforeQueryCallback && input) {
        const shouldProceed = await onBeforeQueryCallback(input, latestMessages);
        if (!shouldProceed) {
          return;
        }
      }
      await onQueryImpl(latestMessages, newMessages, abortController, shouldQuery, additionalAllowedTools, mainLoopModelParam, effort);
    } finally {
      // queryGuard.end() atomically checks generation and transitions
      // running→idle. Returns false if a newer query owns the guard
      // (cancel+resubmit race where the stale finally fires as a microtask).
      if (queryGuard.end(thisGeneration)) {
        setLastQueryCompletionTime(Date.now());
        skipIdleCheckRef.current = false;
        // Always reset loading state in finally - this ensures cleanup even
        // if onQueryImpl throws. onTurnComplete is called separately in
        // onQueryImpl only on successful completion.
        resetLoadingState();
        await mrOnTurnComplete(messagesRef.current, abortController.signal.aborted);

        // Notify bridge clients that the turn is complete so mobile apps
        // can stop the spark animation and show post-turn UI.
        sendBridgeResultRef.current();

        // Auto-hide tungsten panel content at turn end (ant-only), but keep
        // tungstenActiveSession set so the pill stays in the footer and the user
        // can reopen the panel. Background tmux tasks (e.g. /hunter) run for
        // minutes — wiping the session made the pill disappear entirely, forcing
        // the user to re-invoke Tmux just to peek. Skip on abort so the panel
        // stays open for inspection (matches the turn-duration guard below).
        if ("external" === 'ant' && !abortController.signal.aborted) {
          setAppState(prev => {
            if (prev.tungstenActiveSession === undefined) return prev;
            if (prev.tungstenPanelAutoHidden === true) return prev;
            return {
              ...prev,
              tungstenPanelAutoHidden: true
            };
          });
        }

        // Capture budget info before clearing (ant-only)
        let budgetInfo: {
          tokens: number;
          limit: number;
          nudges: number;
        } | undefined;
        if (feature('TOKEN_BUDGET')) {
          if (getCurrentTurnTokenBudget() !== null && getCurrentTurnTokenBudget()! > 0 && !abortController.signal.aborted) {
            budgetInfo = {
              tokens: getTurnOutputTokens(),
              limit: getCurrentTurnTokenBudget()!,
              nudges: getBudgetContinuationCount()
            };
          }
          snapshotOutputTokensForTurn(null);
        }

        // Add turn duration message for turns longer than 30s or with a budget
        // Skip if user aborted or if in loop mode (too noisy between ticks)
        // Defer if swarm teammates are still running (show when they finish)
        const turnDurationMs = Date.now() - loadingStartTimeRef.current - totalPausedMsRef.current;
        if ((turnDurationMs > 30000 || budgetInfo !== undefined) && !abortController.signal.aborted && !proactiveActive) {
          const hasRunningSwarmAgents = getAllInProcessTeammateTasks(store.getState().tasks).some(t => t.status === 'running');
          if (hasRunningSwarmAgents) {
            // Only record start time on the first deferred turn
            if (swarmStartTimeRef.current === null) {
              swarmStartTimeRef.current = loadingStartTimeRef.current;
            }
            // Always update budget — later turns may carry the actual budget
            if (budgetInfo) {
              swarmBudgetInfoRef.current = budgetInfo;
            }
          } else {
            setMessages(prev => [...prev, createTurnDurationMessage(turnDurationMs, budgetInfo, count(prev, isLoggableMessage))]);
          }
        }
        // Clear the controller so CancelRequestHandler's canCancelRunningTask
        // reads false at the idle prompt. Without this, the stale non-aborted
        // controller makes ctrl+c fire onCancel() (aborting nothing) instead of
        // propagating to the double-press exit flow.
        setAbortController(null);
      }

      // Auto-restore: if the user interrupted before any meaningful response
      // arrived, rewind the conversation and restore their prompt — same as
      // opening the message selector and picking the last message.
      // This runs OUTSIDE the queryGuard.end() check because onCancel calls
      // forceEnd(), which bumps the generation so end() returns false above.
      // Guards: reason === 'user-cancel' (onCancel/Esc; programmatic aborts
      // use 'background'/'interrupt' and must not rewind — note abort() with
      // no args sets reason to a DOMException, not undefined), !isActive (no
      // newer query started — cancel+resubmit race), empty input (don't
      // clobber text typed during loading), no queued commands (user queued
      // B while A was loading → they've moved on, don't restore A; also
      // avoids removeLastFromHistory removing B's entry instead of A's),
      // not viewing a teammate (messagesRef is the main conversation — the
      // old Up-arrow quick-restore had this guard, preserve it).
      if (abortController.signal.reason === 'user-cancel' && !queryGuard.isActive && inputValueRef.current === '' && getCommandQueueLength() === 0 && !store.getState().viewingAgentTaskId) {
        const msgs = messagesRef.current;
        const lastUserMsg = msgs.findLast(selectableUserMessagesFilter);
        if (lastUserMsg) {
          const idx = msgs.lastIndexOf(lastUserMsg);
          if (messagesAfterAreOnlySynthetic(msgs, idx)) {
            // The submit is being undone — undo its history entry too,
            // otherwise Up-arrow shows the restored text twice.
            removeLastFromHistory();
            restoreMessageSyncRef.current(lastUserMsg);
          }
        }
      }
    }
  }, [onQueryImpl, setAppState, resetLoadingState, queryGuard, mrOnBeforeQuery, mrOnTurnComplete]);

  // Handle initial message (from CLI args or plan mode exit with context clear)
  // This effect runs when isLoading becomes false and there's a pending message
  const initialMessageRef = useRef(false);
  useEffect(() => {
    const pending = initialMessage;
    if (!pending || isLoading || initialMessageRef.current) return;

    // Mark as processing to prevent re-entry
    initialMessageRef.current = true;
    async function processInitialMessage(initialMsg: NonNullable<typeof pending>) {
      // Clear context if requested (plan mode exit)
      if (initialMsg.clearContext) {
        // Preserve the plan slug before clearing context, so the new session
        // can access the same plan file after regenerateSessionId()
        const oldPlanSlug = initialMsg.message.planContent ? getPlanSlug() : undefined;
        const {
          clearConversation
        } = await import('../commands/clear/conversation.js');
        await clearConversation({
          setMessages,
          readFileState: readFileState.current,
          discoveredSkillNames: discoveredSkillNamesRef.current,
          loadedNestedMemoryPaths: loadedNestedMemoryPathsRef.current,
          getAppState: () => store.getState(),
          setAppState,
          setConversationId
        });
        haikuTitleAttemptedRef.current = false;
        setHaikuTitle(undefined);
        bashTools.current.clear();
        bashToolsProcessedIdx.current = 0;

        // Restore the plan slug for the new session so getPlan() finds the file
        if (oldPlanSlug) {
          setPlanSlug(getSessionId(), oldPlanSlug);
        }
      }

      // Atomically: clear initial message, set permission mode and rules, and store plan for verification
      const shouldStorePlanForVerification = initialMsg.message.planContent && "external" === 'ant' && isEnvTruthy(undefined);
      setAppState(prev => {
        // Build and apply permission updates (mode + allowedPrompts rules)
        let updatedToolPermissionContext = initialMsg.mode ? applyPermissionUpdates(prev.toolPermissionContext, buildPermissionUpdates(initialMsg.mode, initialMsg.allowedPrompts)) : prev.toolPermissionContext;
        // For auto, override the mode (buildPermissionUpdates maps
        // it to 'default' via toExternalPermissionMode) and strip dangerous rules
        if (feature('TRANSCRIPT_CLASSIFIER') && initialMsg.mode === 'auto') {
          updatedToolPermissionContext = stripDangerousPermissionsForAutoMode({
            ...updatedToolPermissionContext,
            mode: 'auto',
            prePlanMode: undefined
          });
        }
        return {
          ...prev,
          initialMessage: null,
          toolPermissionContext: updatedToolPermissionContext,
          ...(shouldStorePlanForVerification && {
            pendingPlanVerification: {
              plan: initialMsg.message.planContent!,
              verificationStarted: false,
              verificationCompleted: false
            }
          })
        };
      });

      // Create file history snapshot for code rewind
      if (fileHistoryEnabled()) {
        void fileHistoryMakeSnapshot((updater: (prev: FileHistoryState) => FileHistoryState) => {
          setAppState(prev => ({
            ...prev,
            fileHistory: updater(prev.fileHistory)
          }));
        }, initialMsg.message.uuid);
      }

      // Ensure SessionStart hook context is available before the first API
      // call. onSubmit calls this internally but the onQuery path below
      // bypasses onSubmit — hoist here so both paths see hook messages.
      await awaitPendingHooks();

      // Route all initial prompts through onSubmit to ensure UserPromptSubmit hooks fire
      // TODO: Simplify by always routing through onSubmit once it supports
      // ContentBlockParam arrays (images) as input
      const content = initialMsg.message.message.content;

      // Route all string content through onSubmit to ensure hooks fire
      // For complex content (images, etc.), fall back to direct onQuery
      // Plan messages bypass onSubmit to preserve planContent metadata for rendering
      if (typeof content === 'string' && !initialMsg.message.planContent) {
        // Route through onSubmit for proper processing including UserPromptSubmit hooks
        void onSubmit(content, {
          setCursorOffset: () => {},
          clearBuffer: () => {},
          resetHistory: () => {}
        });
      } else {
        // Plan messages or complex content (images, etc.) - send directly to model
        // Plan messages use onQuery to preserve planContent metadata for rendering
        // TODO: Once onSubmit supports ContentBlockParam arrays, remove this branch
        const newAbortController = createAbortController();
        setAbortController(newAbortController);
        void onQuery([initialMsg.message], newAbortController, true,
        // shouldQuery
        [],
        // additionalAllowedTools
        mainLoopModel);
      }

      // Reset ref after a delay to allow new initial messages
      setTimeout(ref => {
        ref.current = false;
      }, 100, initialMessageRef);
    }
    void processInitialMessage(pending);
  }, [initialMessage, isLoading, setMessages, setAppState, onQuery, mainLoopModel, tools]);
  const onSubmit = useCallback(async (input: string, helpers: PromptInputHelpers, speculationAccept?: {
    state: ActiveSpeculationState;
    speculationSessionTimeSavedMs: number;
    setAppState: SetAppState;
  }, options?: {
    fromKeybinding?: boolean;
  }) => {
    // Re-pin scroll to bottom on submit so the user always sees the new
    // exchange (matches OpenCode's auto-scroll behavior).
    repinScroll();

    // Resume loop mode if paused
    if (feature('PROACTIVE') || feature('KAIROS')) {
      proactiveModule?.resumeProactive();
    }

    // Handle immediate commands - these bypass the queue and execute right away
    // even while Claude is processing. Commands opt-in via `immediate: true`.
    // Commands triggered via keybindings are always treated as immediate.
    if (!speculationAccept && input.trim().startsWith('/')) {
      // Expand [Pasted text #N] refs so immediate commands (e.g. /btw) receive
      // the pasted content, not the placeholder. The non-immediate path gets
      // this expansion later in handlePromptSubmit.
      const trimmedInput = expandPastedTextRefs(input, pastedContents).trim();
      const spaceIndex = trimmedInput.indexOf(' ');
      const commandName = spaceIndex === -1 ? trimmedInput.slice(1) : trimmedInput.slice(1, spaceIndex);
      const commandArgs = spaceIndex === -1 ? '' : trimmedInput.slice(spaceIndex + 1).trim();

      // Find matching command - treat as immediate if:
      // 1. Command has `immediate: true`, OR
      // 2. Command was triggered via keybinding (fromKeybinding option)
      const matchingCommand = commands.find(cmd => isCommandEnabled(cmd) && (cmd.name === commandName || cmd.aliases?.includes(commandName) || getCommandName(cmd) === commandName));
      if (matchingCommand?.name === 'clear' && idleHintShownRef.current) {
        logEvent('tengu_idle_return_action', {
          action: 'hint_converted' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          variant: idleHintShownRef.current as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          idleMinutes: Math.round((Date.now() - lastQueryCompletionTimeRef.current) / 60_000),
          messageCount: messagesRef.current.length,
          totalInputTokens: getTotalInputTokens()
        });
        idleHintShownRef.current = false;
      }
      const shouldTreatAsImmediate = queryGuard.isActive && (matchingCommand?.immediate || options?.fromKeybinding);
      if (matchingCommand && shouldTreatAsImmediate && matchingCommand.type === 'local-jsx') {
        // Only clear input if the submitted text matches what's in the prompt.
        // When a command keybinding fires, input is "/<command>" but the actual
        // input value is the user's existing text - don't clear it in that case.
        if (input.trim() === inputValueRef.current.trim()) {
          setInputValue('');
          helpers.setCursorOffset(0);
          helpers.clearBuffer();
          setPastedContents({});
        }
        const pastedTextRefs = parseReferences(input).filter(r => pastedContents[r.id]?.type === 'text');
        const pastedTextCount = pastedTextRefs.length;
        const pastedTextBytes = pastedTextRefs.reduce((sum, r) => sum + (pastedContents[r.id]?.content.length ?? 0), 0);
        logEvent('tengu_paste_text', {
          pastedTextCount,
          pastedTextBytes
        });
        logEvent('tengu_immediate_command_executed', {
          commandName: matchingCommand.name as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          fromKeybinding: options?.fromKeybinding ?? false
        });

        // Execute the command directly
        const executeImmediateCommand = async (): Promise<void> => {
          let doneWasCalled = false;
          const onDone = (result?: string, doneOptions?: {
            display?: CommandResultDisplay;
            metaMessages?: string[];
          }): void => {
            doneWasCalled = true;
            setToolJSX({
              jsx: null,
              shouldHidePromptInput: false,
              clearLocalJSX: true
            });
            const newMessages: MessageType[] = [];
            if (result && doneOptions?.display !== 'skip') {
              addNotification({
                key: `immediate-${matchingCommand.name}`,
                text: result,
                priority: 'immediate'
              });
              // In fullscreen the command just showed as a centered modal
              // pane — the notification above is enough feedback. Adding
              // "❯ /config" + "⎿ dismissed" to the transcript is clutter
              // (those messages are type:system subtype:local_command —
              // user-visible but NOT sent to the model, so skipping them
              // doesn't change model context). Outside fullscreen the
              // transcript entry stays so scrollback shows what ran.
              if (!isFullscreenEnvEnabled()) {
                newMessages.push(createCommandInputMessage(formatCommandInputTags(getCommandName(matchingCommand), commandArgs)), createCommandInputMessage(`<${LOCAL_COMMAND_STDOUT_TAG}>${escapeXml(result)}</${LOCAL_COMMAND_STDOUT_TAG}>`));
              }
            }
            // Inject meta messages (model-visible, user-hidden) into the transcript
            if (doneOptions?.metaMessages?.length) {
              newMessages.push(...doneOptions.metaMessages.map(content => createUserMessage({
                content,
                isMeta: true
              })));
            }
            if (newMessages.length) {
              setMessages(prev => [...prev, ...newMessages]);
            }
            // Restore stashed prompt after local-jsx command completes.
            // The normal stash restoration path (below) is skipped because
            // local-jsx commands return early from onSubmit.
            if (stashedPrompt !== undefined) {
              setInputValue(stashedPrompt.text);
              helpers.setCursorOffset(stashedPrompt.cursorOffset);
              setPastedContents(stashedPrompt.pastedContents);
              setStashedPrompt(undefined);
            }
          };

          // Build context for the command (reuses existing getToolUseContext).
          // Read messages via ref to keep onSubmit stable across message
          // updates — matches the pattern at L2384/L2400/L2662 and avoids
          // pinning stale REPL render scopes in downstream closures.
          const context = getToolUseContext(messagesRef.current, [], createAbortController(), mainLoopModel);
          const mod = await matchingCommand.load();
          const jsx = await mod.call(onDone, context, commandArgs);

          // Skip if onDone already fired — prevents stuck isLocalJSXCommand
          // (see processSlashCommand.tsx local-jsx case for full mechanism).
          if (jsx && !doneWasCalled) {
            // shouldHidePromptInput: false keeps Notifications mounted
            // so the onDone result isn't lost
            setToolJSX({
              jsx,
              shouldHidePromptInput: false,
              isLocalJSXCommand: true
            });
          }
        };
        void executeImmediateCommand();
        return; // Always return early - don't add to history or queue
      }
    }

    // Remote mode: skip empty input early before any state mutations
    if (activeRemote.isRemoteMode && !input.trim()) {
      return;
    }

    // Idle-return: prompt returning users to start fresh when the
    // conversation is large and the cache is cold. tengu_willow_mode
    // controls treatment: "dialog" (blocking), "hint" (notification), "off".
    {
      const willowMode = getFeatureValue_CACHED_MAY_BE_STALE('tengu_willow_mode', 'off');
      const idleThresholdMin = Number(process.env.CLAUDE_CODE_IDLE_THRESHOLD_MINUTES ?? 75);
      const tokenThreshold = Number(process.env.CLAUDE_CODE_IDLE_TOKEN_THRESHOLD ?? 100_000);
      if (willowMode !== 'off' && !getGlobalConfig().idleReturnDismissed && !skipIdleCheckRef.current && !speculationAccept && !input.trim().startsWith('/') && lastQueryCompletionTimeRef.current > 0 && getTotalInputTokens() >= tokenThreshold) {
        const idleMs = Date.now() - lastQueryCompletionTimeRef.current;
        const idleMinutes = idleMs / 60_000;
        if (idleMinutes >= idleThresholdMin && willowMode === 'dialog') {
          setIdleReturnPending({
            input,
            idleMinutes
          });
          setInputValue('');
          helpers.setCursorOffset(0);
          helpers.clearBuffer();
          return;
        }
      }
    }

    // Add to history for direct user submissions.
    // Queued command processing (executeQueuedInput) doesn't call onSubmit,
    // so notifications and already-queued user input won't be added to history here.
    // Skip history for keybinding-triggered commands (user didn't type the command).
    if (!options?.fromKeybinding) {
      addToHistory({
        display: speculationAccept ? input : prependModeCharacterToInput(input, inputMode),
        pastedContents: speculationAccept ? {} : pastedContents
      });
      // Add the just-submitted command to the front of the ghost-text
      // cache so it's suggested immediately (not after the 60s TTL).
      if (inputMode === 'bash') {
        prependToShellHistoryCache(input.trim());
      }
    }

    // Restore stash if present, but NOT for slash commands or when loading.
    // - Slash commands (especially interactive ones like /model, /context) hide
    //   the prompt and show a picker UI. Restoring the stash during a command would
    //   place the text in a hidden input, and the user would lose it by typing the
    //   next command. Instead, preserve the stash so it survives across command runs.
    // - When loading, the submitted input will be queued and handlePromptSubmit
    //   will clear the input field (onInputChange('')), which would clobber the
    //   restored stash. Defer restoration to after handlePromptSubmit (below).
    //   Remote mode is exempt: it sends via WebSocket and returns early without
    //   calling handlePromptSubmit, so there's no clobbering risk — restore eagerly.
    // In both deferred cases, the stash is restored after await handlePromptSubmit.
    const isSlashCommand = !speculationAccept && input.trim().startsWith('/');
    // Submit runs "now" (not queued) when not already loading, or when
    // accepting speculation, or in remote mode (which sends via WS and
    // returns early without calling handlePromptSubmit).
    const submitsNow = !isLoading || speculationAccept || activeRemote.isRemoteMode;
    if (stashedPrompt !== undefined && !isSlashCommand && submitsNow) {
      setInputValue(stashedPrompt.text);
      helpers.setCursorOffset(stashedPrompt.cursorOffset);
      setPastedContents(stashedPrompt.pastedContents);
      setStashedPrompt(undefined);
    } else if (submitsNow) {
      if (!options?.fromKeybinding) {
        // Clear input when not loading or accepting speculation.
        // Preserve input for keybinding-triggered commands.
        setInputValue('');
        helpers.setCursorOffset(0);
      }
      setPastedContents({});
    }
    if (submitsNow) {
      setInputMode('prompt');
      setIDESelection(undefined);
      setSubmitCount(_ => _ + 1);
      helpers.clearBuffer();
      tipPickedThisTurnRef.current = false;

      // Show the placeholder in the same React batch as setInputValue('').
      // Skip for slash/bash (they have their own echo), speculation and remote
      // mode (both setMessages directly with no gap to bridge).
      if (!isSlashCommand && inputMode === 'prompt' && !speculationAccept && !activeRemote.isRemoteMode) {
        setUserInputOnProcessing(input);
        // showSpinner includes userInputOnProcessing, so the spinner appears
        // on this render. Reset timing refs now (before queryGuard.reserve()
        // would) so elapsed time doesn't read as Date.now() - 0. The
        // isQueryActive transition above does the same reset — idempotent.
        resetTimingRefs();
      }

      // Increment prompt count for attribution tracking and save snapshot
      // The snapshot persists promptCount so it survives compaction
      if (feature('COMMIT_ATTRIBUTION')) {
        setAppState(prev => ({
          ...prev,
          attribution: incrementPromptCount(prev.attribution, snapshot => {
            void recordAttributionSnapshot(snapshot).catch(error => {
              logForDebugging(`Attribution: Failed to save snapshot: ${error}`);
            });
          })
        }));
      }
    }

    // Handle speculation acceptance
    if (speculationAccept) {
      const {
        queryRequired
      } = await handleSpeculationAccept(speculationAccept.state, speculationAccept.speculationSessionTimeSavedMs, speculationAccept.setAppState, input, {
        setMessages,
        readFileState,
        cwd: getOriginalCwd()
      });
      if (queryRequired) {
        const newAbortController = createAbortController();
        setAbortController(newAbortController);
        void onQuery([], newAbortController, true, [], mainLoopModel);
      }
      return;
    }

    // Remote mode: send input via stream-json instead of local query.
    // Permission requests from the remote are bridged into toolUseConfirmQueue
    // and rendered using the standard PermissionRequest component.
    //
    // local-jsx slash commands (e.g. /agents, /config) render UI in THIS
    // process — they have no remote equivalent. Let those fall through to
    // handlePromptSubmit so they execute locally. Prompt commands and
    // plain text go to the remote.
    if (activeRemote.isRemoteMode && !(isSlashCommand && commands.find(c => {
      const name = input.trim().slice(1).split(/\s/)[0];
      return isCommandEnabled(c) && (c.name === name || c.aliases?.includes(name!) || getCommandName(c) === name);
    })?.type === 'local-jsx')) {
      // Build content blocks when there are pasted attachments (images)
      const pastedValues = Object.values(pastedContents);
      const imageContents = pastedValues.filter(c => c.type === 'image');
      const imagePasteIds = imageContents.length > 0 ? imageContents.map(c => c.id) : undefined;
      let messageContent: string | ContentBlockParam[] = input.trim();
      let remoteContent: RemoteMessageContent = input.trim();
      if (pastedValues.length > 0) {
        const contentBlocks: ContentBlockParam[] = [];
        const remoteBlocks: Array<{
          type: string;
          [key: string]: unknown;
        }> = [];
        const trimmedInput = input.trim();
        if (trimmedInput) {
          contentBlocks.push({
            type: 'text',
            text: trimmedInput
          });
          remoteBlocks.push({
            type: 'text',
            text: trimmedInput
          });
        }
        for (const pasted of pastedValues) {
          if (pasted.type === 'image') {
            const source = {
              type: 'base64' as const,
              media_type: (pasted.mediaType ?? 'image/png') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: pasted.content
            };
            contentBlocks.push({
              type: 'image',
              source
            });
            remoteBlocks.push({
              type: 'image',
              source
            });
          } else {
            contentBlocks.push({
              type: 'text',
              text: pasted.content
            });
            remoteBlocks.push({
              type: 'text',
              text: pasted.content
            });
          }
        }
        messageContent = contentBlocks;
        remoteContent = remoteBlocks;
      }

      // Create and add user message to UI
      // Note: empty input already handled by early return above
      const userMessage = createUserMessage({
        content: messageContent,
        imagePasteIds
      });
      setMessages(prev => [...prev, userMessage]);

      // Send to remote session
      await activeRemote.sendMessage(remoteContent, {
        uuid: userMessage.uuid
      });
      return;
    }

    // Ensure SessionStart hook context is available before the first API call.
    await awaitPendingHooks();
    await handlePromptSubmit({
      input,
      helpers,
      queryGuard,
      isExternalLoading,
      mode: inputMode,
      commands,
      onInputChange: setInputValue,
      setPastedContents,
      setToolJSX,
      getToolUseContext,
      messages: messagesRef.current,
      mainLoopModel,
      pastedContents,
      ideSelection,
      setUserInputOnProcessing,
      setAbortController,
      abortController,
      onQuery,
      setAppState,
      querySource: getQuerySourceForREPL(),
      onBeforeQuery,
      canUseTool,
      addNotification,
      setMessages,
      // Read via ref so streamMode can be dropped from onSubmit deps —
      // handlePromptSubmit only uses it for debug log + telemetry event.
      streamMode: streamModeRef.current,
      hasInterruptibleToolInProgress: hasInterruptibleToolInProgressRef.current
    });

    // Restore stash that was deferred above. Two cases:
    // - Slash command: handlePromptSubmit awaited the full command execution
    //   (including interactive pickers). Restoring now places the stash back in
    //   the visible input.
    // - Loading (queued): handlePromptSubmit enqueued + cleared input, then
    //   returned quickly. Restoring now places the stash back after the clear.
    if ((isSlashCommand || isLoading) && stashedPrompt !== undefined) {
      setInputValue(stashedPrompt.text);
      helpers.setCursorOffset(stashedPrompt.cursorOffset);
      setPastedContents(stashedPrompt.pastedContents);
      setStashedPrompt(undefined);
    }
  }, [queryGuard,
  // isLoading is read at the !isLoading checks above for input-clearing
  // and submitCount gating. It's derived from isQueryActive || isExternalLoading,
  // so including it here ensures the closure captures the fresh value.
  isLoading, isExternalLoading, inputMode, commands, setInputValue, setInputMode, setPastedContents, setSubmitCount, setIDESelection, setToolJSX, getToolUseContext,
  // messages is read via messagesRef.current inside the callback to
  // keep onSubmit stable across message updates (see L2384/L2400/L2662).
  // Without this, each setMessages call (~30× per turn) recreates
  // onSubmit, pinning the REPL render scope (1776B) + that render's
  // messages array in downstream closures (PromptInput, handleAutoRunIssue).
  // Heap analysis showed ~9 REPL scopes and ~15 messages array versions
  // accumulating after #20174/#20175, all traced to this dep.
  mainLoopModel, pastedContents, ideSelection, setUserInputOnProcessing, setAbortController, addNotification, onQuery, stashedPrompt, setStashedPrompt, setAppState, onBeforeQuery, canUseTool, remoteSession, setMessages, awaitPendingHooks, repinScroll]);

  // Callback for when user submits input while viewing a teammate's transcript
  const onAgentSubmit = useCallback(async (input: string, task: InProcessTeammateTaskState | LocalAgentTaskState, helpers: PromptInputHelpers) => {
    if (isLocalAgentTask(task)) {
      appendMessageToLocalAgent(task.id, createUserMessage({
        content: input
      }), setAppState);
      if (task.status === 'running') {
        queuePendingMessage(task.id, input, setAppState);
      } else {
        void resumeAgentBackground({
          agentId: task.id,
          prompt: input,
          toolUseContext: getToolUseContext(messagesRef.current, [], new AbortController(), mainLoopModel),
          canUseTool
        }).catch(err => {
          logForDebugging(`resumeAgentBackground failed: ${errorMessage(err)}`);
          addNotification({
            key: `resume-agent-failed-${task.id}`,
            jsx: <Text color="error">
                  Failed to resume agent: {errorMessage(err)}
                </Text>,
            priority: 'low'
          });
        });
      }
    } else {
      injectUserMessageToTeammate(task.id, input, setAppState);
    }
    setInputValue('');
    helpers.setCursorOffset(0);
    helpers.clearBuffer();
  }, [setAppState, setInputValue, getToolUseContext, canUseTool, mainLoopModel, addNotification]);

  // Handlers for auto-run /issue or /good-claude (defined after onSubmit)
  const handleAutoRunIssue = useCallback(() => {
    const command = autoRunIssueReason ? getAutoRunCommand(autoRunIssueReason) : '/issue';
    setAutoRunIssueReason(null); // Clear the state
    onSubmit(command, {
      setCursorOffset: () => {},
      clearBuffer: () => {},
      resetHistory: () => {}
    }).catch(err => {
      logForDebugging(`Auto-run ${command} failed: ${errorMessage(err)}`);
    });
  }, [onSubmit, autoRunIssueReason]);
  const handleCancelAutoRunIssue = useCallback(() => {
    setAutoRunIssueReason(null);
  }, []);

  // Handler for when user presses 1 on survey thanks screen to share details
  const handleSurveyRequestFeedback = useCallback(() => {
    const command = "external" === 'ant' ? '/issue' : '/feedback';
    onSubmit(command, {
      setCursorOffset: () => {},
      clearBuffer: () => {},
      resetHistory: () => {}
    }).catch(err => {
      logForDebugging(`Survey feedback request failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, [onSubmit]);

  // onSubmit is unstable (deps include `messages` which changes every turn).
  // `handleOpenRateLimitOptions` is prop-drilled to every MessageRow, and each
  // MessageRow fiber pins the closure (and transitively the entire REPL render
  // scope, ~1.8KB) at mount time. Using a ref keeps this callback stable so
  // old REPL scopes can be GC'd — saves ~35MB over a 1000-turn session.
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const handleOpenRateLimitOptions = useCallback(() => {
    void onSubmitRef.current('/rate-limit-options', {
      setCursorOffset: () => {},
      clearBuffer: () => {},
      resetHistory: () => {}
    });
  }, []);
  const handleExit = useCallback(async () => {
    setIsExiting(true);
    // In bg sessions, always detach instead of kill — even when a worktree is
    // active. Without this guard, the worktree branch below short-circuits into
    // ExitFlow (which calls gracefulShutdown) before exit.tsx is ever loaded.
    if (feature('BG_SESSIONS') && isBgSession()) {
      spawnSync('tmux', ['detach-client'], {
        stdio: 'ignore'
      });
      setIsExiting(false);
      return;
    }
    const showWorktree = getCurrentWorktreeSession() !== null;
    if (showWorktree) {
      setExitFlow(<ExitFlow showWorktree onDone={() => {}} onCancel={() => {
        setExitFlow(null);
        setIsExiting(false);
      }} />);
      return;
    }
    const exitMod = await exit.load();
    const exitFlowResult = await exitMod.call(() => {});
    setExitFlow(exitFlowResult);
    // If call() returned without killing the process (bg session detach),
    // clear isExiting so the UI is usable on reattach. No-op on the normal
    // path — gracefulShutdown's process.exit() means we never get here.
    if (exitFlowResult === null) {
      setIsExiting(false);
    }
  }, []);
  const handleShowMessageSelector = useCallback(() => {
    setIsMessageSelectorVisible(prev => !prev);
  }, []);

  // Rewind conversation state to just before `message`: slice messages,
  // reset conversation ID, microcompact state, permission mode, prompt suggestion.
  // Does NOT touch the prompt input. Index is computed from messagesRef (always
  // fresh via the setMessages wrapper) so callers don't need to worry about
  // stale closures.
  const rewindConversationTo = useCallback((message: UserMessage) => {
    const prev = messagesRef.current;
    const messageIndex = prev.lastIndexOf(message);
    if (messageIndex === -1) return;
    logEvent('tengu_conversation_rewind', {
      preRewindMessageCount: prev.length,
      postRewindMessageCount: messageIndex,
      messagesRemoved: prev.length - messageIndex,
      rewindToMessageIndex: messageIndex
    });
    setMessages(prev.slice(0, messageIndex));
    // Careful, this has to happen after setMessages
    setConversationId(randomUUID());
    // Reset cached microcompact state so stale pinned cache edits
    // don't reference tool_use_ids from truncated messages
    resetMicrocompactState();
    if (feature('CONTEXT_COLLAPSE')) {
      // Rewind truncates the REPL array. Commits whose archived span
      // was past the rewind point can't be projected anymore
      // (projectView silently skips them) but the staged queue and ID
      // maps reference stale uuids. Simplest safe reset: drop
      // everything. The ctx-agent will re-stage on the next
      // threshold crossing.
      /* eslint-disable @typescript-eslint/no-require-imports */
      ;
      (require('../services/contextCollapse/index.js') as typeof import('../services/contextCollapse/index.js')).resetContextCollapse();
      /* eslint-enable @typescript-eslint/no-require-imports */
    }

    // Restore state from the message we're rewinding to
    setAppState(prev => ({
      ...prev,
      // Restore permission mode from the message
      toolPermissionContext: message.permissionMode && prev.toolPermissionContext.mode !== message.permissionMode ? {
        ...prev.toolPermissionContext,
        mode: message.permissionMode
      } : prev.toolPermissionContext,
      // Clear stale prompt suggestion from previous conversation state
      promptSuggestion: {
        text: null,
        promptId: null,
        shownAt: 0,
        acceptedAt: 0,
        generationRequestId: null
      }
    }));
  }, [setMessages, setAppState]);

  // Synchronous rewind + input population. Used directly by auto-restore on
  // interrupt (so React batches with the abort's setMessages → single render,
  // no flicker). MessageSelector wraps this in setImmediate via handleRestoreMessage.
  const restoreMessageSync = useCallback((message: UserMessage) => {
    rewindConversationTo(message);
    const r = textForResubmit(message);
    if (r) {
      setInputValue(r.text);
      setInputMode(r.mode);
    }

    // Restore pasted images
    if (Array.isArray(message.message.content) && message.message.content.some(block => block.type === 'image')) {
      const imageBlocks: Array<ImageBlockParam> = message.message.content.filter(block => block.type === 'image');
      if (imageBlocks.length > 0) {
        const newPastedContents: Record<number, PastedContent> = {};
        imageBlocks.forEach((block, index) => {
          if (block.source.type === 'base64') {
            const id = message.imagePasteIds?.[index] ?? index + 1;
            newPastedContents[id] = {
              id,
              type: 'image',
              content: block.source.data,
              mediaType: block.source.media_type
            };
          }
        });
        setPastedContents(newPastedContents);
      }
    }
  }, [rewindConversationTo, setInputValue]);
  restoreMessageSyncRef.current = restoreMessageSync;

  // MessageSelector path: defer via setImmediate so the "Interrupted" message
  // renders to static output before rewind — otherwise it remains vestigial
  // at the top of the screen.
  const handleRestoreMessage = useCallback(async (message: UserMessage) => {
    setImmediate((restore, message) => restore(message), restoreMessageSync, message);
  }, [restoreMessageSync]);

  // Not memoized — hook stores caps via ref, reads latest closure at dispatch.
  // 24-char prefix: deriveUUID preserves first 24, renderable uuid prefix-matches raw source.
  const findRawIndex = (uuid: string) => {
    const prefix = uuid.slice(0, 24);
    return messages.findIndex(m => m.uuid.slice(0, 24) === prefix);
  };
  const messageActionCaps: MessageActionCaps = {
    copy: text =>
    // setClipboard RETURNS OSC 52 — caller must stdout.write (tmux side-effects load-buffer, but that's tmux-only).
    void setClipboard(text).then(raw => {
      if (raw) process.stdout.write(raw);
      addNotification({
        // Same key as text-selection copy — repeated copies replace toast, don't queue.
        key: 'selection-copied',
        text: 'copied',
        color: 'success',
        priority: 'immediate',
        timeoutMs: 2000
      });
    }),
    edit: async msg => {
      // Same skip-confirm check as /rewind: lossless → direct, else confirm dialog.
      const rawIdx = findRawIndex(msg.uuid);
      const raw = rawIdx >= 0 ? messages[rawIdx] : undefined;
      if (!raw || !selectableUserMessagesFilter(raw)) return;
      const noFileChanges = !(await fileHistoryHasAnyChanges(fileHistory, raw.uuid));
      const onlySynthetic = messagesAfterAreOnlySynthetic(messages, rawIdx);
      if (noFileChanges && onlySynthetic) {
        // rewindConversationTo's setMessages races stream appends — cancel first (idempotent).
        onCancel();
        // handleRestoreMessage also restores pasted images.
        void handleRestoreMessage(raw);
      } else {
        // Dialog path: onPreRestore (= onCancel) fires when user CONFIRMS, not on nevermind.
        setMessageSelectorPreselect(raw);
        setIsMessageSelectorVisible(true);
      }
    }
  };
  const {
    enter: enterMessageActions,
    handlers: messageActionHandlers
  } = useMessageActions(cursor, setCursor, cursorNavRef, messageActionCaps);
  async function onInit() {
    // Always verify API key on startup, so we can show the user an error in the
    // bottom right corner of the screen if the API key is invalid.
    void reverify();

    // Populate readFileState with CLAUDE.md files at startup
    const memoryFiles = await getMemoryFiles();
    if (memoryFiles.length > 0) {
      const fileList = memoryFiles.map(f => `  [${f.type}] ${f.path} (${f.content.length} chars)${f.parent ? ` (included by ${f.parent})` : ''}`).join('\n');
      logForDebugging(`Loaded ${memoryFiles.length} CLAUDE.md/rules files:\n${fileList}`);
    } else {
      logForDebugging('No CLAUDE.md/rules files found');
    }
    for (const file of memoryFiles) {
      // When the injected content doesn't match disk (stripped HTML comments,
      // stripped frontmatter, MEMORY.md truncation), cache the RAW disk bytes
      // with isPartialView so Edit/Write require a real Read first while
      // getChangedFiles + nested_memory dedup still work.
      readFileState.current.set(file.path, {
        content: file.contentDiffersFromDisk ? file.rawContent ?? file.content : file.content,
        timestamp: Date.now(),
        offset: undefined,
        limit: undefined,
        isPartialView: file.contentDiffersFromDisk
      });
    }

    // Initial message handling is done via the initialMessage effect
  }

  // Register cost summary tracker
  useCostSummary(useFpsMetrics());

  // Record transcripts locally, for debugging and conversation recovery
  // Don't record conversation if we only have initial messages; optimizes
  // the case where user resumes a conversation then quites before doing
  // anything else
  useLogMessages(messages, messages.length === initialMessages?.length);

  // REPL Bridge: replicate user/assistant messages to the bridge session
  // for remote access via claude.ai. No-op in external builds or when not enabled.
  const {
    sendBridgeResult
  } = useReplBridge(messages, setMessages, abortControllerRef, commands, mainLoopModel);
  sendBridgeResultRef.current = sendBridgeResult;
  useAfterFirstRender();

  // Track prompt queue usage for analytics. Fire once per transition from
  // empty to non-empty, not on every length change -- otherwise a render loop
  // (concurrent onQuery thrashing, etc.) spams saveGlobalConfig, which hits
  // ELOCKED under concurrent sessions and falls back to unlocked writes.
  // That write storm is the primary trigger for ~/.claude.json corruption
  // (GH #3117).
  const hasCountedQueueUseRef = useRef(false);
  useEffect(() => {
    if (queuedCommands.length < 1) {
      hasCountedQueueUseRef.current = false;
      return;
    }
    if (hasCountedQueueUseRef.current) return;
    hasCountedQueueUseRef.current = true;
    saveGlobalConfig(current => ({
      ...current,
      promptQueueUseCount: (current.promptQueueUseCount ?? 0) + 1
    }));
  }, [queuedCommands.length]);

  // Process queued commands when query completes and queue has items

  const executeQueuedInput = useCallback(async (queuedCommands: QueuedCommand[]) => {
    await handlePromptSubmit({
      helpers: {
        setCursorOffset: () => {},
        clearBuffer: () => {},
        resetHistory: () => {}
      },
      queryGuard,
      commands,
      onInputChange: () => {},
      setPastedContents: () => {},
      setToolJSX,
      getToolUseContext,
      messages,
      mainLoopModel,
      ideSelection,
      setUserInputOnProcessing,
      setAbortController,
      onQuery,
      setAppState,
      querySource: getQuerySourceForREPL(),
      onBeforeQuery,
      canUseTool,
      addNotification,
      setMessages,
      queuedCommands
    });
  }, [queryGuard, commands, setToolJSX, getToolUseContext, messages, mainLoopModel, ideSelection, setUserInputOnProcessing, canUseTool, setAbortController, onQuery, addNotification, setAppState, onBeforeQuery]);
  useQueueProcessor({
    executeQueuedInput,
    hasActiveLocalJsxUI: isShowingLocalJSXCommand,
    queryGuard
  });

  // We'll use the global lastInteractionTime from state.ts

  // Update last interaction time when input changes.
  // Must be immediate because useEffect runs after the Ink render cycle flush.
  useEffect(() => {
    activityManager.recordUserActivity();
    updateLastInteractionTime(true);
  }, [inputValue, submitCount]);
  useEffect(() => {
    if (submitCount === 1) {
      startBackgroundHousekeeping();
    }
  }, [submitCount]);

  // Show notification when Claude is done responding and user is idle
  useEffect(() => {
    // Don't set up notification if Claude is busy
    if (isLoading) return;

    // Only enable notifications after the first new interaction in this session
    if (submitCount === 0) return;

    // No query has completed yet
    if (lastQueryCompletionTime === 0) return;

    // Set timeout to check idle state
    const timer = setTimeout((lastQueryCompletionTime, isLoading, toolJSX, focusedInputDialogRef, terminal) => {
      // Check if user has interacted since the response ended
      const lastUserInteraction = getLastInteractionTime();
      if (lastUserInteraction > lastQueryCompletionTime) {
        // User has interacted since Claude finished - they're not idle, don't notify
        return;
      }

      // User hasn't interacted since response ended, check other conditions
      const idleTimeSinceResponse = Date.now() - lastQueryCompletionTime;
      if (!isLoading && !toolJSX &&
      // Use ref to get current dialog state, avoiding stale closure
      focusedInputDialogRef.current === undefined && idleTimeSinceResponse >= getGlobalConfig().messageIdleNotifThresholdMs) {
        void sendNotification({
          message: 'Claude is waiting for your input',
          notificationType: 'idle_prompt'
        }, terminal);
      }
    }, getGlobalConfig().messageIdleNotifThresholdMs, lastQueryCompletionTime, isLoading, toolJSX, focusedInputDialogRef, terminal);
    return () => clearTimeout(timer);
  }, [isLoading, toolJSX, submitCount, lastQueryCompletionTime, terminal]);

  // Idle-return hint: show notification when idle threshold is exceeded.
  // Timer fires after the configured idle period; notification persists until
  // dismissed or the user submits.
  useEffect(() => {
    if (lastQueryCompletionTime === 0) return;
    if (isLoading) return;
    const willowMode: string = getFeatureValue_CACHED_MAY_BE_STALE('tengu_willow_mode', 'off');
    if (willowMode !== 'hint' && willowMode !== 'hint_v2') return;
    if (getGlobalConfig().idleReturnDismissed) return;
    const tokenThreshold = Number(process.env.CLAUDE_CODE_IDLE_TOKEN_THRESHOLD ?? 100_000);
    if (getTotalInputTokens() < tokenThreshold) return;
    const idleThresholdMs = Number(process.env.CLAUDE_CODE_IDLE_THRESHOLD_MINUTES ?? 75) * 60_000;
    const elapsed = Date.now() - lastQueryCompletionTime;
    const remaining = idleThresholdMs - elapsed;
    const timer = setTimeout((lqct, addNotif, msgsRef, mode, hintRef) => {
      if (msgsRef.current.length === 0) return;
      const totalTokens = getTotalInputTokens();
      const formattedTokens = formatTokens(totalTokens);
      const idleMinutes = (Date.now() - lqct) / 60_000;
      addNotif({
        key: 'idle-return-hint',
        jsx: mode === 'hint_v2' ? <>
                <Text dimColor>new task? </Text>
                <Text color="suggestion">/clear</Text>
                <Text dimColor> to save </Text>
                <Text color="suggestion">{formattedTokens} tokens</Text>
              </> : <Text color="warning">
                new task? /clear to save {formattedTokens} tokens
              </Text>,
        priority: 'medium',
        // Persist until submit — the hint fires at T+75min idle, user may
        // not return for hours. removeNotification in useEffect cleanup
        // handles dismissal. 0x7FFFFFFF = setTimeout max (~24.8 days).
        timeoutMs: 0x7fffffff
      });
      hintRef.current = mode;
      logEvent('tengu_idle_return_action', {
        action: 'hint_shown' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        variant: mode as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        idleMinutes: Math.round(idleMinutes),
        messageCount: msgsRef.current.length,
        totalInputTokens: totalTokens
      });
    }, Math.max(0, remaining), lastQueryCompletionTime, addNotification, messagesRef, willowMode, idleHintShownRef);
    return () => {
      clearTimeout(timer);
      removeNotification('idle-return-hint');
      idleHintShownRef.current = false;
    };
  }, [lastQueryCompletionTime, isLoading, addNotification, removeNotification]);

  // Submits incoming prompts from teammate messages or tasks mode as new turns
  // Returns true if submission succeeded, false if a query is already running
  const handleIncomingPrompt = useCallback((content: string, options?: {
    isMeta?: boolean;
  }): boolean => {
    if (queryGuard.isActive) return false;

    // Defer to user-queued commands — user input always takes priority
    // over system messages (teammate messages, task list items, etc.)
    // Read from the module-level store at call time (not the render-time
    // snapshot) to avoid a stale closure — this callback's deps don't
    // include the queue.
    if (getCommandQueue().some(cmd => cmd.mode === 'prompt' || cmd.mode === 'bash')) {
      return false;
    }
    const newAbortController = createAbortController();
    setAbortController(newAbortController);

    // Create a user message with the formatted content (includes XML wrapper)
    const userMessage = createUserMessage({
      content,
      isMeta: options?.isMeta ? true : undefined
    });
    void onQuery([userMessage], newAbortController, true, [], mainLoopModel);
    return true;
  }, [onQuery, mainLoopModel, store]);

  // Voice input integration (VOICE_MODE builds only)
  const voice = feature('VOICE_MODE') ?
  // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
  useVoiceIntegration({
    setInputValueRaw,
    inputValueRef,
    insertTextRef
  }) : {
    stripTrailing: () => 0,
    handleKeyEvent: () => {},
    resetAnchor: () => {},
    interimRange: null
  };
  useInboxPoller({
    enabled: isAgentSwarmsEnabled(),
    isLoading,
    focusedInputDialog,
    onSubmitMessage: handleIncomingPrompt
  });
  useMailboxBridge({
    isLoading,
    onSubmitMessage: handleIncomingPrompt
  });

  // Scheduled tasks from .claude/scheduled_tasks.json (CronCreate/Delete/List)
  if (feature('AGENT_TRIGGERS')) {
    // Assistant mode bypasses the isLoading gate (the proactive tick →
    // Sleep → tick loop would otherwise starve the scheduler).
    // kairosEnabled is set once in initialState (main.tsx) and never mutated — no
    // subscription needed. The tengu_kairos_cron runtime gate is checked inside
    // useScheduledTasks's effect (not here) since wrapping a hook call in a dynamic
    // condition would break rules-of-hooks.
    const assistantMode = store.getState().kairosEnabled;
    // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
    useScheduledTasks!({
      isLoading,
      assistantMode,
      setMessages
    });
  }

  // Note: Permission polling is now handled by useInboxPoller
  // - Workers receive permission responses via mailbox messages
  // - Leaders receive permission requests via mailbox messages

  if ("external" === 'ant') {
    // Tasks mode: watch for tasks and auto-process them
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // biome-ignore lint/correctness/useHookAtTopLevel: conditional for dead code elimination in external builds
    useTaskListWatcher({
      taskListId,
      isLoading,
      onSubmitTask: handleIncomingPrompt
    });

    // Loop mode: auto-tick when enabled (via /job command)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // biome-ignore lint/correctness/useHookAtTopLevel: conditional for dead code elimination in external builds
    useProactive?.({
      // Suppress ticks while an initial message is pending — the initial
      // message will be processed asynchronously and a premature tick would
      // race with it, causing concurrent-query enqueue of expanded skill text.
      isLoading: isLoading || initialMessage !== null,
      queuedCommandsLength: queuedCommands.length,
      hasActiveLocalJsxUI: isShowingLocalJSXCommand,
      isInPlanMode: toolPermissionContext.mode === 'plan',
      onSubmitTick: (prompt: string) => handleIncomingPrompt(prompt, {
        isMeta: true
      }),
      onQueueTick: (prompt: string) => enqueue({
        mode: 'prompt',
        value: prompt,
        isMeta: true
      })
    });
  }

  // Abort the current operation when a 'now' priority message arrives
  // (e.g. from a chat UI client via UDS).
  useEffect(() => {
    if (queuedCommands.some(cmd => cmd.priority === 'now')) {
      abortControllerRef.current?.abort('interrupt');
    }
  }, [queuedCommands]);

  // Initial load
  useEffect(() => {
    void onInit();

    // Cleanup on unmount
    return () => {
      void diagnosticTracker.shutdown();
    };
    // TODO: fix this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for suspend/resume events
  const {
    internal_eventEmitter
  } = useStdin();
  const [remountKey, setRemountKey] = useState(0);
  useEffect(() => {
    const handleSuspend = () => {
      // Print suspension instructions
      process.stdout.write(`\nClaude Code has been suspended. Run \`fg\` to bring Claude Code back.\nNote: ctrl + z now suspends Claude Code, ctrl + _ undoes input.\n`);
    };
    const handleResume = () => {
      // Force complete component tree replacement instead of terminal clear
      // Ink now handles line count reset internally on SIGCONT
      setRemountKey(prev => prev + 1);
    };
    internal_eventEmitter?.on('suspend', handleSuspend);
    internal_eventEmitter?.on('resume', handleResume);
    return () => {
      internal_eventEmitter?.off('suspend', handleSuspend);
      internal_eventEmitter?.off('resume', handleResume);
    };
  }, [internal_eventEmitter]);

  // Derive stop hook spinner suffix from messages state
  const stopHookSpinnerSuffix = useMemo(() => {
    if (!isLoading) return null;

    // Find stop hook progress messages
    const progressMsgs = messages.filter((m): m is ProgressMessage<HookProgress> => m.type === 'progress' && m.data.type === 'hook_progress' && (m.data.hookEvent === 'Stop' || m.data.hookEvent === 'SubagentStop'));
    if (progressMsgs.length === 0) return null;

    // Get the most recent stop hook execution
    const currentToolUseID = progressMsgs.at(-1)?.toolUseID;
    if (!currentToolUseID) return null;

    // Check if there's already a summary message for this execution (hooks completed)
    const hasSummaryForCurrentExecution = messages.some(m => m.type === 'system' && m.subtype === 'stop_hook_summary' && m.toolUseID === currentToolUseID);
    if (hasSummaryForCurrentExecution) return null;
    const currentHooks = progressMsgs.filter(p => p.toolUseID === currentToolUseID);
    const total = currentHooks.length;

    // Count completed hooks
    const completedCount = count(messages, m => {
      if (m.type !== 'attachment') return false;
      const attachment = m.attachment;
      return 'hookEvent' in attachment && (attachment.hookEvent === 'Stop' || attachment.hookEvent === 'SubagentStop') && 'toolUseID' in attachment && attachment.toolUseID === currentToolUseID;
    });

    // Check if any hook has a custom status message
    const customMessage = currentHooks.find(p => p.data.statusMessage)?.data.statusMessage;
    if (customMessage) {
      // Use custom message with progress counter if multiple hooks
      return total === 1 ? `${customMessage}…` : `${customMessage}… ${completedCount}/${total}`;
    }

    // Fall back to default behavior
    const hookType = currentHooks[0]?.data.hookEvent === 'SubagentStop' ? 'subagent stop' : 'stop';
    if ("external" === 'ant') {
      const cmd = currentHooks[completedCount]?.data.command;
      const label = cmd ? ` '${truncateToWidth(cmd, 40)}'` : '';
      return total === 1 ? `running ${hookType} hook${label}` : `running ${hookType} hook${label}\u2026 ${completedCount}/${total}`;
    }
    return total === 1 ? `running ${hookType} hook` : `running stop hooks… ${completedCount}/${total}`;
  }, [messages, isLoading]);

  // Callback to capture frozen state when entering transcript mode
  const handleEnterTranscript = useCallback(() => {
    setFrozenTranscriptState({
      messagesLength: messages.length,
      streamingToolUsesLength: streamingToolUses.length
    });
  }, [messages.length, streamingToolUses.length]);

  // Callback to clear frozen state when exiting transcript mode
  const handleExitTranscript = useCallback(() => {
    setFrozenTranscriptState(null);
  }, []);

  // Props for GlobalKeybindingHandlers component (rendered inside KeybindingSetup)
  const virtualScrollActive = isFullscreenEnvEnabled() && !disableVirtualScroll;

  // Transcript search state. Hooks must be unconditional so they live here
  // (not inside the `if (screen === 'transcript')` branch below); isActive
  // gates the useInput. Query persists across bar open/close so n/N keep
  // working after Enter dismisses the bar (less semantics).
  const jumpRef = useRef<JumpHandle | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCount, setSearchCount] = useState(0);
  const [searchCurrent, setSearchCurrent] = useState(0);
  const onSearchMatchesChange = useCallback((count: number, current: number) => {
    setSearchCount(count);
    setSearchCurrent(current);
  }, []);
  useInput((input, key, event) => {
    if (key.ctrl || key.meta) return;
    // No Esc handling here — less has no navigating mode. Search state
    // (highlights, n/N) is just state. Esc/q/ctrl+c → transcript:exit
    // (ungated). Highlights clear on exit via the screen-change effect.
    if (input === '/') {
      // Capture scrollTop NOW — typing is a preview, 0-matches snaps
      // back here. Synchronous ref write, fires before the bar's
      // mount-effect calls setSearchQuery.
      jumpRef.current?.setAnchor();
      setSearchOpen(true);
      event.stopImmediatePropagation();
      return;
    }
    // Held-key batching: tokenizer coalesces to 'nnn'. Same uniform-batch
    // pattern as modalPagerAction in ScrollKeybindingHandler.tsx. Each
    // repeat is a step (n isn't idempotent like g).
    const c = input[0];
    if ((c === 'n' || c === 'N') && input === c.repeat(input.length) && searchCount > 0) {
      const fn = c === 'n' ? jumpRef.current?.nextMatch : jumpRef.current?.prevMatch;
      if (fn) for (let i = 0; i < input.length; i++) fn();
      event.stopImmediatePropagation();
    }
  },
  // Search needs virtual scroll (jumpRef drives VirtualMessageList). [
  // kills it, so !dumpMode — after [ there's nothing to jump in.
  {
    isActive: screen === 'transcript' && virtualScrollActive && !searchOpen && !dumpMode
  });
  const {
    setQuery: setHighlight,
    scanElement,
    setPositions
  } = useSearchHighlight();

  // Resize → abort search. Positions are (msg, query, WIDTH)-keyed —
  // cached positions are stale after a width change (new layout, new
  // wrapping). Clearing searchQuery triggers VML's setSearchQuery('')
  // which clears positionsCache + setPositions(null). Bar closes.
  // User hits / again → fresh everything.
  const transcriptCols = useTerminalSize().columns;
  const prevColsRef = React.useRef(transcriptCols);
  React.useEffect(() => {
    if (prevColsRef.current !== transcriptCols) {
      prevColsRef.current = transcriptCols;
      if (searchQuery || searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchCount(0);
        setSearchCurrent(0);
        jumpRef.current?.disarmSearch();
        setHighlight('');
      }
    }
  }, [transcriptCols, searchQuery, searchOpen, setHighlight]);

  // Transcript escape hatches. Bare letters in modal context (no prompt
  // competing for input) — same class as g/G/j/k in ScrollKeybindingHandler.
  useInput((input, key, event) => {
    if (key.ctrl || key.meta) return;
    if (input === 'q') {
      // less: q quits the pager. ctrl+o toggles; q is the lineage exit.
      handleExitTranscript();
      event.stopImmediatePropagation();
      return;
    }
    if (input === '[' && !dumpMode) {
      // Force dump-to-scrollback. Also expand + uncap — no point dumping
      // a subset. Terminal/tmux cmd-F can now find anything. Guard here
      // (not in isActive) so v still works post-[ — dump-mode footer at
      // ~4898 wires editorStatus, confirming v is meant to stay live.
      setDumpMode(true);
      setShowAllInTranscript(true);
      event.stopImmediatePropagation();
    } else if (input === 'v') {
      // less-style: v opens the file in $VISUAL/$EDITOR. Render the full
      // transcript (same path /export uses), write to tmp, hand off.
      // openFileInExternalEditor handles alt-screen suspend/resume for
      // terminal editors; GUI editors spawn detached.
      event.stopImmediatePropagation();
      // Drop double-taps: the render is async and a second press before it
      // completes would run a second parallel render (double memory, two
      // tempfiles, two editor spawns). editorGenRef only guards
      // transcript-exit staleness, not same-session concurrency.
      if (editorRenderingRef.current) return;
      editorRenderingRef.current = true;
      // Capture generation + make a staleness-aware setter. Each write
      // checks gen (transcript exit bumps it → late writes from the
      // async render go silent).
      const gen = editorGenRef.current;
      const setStatus = (s: string): void => {
        if (gen !== editorGenRef.current) return;
        clearTimeout(editorTimerRef.current);
        setEditorStatus(s);
      };
      setStatus(`rendering ${deferredMessages.length} messages…`);
      void (async () => {
        try {
          // Width = terminal minus vim's line-number gutter (4 digits +
          // space + slack). Floor at 80. PassThrough has no .columns so
          // without this Ink defaults to 80. Trailing-space strip: right-
          // aligned timestamps still leave a flexbox spacer run at EOL.
          // eslint-disable-next-line custom-rules/prefer-use-terminal-size -- one-shot at keypress time, not a reactive render dep
          const w = Math.max(80, (process.stdout.columns ?? 80) - 6);
          const raw = await renderMessagesToPlainText(deferredMessages, tools, w);
          const text = raw.replace(/[ \t]+$/gm, '');
          const path = join(tmpdir(), `cc-transcript-${Date.now()}.txt`);
          await writeFile(path, text);
          const opened = openFileInExternalEditor(path);
          setStatus(opened ? `opening ${path}` : `wrote ${path} · no $VISUAL/$EDITOR set`);
        } catch (e) {
          setStatus(`render failed: ${e instanceof Error ? e.message : String(e)}`);
        }
        editorRenderingRef.current = false;
        if (gen !== editorGenRef.current) return;
        editorTimerRef.current = setTimeout(s => s(''), 4000, setEditorStatus);
      })();
    }
  },
  // !searchOpen: typing 'v' or '[' in the search bar is search input, not
  // a command. No !dumpMode here — v should work after [ (the [ handler
  // guards itself inline).
  {
    isActive: screen === 'transcript' && virtualScrollActive && !searchOpen
  });

  // Fresh `less` per transcript entry. Prevents stale highlights matching
  // unrelated normal-mode text (overlay is alt-screen-global) and avoids
  // surprise n/N on re-entry. Same exit resets [ dump mode — each ctrl+o
  // entry is a fresh instance.
  const inTranscript = screen === 'transcript' && virtualScrollActive;
  useEffect(() => {
    if (!inTranscript) {
      setSearchQuery('');
      setSearchCount(0);
      setSearchCurrent(0);
      setSearchOpen(false);
      editorGenRef.current++;
      clearTimeout(editorTimerRef.current);
      setDumpMode(false);
      setEditorStatus('');
    }
  }, [inTranscript]);
  useEffect(() => {
    setHighlight(inTranscript ? searchQuery : '');
    // Clear the position-based CURRENT (yellow) overlay too. setHighlight
    // only clears the scan-based inverse. Without this, the yellow box
    // persists at its last screen coords after ctrl-c exits transcript.
    if (!inTranscript) setPositions(null);
  }, [inTranscript, searchQuery, setHighlight, setPositions]);
  const globalKeybindingProps = {
    screen,
    setScreen,
    showAllInTranscript,
    setShowAllInTranscript,
    messageCount: messages.length,
    onEnterTranscript: handleEnterTranscript,
    onExitTranscript: handleExitTranscript,
    virtualScrollActive,
    // Bar-open is a mode (owns keystrokes — j/k type, Esc cancels).
    // Navigating (query set, bar closed) is NOT — Esc exits transcript,
    // same as less q with highlights still visible. useSearchInput
    // doesn't stopPropagation, so without this gate transcript:exit
    // would fire on the same Esc that cancels the bar (child registers
    // first, fires first, bubbles).
    searchBarOpen: searchOpen
  };

  // Use frozen lengths to slice arrays, avoiding memory overhead of cloning
  const transcriptMessages = frozenTranscriptState ? deferredMessages.slice(0, frozenTranscriptState.messagesLength) : deferredMessages;
  const transcriptStreamingToolUses = frozenTranscriptState ? streamingToolUses.slice(0, frozenTranscriptState.streamingToolUsesLength) : streamingToolUses;

  // Handle shift+down for teammate navigation and background task management.
  // Guard onOpenBackgroundTasks when a local-jsx dialog (e.g. /mcp) is open —
  // otherwise Shift+Down stacks BackgroundTasksDialog on top and deadlocks input.
  useBackgroundTaskNavigation({
    onOpenBackgroundTasks: isShowingLocalJSXCommand ? undefined : () => setShowBashesDialog(true)
  });
  // Auto-exit viewing mode when teammate completes or errors
  useTeammateViewAutoExit();
  if (screen === 'transcript') {
    // Virtual scroll replaces the 30-message cap: everything is scrollable
    // and memory is bounded by the viewport. Without it, wrapping transcript
    // in a ScrollBox would mount all messages (~250 MB on long sessions —
    // the exact problem), so the kill switch and non-fullscreen paths must
    // fall through to the legacy render: no alt screen, dump to terminal
    // scrollback, 30-cap + Ctrl+E. Reusing scrollRef is safe — normal-mode
    // and transcript-mode are mutually exclusive (this early return), so
    // only one ScrollBox is ever mounted at a time.
    const transcriptScrollRef = isFullscreenEnvEnabled() && !disableVirtualScroll && !dumpMode ? scrollRef : undefined;
    const transcriptMessagesElement = <Messages messages={transcriptMessages} tools={tools} commands={commands} verbose={true} toolJSX={null} toolUseConfirmQueue={[]} inProgressToolUseIDs={inProgressToolUseIDs} isMessageSelectorVisible={false} conversationId={conversationId} screen={screen} agentDefinitions={agentDefinitions} streamingToolUses={transcriptStreamingToolUses} showAllInTranscript={showAllInTranscript} onOpenRateLimitOptions={handleOpenRateLimitOptions} isLoading={isLoading} hidePastThinking={true} streamingThinking={streamingThinking} scrollRef={transcriptScrollRef} jumpRef={jumpRef} onSearchMatchesChange={onSearchMatchesChange} scanElement={scanElement} setPositions={setPositions} disableRenderCap={dumpMode} />;
    const transcriptToolJSX = toolJSX && <Box flexDirection="column" width="100%">
        {toolJSX.jsx}
      </Box>;
    const transcriptReturn = <KeybindingSetup>
        <AnimatedTerminalTitle isAnimating={titleIsAnimating} title={terminalTitle} disabled={titleDisabled} noPrefix={showStatusInTerminalTab} />
        <GlobalKeybindingHandlers {...globalKeybindingProps} />
        {feature('VOICE_MODE') ? <VoiceKeybindingHandler voiceHandleKeyEvent={voice.handleKeyEvent} stripTrailing={voice.stripTrailing} resetAnchor={voice.resetAnchor} isActive={!toolJSX?.isLocalJSXCommand} /> : null}
        <CommandKeybindingHandlers onSubmit={onSubmit} isActive={!toolJSX?.isLocalJSXCommand} />
        {transcriptScrollRef ?
      // ScrollKeybindingHandler must mount before CancelRequestHandler so
      // ctrl+c-with-selection copies instead of cancelling the active task.
      // Its raw useInput handler only stops propagation when a selection
      // exists — without one, ctrl+c falls through to CancelRequestHandler.
      <ScrollKeybindingHandler scrollRef={scrollRef}
      // Yield wheel/ctrl+u/d to UltraplanChoiceDialog's own scroll
      // handler while the modal is showing.
      isActive={focusedInputDialog !== 'ultraplan-choice'}
      // g/G/j/k/ctrl+u/ctrl+d would eat keystrokes the search bar
      // wants. Off while searching.
      isModal={!searchOpen}
      // Manual scroll exits the search context — clear the yellow
      // current-match marker. Positions are (msg, rowOffset)-keyed;
      // j/k changes scrollTop so rowOffset is stale → wrong row
      // gets yellow. Next n/N re-establishes via step()→jump().
      onScroll={() => jumpRef.current?.disarmSearch()} /> : null}
        <CancelRequestHandler {...cancelRequestProps} />
        {transcriptScrollRef ? <FullscreenLayout scrollRef={scrollRef} scrollable={<>
                {transcriptMessagesElement}
                {transcriptToolJSX}
                <SandboxViolationExpandedView />
              </>} bottom={searchOpen ? <TranscriptSearchBar jumpRef={jumpRef}
      // Seed was tried (c01578c8) — broke /hello muscle
      // memory (cursor lands after 'foo', /hello → foohello).
      // Cancel-restore handles the 'don't lose prior search'
      // concern differently (onCancel re-applies searchQuery).
      initialQuery="" count={searchCount} current={searchCurrent} onClose={q => {
        // Enter — commit. 0-match guard: junk query shouldn't
        // persist (badge hidden, n/N dead anyway).
        setSearchQuery(searchCount > 0 ? q : '');
        setSearchOpen(false);
        // onCancel path: bar unmounts before its useEffect([query])
        // can fire with ''. Without this, searchCount stays stale
        // (n guard at :4956 passes) and VML's matches[] too
        // (nextMatch walks the old array). Phantom nav, no
        // highlight. onExit (Enter, q non-empty) still commits.
        if (!q) {
          setSearchCount(0);
          setSearchCurrent(0);
          jumpRef.current?.setSearchQuery('');
        }
      }} onCancel={() => {
        // Esc/ctrl+c/ctrl+g — undo. Bar's effect last fired
        // with whatever was typed. searchQuery (REPL state)
        // is unchanged since / (onClose = commit, didn't run).
        // Two VML calls: '' restores anchor (0-match else-
        // branch), then searchQuery re-scans from anchor's
        // nearest. Both synchronous — one React batch.
        // setHighlight explicit: REPL's sync-effect dep is
        // searchQuery (unchanged), wouldn't re-fire.
        setSearchOpen(false);
        jumpRef.current?.setSearchQuery('');
        jumpRef.current?.setSearchQuery(searchQuery);
        setHighlight(searchQuery);
      }} setHighlight={setHighlight} /> : <TranscriptModeFooter showAllInTranscript={showAllInTranscript} virtualScroll={true} status={editorStatus || undefined} searchBadge={searchQuery && searchCount > 0 ? {
        current: searchCurrent,
        count: searchCount
      } : undefined} />} /> : <>
            {transcriptMessagesElement}
            {transcriptToolJSX}
            <SandboxViolationExpandedView />
            <TranscriptModeFooter showAllInTranscript={showAllInTranscript} virtualScroll={false} suppressShowAll={dumpMode} status={editorStatus || undefined} />
          </>}
      </KeybindingSetup>;
    // The virtual-scroll branch (FullscreenLayout above) needs
    // <AlternateScreen>'s <Box height={rows}> constraint — without it,
    // ScrollBox's flexGrow has no ceiling, viewport = content height,
    // scrollTop pins at 0, and Ink's screen buffer sizes to the full
    // spacer (200×5k+ rows on long sessions). Same root type + props as
    // normal mode's wrap below so React reconciles and the alt buffer
    // stays entered across toggle. The 30-cap dump branch stays
    // unwrapped — it wants native terminal scrollback.
    if (transcriptScrollRef) {
      return <AlternateScreen mouseTracking={isMouseTrackingEnabled()}>
          {transcriptReturn}
        </AlternateScreen>;
    }
    return transcriptReturn;
  }

  // Get viewed agent task (inlined from selectors for explicit data flow).
  // viewedAgentTask: teammate OR local_agent — drives the boolean checks
  // below. viewedTeammateTask: teammate-only narrowed, for teammate-specific
  // field access (inProgressToolUseIDs).
  const viewedTask = viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined;
  const viewedTeammateTask = viewedTask && isInProcessTeammateTask(viewedTask) ? viewedTask : undefined;
  const viewedAgentTask = viewedTeammateTask ?? (viewedTask && isLocalAgentTask(viewedTask) ? viewedTask : undefined);

  // Bypass useDeferredValue when streaming text is showing so Messages renders
  // the final message in the same frame streaming text clears. Also bypass when
  // not loading — deferredMessages only matters during streaming (keeps input
  // responsive); after the turn ends, showing messages immediately prevents a
  // jitter gap where the spinner is gone but the answer hasn't appeared yet.
  // Only reducedMotion users keep the deferred path during loading.
  const usesSyncMessages = showStreamingText || !isLoading;
  // When viewing an agent, never fall through to leader — empty until
  // bootstrap/stream fills. Closes the see-leader-type-agent footgun.
  const displayedMessages = viewedAgentTask ? viewedAgentTask.messages ?? [] : usesSyncMessages ? messages : deferredMessages;
  // Show the placeholder until the real user message appears in
  // displayedMessages. userInputOnProcessing stays set for the whole turn
  // (cleared in resetLoadingState); this length check hides it once
  // displayedMessages grows past the baseline captured at submit time.
  // Covers both gaps: before setMessages is called (processUserInput), and
  // while deferredMessages lags behind messages. Suppressed when viewing an
  // agent — displayedMessages is a different array there, and onAgentSubmit
  // doesn't use the placeholder anyway.
  const placeholderText = userInputOnProcessing && !viewedAgentTask && displayedMessages.length <= userInputBaselineRef.current ? userInputOnProcessing : undefined;
  const toolPermissionOverlay = focusedInputDialog === 'tool-permission' ? <PermissionRequest key={toolUseConfirmQueue[0]?.toolUseID} onDone={() => setToolUseConfirmQueue(([_, ...tail]) => tail)} onReject={handleQueuedCommandOnCancel} toolUseConfirm={toolUseConfirmQueue[0]!} toolUseContext={getToolUseContext(messages, messages, abortController ?? createAbortController(), mainLoopModel)} verbose={verbose} workerBadge={toolUseConfirmQueue[0]?.workerBadge} setStickyFooter={isFullscreenEnvEnabled() ? setPermissionStickyFooter : undefined} /> : null;

  // Narrow terminals: companion collapses to a one-liner that REPL stacks
  // on its own row (above input in fullscreen, below in scrollback) instead
  // of row-beside. Wide terminals keep the row layout with sprite on the right.
  const companionNarrow = transcriptCols < MIN_COLS_FOR_FULL_SPRITE;
  // Hide the sprite when PromptInput early-returns BackgroundTasksDialog.
  // The sprite sits as a row sibling of PromptInput, so the dialog's Pane
  // divider draws at useTerminalSize() width but only gets terminalWidth -
  // spriteWidth — divider stops short and dialog text wraps early. Don't
  // check footerSelection: pill FOCUS (arrow-down to tasks pill) must keep
  // the sprite visible so arrow-right can navigate to it.
  const companionVisible = !toolJSX?.shouldHidePromptInput && !focusedInputDialog && !showBashesDialog;

  // In fullscreen, ALL local-jsx slash commands float in the modal slot —
  // FullscreenLayout wraps them in an absolute-positioned bottom-anchored
  // pane (▔ divider, ModalContext). Pane/Dialog inside detect the context
  // and skip their own top-level frame. Non-fullscreen keeps the inline
  // render paths below. Commands that used to route through bottom
  // (immediate: /model, /mcp, /btw, ...) and scrollable (non-immediate:
  // /config, /theme, /diff, ...) both go here now.
  const toolJsxCentered = isFullscreenEnvEnabled() && toolJSX?.isLocalJSXCommand === true;
  const centeredModal: React.ReactNode = toolJsxCentered ? toolJSX!.jsx : null;

  // <AlternateScreen> at the root: everything below is inside its
  // <Box height={rows}>. Handlers/contexts are zero-height so ScrollBox's
  // flexGrow in FullscreenLayout resolves against this Box. The transcript
  // early return above wraps its virtual-scroll branch the same way; only
  // the 30-cap dump branch stays unwrapped for native terminal scrollback.
  const mainReturn = <KeybindingSetup>
      <AnimatedTerminalTitle isAnimating={titleIsAnimating} title={terminalTitle} disabled={titleDisabled} noPrefix={showStatusInTerminalTab} />
      <GlobalKeybindingHandlers {...globalKeybindingProps} />
      {feature('VOICE_MODE') ? <VoiceKeybindingHandler voiceHandleKeyEvent={voice.handleKeyEvent} stripTrailing={voice.stripTrailing} resetAnchor={voice.resetAnchor} isActive={!toolJSX?.isLocalJSXCommand} /> : null}
      <CommandKeybindingHandlers onSubmit={onSubmit} isActive={!toolJSX?.isLocalJSXCommand} />
      {/* ScrollKeybindingHandler must mount before CancelRequestHandler so
          ctrl+c-with-selection copies instead of cancelling the active task.
          Its raw useInput handler only stops propagation when a selection
          exists — without one, ctrl+c falls through to CancelRequestHandler.
          PgUp/PgDn/wheel always scroll the transcript behind the modal —
          the modal's inner ScrollBox is not keyboard-driven. onScroll
          stays suppressed while a modal is showing so scroll doesn't
          stamp divider/pill state. */}
      <ScrollKeybindingHandler scrollRef={scrollRef} isActive={isFullscreenEnvEnabled() && (centeredModal != null || !focusedInputDialog || focusedInputDialog === 'tool-permission')} onScroll={centeredModal || toolPermissionOverlay || viewedAgentTask ? undefined : composedOnScroll} />
      {feature('MESSAGE_ACTIONS') && isFullscreenEnvEnabled() && !disableMessageActions ? <MessageActionsKeybindings handlers={messageActionHandlers} isActive={cursor !== null} /> : null}
      <CancelRequestHandler {...cancelRequestProps} />
      <MCPConnectionManager key={remountKey} dynamicMcpConfig={dynamicMcpConfig} isStrictMcpConfig={strictMcpConfig}>
        <FullscreenLayout scrollRef={scrollRef} overlay={toolPermissionOverlay} bottomFloat={feature('BUDDY') && companionVisible && !companionNarrow ? <CompanionFloatingBubble /> : undefined} modal={centeredModal} modalScrollRef={modalScrollRef} dividerYRef={dividerYRef} hidePill={!!viewedAgentTask} hideSticky={!!viewedTeammateTask} newMessageCount={unseenDivider?.count ?? 0} onPillClick={() => {
        setCursor(null);
        jumpToNew(scrollRef.current);
      }} scrollable={<>
              <TeammateViewHeader />
              <Messages messages={displayedMessages} tools={tools} commands={commands} verbose={verbose} toolJSX={toolJSX} toolUseConfirmQueue={toolUseConfirmQueue} inProgressToolUseIDs={viewedTeammateTask ? viewedTeammateTask.inProgressToolUseIDs ?? new Set() : inProgressToolUseIDs} isMessageSelectorVisible={isMessageSelectorVisible} conversationId={conversationId} screen={screen} streamingToolUses={streamingToolUses} showAllInTranscript={showAllInTranscript} agentDefinitions={agentDefinitions} onOpenRateLimitOptions={handleOpenRateLimitOptions} isLoading={isLoading} streamingText={isLoading && !viewedAgentTask ? visibleStreamingText : null} isBriefOnly={viewedAgentTask ? false : isBriefOnly} unseenDivider={viewedAgentTask ? undefined : unseenDivider} scrollRef={isFullscreenEnvEnabled() ? scrollRef : undefined} trackStickyPrompt={isFullscreenEnvEnabled() ? true : undefined} cursor={cursor} setCursor={setCursor} cursorNavRef={cursorNavRef} />
              <AwsAuthStatusBox />
              {/* Hide the processing placeholder while a modal is showing —
                  it would sit at the last visible transcript row right above
                  the ▔ divider, showing "❯ /config" as redundant clutter
                  (the modal IS the /config UI). Outside modals it stays so
                  the user sees their input echoed while Claude processes. */}
              {!disabled && placeholderText && !centeredModal && <UserTextMessage param={{
          text: placeholderText,
          type: 'text'
        }} addMargin={true} verbose={verbose} />}
              {toolJSX && !(toolJSX.isLocalJSXCommand && toolJSX.isImmediate) && !toolJsxCentered && <Box flexDirection="column" width="100%">
                    {toolJSX.jsx}
                  </Box>}
              {"external" === 'ant' && <TungstenLiveMonitor />}
              {feature('WEB_BROWSER_TOOL') ? WebBrowserPanelModule && <WebBrowserPanelModule.WebBrowserPanel /> : null}
              <Box flexGrow={1} />
              {showSpinner && <SpinnerWithVerb mode={streamMode} spinnerTip={spinnerTip} responseLengthRef={responseLengthRef} apiMetricsRef={apiMetricsRef} overrideMessage={spinnerMessage} spinnerSuffix={stopHookSpinnerSuffix} verbose={verbose} loadingStartTimeRef={loadingStartTimeRef} totalPausedMsRef={totalPausedMsRef} pauseStartTimeRef={pauseStartTimeRef} overrideColor={spinnerColor} overrideShimmerColor={spinnerShimmerColor} hasActiveTools={inProgressToolUseIDs.size > 0} leaderIsIdle={!isLoading} />}
              {!showSpinner && !isLoading && !userInputOnProcessing && !hasRunningTeammates && isBriefOnly && !viewedAgentTask && <BriefIdleStatus />}
              {isFullscreenEnvEnabled() && <PromptInputQueuedCommands />}
            </>} bottom={<Box flexDirection={feature('BUDDY') && companionNarrow ? 'column' : 'row'} width="100%" alignItems={feature('BUDDY') && companionNarrow ? undefined : 'flex-end'}>
              {feature('BUDDY') && companionNarrow && isFullscreenEnvEnabled() && companionVisible ? <CompanionSprite /> : null}
              <Box flexDirection="column" flexGrow={1}>
                {permissionStickyFooter}
                {/* Immediate local-jsx commands (/btw, /sandbox, /assistant,
                  /issue) render here, NOT inside scrollable. They stay mounted
                  while the main conversation streams behind them, so ScrollBox
                  relayouts on each new message would drag them around. bottom
                  is flexShrink={0} outside the ScrollBox — it never moves.
                  Non-immediate local-jsx (/diff, /status, /theme, ~40 others)
                  stays in scrollable: the main loop is paused so no jiggle,
                  and their tall content (DiffDetailView renders up to 400
                  lines with no internal scroll) needs the outer ScrollBox. */}
                {toolJSX?.isLocalJSXCommand && toolJSX.isImmediate && !toolJsxCentered && <Box flexDirection="column" width="100%">
                      {toolJSX.jsx}
                    </Box>}
                {!showSpinner && !toolJSX?.isLocalJSXCommand && showExpandedTodos && tasksV2 && tasksV2.length > 0 && <Box width="100%" flexDirection="column">
                      <TaskListV2 tasks={tasksV2} isStandalone={true} />
                    </Box>}
                {focusedInputDialog === 'sandbox-permission' && <SandboxPermissionRequest key={sandboxPermissionRequestQueue[0]!.hostPattern.host} hostPattern={sandboxPermissionRequestQueue[0]!.hostPattern} onUserResponse={(response: {
            allow: boolean;
            persistToSettings: boolean;
          }) => {
            const {
              allow,
              persistToSettings
            } = response;
            const currentRequest = sandboxPermissionRequestQueue[0];
            if (!currentRequest) return;
            const approvedHost = currentRequest.hostPattern.host;
            if (persistToSettings) {
              const update = {
                type: 'addRules' as const,
                rules: [{
                  toolName: WEB_FETCH_TOOL_NAME,
                  ruleContent: `domain:${approvedHost}`
                }],
                behavior: (allow ? 'allow' : 'deny') as 'allow' | 'deny',
                destination: 'localSettings' as const
              };
              setAppState(prev => ({
                ...prev,
                toolPermissionContext: applyPermissionUpdate(prev.toolPermissionContext, update)
              }));
              persistPermissionUpdate(update);

              // Immediately update sandbox in-memory config to prevent race conditions
              // where pending requests slip through before settings change is detected
              SandboxManager.refreshConfig();
            }

            // Resolve ALL pending requests for the same host (not just the first one)
            // This handles the case where multiple parallel requests came in for the same domain
            setSandboxPermissionRequestQueue(queue => {
              queue.filter(item => item.hostPattern.host === approvedHost).forEach(item => item.resolvePromise(allow));
              return queue.filter(item => item.hostPattern.host !== approvedHost);
            });

            // Clean up bridge subscriptions and cancel remote prompts
            // for this host since the local user already responded.
            const cleanups = sandboxBridgeCleanupRef.current.get(approvedHost);
            if (cleanups) {
              for (const fn of cleanups) {
                fn();
              }
              sandboxBridgeCleanupRef.current.delete(approvedHost);
            }
          }} />}
                {focusedInputDialog === 'prompt' && <PromptDialog key={promptQueue[0]!.request.prompt} title={promptQueue[0]!.title} toolInputSummary={promptQueue[0]!.toolInputSummary} request={promptQueue[0]!.request} onRespond={selectedKey => {
            const item = promptQueue[0];
            if (!item) return;
            item.resolve({
              prompt_response: item.request.prompt,
              selected: selectedKey
            });
            setPromptQueue(([, ...tail]) => tail);
          }} onAbort={() => {
            const item = promptQueue[0];
            if (!item) return;
            item.reject(new Error('Prompt cancelled by user'));
            setPromptQueue(([, ...tail]) => tail);
          }} />}
                {/* Show pending indicator on worker while waiting for leader approval */}
                {pendingWorkerRequest && <WorkerPendingPermission toolName={pendingWorkerRequest.toolName} description={pendingWorkerRequest.description} />}
                {/* Show pending indicator for sandbox permission on worker side */}
                {pendingSandboxRequest && <WorkerPendingPermission toolName="Network Access" description={`Waiting for leader to approve network access to ${pendingSandboxRequest.host}`} />}
                {/* Worker sandbox permission requests from swarm workers */}
                {focusedInputDialog === 'worker-sandbox-permission' && <SandboxPermissionRequest key={workerSandboxPermissions.queue[0]!.requestId} hostPattern={{
            host: workerSandboxPermissions.queue[0]!.host,
            port: undefined
          } as NetworkHostPattern} onUserResponse={(response: {
            allow: boolean;
            persistToSettings: boolean;
          }) => {
            const {
              allow,
              persistToSettings
            } = response;
            const currentRequest = workerSandboxPermissions.queue[0];
            if (!currentRequest) return;
            const approvedHost = currentRequest.host;

            // Send response via mailbox to the worker
            void sendSandboxPermissionResponseViaMailbox(currentRequest.workerName, currentRequest.requestId, approvedHost, allow, teamContext?.teamName);
            if (persistToSettings && allow) {
              const update = {
                type: 'addRules' as const,
                rules: [{
                  toolName: WEB_FETCH_TOOL_NAME,
                  ruleContent: `domain:${approvedHost}`
                }],
                behavior: 'allow' as const,
                destination: 'localSettings' as const
              };
              setAppState(prev => ({
                ...prev,
                toolPermissionContext: applyPermissionUpdate(prev.toolPermissionContext, update)
              }));
              persistPermissionUpdate(update);
              SandboxManager.refreshConfig();
            }

            // Remove from queue
            setAppState(prev => ({
              ...prev,
              workerSandboxPermissions: {
                ...prev.workerSandboxPermissions,
                queue: prev.workerSandboxPermissions.queue.slice(1)
              }
            }));
          }} />}
                {focusedInputDialog === 'elicitation' && <ElicitationDialog key={elicitation.queue[0]!.serverName + ':' + String(elicitation.queue[0]!.requestId)} event={elicitation.queue[0]!} onResponse={(action, content) => {
            const currentRequest = elicitation.queue[0];
            if (!currentRequest) return;
            // Call respond callback to resolve Promise
            currentRequest.respond({
              action,
              content
            });
            // For URL accept, keep in queue for phase 2
            const isUrlAccept = currentRequest.params.mode === 'url' && action === 'accept';
            if (!isUrlAccept) {
              setAppState(prev => ({
                ...prev,
                elicitation: {
                  queue: prev.elicitation.queue.slice(1)
                }
              }));
            }
          }} onWaitingDismiss={action => {
            const currentRequest = elicitation.queue[0];
            // Remove from queue
            setAppState(prev => ({
              ...prev,
              elicitation: {
                queue: prev.elicitation.queue.slice(1)
              }
            }));
            currentRequest?.onWaitingDismiss?.(action);
          }} />}
                {focusedInputDialog === 'cost' && <CostThresholdDialog onDone={() => {
            setShowCostDialog(false);
            setHaveShownCostDialog(true);
            saveGlobalConfig(current => ({
              ...current,
              hasAcknowledgedCostThreshold: true
            }));
            logEvent('tengu_cost_threshold_acknowledged', {});
          }} />}
                {focusedInputDialog === 'idle-return' && idleReturnPending && <IdleReturnDialog idleMinutes={idleReturnPending.idleMinutes} totalInputTokens={getTotalInputTokens()} onDone={async action => {
            const pending = idleReturnPending;
            setIdleReturnPending(null);
            logEvent('tengu_idle_return_action', {
              action: action as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
              idleMinutes: Math.round(pending.idleMinutes),
              messageCount: messagesRef.current.length,
              totalInputTokens: getTotalInputTokens()
            });
            if (action === 'dismiss') {
              setInputValue(pending.input);
              return;
            }
            if (action === 'never') {
              saveGlobalConfig(current => {
                if (current.idleReturnDismissed) return current;
                return {
                  ...current,
                  idleReturnDismissed: true
                };
              });
            }
            if (action === 'clear') {
              const {
                clearConversation
              } = await import('../commands/clear/conversation.js');
              await clearConversation({
                setMessages,
                readFileState: readFileState.current,
                discoveredSkillNames: discoveredSkillNamesRef.current,
                loadedNestedMemoryPaths: loadedNestedMemoryPathsRef.current,
                getAppState: () => store.getState(),
                setAppState,
                setConversationId
              });
              haikuTitleAttemptedRef.current = false;
              setHaikuTitle(undefined);
              bashTools.current.clear();
              bashToolsProcessedIdx.current = 0;
            }
            skipIdleCheckRef.current = true;
            void onSubmitRef.current(pending.input, {
              setCursorOffset: () => {},
              clearBuffer: () => {},
              resetHistory: () => {}
            });
          }} />}
                {focusedInputDialog === 'ide-onboarding' && <IdeOnboardingDialog onDone={() => setShowIdeOnboarding(false)} installationStatus={ideInstallationStatus} />}
                {"external" === 'ant' && focusedInputDialog === 'model-switch' && AntModelSwitchCallout && <AntModelSwitchCallout onDone={(selection: string, modelAlias?: string) => {
            setShowModelSwitchCallout(false);
            if (selection === 'switch' && modelAlias) {
              setAppState(prev => ({
                ...prev,
                mainLoopModel: modelAlias,
                mainLoopModelForSession: null
              }));
            }
          }} />}
                {"external" === 'ant' && focusedInputDialog === 'undercover-callout' && UndercoverAutoCallout && <UndercoverAutoCallout onDone={() => setShowUndercoverCallout(false)} />}
                {focusedInputDialog === 'effort-callout' && <EffortCallout model={mainLoopModel} onDone={selection => {
            setShowEffortCallout(false);
            if (selection !== 'dismiss') {
              setAppState(prev => ({
                ...prev,
                effortValue: selection
              }));
            }
          }} />}
                {focusedInputDialog === 'remote-callout' && <RemoteCallout onDone={selection => {
            setAppState(prev => {
              if (!prev.showRemoteCallout) return prev;
              return {
                ...prev,
                showRemoteCallout: false,
                ...(selection === 'enable' && {
                  replBridgeEnabled: true,
                  replBridgeExplicit: true,
                  replBridgeOutboundOnly: false
                })
              };
            });
          }} />}

                {exitFlow}

                {focusedInputDialog === 'plugin-hint' && hintRecommendation && <PluginHintMenu pluginName={hintRecommendation.pluginName} pluginDescription={hintRecommendation.pluginDescription} marketplaceName={hintRecommendation.marketplaceName} sourceCommand={hintRecommendation.sourceCommand} onResponse={handleHintResponse} />}

                {focusedInputDialog === 'lsp-recommendation' && lspRecommendation && <LspRecommendationMenu pluginName={lspRecommendation.pluginName} pluginDescription={lspRecommendation.pluginDescription} fileExtension={lspRecommendation.fileExtension} onResponse={handleLspResponse} />}

                {focusedInputDialog === 'desktop-upsell' && <DesktopUpsellStartup onDone={() => setShowDesktopUpsellStartup(false)} />}

                {feature('ULTRAPLAN') ? focusedInputDialog === 'ultraplan-choice' && ultraplanPendingChoice && <UltraplanChoiceDialog plan={ultraplanPendingChoice.plan} sessionId={ultraplanPendingChoice.sessionId} taskId={ultraplanPendingChoice.taskId} setMessages={setMessages} readFileState={readFileState.current} getAppState={() => store.getState()} setConversationId={setConversationId} /> : null}

                {feature('ULTRAPLAN') ? focusedInputDialog === 'ultraplan-launch' && ultraplanLaunchPending && <UltraplanLaunchDialog onChoice={(choice, opts) => {
            const blurb = ultraplanLaunchPending.blurb;
            setAppState(prev => prev.ultraplanLaunchPending ? {
              ...prev,
              ultraplanLaunchPending: undefined
            } : prev);
            if (choice === 'cancel') return;
            // Command's onDone used display:'skip', so add the
            // echo here — gives immediate feedback before the
            // ~5s teleportToRemote resolves.
            setMessages(prev => [...prev, createCommandInputMessage(formatCommandInputTags('ultraplan', blurb))]);
            const appendStdout = (msg: string) => setMessages(prev => [...prev, createCommandInputMessage(`<${LOCAL_COMMAND_STDOUT_TAG}>${escapeXml(msg)}</${LOCAL_COMMAND_STDOUT_TAG}>`)]);
            // Defer the second message if a query is mid-turn
            // so it lands after the assistant reply, not
            // between the user's prompt and the reply.
            const appendWhenIdle = (msg: string) => {
              if (!queryGuard.isActive) {
                appendStdout(msg);
                return;
              }
              const unsub = queryGuard.subscribe(() => {
                if (queryGuard.isActive) return;
                unsub();
                // Skip if the user stopped ultraplan while we
                // were waiting — avoids a stale "Monitoring
                // <url>" message for a session that's gone.
                if (!store.getState().ultraplanSessionUrl) return;
                appendStdout(msg);
              });
            };
            void launchUltraplan({
              blurb,
              getAppState: () => store.getState(),
              setAppState,
              signal: createAbortController().signal,
              disconnectedBridge: opts?.disconnectedBridge,
              onSessionReady: appendWhenIdle
            }).then(appendStdout).catch(logError);
          }} /> : null}

                {mrRender()}

                {!toolJSX?.shouldHidePromptInput && !focusedInputDialog && !isExiting && !disabled && !cursor && <>
                      {autoRunIssueReason && <AutoRunIssueNotification onRun={handleAutoRunIssue} onCancel={handleCancelAutoRunIssue} reason={getAutoRunIssueReasonText(autoRunIssueReason)} />}
                      {postCompactSurvey.state !== 'closed' ? <FeedbackSurvey state={postCompactSurvey.state} lastResponse={postCompactSurvey.lastResponse} handleSelect={postCompactSurvey.handleSelect} inputValue={inputValue} setInputValue={setInputValue} onRequestFeedback={handleSurveyRequestFeedback} /> : memorySurvey.state !== 'closed' ? <FeedbackSurvey state={memorySurvey.state} lastResponse={memorySurvey.lastResponse} handleSelect={memorySurvey.handleSelect} handleTranscriptSelect={memorySurvey.handleTranscriptSelect} inputValue={inputValue} setInputValue={setInputValue} onRequestFeedback={handleSurveyRequestFeedback} message="How well did Claude use its memory? (optional)" /> : <FeedbackSurvey state={feedbackSurvey.state} lastResponse={feedbackSurvey.lastResponse} handleSelect={feedbackSurvey.handleSelect} handleTranscriptSelect={feedbackSurvey.handleTranscriptSelect} inputValue={inputValue} setInputValue={setInputValue} onRequestFeedback={didAutoRunIssueRef.current ? undefined : handleSurveyRequestFeedback} />}
                      {/* Frustration-triggered transcript sharing prompt */}
                      {frustrationDetection.state !== 'closed' && <FeedbackSurvey state={frustrationDetection.state} lastResponse={null} handleSelect={() => {}} handleTranscriptSelect={frustrationDetection.handleTranscriptSelect} inputValue={inputValue} setInputValue={setInputValue} />}
                      {/* Skill improvement survey - appears when improvements detected (ant-only) */}
                      {"external" === 'ant' && skillImprovementSurvey.suggestion && <SkillImprovementSurvey isOpen={skillImprovementSurvey.isOpen} skillName={skillImprovementSurvey.suggestion.skillName} updates={skillImprovementSurvey.suggestion.updates} handleSelect={skillImprovementSurvey.handleSelect} inputValue={inputValue} setInputValue={setInputValue} />}
                      {showIssueFlagBanner && <IssueFlagBanner />}
                      {}
                      <PromptInput debug={debug} ideSelection={ideSelection} hasSuppressedDialogs={!!hasSuppressedDialogs} isLocalJSXCommandActive={isShowingLocalJSXCommand} getToolUseContext={getToolUseContext} toolPermissionContext={toolPermissionContext} setToolPermissionContext={setToolPermissionContext} apiKeyStatus={apiKeyStatus} commands={commands} agents={agentDefinitions.activeAgents} isLoading={isLoading} onExit={handleExit} verbose={verbose} messages={messages} onAutoUpdaterResult={setAutoUpdaterResult} autoUpdaterResult={autoUpdaterResult} input={inputValue} onInputChange={setInputValue} mode={inputMode} onModeChange={setInputMode} stashedPrompt={stashedPrompt} setStashedPrompt={setStashedPrompt} submitCount={submitCount} onShowMessageSelector={handleShowMessageSelector} onMessageActionsEnter={
            // Works during isLoading — edit cancels first; uuid selection survives appends.
            feature('MESSAGE_ACTIONS') && isFullscreenEnvEnabled() && !disableMessageActions ? enterMessageActions : undefined} mcpClients={mcpClients} pastedContents={pastedContents} setPastedContents={setPastedContents} vimMode={vimMode} setVimMode={setVimMode} showBashesDialog={showBashesDialog} setShowBashesDialog={setShowBashesDialog} onSubmit={onSubmit} onAgentSubmit={onAgentSubmit} isSearchingHistory={isSearchingHistory} setIsSearchingHistory={setIsSearchingHistory} helpOpen={isHelpOpen} setHelpOpen={setIsHelpOpen} insertTextRef={feature('VOICE_MODE') ? insertTextRef : undefined} voiceInterimRange={voice.interimRange} />
                      <SessionBackgroundHint onBackgroundSession={handleBackgroundSession} isLoading={isLoading} />
                    </>}
                {cursor &&
          // inputValue is REPL state; typed text survives the round-trip.
          <MessageActionsBar cursor={cursor} />}
                {focusedInputDialog === 'message-selector' && <MessageSelector messages={messages} preselectedMessage={messageSelectorPreselect} onPreRestore={onCancel} onRestoreCode={async (message: UserMessage) => {
            await fileHistoryRewind((updater: (prev: FileHistoryState) => FileHistoryState) => {
              setAppState(prev => ({
                ...prev,
                fileHistory: updater(prev.fileHistory)
              }));
            }, message.uuid);
          }} onSummarize={async (message: UserMessage, feedback?: string, direction: PartialCompactDirection = 'from') => {
            // Project snipped messages so the compact model
            // doesn't summarize content that was intentionally removed.
            const compactMessages = getMessagesAfterCompactBoundary(messages);
            const messageIndex = compactMessages.indexOf(message);
            if (messageIndex === -1) {
              // Selected a snipped or pre-compact message that the
              // selector still shows (REPL keeps full history for
              // scrollback). Surface why nothing happened instead
              // of silently no-oping.
              setMessages(prev => [...prev, createSystemMessage('That message is no longer in the active context (snipped or pre-compact). Choose a more recent message.', 'warning')]);
              return;
            }
            const newAbortController = createAbortController();
            const context = getToolUseContext(compactMessages, [], newAbortController, mainLoopModel);
            const appState = context.getAppState();
            const defaultSysPrompt = await getSystemPrompt(context.options.tools, context.options.mainLoopModel, Array.from(appState.toolPermissionContext.additionalWorkingDirectories.keys()), context.options.mcpClients);
            const systemPrompt = buildEffectiveSystemPrompt({
              mainThreadAgentDefinition: undefined,
              toolUseContext: context,
              customSystemPrompt: context.options.customSystemPrompt,
              defaultSystemPrompt: defaultSysPrompt,
              appendSystemPrompt: context.options.appendSystemPrompt
            });
            const [userContext, systemContext] = await Promise.all([getUserContext(), getSystemContext()]);
            const result = await partialCompactConversation(compactMessages, messageIndex, context, {
              systemPrompt,
              userContext,
              systemContext,
              toolUseContext: context,
              forkContextMessages: compactMessages
            }, feedback, direction);
            const kept = result.messagesToKeep ?? [];
            const ordered = direction === 'up_to' ? [...result.summaryMessages, ...kept] : [...kept, ...result.summaryMessages];
            const postCompact = [result.boundaryMarker, ...ordered, ...result.attachments, ...result.hookResults];
            // Fullscreen 'from' keeps scrollback; 'up_to' must not
            // (old[0] unchanged + grown array means incremental
            // useLogMessages path, so boundary never persisted).
            // Find by uuid since old is raw REPL history and snipped
            // entries can shift the projected messageIndex.
            if (isFullscreenEnvEnabled() && direction === 'from') {
              setMessages(old => {
                const rawIdx = old.findIndex(m => m.uuid === message.uuid);
                return [...old.slice(0, rawIdx === -1 ? 0 : rawIdx), ...postCompact];
              });
            } else {
              setMessages(postCompact);
            }
            // Partial compact bypasses handleMessageFromStream — clear
            // the context-blocked flag so proactive ticks resume.
            if (feature('PROACTIVE') || feature('KAIROS')) {
              proactiveModule?.setContextBlocked(false);
            }
            setConversationId(randomUUID());
            runPostCompactCleanup(context.options.querySource);
            if (direction === 'from') {
              const r = textForResubmit(message);
              if (r) {
                setInputValue(r.text);
                setInputMode(r.mode);
              }
            }

            // Show notification with ctrl+o hint
            const historyShortcut = getShortcutDisplay('app:toggleTranscript', 'Global', 'ctrl+o');
            addNotification({
              key: 'summarize-ctrl-o-hint',
              text: `Conversation summarized (${historyShortcut} for history)`,
              priority: 'medium',
              timeoutMs: 8000
            });
          }} onRestoreMessage={handleRestoreMessage} onClose={() => {
            setIsMessageSelectorVisible(false);
            setMessageSelectorPreselect(undefined);
          }} />}
                {"external" === 'ant' && <DevBar />}
              </Box>
              {feature('BUDDY') && !(companionNarrow && isFullscreenEnvEnabled()) && companionVisible ? <CompanionSprite /> : null}
            </Box>} />
      </MCPConnectionManager>
    </KeybindingSetup>;
  if (isFullscreenEnvEnabled()) {
    return <AlternateScreen mouseTracking={isMouseTrackingEnabled()}>
        {mainReturn}
      </AlternateScreen>;
  }
  return mainReturn;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJFUEwudHN4Il0sIm5hbWVzIjpbImZlYXR1cmUiLCJzcGF3blN5bmMiLCJzbmFwc2hvdE91dHB1dFRva2Vuc0ZvclR1cm4iLCJnZXRDdXJyZW50VHVyblRva2VuQnVkZ2V0IiwiZ2V0VHVybk91dHB1dFRva2VucyIsImdldEJ1ZGdldENvbnRpbnVhdGlvbkNvdW50IiwiZ2V0VG90YWxJbnB1dFRva2VucyIsInBhcnNlVG9rZW5CdWRnZXQiLCJjb3VudCIsImRpcm5hbWUiLCJqb2luIiwidG1wZGlyIiwiZmlndXJlcyIsInVzZUlucHV0IiwidXNlU2VhcmNoSW5wdXQiLCJ1c2VUZXJtaW5hbFNpemUiLCJ1c2VTZWFyY2hIaWdobGlnaHQiLCJKdW1wSGFuZGxlIiwicmVuZGVyTWVzc2FnZXNUb1BsYWluVGV4dCIsIm9wZW5GaWxlSW5FeHRlcm5hbEVkaXRvciIsIndyaXRlRmlsZSIsIkJveCIsIlRleHQiLCJ1c2VTdGRpbiIsInVzZVRoZW1lIiwidXNlVGVybWluYWxGb2N1cyIsInVzZVRlcm1pbmFsVGl0bGUiLCJ1c2VUYWJTdGF0dXMiLCJUYWJTdGF0dXNLaW5kIiwiQ29zdFRocmVzaG9sZERpYWxvZyIsIklkbGVSZXR1cm5EaWFsb2ciLCJSZWFjdCIsInVzZUVmZmVjdCIsInVzZU1lbW8iLCJ1c2VSZWYiLCJ1c2VTdGF0ZSIsInVzZUNhbGxiYWNrIiwidXNlRGVmZXJyZWRWYWx1ZSIsInVzZUxheW91dEVmZmVjdCIsIlJlZk9iamVjdCIsInVzZU5vdGlmaWNhdGlvbnMiLCJzZW5kTm90aWZpY2F0aW9uIiwic3RhcnRQcmV2ZW50U2xlZXAiLCJzdG9wUHJldmVudFNsZWVwIiwidXNlVGVybWluYWxOb3RpZmljYXRpb24iLCJoYXNDdXJzb3JVcFZpZXdwb3J0WWFua0J1ZyIsImNyZWF0ZUZpbGVTdGF0ZUNhY2hlV2l0aFNpemVMaW1pdCIsIm1lcmdlRmlsZVN0YXRlQ2FjaGVzIiwiUkVBRF9GSUxFX1NUQVRFX0NBQ0hFX1NJWkUiLCJ1cGRhdGVMYXN0SW50ZXJhY3Rpb25UaW1lIiwiZ2V0TGFzdEludGVyYWN0aW9uVGltZSIsImdldE9yaWdpbmFsQ3dkIiwiZ2V0UHJvamVjdFJvb3QiLCJnZXRTZXNzaW9uSWQiLCJzd2l0Y2hTZXNzaW9uIiwic2V0Q29zdFN0YXRlRm9yUmVzdG9yZSIsImdldFR1cm5Ib29rRHVyYXRpb25NcyIsImdldFR1cm5Ib29rQ291bnQiLCJyZXNldFR1cm5Ib29rRHVyYXRpb24iLCJnZXRUdXJuVG9vbER1cmF0aW9uTXMiLCJnZXRUdXJuVG9vbENvdW50IiwicmVzZXRUdXJuVG9vbER1cmF0aW9uIiwiZ2V0VHVybkNsYXNzaWZpZXJEdXJhdGlvbk1zIiwiZ2V0VHVybkNsYXNzaWZpZXJDb3VudCIsInJlc2V0VHVybkNsYXNzaWZpZXJEdXJhdGlvbiIsImFzU2Vzc2lvbklkIiwiYXNBZ2VudElkIiwibG9nRm9yRGVidWdnaW5nIiwiUXVlcnlHdWFyZCIsImlzRW52VHJ1dGh5IiwiZm9ybWF0VG9rZW5zIiwidHJ1bmNhdGVUb1dpZHRoIiwiY29uc3VtZUVhcmx5SW5wdXQiLCJzZXRNZW1iZXJBY3RpdmUiLCJpc1N3YXJtV29ya2VyIiwiZ2VuZXJhdGVTYW5kYm94UmVxdWVzdElkIiwic2VuZFNhbmRib3hQZXJtaXNzaW9uUmVxdWVzdFZpYU1haWxib3giLCJzZW5kU2FuZGJveFBlcm1pc3Npb25SZXNwb25zZVZpYU1haWxib3giLCJyZWdpc3RlclNhbmRib3hQZXJtaXNzaW9uQ2FsbGJhY2siLCJnZXRUZWFtTmFtZSIsImdldEFnZW50TmFtZSIsIldvcmtlclBlbmRpbmdQZXJtaXNzaW9uIiwiaW5qZWN0VXNlck1lc3NhZ2VUb1RlYW1tYXRlIiwiZ2V0QWxsSW5Qcm9jZXNzVGVhbW1hdGVUYXNrcyIsImlzTG9jYWxBZ2VudFRhc2siLCJxdWV1ZVBlbmRpbmdNZXNzYWdlIiwiYXBwZW5kTWVzc2FnZVRvTG9jYWxBZ2VudCIsIkxvY2FsQWdlbnRUYXNrU3RhdGUiLCJyZWdpc3RlckxlYWRlclRvb2xVc2VDb25maXJtUXVldWUiLCJ1bnJlZ2lzdGVyTGVhZGVyVG9vbFVzZUNvbmZpcm1RdWV1ZSIsInJlZ2lzdGVyTGVhZGVyU2V0VG9vbFBlcm1pc3Npb25Db250ZXh0IiwidW5yZWdpc3RlckxlYWRlclNldFRvb2xQZXJtaXNzaW9uQ29udGV4dCIsImVuZEludGVyYWN0aW9uU3BhbiIsInVzZUxvZ01lc3NhZ2VzIiwidXNlUmVwbEJyaWRnZSIsIkNvbW1hbmQiLCJDb21tYW5kUmVzdWx0RGlzcGxheSIsIlJlc3VtZUVudHJ5cG9pbnQiLCJnZXRDb21tYW5kTmFtZSIsImlzQ29tbWFuZEVuYWJsZWQiLCJQcm9tcHRJbnB1dE1vZGUiLCJRdWV1ZWRDb21tYW5kIiwiVmltTW9kZSIsIk1lc3NhZ2VTZWxlY3RvciIsInNlbGVjdGFibGVVc2VyTWVzc2FnZXNGaWx0ZXIiLCJtZXNzYWdlc0FmdGVyQXJlT25seVN5bnRoZXRpYyIsInVzZUlkZUxvZ2dpbmciLCJQZXJtaXNzaW9uUmVxdWVzdCIsIlRvb2xVc2VDb25maXJtIiwiRWxpY2l0YXRpb25EaWFsb2ciLCJQcm9tcHREaWFsb2ciLCJQcm9tcHRSZXF1ZXN0IiwiUHJvbXB0UmVzcG9uc2UiLCJQcm9tcHRJbnB1dCIsIlByb21wdElucHV0UXVldWVkQ29tbWFuZHMiLCJ1c2VSZW1vdGVTZXNzaW9uIiwidXNlRGlyZWN0Q29ubmVjdCIsIkRpcmVjdENvbm5lY3RDb25maWciLCJ1c2VTU0hTZXNzaW9uIiwidXNlQXNzaXN0YW50SGlzdG9yeSIsIlNTSFNlc3Npb24iLCJTa2lsbEltcHJvdmVtZW50U3VydmV5IiwidXNlU2tpbGxJbXByb3ZlbWVudFN1cnZleSIsInVzZU1vcmVSaWdodCIsIlNwaW5uZXJXaXRoVmVyYiIsIkJyaWVmSWRsZVN0YXR1cyIsIlNwaW5uZXJNb2RlIiwiZ2V0U3lzdGVtUHJvbXB0IiwiYnVpbGRFZmZlY3RpdmVTeXN0ZW1Qcm9tcHQiLCJnZXRTeXN0ZW1Db250ZXh0IiwiZ2V0VXNlckNvbnRleHQiLCJnZXRNZW1vcnlGaWxlcyIsInN0YXJ0QmFja2dyb3VuZEhvdXNla2VlcGluZyIsImdldFRvdGFsQ29zdCIsInNhdmVDdXJyZW50U2Vzc2lvbkNvc3RzIiwicmVzZXRDb3N0U3RhdGUiLCJnZXRTdG9yZWRTZXNzaW9uQ29zdHMiLCJ1c2VDb3N0U3VtbWFyeSIsInVzZUZwc01ldHJpY3MiLCJ1c2VBZnRlckZpcnN0UmVuZGVyIiwidXNlRGVmZXJyZWRIb29rTWVzc2FnZXMiLCJhZGRUb0hpc3RvcnkiLCJyZW1vdmVMYXN0RnJvbUhpc3RvcnkiLCJleHBhbmRQYXN0ZWRUZXh0UmVmcyIsInBhcnNlUmVmZXJlbmNlcyIsInByZXBlbmRNb2RlQ2hhcmFjdGVyVG9JbnB1dCIsInByZXBlbmRUb1NoZWxsSGlzdG9yeUNhY2hlIiwidXNlQXBpS2V5VmVyaWZpY2F0aW9uIiwiR2xvYmFsS2V5YmluZGluZ0hhbmRsZXJzIiwiQ29tbWFuZEtleWJpbmRpbmdIYW5kbGVycyIsIktleWJpbmRpbmdTZXR1cCIsInVzZVNob3J0Y3V0RGlzcGxheSIsImdldFNob3J0Y3V0RGlzcGxheSIsIkNhbmNlbFJlcXVlc3RIYW5kbGVyIiwidXNlQmFja2dyb3VuZFRhc2tOYXZpZ2F0aW9uIiwidXNlU3dhcm1Jbml0aWFsaXphdGlvbiIsInVzZVRlYW1tYXRlVmlld0F1dG9FeGl0IiwiZXJyb3JNZXNzYWdlIiwiaXNIdW1hblR1cm4iLCJsb2dFcnJvciIsInVzZVZvaWNlSW50ZWdyYXRpb24iLCJyZXF1aXJlIiwic3RyaXBUcmFpbGluZyIsImhhbmRsZUtleUV2ZW50IiwicmVzZXRBbmNob3IiLCJWb2ljZUtleWJpbmRpbmdIYW5kbGVyIiwidXNlRnJ1c3RyYXRpb25EZXRlY3Rpb24iLCJzdGF0ZSIsImhhbmRsZVRyYW5zY3JpcHRTZWxlY3QiLCJ1c2VBbnRPcmdXYXJuaW5nTm90aWZpY2F0aW9uIiwiZ2V0Q29vcmRpbmF0b3JVc2VyQ29udGV4dCIsIm1jcENsaWVudHMiLCJSZWFkb25seUFycmF5IiwibmFtZSIsInNjcmF0Y2hwYWREaXIiLCJrIiwidXNlQ2FuVXNlVG9vbCIsIlRvb2xQZXJtaXNzaW9uQ29udGV4dCIsIlRvb2wiLCJhcHBseVBlcm1pc3Npb25VcGRhdGUiLCJhcHBseVBlcm1pc3Npb25VcGRhdGVzIiwicGVyc2lzdFBlcm1pc3Npb25VcGRhdGUiLCJidWlsZFBlcm1pc3Npb25VcGRhdGVzIiwic3RyaXBEYW5nZXJvdXNQZXJtaXNzaW9uc0ZvckF1dG9Nb2RlIiwiZ2V0U2NyYXRjaHBhZERpciIsImlzU2NyYXRjaHBhZEVuYWJsZWQiLCJXRUJfRkVUQ0hfVE9PTF9OQU1FIiwiU0xFRVBfVE9PTF9OQU1FIiwiY2xlYXJTcGVjdWxhdGl2ZUNoZWNrcyIsIkF1dG9VcGRhdGVyUmVzdWx0IiwiZ2V0R2xvYmFsQ29uZmlnIiwic2F2ZUdsb2JhbENvbmZpZyIsImdldEdsb2JhbENvbmZpZ1dyaXRlQ291bnQiLCJoYXNDb25zb2xlQmlsbGluZ0FjY2VzcyIsImxvZ0V2ZW50IiwiQW5hbHl0aWNzTWV0YWRhdGFfSV9WRVJJRklFRF9USElTX0lTX05PVF9DT0RFX09SX0ZJTEVQQVRIUyIsImdldEZlYXR1cmVWYWx1ZV9DQUNIRURfTUFZX0JFX1NUQUxFIiwidGV4dEZvclJlc3VibWl0IiwiaGFuZGxlTWVzc2FnZUZyb21TdHJlYW0iLCJTdHJlYW1pbmdUb29sVXNlIiwiU3RyZWFtaW5nVGhpbmtpbmciLCJpc0NvbXBhY3RCb3VuZGFyeU1lc3NhZ2UiLCJnZXRNZXNzYWdlc0FmdGVyQ29tcGFjdEJvdW5kYXJ5IiwiZ2V0Q29udGVudFRleHQiLCJjcmVhdGVVc2VyTWVzc2FnZSIsImNyZWF0ZUFzc2lzdGFudE1lc3NhZ2UiLCJjcmVhdGVUdXJuRHVyYXRpb25NZXNzYWdlIiwiY3JlYXRlQWdlbnRzS2lsbGVkTWVzc2FnZSIsImNyZWF0ZUFwaU1ldHJpY3NNZXNzYWdlIiwiY3JlYXRlU3lzdGVtTWVzc2FnZSIsImNyZWF0ZUNvbW1hbmRJbnB1dE1lc3NhZ2UiLCJmb3JtYXRDb21tYW5kSW5wdXRUYWdzIiwiZ2VuZXJhdGVTZXNzaW9uVGl0bGUiLCJCQVNIX0lOUFVUX1RBRyIsIkNPTU1BTkRfTUVTU0FHRV9UQUciLCJDT01NQU5EX05BTUVfVEFHIiwiTE9DQUxfQ09NTUFORF9TVERPVVRfVEFHIiwiZXNjYXBlWG1sIiwiVGhpbmtpbmdDb25maWciLCJncmFjZWZ1bFNodXRkb3duU3luYyIsImhhbmRsZVByb21wdFN1Ym1pdCIsIlByb21wdElucHV0SGVscGVycyIsInVzZVF1ZXVlUHJvY2Vzc29yIiwidXNlTWFpbGJveEJyaWRnZSIsInF1ZXJ5Q2hlY2twb2ludCIsImxvZ1F1ZXJ5UHJvZmlsZVJlcG9ydCIsInF1ZXJ5IiwibWVyZ2VDbGllbnRzIiwidXNlTWVyZ2VkQ2xpZW50cyIsImdldFF1ZXJ5U291cmNlRm9yUkVQTCIsInVzZU1lcmdlZFRvb2xzIiwibWVyZ2VBbmRGaWx0ZXJUb29scyIsInVzZU1lcmdlZENvbW1hbmRzIiwidXNlU2tpbGxzQ2hhbmdlIiwidXNlTWFuYWdlUGx1Z2lucyIsIk1lc3NhZ2VzIiwiVGFza0xpc3RWMiIsIlRlYW1tYXRlVmlld0hlYWRlciIsInVzZVRhc2tzVjJXaXRoQ29sbGFwc2VFZmZlY3QiLCJtYXliZU1hcmtQcm9qZWN0T25ib2FyZGluZ0NvbXBsZXRlIiwiTUNQU2VydmVyQ29ubmVjdGlvbiIsIlNjb3BlZE1jcFNlcnZlckNvbmZpZyIsInJhbmRvbVVVSUQiLCJVVUlEIiwicHJvY2Vzc1Nlc3Npb25TdGFydEhvb2tzIiwiZXhlY3V0ZVNlc3Npb25FbmRIb29rcyIsImdldFNlc3Npb25FbmRIb29rVGltZW91dE1zIiwiSURFU2VsZWN0aW9uIiwidXNlSWRlU2VsZWN0aW9uIiwiZ2V0VG9vbHMiLCJhc3NlbWJsZVRvb2xQb29sIiwiQWdlbnREZWZpbml0aW9uIiwicmVzb2x2ZUFnZW50VG9vbHMiLCJyZXN1bWVBZ2VudEJhY2tncm91bmQiLCJ1c2VNYWluTG9vcE1vZGVsIiwidXNlQXBwU3RhdGUiLCJ1c2VTZXRBcHBTdGF0ZSIsInVzZUFwcFN0YXRlU3RvcmUiLCJDb250ZW50QmxvY2tQYXJhbSIsIkltYWdlQmxvY2tQYXJhbSIsIlByb2Nlc3NVc2VySW5wdXRDb250ZXh0IiwiUGFzdGVkQ29udGVudCIsImNvcHlQbGFuRm9yRm9yayIsImNvcHlQbGFuRm9yUmVzdW1lIiwiZ2V0UGxhblNsdWciLCJzZXRQbGFuU2x1ZyIsImNsZWFyU2Vzc2lvbk1ldGFkYXRhIiwicmVzZXRTZXNzaW9uRmlsZVBvaW50ZXIiLCJhZG9wdFJlc3VtZWRTZXNzaW9uRmlsZSIsInJlbW92ZVRyYW5zY3JpcHRNZXNzYWdlIiwicmVzdG9yZVNlc3Npb25NZXRhZGF0YSIsImdldEN1cnJlbnRTZXNzaW9uVGl0bGUiLCJpc0VwaGVtZXJhbFRvb2xQcm9ncmVzcyIsImlzTG9nZ2FibGVNZXNzYWdlIiwic2F2ZVdvcmt0cmVlU3RhdGUiLCJnZXRBZ2VudFRyYW5zY3JpcHQiLCJkZXNlcmlhbGl6ZU1lc3NhZ2VzIiwiZXh0cmFjdFJlYWRGaWxlc0Zyb21NZXNzYWdlcyIsImV4dHJhY3RCYXNoVG9vbHNGcm9tTWVzc2FnZXMiLCJyZXNldE1pY3JvY29tcGFjdFN0YXRlIiwicnVuUG9zdENvbXBhY3RDbGVhbnVwIiwicHJvdmlzaW9uQ29udGVudFJlcGxhY2VtZW50U3RhdGUiLCJyZWNvbnN0cnVjdENvbnRlbnRSZXBsYWNlbWVudFN0YXRlIiwiQ29udGVudFJlcGxhY2VtZW50UmVjb3JkIiwicGFydGlhbENvbXBhY3RDb252ZXJzYXRpb24iLCJMb2dPcHRpb24iLCJBZ2VudENvbG9yTmFtZSIsImZpbGVIaXN0b3J5TWFrZVNuYXBzaG90IiwiRmlsZUhpc3RvcnlTdGF0ZSIsImZpbGVIaXN0b3J5UmV3aW5kIiwiRmlsZUhpc3RvcnlTbmFwc2hvdCIsImNvcHlGaWxlSGlzdG9yeUZvclJlc3VtZSIsImZpbGVIaXN0b3J5RW5hYmxlZCIsImZpbGVIaXN0b3J5SGFzQW55Q2hhbmdlcyIsIkF0dHJpYnV0aW9uU3RhdGUiLCJpbmNyZW1lbnRQcm9tcHRDb3VudCIsInJlY29yZEF0dHJpYnV0aW9uU25hcHNob3QiLCJjb21wdXRlU3RhbmRhbG9uZUFnZW50Q29udGV4dCIsInJlc3RvcmVBZ2VudEZyb21TZXNzaW9uIiwicmVzdG9yZVNlc3Npb25TdGF0ZUZyb21Mb2ciLCJyZXN0b3JlV29ya3RyZWVGb3JSZXN1bWUiLCJleGl0UmVzdG9yZWRXb3JrdHJlZSIsImlzQmdTZXNzaW9uIiwidXBkYXRlU2Vzc2lvbk5hbWUiLCJ1cGRhdGVTZXNzaW9uQWN0aXZpdHkiLCJpc0luUHJvY2Vzc1RlYW1tYXRlVGFzayIsIkluUHJvY2Vzc1RlYW1tYXRlVGFza1N0YXRlIiwicmVzdG9yZVJlbW90ZUFnZW50VGFza3MiLCJ1c2VJbmJveFBvbGxlciIsInByb2FjdGl2ZU1vZHVsZSIsIlBST0FDVElWRV9OT19PUF9TVUJTQ1JJQkUiLCJfY2IiLCJQUk9BQ1RJVkVfRkFMU0UiLCJTVUdHRVNUX0JHX1BSX05PT1AiLCJfcCIsIl9uIiwidXNlUHJvYWN0aXZlIiwidXNlU2NoZWR1bGVkVGFza3MiLCJpc0FnZW50U3dhcm1zRW5hYmxlZCIsInVzZVRhc2tMaXN0V2F0Y2hlciIsIlNhbmRib3hBc2tDYWxsYmFjayIsIk5ldHdvcmtIb3N0UGF0dGVybiIsIklERUV4dGVuc2lvbkluc3RhbGxhdGlvblN0YXR1cyIsImNsb3NlT3BlbkRpZmZzIiwiZ2V0Q29ubmVjdGVkSWRlQ2xpZW50IiwiSWRlVHlwZSIsInVzZUlERUludGVncmF0aW9uIiwiZXhpdCIsIkV4aXRGbG93IiwiZ2V0Q3VycmVudFdvcmt0cmVlU2Vzc2lvbiIsInBvcEFsbEVkaXRhYmxlIiwiZW5xdWV1ZSIsIlNldEFwcFN0YXRlIiwiZ2V0Q29tbWFuZFF1ZXVlIiwiZ2V0Q29tbWFuZFF1ZXVlTGVuZ3RoIiwicmVtb3ZlQnlGaWx0ZXIiLCJ1c2VDb21tYW5kUXVldWUiLCJTZXNzaW9uQmFja2dyb3VuZEhpbnQiLCJzdGFydEJhY2tncm91bmRTZXNzaW9uIiwidXNlU2Vzc2lvbkJhY2tncm91bmRpbmciLCJkaWFnbm9zdGljVHJhY2tlciIsImhhbmRsZVNwZWN1bGF0aW9uQWNjZXB0IiwiQWN0aXZlU3BlY3VsYXRpb25TdGF0ZSIsIklkZU9uYm9hcmRpbmdEaWFsb2ciLCJFZmZvcnRDYWxsb3V0Iiwic2hvdWxkU2hvd0VmZm9ydENhbGxvdXQiLCJFZmZvcnRWYWx1ZSIsIlJlbW90ZUNhbGxvdXQiLCJBbnRNb2RlbFN3aXRjaENhbGxvdXQiLCJzaG91bGRTaG93QW50TW9kZWxTd2l0Y2giLCJzaG91bGRTaG93TW9kZWxTd2l0Y2hDYWxsb3V0IiwiVW5kZXJjb3ZlckF1dG9DYWxsb3V0IiwiYWN0aXZpdHlNYW5hZ2VyIiwiY3JlYXRlQWJvcnRDb250cm9sbGVyIiwiTUNQQ29ubmVjdGlvbk1hbmFnZXIiLCJ1c2VGZWVkYmFja1N1cnZleSIsInVzZU1lbW9yeVN1cnZleSIsInVzZVBvc3RDb21wYWN0U3VydmV5IiwiRmVlZGJhY2tTdXJ2ZXkiLCJ1c2VJbnN0YWxsTWVzc2FnZXMiLCJ1c2VBd2F5U3VtbWFyeSIsInVzZUNocm9tZUV4dGVuc2lvbk5vdGlmaWNhdGlvbiIsInVzZU9mZmljaWFsTWFya2V0cGxhY2VOb3RpZmljYXRpb24iLCJ1c2VQcm9tcHRzRnJvbUNsYXVkZUluQ2hyb21lIiwiZ2V0VGlwVG9TaG93T25TcGlubmVyIiwicmVjb3JkU2hvd25UaXAiLCJUaGVtZSIsImNoZWNrQW5kRGlzYWJsZUJ5cGFzc1Blcm1pc3Npb25zSWZOZWVkZWQiLCJjaGVja0FuZERpc2FibGVBdXRvTW9kZUlmTmVlZGVkIiwidXNlS2lja09mZkNoZWNrQW5kRGlzYWJsZUJ5cGFzc1Blcm1pc3Npb25zSWZOZWVkZWQiLCJ1c2VLaWNrT2ZmQ2hlY2tBbmREaXNhYmxlQXV0b01vZGVJZk5lZWRlZCIsIlNhbmRib3hNYW5hZ2VyIiwiU0FOREJPWF9ORVRXT1JLX0FDQ0VTU19UT09MX05BTUUiLCJ1c2VGaWxlSGlzdG9yeVNuYXBzaG90SW5pdCIsIlNhbmRib3hQZXJtaXNzaW9uUmVxdWVzdCIsIlNhbmRib3hWaW9sYXRpb25FeHBhbmRlZFZpZXciLCJ1c2VTZXR0aW5nc0Vycm9ycyIsInVzZU1jcENvbm5lY3Rpdml0eVN0YXR1cyIsInVzZUF1dG9Nb2RlVW5hdmFpbGFibGVOb3RpZmljYXRpb24iLCJBVVRPX01PREVfREVTQ1JJUFRJT04iLCJ1c2VMc3BJbml0aWFsaXphdGlvbk5vdGlmaWNhdGlvbiIsInVzZUxzcFBsdWdpblJlY29tbWVuZGF0aW9uIiwiTHNwUmVjb21tZW5kYXRpb25NZW51IiwidXNlQ2xhdWRlQ29kZUhpbnRSZWNvbW1lbmRhdGlvbiIsIlBsdWdpbkhpbnRNZW51IiwiRGVza3RvcFVwc2VsbFN0YXJ0dXAiLCJzaG91bGRTaG93RGVza3RvcFVwc2VsbFN0YXJ0dXAiLCJ1c2VQbHVnaW5JbnN0YWxsYXRpb25TdGF0dXMiLCJ1c2VQbHVnaW5BdXRvdXBkYXRlTm90aWZpY2F0aW9uIiwicGVyZm9ybVN0YXJ0dXBDaGVja3MiLCJVc2VyVGV4dE1lc3NhZ2UiLCJBd3NBdXRoU3RhdHVzQm94IiwidXNlUmF0ZUxpbWl0V2FybmluZ05vdGlmaWNhdGlvbiIsInVzZURlcHJlY2F0aW9uV2FybmluZ05vdGlmaWNhdGlvbiIsInVzZU5wbURlcHJlY2F0aW9uTm90aWZpY2F0aW9uIiwidXNlSURFU3RhdHVzSW5kaWNhdG9yIiwidXNlTW9kZWxNaWdyYXRpb25Ob3RpZmljYXRpb25zIiwidXNlQ2FuU3dpdGNoVG9FeGlzdGluZ1N1YnNjcmlwdGlvbiIsInVzZVRlYW1tYXRlTGlmZWN5Y2xlTm90aWZpY2F0aW9uIiwidXNlRmFzdE1vZGVOb3RpZmljYXRpb24iLCJBdXRvUnVuSXNzdWVOb3RpZmljYXRpb24iLCJzaG91bGRBdXRvUnVuSXNzdWUiLCJnZXRBdXRvUnVuSXNzdWVSZWFzb25UZXh0IiwiZ2V0QXV0b1J1bkNvbW1hbmQiLCJBdXRvUnVuSXNzdWVSZWFzb24iLCJIb29rUHJvZ3Jlc3MiLCJXZWJCcm93c2VyUGFuZWxNb2R1bGUiLCJJc3N1ZUZsYWdCYW5uZXIiLCJ1c2VJc3N1ZUZsYWdCYW5uZXIiLCJDb21wYW5pb25TcHJpdGUiLCJDb21wYW5pb25GbG9hdGluZ0J1YmJsZSIsIk1JTl9DT0xTX0ZPUl9GVUxMX1NQUklURSIsIkRldkJhciIsIlJlbW90ZVNlc3Npb25Db25maWciLCJSRU1PVEVfU0FGRV9DT01NQU5EUyIsIlJlbW90ZU1lc3NhZ2VDb250ZW50IiwiRnVsbHNjcmVlbkxheW91dCIsInVzZVVuc2VlbkRpdmlkZXIiLCJjb21wdXRlVW5zZWVuRGl2aWRlciIsImlzRnVsbHNjcmVlbkVudkVuYWJsZWQiLCJtYXliZUdldFRtdXhNb3VzZUhpbnQiLCJpc01vdXNlVHJhY2tpbmdFbmFibGVkIiwiQWx0ZXJuYXRlU2NyZWVuIiwiU2Nyb2xsS2V5YmluZGluZ0hhbmRsZXIiLCJ1c2VNZXNzYWdlQWN0aW9ucyIsIk1lc3NhZ2VBY3Rpb25zS2V5YmluZGluZ3MiLCJNZXNzYWdlQWN0aW9uc0JhciIsIk1lc3NhZ2VBY3Rpb25zU3RhdGUiLCJNZXNzYWdlQWN0aW9uc05hdiIsIk1lc3NhZ2VBY3Rpb25DYXBzIiwic2V0Q2xpcGJvYXJkIiwiU2Nyb2xsQm94SGFuZGxlIiwiY3JlYXRlQXR0YWNobWVudE1lc3NhZ2UiLCJnZXRRdWV1ZWRDb21tYW5kQXR0YWNobWVudHMiLCJFTVBUWV9NQ1BfQ0xJRU5UUyIsIkhJU1RPUllfU1RVQiIsIm1heWJlTG9hZE9sZGVyIiwiXyIsIlJFQ0VOVF9TQ1JPTExfUkVQSU5fV0lORE9XX01TIiwibWVkaWFuIiwidmFsdWVzIiwic29ydGVkIiwic29ydCIsImEiLCJiIiwibWlkIiwiTWF0aCIsImZsb29yIiwibGVuZ3RoIiwicm91bmQiLCJUcmFuc2NyaXB0TW9kZUZvb3RlciIsInQwIiwiJCIsIl9jIiwic2hvd0FsbEluVHJhbnNjcmlwdCIsInZpcnR1YWxTY3JvbGwiLCJzZWFyY2hCYWRnZSIsInN1cHByZXNzU2hvd0FsbCIsInQxIiwic3RhdHVzIiwidW5kZWZpbmVkIiwidG9nZ2xlU2hvcnRjdXQiLCJzaG93QWxsU2hvcnRjdXQiLCJ0MiIsImFycm93VXAiLCJhcnJvd0Rvd24iLCJ0MyIsInQ0IiwiY3VycmVudCIsInQ1IiwiVHJhbnNjcmlwdFNlYXJjaEJhciIsImp1bXBSZWYiLCJvbkNsb3NlIiwib25DYW5jZWwiLCJzZXRIaWdobGlnaHQiLCJpbml0aWFsUXVlcnkiLCJsYXN0UXVlcnkiLCJSZWFjdE5vZGUiLCJjdXJzb3JPZmZzZXQiLCJpc0FjdGl2ZSIsIm9uRXhpdCIsImluZGV4U3RhdHVzIiwic2V0SW5kZXhTdGF0dXMiLCJtcyIsImFsaXZlIiwid2FybSIsIndhcm1TZWFyY2hJbmRleCIsInRoZW4iLCJzZXRUaW1lb3V0Iiwid2FybURvbmUiLCJzZXRTZWFyY2hRdWVyeSIsIm9mZiIsImN1cnNvckNoYXIiLCJzbGljZSIsIlRJVExFX0FOSU1BVElPTl9GUkFNRVMiLCJUSVRMRV9TVEFUSUNfUFJFRklYIiwiVElUTEVfQU5JTUFUSU9OX0lOVEVSVkFMX01TIiwiQW5pbWF0ZWRUZXJtaW5hbFRpdGxlIiwiaXNBbmltYXRpbmciLCJ0aXRsZSIsImRpc2FibGVkIiwibm9QcmVmaXgiLCJ0ZXJtaW5hbEZvY3VzZWQiLCJmcmFtZSIsInNldEZyYW1lIiwiaW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsIl90ZW1wMiIsImNsZWFySW50ZXJ2YWwiLCJwcmVmaXgiLCJzZXRGcmFtZV8wIiwiX3RlbXAiLCJmIiwiUHJvcHMiLCJjb21tYW5kcyIsImRlYnVnIiwiaW5pdGlhbFRvb2xzIiwiaW5pdGlhbE1lc3NhZ2VzIiwiTWVzc2FnZVR5cGUiLCJwZW5kaW5nSG9va01lc3NhZ2VzIiwiUHJvbWlzZSIsIkhvb2tSZXN1bHRNZXNzYWdlIiwiaW5pdGlhbEZpbGVIaXN0b3J5U25hcHNob3RzIiwiaW5pdGlhbENvbnRlbnRSZXBsYWNlbWVudHMiLCJpbml0aWFsQWdlbnROYW1lIiwiaW5pdGlhbEFnZW50Q29sb3IiLCJkeW5hbWljTWNwQ29uZmlnIiwiUmVjb3JkIiwiYXV0b0Nvbm5lY3RJZGVGbGFnIiwic3RyaWN0TWNwQ29uZmlnIiwic3lzdGVtUHJvbXB0IiwiYXBwZW5kU3lzdGVtUHJvbXB0Iiwib25CZWZvcmVRdWVyeSIsImlucHV0IiwibmV3TWVzc2FnZXMiLCJvblR1cm5Db21wbGV0ZSIsIm1lc3NhZ2VzIiwibWFpblRocmVhZEFnZW50RGVmaW5pdGlvbiIsImRpc2FibGVTbGFzaENvbW1hbmRzIiwidGFza0xpc3RJZCIsInJlbW90ZVNlc3Npb25Db25maWciLCJkaXJlY3RDb25uZWN0Q29uZmlnIiwic3NoU2Vzc2lvbiIsInRoaW5raW5nQ29uZmlnIiwiU2NyZWVuIiwiUkVQTCIsImluaXRpYWxDb21tYW5kcyIsImluaXRpYWxNY3BDbGllbnRzIiwiaW5pdGlhbER5bmFtaWNNY3BDb25maWciLCJjdXN0b21TeXN0ZW1Qcm9tcHQiLCJpbml0aWFsTWFpblRocmVhZEFnZW50RGVmaW5pdGlvbiIsImlzUmVtb3RlU2Vzc2lvbiIsInRpdGxlRGlzYWJsZWQiLCJwcm9jZXNzIiwiZW52IiwiQ0xBVURFX0NPREVfRElTQUJMRV9URVJNSU5BTF9USVRMRSIsIm1vcmVSaWdodEVuYWJsZWQiLCJDTEFVREVfTU9SRVJJR0hUIiwiZGlzYWJsZVZpcnR1YWxTY3JvbGwiLCJDTEFVREVfQ09ERV9ESVNBQkxFX1ZJUlRVQUxfU0NST0xMIiwiZGlzYWJsZU1lc3NhZ2VBY3Rpb25zIiwiQ0xBVURFX0NPREVfRElTQUJMRV9NRVNTQUdFX0FDVElPTlMiLCJzZXRNYWluVGhyZWFkQWdlbnREZWZpbml0aW9uIiwidG9vbFBlcm1pc3Npb25Db250ZXh0IiwicyIsInZlcmJvc2UiLCJtY3AiLCJwbHVnaW5zIiwiYWdlbnREZWZpbml0aW9ucyIsImZpbGVIaXN0b3J5IiwiaW5pdGlhbE1lc3NhZ2UiLCJxdWV1ZWRDb21tYW5kcyIsInNwaW5uZXJUaXAiLCJzaG93RXhwYW5kZWRUb2RvcyIsImV4cGFuZGVkVmlldyIsInBlbmRpbmdXb3JrZXJSZXF1ZXN0IiwicGVuZGluZ1NhbmRib3hSZXF1ZXN0IiwidGVhbUNvbnRleHQiLCJ0YXNrcyIsIndvcmtlclNhbmRib3hQZXJtaXNzaW9ucyIsImVsaWNpdGF0aW9uIiwidWx0cmFwbGFuUGVuZGluZ0Nob2ljZSIsInVsdHJhcGxhbkxhdW5jaFBlbmRpbmciLCJ2aWV3aW5nQWdlbnRUYXNrSWQiLCJzZXRBcHBTdGF0ZSIsInZpZXdlZExvY2FsQWdlbnQiLCJuZWVkc0Jvb3RzdHJhcCIsInJldGFpbiIsImRpc2tMb2FkZWQiLCJ0YXNrSWQiLCJyZXN1bHQiLCJwcmV2IiwidCIsImxpdmUiLCJsaXZlVXVpZHMiLCJTZXQiLCJtYXAiLCJtIiwidXVpZCIsImRpc2tPbmx5IiwiZmlsdGVyIiwiaGFzIiwic3RvcmUiLCJ0ZXJtaW5hbCIsIm1haW5Mb29wTW9kZWwiLCJsb2NhbENvbW1hbmRzIiwic2V0TG9jYWxDb21tYW5kcyIsInByb2FjdGl2ZUFjdGl2ZSIsInVzZVN5bmNFeHRlcm5hbFN0b3JlIiwic3Vic2NyaWJlVG9Qcm9hY3RpdmVDaGFuZ2VzIiwiaXNQcm9hY3RpdmVBY3RpdmUiLCJpc0JyaWVmT25seSIsImxvY2FsVG9vbHMiLCJzZXREeW5hbWljTWNwQ29uZmlnIiwib25DaGFuZ2VEeW5hbWljTWNwQ29uZmlnIiwiY29uZmlnIiwic2NyZWVuIiwic2V0U2NyZWVuIiwic2V0U2hvd0FsbEluVHJhbnNjcmlwdCIsImR1bXBNb2RlIiwic2V0RHVtcE1vZGUiLCJlZGl0b3JTdGF0dXMiLCJzZXRFZGl0b3JTdGF0dXMiLCJlZGl0b3JHZW5SZWYiLCJlZGl0b3JUaW1lclJlZiIsIlJldHVyblR5cGUiLCJlZGl0b3JSZW5kZXJpbmdSZWYiLCJhZGROb3RpZmljYXRpb24iLCJyZW1vdmVOb3RpZmljYXRpb24iLCJ0cnlTdWdnZXN0QmdQUkludGVyY2VwdCIsImNsaWVudHMiLCJpZGVTZWxlY3Rpb24iLCJzZXRJREVTZWxlY3Rpb24iLCJpZGVUb0luc3RhbGxFeHRlbnNpb24iLCJzZXRJREVUb0luc3RhbGxFeHRlbnNpb24iLCJpZGVJbnN0YWxsYXRpb25TdGF0dXMiLCJzZXRJREVJbnN0YWxsYXRpb25TdGF0dXMiLCJzaG93SWRlT25ib2FyZGluZyIsInNldFNob3dJZGVPbmJvYXJkaW5nIiwic2hvd01vZGVsU3dpdGNoQ2FsbG91dCIsInNldFNob3dNb2RlbFN3aXRjaENhbGxvdXQiLCJzaG93RWZmb3J0Q2FsbG91dCIsInNldFNob3dFZmZvcnRDYWxsb3V0Iiwic2hvd1JlbW90ZUNhbGxvdXQiLCJzaG93RGVza3RvcFVwc2VsbFN0YXJ0dXAiLCJzZXRTaG93RGVza3RvcFVwc2VsbFN0YXJ0dXAiLCJyZWNvbW1lbmRhdGlvbiIsImxzcFJlY29tbWVuZGF0aW9uIiwiaGFuZGxlUmVzcG9uc2UiLCJoYW5kbGVMc3BSZXNwb25zZSIsImhpbnRSZWNvbW1lbmRhdGlvbiIsImhhbmRsZUhpbnRSZXNwb25zZSIsImNvbWJpbmVkSW5pdGlhbFRvb2xzIiwiZW5hYmxlZCIsInRhc2tzVjIiLCJtb2RlIiwibWVyZ2VkVG9vbHMiLCJ0b29scyIsImFsbG93ZWRBZ2VudFR5cGVzIiwicmVzb2x2ZWQiLCJyZXNvbHZlZFRvb2xzIiwiY29tbWFuZHNXaXRoUGx1Z2lucyIsIm1lcmdlZENvbW1hbmRzIiwic3RyZWFtTW9kZSIsInNldFN0cmVhbU1vZGUiLCJzdHJlYW1Nb2RlUmVmIiwic3RyZWFtaW5nVG9vbFVzZXMiLCJzZXRTdHJlYW1pbmdUb29sVXNlcyIsInN0cmVhbWluZ1RoaW5raW5nIiwic2V0U3RyZWFtaW5nVGhpbmtpbmciLCJpc1N0cmVhbWluZyIsInN0cmVhbWluZ0VuZGVkQXQiLCJlbGFwc2VkIiwiRGF0ZSIsIm5vdyIsInJlbWFpbmluZyIsInRpbWVyIiwiY2xlYXJUaW1lb3V0IiwiYWJvcnRDb250cm9sbGVyIiwic2V0QWJvcnRDb250cm9sbGVyIiwiQWJvcnRDb250cm9sbGVyIiwiYWJvcnRDb250cm9sbGVyUmVmIiwic2VuZEJyaWRnZVJlc3VsdFJlZiIsInJlc3RvcmVNZXNzYWdlU3luY1JlZiIsIlVzZXJNZXNzYWdlIiwic2Nyb2xsUmVmIiwibW9kYWxTY3JvbGxSZWYiLCJsYXN0VXNlclNjcm9sbFRzUmVmIiwicXVlcnlHdWFyZCIsImlzUXVlcnlBY3RpdmUiLCJzdWJzY3JpYmUiLCJnZXRTbmFwc2hvdCIsImlzRXh0ZXJuYWxMb2FkaW5nIiwic2V0SXNFeHRlcm5hbExvYWRpbmdSYXciLCJoYXNJbml0aWFsUHJvbXB0IiwiaXNMb2FkaW5nIiwidXNlcklucHV0T25Qcm9jZXNzaW5nIiwic2V0VXNlcklucHV0T25Qcm9jZXNzaW5nUmF3IiwidXNlcklucHV0QmFzZWxpbmVSZWYiLCJ1c2VyTWVzc2FnZVBlbmRpbmdSZWYiLCJsb2FkaW5nU3RhcnRUaW1lUmVmIiwidG90YWxQYXVzZWRNc1JlZiIsInBhdXNlU3RhcnRUaW1lUmVmIiwicmVzZXRUaW1pbmdSZWZzIiwid2FzUXVlcnlBY3RpdmVSZWYiLCJzZXRJc0V4dGVybmFsTG9hZGluZyIsInZhbHVlIiwic3dhcm1TdGFydFRpbWVSZWYiLCJzd2FybUJ1ZGdldEluZm9SZWYiLCJ0b2tlbnMiLCJsaW1pdCIsIm51ZGdlcyIsImZvY3VzZWRJbnB1dERpYWxvZ1JlZiIsImdldEZvY3VzZWRJbnB1dERpYWxvZyIsIlBST01QVF9TVVBQUkVTU0lPTl9NUyIsImlzUHJvbXB0SW5wdXRBY3RpdmUiLCJzZXRJc1Byb21wdElucHV0QWN0aXZlIiwiYXV0b1VwZGF0ZXJSZXN1bHQiLCJzZXRBdXRvVXBkYXRlclJlc3VsdCIsIm5vdGlmaWNhdGlvbnMiLCJmb3JFYWNoIiwibm90aWZpY2F0aW9uIiwia2V5IiwidGV4dCIsInByaW9yaXR5IiwiaGludCIsInNob3dVbmRlcmNvdmVyQ2FsbG91dCIsInNldFNob3dVbmRlcmNvdmVyQ2FsbG91dCIsImlzSW50ZXJuYWxNb2RlbFJlcG8iLCJzaG91bGRTaG93VW5kZXJjb3ZlckF1dG9Ob3RpY2UiLCJ0b29sSlNYIiwic2V0VG9vbEpTWEludGVybmFsIiwianN4Iiwic2hvdWxkSGlkZVByb21wdElucHV0Iiwic2hvdWxkQ29udGludWVBbmltYXRpb24iLCJzaG93U3Bpbm5lciIsImlzTG9jYWxKU1hDb21tYW5kIiwiaXNJbW1lZGlhdGUiLCJsb2NhbEpTWENvbW1hbmRSZWYiLCJzZXRUb29sSlNYIiwiYXJncyIsImNsZWFyTG9jYWxKU1giLCJyZXN0IiwidG9vbFVzZUNvbmZpcm1RdWV1ZSIsInNldFRvb2xVc2VDb25maXJtUXVldWUiLCJwZXJtaXNzaW9uU3RpY2t5Rm9vdGVyIiwic2V0UGVybWlzc2lvblN0aWNreUZvb3RlciIsInNhbmRib3hQZXJtaXNzaW9uUmVxdWVzdFF1ZXVlIiwic2V0U2FuZGJveFBlcm1pc3Npb25SZXF1ZXN0UXVldWUiLCJBcnJheSIsImhvc3RQYXR0ZXJuIiwicmVzb2x2ZVByb21pc2UiLCJhbGxvd0Nvbm5lY3Rpb24iLCJwcm9tcHRRdWV1ZSIsInNldFByb21wdFF1ZXVlIiwicmVxdWVzdCIsInRvb2xJbnB1dFN1bW1hcnkiLCJyZXNvbHZlIiwicmVzcG9uc2UiLCJyZWplY3QiLCJlcnJvciIsIkVycm9yIiwic2FuZGJveEJyaWRnZUNsZWFudXBSZWYiLCJNYXAiLCJ0ZXJtaW5hbFRpdGxlRnJvbVJlbmFtZSIsInNldHRpbmdzIiwic2Vzc2lvblRpdGxlIiwiaGFpa3VUaXRsZSIsInNldEhhaWt1VGl0bGUiLCJoYWlrdVRpdGxlQXR0ZW1wdGVkUmVmIiwiYWdlbnRUaXRsZSIsImFnZW50VHlwZSIsInRlcm1pbmFsVGl0bGUiLCJpc1dhaXRpbmdGb3JBcHByb3ZhbCIsImlzU2hvd2luZ0xvY2FsSlNYQ29tbWFuZCIsInRpdGxlSXNBbmltYXRpbmciLCJzZXNzaW9uU3RhdHVzIiwid2FpdGluZ0ZvciIsInRvb2wiLCJ0YWJTdGF0dXNHYXRlRW5hYmxlZCIsInNob3dTdGF0dXNJblRlcm1pbmFsVGFiIiwicmF3U2V0TWVzc2FnZXMiLCJtZXNzYWdlc1JlZiIsImlkbGVIaW50U2hvd25SZWYiLCJzZXRNZXNzYWdlcyIsImFjdGlvbiIsIlNldFN0YXRlQWN0aW9uIiwibmV4dCIsImRlbHRhIiwiYWRkZWQiLCJzb21lIiwic2V0VXNlcklucHV0T25Qcm9jZXNzaW5nIiwiZGl2aWRlckluZGV4IiwiZGl2aWRlcllSZWYiLCJvblNjcm9sbEF3YXkiLCJvblJlcGluIiwianVtcFRvTmV3Iiwic2hpZnREaXZpZGVyIiwiY3Vyc29yIiwic2V0Q3Vyc29yIiwiY3Vyc29yTmF2UmVmIiwidW5zZWVuRGl2aWRlciIsInJlcGluU2Nyb2xsIiwic2Nyb2xsVG9Cb3R0b20iLCJsYXN0TXNnIiwiYXQiLCJsYXN0TXNnSXNIdW1hbiIsIm9uUHJlcGVuZCIsImNvbXBvc2VkT25TY3JvbGwiLCJzdGlja3kiLCJoYW5kbGUiLCJjb21wYW5pb25SZWFjdGlvbiIsImF3YWl0UGVuZGluZ0hvb2tzIiwiZGVmZXJyZWRNZXNzYWdlcyIsImRlZmVycmVkQmVoaW5kIiwiZnJvemVuVHJhbnNjcmlwdFN0YXRlIiwic2V0RnJvemVuVHJhbnNjcmlwdFN0YXRlIiwibWVzc2FnZXNMZW5ndGgiLCJzdHJlYW1pbmdUb29sVXNlc0xlbmd0aCIsImlucHV0VmFsdWUiLCJzZXRJbnB1dFZhbHVlUmF3IiwiaW5wdXRWYWx1ZVJlZiIsImluc2VydFRleHRSZWYiLCJpbnNlcnQiLCJzZXRJbnB1dFdpdGhDdXJzb3IiLCJzZXRJbnB1dFZhbHVlIiwidHJpbSIsImlucHV0TW9kZSIsInNldElucHV0TW9kZSIsInN0YXNoZWRQcm9tcHQiLCJzZXRTdGFzaGVkUHJvbXB0IiwicGFzdGVkQ29udGVudHMiLCJoYW5kbGVSZW1vdGVJbml0IiwicmVtb3RlU2xhc2hDb21tYW5kcyIsInJlbW90ZUNvbW1hbmRTZXQiLCJjbWQiLCJpblByb2dyZXNzVG9vbFVzZUlEcyIsInNldEluUHJvZ3Jlc3NUb29sVXNlSURzIiwiaGFzSW50ZXJydXB0aWJsZVRvb2xJblByb2dyZXNzUmVmIiwicmVtb3RlU2Vzc2lvbiIsInNldElzTG9hZGluZyIsIm9uSW5pdCIsImRpcmVjdENvbm5lY3QiLCJzc2hSZW1vdGUiLCJzZXNzaW9uIiwiYWN0aXZlUmVtb3RlIiwiaXNSZW1vdGVNb2RlIiwic2V0UGFzdGVkQ29udGVudHMiLCJzdWJtaXRDb3VudCIsInNldFN1Ym1pdENvdW50IiwicmVzcG9uc2VMZW5ndGhSZWYiLCJhcGlNZXRyaWNzUmVmIiwidHRmdE1zIiwiZmlyc3RUb2tlblRpbWUiLCJsYXN0VG9rZW5UaW1lIiwicmVzcG9uc2VMZW5ndGhCYXNlbGluZSIsImVuZFJlc3BvbnNlTGVuZ3RoIiwic2V0UmVzcG9uc2VMZW5ndGgiLCJlbnRyaWVzIiwibGFzdEVudHJ5Iiwic3RyZWFtaW5nVGV4dCIsInNldFN0cmVhbWluZ1RleHQiLCJyZWR1Y2VkTW90aW9uIiwicHJlZmVyc1JlZHVjZWRNb3Rpb24iLCJzaG93U3RyZWFtaW5nVGV4dCIsIm9uU3RyZWFtaW5nVGV4dCIsInZpc2libGVTdHJlYW1pbmdUZXh0Iiwic3Vic3RyaW5nIiwibGFzdEluZGV4T2YiLCJsYXN0UXVlcnlDb21wbGV0aW9uVGltZSIsInNldExhc3RRdWVyeUNvbXBsZXRpb25UaW1lIiwic3Bpbm5lck1lc3NhZ2UiLCJzZXRTcGlubmVyTWVzc2FnZSIsInNwaW5uZXJDb2xvciIsInNldFNwaW5uZXJDb2xvciIsInNwaW5uZXJTaGltbWVyQ29sb3IiLCJzZXRTcGlubmVyU2hpbW1lckNvbG9yIiwiaXNNZXNzYWdlU2VsZWN0b3JWaXNpYmxlIiwic2V0SXNNZXNzYWdlU2VsZWN0b3JWaXNpYmxlIiwibWVzc2FnZVNlbGVjdG9yUHJlc2VsZWN0Iiwic2V0TWVzc2FnZVNlbGVjdG9yUHJlc2VsZWN0Iiwic2hvd0Nvc3REaWFsb2ciLCJzZXRTaG93Q29zdERpYWxvZyIsImNvbnZlcnNhdGlvbklkIiwic2V0Q29udmVyc2F0aW9uSWQiLCJpZGxlUmV0dXJuUGVuZGluZyIsInNldElkbGVSZXR1cm5QZW5kaW5nIiwiaWRsZU1pbnV0ZXMiLCJza2lwSWRsZUNoZWNrUmVmIiwibGFzdFF1ZXJ5Q29tcGxldGlvblRpbWVSZWYiLCJjb250ZW50UmVwbGFjZW1lbnRTdGF0ZVJlZiIsImhhdmVTaG93bkNvc3REaWFsb2ciLCJzZXRIYXZlU2hvd25Db3N0RGlhbG9nIiwiaGFzQWNrbm93bGVkZ2VkQ29zdFRocmVzaG9sZCIsInZpbU1vZGUiLCJzZXRWaW1Nb2RlIiwic2hvd0Jhc2hlc0RpYWxvZyIsInNldFNob3dCYXNoZXNEaWFsb2ciLCJpc1NlYXJjaGluZ0hpc3RvcnkiLCJzZXRJc1NlYXJjaGluZ0hpc3RvcnkiLCJpc0hlbHBPcGVuIiwic2V0SXNIZWxwT3BlbiIsImlzVGVybWluYWxGb2N1c2VkIiwidGVybWluYWxGb2N1c1JlZiIsInRoZW1lIiwidGlwUGlja2VkVGhpc1R1cm5SZWYiLCJwaWNrTmV3U3Bpbm5lclRpcCIsImJhc2hUb29sc1Byb2Nlc3NlZElkeCIsImJhc2hUb29scyIsImFkZCIsInJlYWRGaWxlU3RhdGUiLCJ0aXAiLCJjb250ZW50IiwicmVzZXRMb2FkaW5nU3RhdGUiLCJoYXNSdW5uaW5nVGVhbW1hdGVzIiwidG90YWxNcyIsImRlZmVycmVkQnVkZ2V0Iiwic2FmZVlvbG9NZXNzYWdlU2hvd25SZWYiLCJhdXRvUGVybWlzc2lvbnNOb3RpZmljYXRpb25Db3VudCIsInJlZiIsInByZXZDb3VudCIsIndvcmt0cmVlVGlwU2hvd25SZWYiLCJ3dCIsImNyZWF0aW9uRHVyYXRpb25NcyIsInVzZWRTcGFyc2VQYXRocyIsInNlY3MiLCJvbmx5U2xlZXBUb29sQWN0aXZlIiwibGFzdEFzc2lzdGFudCIsImZpbmRMYXN0IiwidHlwZSIsImluUHJvZ3Jlc3NUb29sVXNlcyIsIm1lc3NhZ2UiLCJpZCIsImV2ZXJ5IiwibXJPbkJlZm9yZVF1ZXJ5IiwibXJPblR1cm5Db21wbGV0ZSIsInJlbmRlciIsIm1yUmVuZGVyIiwiaGFzQWN0aXZlUHJvbXB0IiwicXVldWUiLCJmZWVkYmFja1N1cnZleU9yaWdpbmFsIiwic2tpbGxJbXByb3ZlbWVudFN1cnZleSIsInNob3dJc3N1ZUZsYWdCYW5uZXIiLCJmZWVkYmFja1N1cnZleSIsImhhbmRsZVNlbGVjdCIsInNlbGVjdGVkIiwiZGlkQXV0b1J1bklzc3VlUmVmIiwic2hvd2VkVHJhbnNjcmlwdFByb21wdCIsInNldEF1dG9SdW5Jc3N1ZVJlYXNvbiIsInBvc3RDb21wYWN0U3VydmV5IiwibWVtb3J5U3VydmV5IiwiZnJ1c3RyYXRpb25EZXRlY3Rpb24iLCJzZXRJREVJbnN0YWxsYXRpb25TdGF0ZSIsImZpbGVIaXN0b3J5U3RhdGUiLCJyZXN1bWUiLCJzZXNzaW9uSWQiLCJsb2ciLCJlbnRyeXBvaW50IiwicmVzdW1lU3RhcnQiLCJwZXJmb3JtYW5jZSIsImNvb3JkaW5hdG9yTW9kdWxlIiwid2FybmluZyIsIm1hdGNoU2Vzc2lvbk1vZGUiLCJnZXRBZ2VudERlZmluaXRpb25zV2l0aE92ZXJyaWRlcyIsImdldEFjdGl2ZUFnZW50c0Zyb21MaXN0IiwiY2FjaGUiLCJjbGVhciIsImZyZXNoQWdlbnREZWZzIiwiYWxsQWdlbnRzIiwiYWN0aXZlQWdlbnRzIiwicHVzaCIsInNlc3Npb25FbmRUaW1lb3V0TXMiLCJnZXRBcHBTdGF0ZSIsImdldFN0YXRlIiwic2lnbmFsIiwiQWJvcnRTaWduYWwiLCJ0aW1lb3V0IiwidGltZW91dE1zIiwiaG9va01lc3NhZ2VzIiwibW9kZWwiLCJmaWxlSGlzdG9yeVNuYXBzaG90cyIsImFnZW50RGVmaW5pdGlvbiIsInJlc3RvcmVkQWdlbnQiLCJhZ2VudFNldHRpbmciLCJhZ2VudCIsInN0YW5kYWxvbmVBZ2VudENvbnRleHQiLCJhZ2VudE5hbWUiLCJhZ2VudENvbG9yIiwicmVzdG9yZVJlYWRGaWxlU3RhdGUiLCJwcm9qZWN0UGF0aCIsInRhcmdldFNlc3Npb25Db3N0cyIsImZ1bGxQYXRoIiwicmVuYW1lUmVjb3JkaW5nRm9yU2Vzc2lvbiIsIndvcmt0cmVlU2Vzc2lvbiIsIndzIiwic2F2ZU1vZGUiLCJpc0Nvb3JkaW5hdG9yTW9kZSIsImNvbnRlbnRSZXBsYWNlbWVudHMiLCJzdWNjZXNzIiwicmVzdW1lX2R1cmF0aW9uX21zIiwiaW5pdGlhbFJlYWRGaWxlU3RhdGUiLCJkaXNjb3ZlcmVkU2tpbGxOYW1lc1JlZiIsImxvYWRlZE5lc3RlZE1lbW9yeVBhdGhzUmVmIiwiY3dkIiwiZXh0cmFjdGVkIiwiYXBpS2V5U3RhdHVzIiwicmV2ZXJpZnkiLCJhdXRvUnVuSXNzdWVSZWFzb24iLCJleGl0RmxvdyIsInNldEV4aXRGbG93IiwiaXNFeGl0aW5nIiwic2V0SXNFeGl0aW5nIiwic2hvd2luZ0Nvc3REaWFsb2ciLCJhbGxvd0RpYWxvZ3NXaXRoQW5pbWF0aW9uIiwiZm9jdXNlZElucHV0RGlhbG9nIiwiaGFzU3VwcHJlc3NlZERpYWxvZ3MiLCJpc1BhdXNlZCIsInByZXZEaWFsb2dSZWYiLCJ3YXMiLCJwYXVzZVByb2FjdGl2ZSIsImZvcmNlRW5kIiwib25BYm9ydCIsIml0ZW0iLCJhYm9ydCIsImNhbmNlbFJlcXVlc3QiLCJoYW5kbGVRdWV1ZWRDb21tYW5kT25DYW5jZWwiLCJpbWFnZXMiLCJuZXdDb250ZW50cyIsImltYWdlIiwiY2FuY2VsUmVxdWVzdFByb3BzIiwib25BZ2VudHNLaWxsZWQiLCJhYm9ydFNpZ25hbCIsInBvcENvbW1hbmRGcm9tUXVldWUiLCJ0b3RhbENvc3QiLCJzYW5kYm94QXNrQ2FsbGJhY2siLCJyZXF1ZXN0SWQiLCJzZW50IiwiaG9zdCIsInJlc29sdmVTaG91bGRBbGxvd0hvc3QiLCJyZXNvbHZlT25jZSIsImFsbG93IiwiYnJpZGdlQ2FsbGJhY2tzIiwicmVwbEJyaWRnZVBlcm1pc3Npb25DYWxsYmFja3MiLCJicmlkZ2VSZXF1ZXN0SWQiLCJzZW5kUmVxdWVzdCIsInVuc3Vic2NyaWJlIiwib25SZXNwb25zZSIsImJlaGF2aW9yIiwic2libGluZ0NsZWFudXBzIiwiZ2V0IiwiZm4iLCJkZWxldGUiLCJjbGVhbnVwIiwiZXhpc3RpbmciLCJzZXQiLCJyZWFzb24iLCJnZXRTYW5kYm94VW5hdmFpbGFibGVSZWFzb24iLCJpc1NhbmRib3hSZXF1aXJlZCIsInN0ZGVyciIsIndyaXRlIiwibGV2ZWwiLCJpc1NhbmRib3hpbmdFbmFibGVkIiwiaW5pdGlhbGl6ZSIsImNhdGNoIiwiZXJyIiwic2V0VG9vbFBlcm1pc3Npb25Db250ZXh0IiwiY29udGV4dCIsIm9wdGlvbnMiLCJwcmVzZXJ2ZU1vZGUiLCJzZXRJbW1lZGlhdGUiLCJjdXJyZW50UXVldWUiLCJyZWNoZWNrUGVybWlzc2lvbiIsImNhblVzZVRvb2wiLCJyZXF1ZXN0UHJvbXB0IiwiZ2V0VG9vbFVzZUNvbnRleHQiLCJjb21wdXRlVG9vbHMiLCJhc3NlbWJsZWQiLCJtZXJnZWQiLCJ0aGlua2luZ0VuYWJsZWQiLCJtY3BSZXNvdXJjZXMiLCJyZXNvdXJjZXMiLCJpc05vbkludGVyYWN0aXZlU2Vzc2lvbiIsInJlZnJlc2hUb29scyIsInVwZGF0ZUZpbGVIaXN0b3J5U3RhdGUiLCJ1cGRhdGVyIiwidXBkYXRlZCIsInVwZGF0ZUF0dHJpYnV0aW9uU3RhdGUiLCJhdHRyaWJ1dGlvbiIsIm9wZW5NZXNzYWdlU2VsZWN0b3IiLCJvbkNoYW5nZUFQSUtleSIsImFwcGVuZFN5c3RlbU1lc3NhZ2UiLCJtc2ciLCJzZW5kT1NOb3RpZmljYXRpb24iLCJvcHRzIiwib25JbnN0YWxsSURFRXh0ZW5zaW9uIiwibmVzdGVkTWVtb3J5QXR0YWNobWVudFRyaWdnZXJzIiwibG9hZGVkTmVzdGVkTWVtb3J5UGF0aHMiLCJkeW5hbWljU2tpbGxEaXJUcmlnZ2VycyIsImRpc2NvdmVyZWRTa2lsbE5hbWVzIiwicHVzaEFwaU1ldHJpY3NFbnRyeSIsImJhc2VsaW5lIiwib25Db21wYWN0UHJvZ3Jlc3MiLCJldmVudCIsImhvb2tUeXBlIiwic2V0SGFzSW50ZXJydXB0aWJsZVRvb2xJblByb2dyZXNzIiwidiIsImNvbnRlbnRSZXBsYWNlbWVudFN0YXRlIiwiaGFuZGxlQmFja2dyb3VuZFF1ZXJ5IiwicmVtb3ZlZE5vdGlmaWNhdGlvbnMiLCJ0b29sVXNlQ29udGV4dCIsImRlZmF1bHRTeXN0ZW1Qcm9tcHQiLCJ1c2VyQ29udGV4dCIsInN5c3RlbUNvbnRleHQiLCJhbGwiLCJmcm9tIiwiYWRkaXRpb25hbFdvcmtpbmdEaXJlY3RvcmllcyIsImtleXMiLCJyZW5kZXJlZFN5c3RlbVByb21wdCIsIm5vdGlmaWNhdGlvbkF0dGFjaG1lbnRzIiwibm90aWZpY2F0aW9uTWVzc2FnZXMiLCJleGlzdGluZ1Byb21wdHMiLCJhdHRhY2htZW50IiwiY29tbWFuZE1vZGUiLCJwcm9tcHQiLCJ1bmlxdWVOb3RpZmljYXRpb25zIiwicXVlcnlQYXJhbXMiLCJxdWVyeVNvdXJjZSIsImRlc2NyaXB0aW9uIiwiaGFuZGxlQmFja2dyb3VuZFNlc3Npb24iLCJvbkJhY2tncm91bmRRdWVyeSIsIm9uUXVlcnlFdmVudCIsIlBhcmFtZXRlcnMiLCJuZXdNZXNzYWdlIiwib2xkIiwiaW5jbHVkZVNuaXBwZWQiLCJzZXRDb250ZXh0QmxvY2tlZCIsImRhdGEiLCJvbGRNZXNzYWdlcyIsImxhc3QiLCJwYXJlbnRUb29sVXNlSUQiLCJjb3B5IiwiaXNBcGlFcnJvck1lc3NhZ2UiLCJuZXdDb250ZW50IiwidG9tYnN0b25lZE1lc3NhZ2UiLCJtZXRyaWNzIiwib25RdWVyeUltcGwiLCJtZXNzYWdlc0luY2x1ZGluZ05ld01lc3NhZ2VzIiwic2hvdWxkUXVlcnkiLCJhZGRpdGlvbmFsQWxsb3dlZFRvb2xzIiwibWFpbkxvb3BNb2RlbFBhcmFtIiwiZWZmb3J0IiwiZnJlc2hDbGllbnRzIiwiaGFuZGxlUXVlcnlTdGFydCIsImlkZUNsaWVudCIsImZpcnN0VXNlck1lc3NhZ2UiLCJmaW5kIiwiaXNNZXRhIiwic3RhcnRzV2l0aCIsInNldFN0YXRlIiwiY3VyIiwiYWx3YXlzQWxsb3dSdWxlcyIsImNvbW1hbmQiLCJpIiwiZnJlc2hUb29scyIsImZyZXNoTWNwQ2xpZW50cyIsInByZXZpb3VzR2V0QXBwU3RhdGUiLCJlZmZvcnRWYWx1ZSIsImJhc2VVc2VyQ29udGV4dCIsImZhc3RNb2RlIiwidGVybWluYWxGb2N1cyIsImZpcmVDb21wYW5pb25PYnNlcnZlciIsInJlYWN0aW9uIiwidHRmdHMiLCJlIiwib3Rwc1ZhbHVlcyIsInNhbXBsaW5nTXMiLCJpc011bHRpUmVxdWVzdCIsImhvb2tNcyIsImhvb2tDb3VudCIsInRvb2xNcyIsInRvb2xDb3VudCIsImNsYXNzaWZpZXJNcyIsImNsYXNzaWZpZXJDb3VudCIsInR1cm5NcyIsIm90cHMiLCJpc1A1MCIsImhvb2tEdXJhdGlvbk1zIiwidHVybkR1cmF0aW9uTXMiLCJ0b29sRHVyYXRpb25NcyIsImNsYXNzaWZpZXJEdXJhdGlvbk1zIiwiY29uZmlnV3JpdGVDb3VudCIsIm9uUXVlcnkiLCJvbkJlZm9yZVF1ZXJ5Q2FsbGJhY2siLCJ0ZWFtTmFtZSIsInRoaXNHZW5lcmF0aW9uIiwidHJ5U3RhcnQiLCJwYXJzZWRCdWRnZXQiLCJsYXRlc3RNZXNzYWdlcyIsInNob3VsZFByb2NlZWQiLCJlbmQiLCJhYm9ydGVkIiwidHVuZ3N0ZW5BY3RpdmVTZXNzaW9uIiwidHVuZ3N0ZW5QYW5lbEF1dG9IaWRkZW4iLCJidWRnZXRJbmZvIiwiaGFzUnVubmluZ1N3YXJtQWdlbnRzIiwibXNncyIsImxhc3RVc2VyTXNnIiwiaWR4IiwiaW5pdGlhbE1lc3NhZ2VSZWYiLCJwZW5kaW5nIiwicHJvY2Vzc0luaXRpYWxNZXNzYWdlIiwiaW5pdGlhbE1zZyIsIk5vbk51bGxhYmxlIiwiY2xlYXJDb250ZXh0Iiwib2xkUGxhblNsdWciLCJwbGFuQ29udGVudCIsImNsZWFyQ29udmVyc2F0aW9uIiwic2hvdWxkU3RvcmVQbGFuRm9yVmVyaWZpY2F0aW9uIiwidXBkYXRlZFRvb2xQZXJtaXNzaW9uQ29udGV4dCIsImFsbG93ZWRQcm9tcHRzIiwicHJlUGxhbk1vZGUiLCJwZW5kaW5nUGxhblZlcmlmaWNhdGlvbiIsInBsYW4iLCJ2ZXJpZmljYXRpb25TdGFydGVkIiwidmVyaWZpY2F0aW9uQ29tcGxldGVkIiwib25TdWJtaXQiLCJzZXRDdXJzb3JPZmZzZXQiLCJjbGVhckJ1ZmZlciIsInJlc2V0SGlzdG9yeSIsIm5ld0Fib3J0Q29udHJvbGxlciIsImhlbHBlcnMiLCJzcGVjdWxhdGlvbkFjY2VwdCIsInNwZWN1bGF0aW9uU2Vzc2lvblRpbWVTYXZlZE1zIiwiZnJvbUtleWJpbmRpbmciLCJyZXN1bWVQcm9hY3RpdmUiLCJ0cmltbWVkSW5wdXQiLCJzcGFjZUluZGV4IiwiaW5kZXhPZiIsImNvbW1hbmROYW1lIiwiY29tbWFuZEFyZ3MiLCJtYXRjaGluZ0NvbW1hbmQiLCJhbGlhc2VzIiwiaW5jbHVkZXMiLCJ2YXJpYW50IiwibWVzc2FnZUNvdW50IiwidG90YWxJbnB1dFRva2VucyIsInNob3VsZFRyZWF0QXNJbW1lZGlhdGUiLCJpbW1lZGlhdGUiLCJwYXN0ZWRUZXh0UmVmcyIsInIiLCJwYXN0ZWRUZXh0Q291bnQiLCJwYXN0ZWRUZXh0Qnl0ZXMiLCJyZWR1Y2UiLCJzdW0iLCJleGVjdXRlSW1tZWRpYXRlQ29tbWFuZCIsImRvbmVXYXNDYWxsZWQiLCJvbkRvbmUiLCJkb25lT3B0aW9ucyIsImRpc3BsYXkiLCJtZXRhTWVzc2FnZXMiLCJtb2QiLCJsb2FkIiwiY2FsbCIsIndpbGxvd01vZGUiLCJpZGxlVGhyZXNob2xkTWluIiwiTnVtYmVyIiwiQ0xBVURFX0NPREVfSURMRV9USFJFU0hPTERfTUlOVVRFUyIsInRva2VuVGhyZXNob2xkIiwiQ0xBVURFX0NPREVfSURMRV9UT0tFTl9USFJFU0hPTEQiLCJpZGxlUmV0dXJuRGlzbWlzc2VkIiwiaWRsZU1zIiwiaXNTbGFzaENvbW1hbmQiLCJzdWJtaXRzTm93Iiwic25hcHNob3QiLCJxdWVyeVJlcXVpcmVkIiwiYyIsInNwbGl0IiwicGFzdGVkVmFsdWVzIiwiT2JqZWN0IiwiaW1hZ2VDb250ZW50cyIsImltYWdlUGFzdGVJZHMiLCJtZXNzYWdlQ29udGVudCIsInJlbW90ZUNvbnRlbnQiLCJjb250ZW50QmxvY2tzIiwicmVtb3RlQmxvY2tzIiwicGFzdGVkIiwic291cmNlIiwiY29uc3QiLCJtZWRpYV90eXBlIiwibWVkaWFUeXBlIiwidXNlck1lc3NhZ2UiLCJzZW5kTWVzc2FnZSIsIm9uSW5wdXRDaGFuZ2UiLCJoYXNJbnRlcnJ1cHRpYmxlVG9vbEluUHJvZ3Jlc3MiLCJvbkFnZW50U3VibWl0IiwidGFzayIsImFnZW50SWQiLCJoYW5kbGVBdXRvUnVuSXNzdWUiLCJoYW5kbGVDYW5jZWxBdXRvUnVuSXNzdWUiLCJoYW5kbGVTdXJ2ZXlSZXF1ZXN0RmVlZGJhY2siLCJTdHJpbmciLCJvblN1Ym1pdFJlZiIsImhhbmRsZU9wZW5SYXRlTGltaXRPcHRpb25zIiwiaGFuZGxlRXhpdCIsInN0ZGlvIiwic2hvd1dvcmt0cmVlIiwiZXhpdE1vZCIsImV4aXRGbG93UmVzdWx0IiwiaGFuZGxlU2hvd01lc3NhZ2VTZWxlY3RvciIsInJld2luZENvbnZlcnNhdGlvblRvIiwibWVzc2FnZUluZGV4IiwicHJlUmV3aW5kTWVzc2FnZUNvdW50IiwicG9zdFJld2luZE1lc3NhZ2VDb3VudCIsIm1lc3NhZ2VzUmVtb3ZlZCIsInJld2luZFRvTWVzc2FnZUluZGV4IiwicmVzZXRDb250ZXh0Q29sbGFwc2UiLCJwZXJtaXNzaW9uTW9kZSIsInByb21wdFN1Z2dlc3Rpb24iLCJwcm9tcHRJZCIsInNob3duQXQiLCJhY2NlcHRlZEF0IiwiZ2VuZXJhdGlvblJlcXVlc3RJZCIsInJlc3RvcmVNZXNzYWdlU3luYyIsImlzQXJyYXkiLCJibG9jayIsImltYWdlQmxvY2tzIiwibmV3UGFzdGVkQ29udGVudHMiLCJpbmRleCIsImhhbmRsZVJlc3RvcmVNZXNzYWdlIiwicmVzdG9yZSIsImZpbmRSYXdJbmRleCIsImZpbmRJbmRleCIsIm1lc3NhZ2VBY3Rpb25DYXBzIiwicmF3Iiwic3Rkb3V0IiwiY29sb3IiLCJlZGl0IiwicmF3SWR4Iiwibm9GaWxlQ2hhbmdlcyIsIm9ubHlTeW50aGV0aWMiLCJlbnRlciIsImVudGVyTWVzc2FnZUFjdGlvbnMiLCJoYW5kbGVycyIsIm1lc3NhZ2VBY3Rpb25IYW5kbGVycyIsIm1lbW9yeUZpbGVzIiwiZmlsZUxpc3QiLCJwYXRoIiwicGFyZW50IiwiZmlsZSIsImNvbnRlbnREaWZmZXJzRnJvbURpc2siLCJyYXdDb250ZW50IiwidGltZXN0YW1wIiwib2Zmc2V0IiwiaXNQYXJ0aWFsVmlldyIsInNlbmRCcmlkZ2VSZXN1bHQiLCJoYXNDb3VudGVkUXVldWVVc2VSZWYiLCJwcm9tcHRRdWV1ZVVzZUNvdW50IiwiZXhlY3V0ZVF1ZXVlZElucHV0IiwiaGFzQWN0aXZlTG9jYWxKc3hVSSIsInJlY29yZFVzZXJBY3Rpdml0eSIsImxhc3RVc2VySW50ZXJhY3Rpb24iLCJpZGxlVGltZVNpbmNlUmVzcG9uc2UiLCJtZXNzYWdlSWRsZU5vdGlmVGhyZXNob2xkTXMiLCJub3RpZmljYXRpb25UeXBlIiwiaWRsZVRocmVzaG9sZE1zIiwibHFjdCIsImFkZE5vdGlmIiwibXNnc1JlZiIsImhpbnRSZWYiLCJ0b3RhbFRva2VucyIsImZvcm1hdHRlZFRva2VucyIsIm1heCIsImhhbmRsZUluY29taW5nUHJvbXB0Iiwidm9pY2UiLCJpbnRlcmltUmFuZ2UiLCJvblN1Ym1pdE1lc3NhZ2UiLCJhc3Npc3RhbnRNb2RlIiwia2Fpcm9zRW5hYmxlZCIsIm9uU3VibWl0VGFzayIsInF1ZXVlZENvbW1hbmRzTGVuZ3RoIiwiaXNJblBsYW5Nb2RlIiwib25TdWJtaXRUaWNrIiwib25RdWV1ZVRpY2siLCJzaHV0ZG93biIsImludGVybmFsX2V2ZW50RW1pdHRlciIsInJlbW91bnRLZXkiLCJzZXRSZW1vdW50S2V5IiwiaGFuZGxlU3VzcGVuZCIsImhhbmRsZVJlc3VtZSIsIm9uIiwic3RvcEhvb2tTcGlubmVyU3VmZml4IiwicHJvZ3Jlc3NNc2dzIiwiUHJvZ3Jlc3NNZXNzYWdlIiwiaG9va0V2ZW50IiwiY3VycmVudFRvb2xVc2VJRCIsInRvb2xVc2VJRCIsImhhc1N1bW1hcnlGb3JDdXJyZW50RXhlY3V0aW9uIiwic3VidHlwZSIsImN1cnJlbnRIb29rcyIsInAiLCJ0b3RhbCIsImNvbXBsZXRlZENvdW50IiwiY3VzdG9tTWVzc2FnZSIsInN0YXR1c01lc3NhZ2UiLCJsYWJlbCIsImhhbmRsZUVudGVyVHJhbnNjcmlwdCIsImhhbmRsZUV4aXRUcmFuc2NyaXB0IiwidmlydHVhbFNjcm9sbEFjdGl2ZSIsInNlYXJjaE9wZW4iLCJzZXRTZWFyY2hPcGVuIiwic2VhcmNoUXVlcnkiLCJzZWFyY2hDb3VudCIsInNldFNlYXJjaENvdW50Iiwic2VhcmNoQ3VycmVudCIsInNldFNlYXJjaEN1cnJlbnQiLCJvblNlYXJjaE1hdGNoZXNDaGFuZ2UiLCJjdHJsIiwibWV0YSIsInNldEFuY2hvciIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsInJlcGVhdCIsIm5leHRNYXRjaCIsInByZXZNYXRjaCIsInNldFF1ZXJ5Iiwic2NhbkVsZW1lbnQiLCJzZXRQb3NpdGlvbnMiLCJ0cmFuc2NyaXB0Q29scyIsImNvbHVtbnMiLCJwcmV2Q29sc1JlZiIsImRpc2FybVNlYXJjaCIsImdlbiIsInNldFN0YXR1cyIsInciLCJyZXBsYWNlIiwib3BlbmVkIiwiaW5UcmFuc2NyaXB0IiwiZ2xvYmFsS2V5YmluZGluZ1Byb3BzIiwib25FbnRlclRyYW5zY3JpcHQiLCJvbkV4aXRUcmFuc2NyaXB0Iiwic2VhcmNoQmFyT3BlbiIsInRyYW5zY3JpcHRNZXNzYWdlcyIsInRyYW5zY3JpcHRTdHJlYW1pbmdUb29sVXNlcyIsIm9uT3BlbkJhY2tncm91bmRUYXNrcyIsInRyYW5zY3JpcHRTY3JvbGxSZWYiLCJ0cmFuc2NyaXB0TWVzc2FnZXNFbGVtZW50IiwidHJhbnNjcmlwdFRvb2xKU1giLCJ0cmFuc2NyaXB0UmV0dXJuIiwicSIsInZpZXdlZFRhc2siLCJ2aWV3ZWRUZWFtbWF0ZVRhc2siLCJ2aWV3ZWRBZ2VudFRhc2siLCJ1c2VzU3luY01lc3NhZ2VzIiwiZGlzcGxheWVkTWVzc2FnZXMiLCJwbGFjZWhvbGRlclRleHQiLCJ0b29sUGVybWlzc2lvbk92ZXJsYXkiLCJ0YWlsIiwid29ya2VyQmFkZ2UiLCJjb21wYW5pb25OYXJyb3ciLCJjb21wYW5pb25WaXNpYmxlIiwidG9vbEpzeENlbnRlcmVkIiwiY2VudGVyZWRNb2RhbCIsIm1haW5SZXR1cm4iLCJzaXplIiwicGVyc2lzdFRvU2V0dGluZ3MiLCJjdXJyZW50UmVxdWVzdCIsImFwcHJvdmVkSG9zdCIsInVwZGF0ZSIsInJ1bGVzIiwidG9vbE5hbWUiLCJydWxlQ29udGVudCIsImRlc3RpbmF0aW9uIiwicmVmcmVzaENvbmZpZyIsImNsZWFudXBzIiwic2VsZWN0ZWRLZXkiLCJwcm9tcHRfcmVzcG9uc2UiLCJwb3J0Iiwid29ya2VyTmFtZSIsInNlcnZlck5hbWUiLCJyZXNwb25kIiwiaXNVcmxBY2NlcHQiLCJwYXJhbXMiLCJvbldhaXRpbmdEaXNtaXNzIiwic2VsZWN0aW9uIiwibW9kZWxBbGlhcyIsIm1haW5Mb29wTW9kZWxGb3JTZXNzaW9uIiwicmVwbEJyaWRnZUVuYWJsZWQiLCJyZXBsQnJpZGdlRXhwbGljaXQiLCJyZXBsQnJpZGdlT3V0Ym91bmRPbmx5IiwicGx1Z2luTmFtZSIsInBsdWdpbkRlc2NyaXB0aW9uIiwibWFya2V0cGxhY2VOYW1lIiwic291cmNlQ29tbWFuZCIsImZpbGVFeHRlbnNpb24iLCJjaG9pY2UiLCJibHVyYiIsImFwcGVuZFN0ZG91dCIsImFwcGVuZFdoZW5JZGxlIiwidW5zdWIiLCJ1bHRyYXBsYW5TZXNzaW9uVXJsIiwibGF1bmNoVWx0cmFwbGFuIiwiZGlzY29ubmVjdGVkQnJpZGdlIiwib25TZXNzaW9uUmVhZHkiLCJsYXN0UmVzcG9uc2UiLCJzdWdnZXN0aW9uIiwiaXNPcGVuIiwic2tpbGxOYW1lIiwidXBkYXRlcyIsImZlZWRiYWNrIiwiZGlyZWN0aW9uIiwiUGFydGlhbENvbXBhY3REaXJlY3Rpb24iLCJjb21wYWN0TWVzc2FnZXMiLCJhcHBTdGF0ZSIsImRlZmF1bHRTeXNQcm9tcHQiLCJmb3JrQ29udGV4dE1lc3NhZ2VzIiwia2VwdCIsIm1lc3NhZ2VzVG9LZWVwIiwib3JkZXJlZCIsInN1bW1hcnlNZXNzYWdlcyIsInBvc3RDb21wYWN0IiwiYm91bmRhcnlNYXJrZXIiLCJhdHRhY2htZW50cyIsImhvb2tSZXN1bHRzIiwiaGlzdG9yeVNob3J0Y3V0Il0sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQSxTQUFTQSxPQUFPLFFBQVEsWUFBWTtBQUNwQyxTQUFTQyxTQUFTLFFBQVEsZUFBZTtBQUN6QyxTQUNFQywyQkFBMkIsRUFDM0JDLHlCQUF5QixFQUN6QkMsbUJBQW1CLEVBQ25CQywwQkFBMEIsRUFDMUJDLG1CQUFtQixRQUNkLHVCQUF1QjtBQUM5QixTQUFTQyxnQkFBZ0IsUUFBUSx5QkFBeUI7QUFDMUQsU0FBU0MsS0FBSyxRQUFRLG1CQUFtQjtBQUN6QyxTQUFTQyxPQUFPLEVBQUVDLElB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QUNuRCxjQUFjLEVBQUUsR0FBRztBQUNuQixjQUFjLENBQUM1YyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQ2pCLEVBQUVpN0MsZUFBZSxJQUFJOWdDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxJQUM5QytnQyxnQkFBZ0IsR0FDZCxDQUFDLGVBQWUsR0FBRyxHQUNqQixJQUFJO0FBQ3RCLFlBQVksRUFBRSxHQUFHLENBQ1AsQ0FBQztBQUVYLE1BQU0sRUFBRSxvQkFBb0I7QUFDNUIsSUFBSSxFQUFFLGVBQWUsQ0FDbEI7RUFDRCxJQUFJL2dDLHNCQUFzQixDQUFDLENBQUMsRUFBRTtJQUM1QixPQUNFLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7QUFDL0QsUUFBUSxDQUFDZ2hDLFVBQVU7QUFDbkIsTUFBTSxFQUFFLGVBQWUsQ0FBQztFQUV0QjtFQUNBLE9BQU9BLFVBQVU7QUFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBiaW9tZS1pZ25vcmUtYWxsIGFzc2lzdC9zb3VyY2Uvb3JnYW5pemVJbXBvcnRzOiBBTlQtT05MWSBpbXBvcnQgbWFya2VycyBtdXN0IG5vdCBiZSByZW9yZGVyZWRcbmltcG9ydCB7IGZlYXR1cmUgfSBmcm9tICdidW46YnVuZGxlJ1xuaW1wb3J0IHsgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCB7XG4gIHNuYXBzaG90T3V0cHV0VG9rZW5zRm9yVHVybixcbiAgZ2V0Q3VycmVudFR1cm5Ub2tlbkJ1ZGdldCxcbiAgZ2V0VHVybk91dHB1dFRva2VucyxcbiAgZ2V0QnVkZ2V0Q29udGludWF0aW9uQ291bnQsXG4gIGdldFRvdGFsSW5wdXRUb2tlbnMsXG59IGZyb20gJy4uL2Jvb3RzdHJhcC9zdGF0ZS5qcydcbmltcG9ydCB7IHBhcnNlVG9rZW5CdWRnZXQgfSBmcm9tICcuLi91dGlscy90b2tlbkJ1ZGdldC5qcydcbmltcG9ydCB7IGNvdW50IH0gZnJvbSAnLi4vdXRpbHMvYXJyYXkuanMnXG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAncGF0aCdcbmltcG9ydCB7IHRtcGRpciB9IGZyb20gJ29zJ1xuaW1wb3J0IGZpZ3VyZXMgZnJvbSAnZmlndXJlcydcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjdXN0b20tcnVsZXMvcHJlZmVyLXVzZS1rZXliaW5kaW5ncyAtLSAvIG4gTiBFc2MgWyB2IGFyZSBiYXJlIGxldHRlcnMgaW4gdHJhbnNjcmlwdCBtb2RhbCBjb250ZXh0LCBzYW1lIGNsYXNzIGFzIGcvRy9qL2sgaW4gU2Nyb2xsS2V5YmluZGluZ0hhbmRsZXJcbmltcG9ydCB7IHVzZUlucHV0IH0gZnJvbSAnLi4vaW5rLmpzJ1xuaW1wb3J0IHsgdXNlU2VhcmNoSW5wdXQgfSBmcm9tICcuLi9ob29rcy91c2VTZWFyY2hJbnB1dC5qcydcbmltcG9ydCB7IHVzZVRlcm1pbmFsU2l6ZSB9IGZyb20gJy4uL2hvb2tzL3VzZVRlcm1pbmFsU2l6ZS5qcydcbmltcG9ydCB7IHVzZVNlYXJjaEhpZ2hsaWdodCB9IGZyb20gJy4uL2luay9ob29rcy91c2Utc2VhcmNoLWhpZ2hsaWdodC5qcydcbmltcG9ydCB0eXBlIHsgSnVtcEhhbmRsZSB9IGZyb20gJy4uL2NvbXBvbmVudHMvVmlydHVhbE1lc3NhZ2VMaXN0LmpzJ1xuaW1wb3J0IHsgcmVuZGVyTWVzc2FnZXNUb1BsYWluVGV4dCB9IGZyb20gJy4uL3V0aWxzL2V4cG9ydFJlbmRlcmVyLmpzJ1xuaW1wb3J0IHsgb3BlbkZpbGVJbkV4dGVybmFsRWRpdG9yIH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLmpzJ1xuaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnZnMvcHJvbWlzZXMnXG5pbXBvcnQge1xuICBCb3gsXG4gIFRleHQsXG4gIHVzZVN0ZGluLFxuICB1c2VUaGVtZSxcbiAgdXNlVGVybWluYWxGb2N1cyxcbiAgdXNlVGVybWluYWxUaXRsZSxcbiAgdXNlVGFiU3RhdHVzLFxufSBmcm9tICcuLi9pbmsuanMnXG5pbXBvcnQgdHlwZSB7IFRhYlN0YXR1c0tpbmQgfSBmcm9tICcuLi9pbmsvaG9va3MvdXNlLXRhYi1zdGF0dXMuanMnXG5pbXBvcnQgeyBDb3N0VGhyZXNob2xkRGlhbG9nIH0gZnJvbSAnLi4vY29tcG9uZW50cy9Db3N0VGhyZXNob2xkRGlhbG9nLmpzJ1xuaW1wb3J0IHsgSWRsZVJldHVybkRpYWxvZyB9IGZyb20gJy4uL2NvbXBvbmVudHMvSWRsZVJldHVybkRpYWxvZy5qcydcbmltcG9ydCAqIGFzIFJlYWN0IGZyb20gJ3JlYWN0J1xuaW1wb3J0IHtcbiAgdXNlRWZmZWN0LFxuICB1c2VNZW1vLFxuICB1c2VSZWYsXG4gIHVzZVN0YXRlLFxuICB1c2VDYWxsYmFjayxcbiAgdXNlRGVmZXJyZWRWYWx1ZSxcbiAgdXNlTGF5b3V0RWZmZWN0LFxuICB0eXBlIFJlZk9iamVjdCxcbn0gZnJvbSAncmVhY3QnXG5pbXBvcnQgeyB1c2VOb3RpZmljYXRpb25zIH0gZnJvbSAnLi4vY29udGV4dC9ub3RpZmljYXRpb25zLmpzJ1xuaW1wb3J0IHsgc2VuZE5vdGlmaWNhdGlvbiB9IGZyb20gJy4uL3NlcnZpY2VzL25vdGlmaWVyLmpzJ1xuaW1wb3J0IHtcbiAgc3RhcnRQcmV2ZW50U2xlZXAsXG4gIHN0b3BQcmV2ZW50U2xlZXAsXG59IGZyb20gJy4uL3NlcnZpY2VzL3ByZXZlbnRTbGVlcC5qcydcbmltcG9ydCB7IHVzZVRlcm1pbmFsTm90aWZpY2F0aW9uIH0gZnJvbSAnLi4vaW5rL3VzZVRlcm1pbmFsTm90aWZpY2F0aW9uLmpzJ1xuaW1wb3J0IHsgaGFzQ3Vyc29yVXBWaWV3cG9ydFlhbmtCdWcgfSBmcm9tICcuLi9pbmsvdGVybWluYWwuanMnXG5pbXBvcnQge1xuICBjcmVhdGVGaWxlU3RhdGVDYWNoZVdpdGhTaXplTGltaXQsXG4gIG1lcmdlRmlsZVN0YXRlQ2FjaGVzLFxuICBSRUFEX0ZJTEVfU1RBVEVfQ0FDSEVfU0laRSxcbn0gZnJvbSAnLi4vdXRpbHMvZmlsZVN0YXRlQ2FjaGUuanMnXG5pbXBvcnQge1xuICB1cGRhdGVMYXN0SW50ZXJhY3Rpb25UaW1lLFxuICBnZXRMYXN0SW50ZXJhY3Rpb25UaW1lLFxuICBnZXRPcmlnaW5hbEN3ZCxcbiAgZ2V0UHJvamVjdFJvb3QsXG4gIGdldFNlc3Npb25JZCxcbiAgc3dpdGNoU2Vzc2lvbixcbiAgc2V0Q29zdFN0YXRlRm9yUmVzdG9yZSxcbiAgZ2V0VHVybkhvb2tEdXJhdGlvbk1zLFxuICBnZXRUdXJuSG9va0NvdW50LFxuICByZXNldFR1cm5Ib29rRHVyYXRpb24sXG4gIGdldFR1cm5Ub29sRHVyYXRpb25NcyxcbiAgZ2V0VHVyblRvb2xDb3VudCxcbiAgcmVzZXRUdXJuVG9vbER1cmF0aW9uLFxuICBnZXRUdXJuQ2xhc3NpZmllckR1cmF0aW9uTXMsXG4gIGdldFR1cm5DbGFzc2lmaWVyQ291bnQsXG4gIHJlc2V0VHVybkNsYXNzaWZpZXJEdXJhdGlvbixcbn0gZnJvbSAnLi4vYm9vdHN0cmFwL3N0YXRlLmpzJ1xuaW1wb3J0IHsgYXNTZXNzaW9uSWQsIGFzQWdlbnRJZCB9IGZyb20gJy4uL3R5cGVzL2lkcy5qcydcbmltcG9ydCB7IGxvZ0ZvckRlYnVnZ2luZyB9IGZyb20gJy4uL3V0aWxzL2RlYnVnLmpzJ1xuaW1wb3J0IHsgUXVlcnlHdWFyZCB9IGZyb20gJy4uL3V0aWxzL1F1ZXJ5R3VhcmQuanMnXG5pbXBvcnQgeyBpc0VudlRydXRoeSB9IGZyb20gJy4uL3V0aWxzL2VudlV0aWxzLmpzJ1xuaW1wb3J0IHsgZm9ybWF0VG9rZW5zLCB0cnVuY2F0ZVRvV2lkdGggfSBmcm9tICcuLi91dGlscy9mb3JtYXQuanMnXG5pbXBvcnQgeyBjb25zdW1lRWFybHlJbnB1dCB9IGZyb20gJy4uL3V0aWxzL2Vhcmx5SW5wdXQuanMnXG5cbmltcG9ydCB7IHNldE1lbWJlckFjdGl2ZSB9IGZyb20gJy4uL3V0aWxzL3N3YXJtL3RlYW1IZWxwZXJzLmpzJ1xuaW1wb3J0IHtcbiAgaXNTd2FybVdvcmtlcixcbiAgZ2VuZXJhdGVTYW5kYm94UmVxdWVzdElkLFxuICBzZW5kU2FuZGJveFBlcm1pc3Npb25SZXF1ZXN0VmlhTWFpbGJveCxcbiAgc2VuZFNhbmRib3hQZXJtaXNzaW9uUmVzcG9uc2VWaWFNYWlsYm94LFxufSBmcm9tICcuLi91dGlscy9zd2FybS9wZXJtaXNzaW9uU3luYy5qcydcbmltcG9ydCB7IHJlZ2lzdGVyU2FuZGJveFBlcm1pc3Npb25DYWxsYmFjayB9IGZyb20gJy4uL2hvb2tzL3VzZVN3YXJtUGVybWlzc2lvblBvbGxlci5qcydcbmltcG9ydCB7IGdldFRlYW1OYW1lLCBnZXRBZ2VudE5hbWUgfSBmcm9tICcuLi91dGlscy90ZWFtbWF0ZS5qcydcbmltcG9ydCB7IFdvcmtlclBlbmRpbmdQZXJtaXNzaW9uIH0gZnJvbSAnLi4vY29tcG9uZW50cy9wZXJtaXNzaW9ucy9Xb3JrZXJQZW5kaW5nUGVybWlzc2lvbi5qcydcbmltcG9ydCB7XG4gIGluamVjdFVzZXJNZXNzYWdlVG9UZWFtbWF0ZSxcbiAgZ2V0QWxsSW5Qcm9jZXNzVGVhbW1hdGVUYXNrcyxcbn0gZnJvbSAnLi4vdGFza3MvSW5Qcm9jZXNzVGVhbW1hdGVUYXNrL0luUHJvY2Vzc1RlYW1tYXRlVGFzay5qcydcbmltcG9ydCB7XG4gIGlzTG9jYWxBZ2VudFRhc2ssXG4gIHF1ZXVlUGVuZGluZ01lc3NhZ2UsXG4gIGFwcGVuZE1lc3NhZ2VUb0xvY2FsQWdlbnQsXG4gIHR5cGUgTG9jYWxBZ2VudFRhc2tTdGF0ZSxcbn0gZnJvbSAnLi4vdGFza3MvTG9jYWxBZ2VudFRhc2svTG9jYWxBZ2VudFRhc2suanMnXG5pbXBvcnQge1xuICByZWdpc3RlckxlYWRlclRvb2xVc2VDb25maXJtUXVldWUsXG4gIHVucmVnaXN0ZXJMZWFkZXJUb29sVXNlQ29uZmlybVF1ZXVlLFxuICByZWdpc3RlckxlYWRlclNldFRvb2xQZXJtaXNzaW9uQ29udGV4dCxcbiAgdW5yZWdpc3RlckxlYWRlclNldFRvb2xQZXJtaXNzaW9uQ29udGV4dCxcbn0gZnJvbSAnLi4vdXRpbHMvc3dhcm0vbGVhZGVyUGVybWlzc2lvbkJyaWRnZS5qcydcbmltcG9ydCB7IGVuZEludGVyYWN0aW9uU3BhbiB9IGZyb20gJy4uL3V0aWxzL3RlbGVtZXRyeS9zZXNzaW9uVHJhY2luZy5qcydcbmltcG9ydCB7IHVzZUxvZ01lc3NhZ2VzIH0gZnJvbSAnLi4vaG9va3MvdXNlTG9nTWVzc2FnZXMuanMnXG5pbXBvcnQgeyB1c2VSZXBsQnJpZGdlIH0gZnJvbSAnLi4vaG9va3MvdXNlUmVwbEJyaWRnZS5qcydcbmltcG9ydCB7XG4gIHR5cGUgQ29tbWFuZCxcbiAgdHlwZSBDb21tYW5kUmVzdWx0RGlzcGxheSxcbiAgdHlwZSBSZXN1bWVFbnRyeXBvaW50LFxuICBnZXRDb21tYW5kTmFtZSxcbiAgaXNDb21tYW5kRW5hYmxlZCxcbn0gZnJvbSAnLi4vY29tbWFuZHMuanMnXG5pbXBvcnQgdHlwZSB7XG4gIFByb21wdElucHV0TW9kZSxcbiAgUXVldWVkQ29tbWFuZCxcbiAgVmltTW9kZSxcbn0gZnJvbSAnLi4vdHlwZXMvdGV4dElucHV0VHlwZXMuanMnXG5pbXBvcnQge1xuICBNZXNzYWdlU2VsZWN0b3IsXG4gIHNlbGVjdGFibGVVc2VyTWVzc2FnZXNGaWx0ZXIsXG4gIG1lc3NhZ2VzQWZ0ZXJBcmVPbmx5U3ludGhldGljLFxufSBmcm9tICcuLi9jb21wb25lbnRzL01lc3NhZ2VTZWxlY3Rvci5qcydcbmltcG9ydCB7IHVzZUlkZUxvZ2dpbmcgfSBmcm9tICcuLi9ob29rcy91c2VJZGVMb2dnaW5nLmpzJ1xuaW1wb3J0IHtcbiAgUGVybWlzc2lvblJlcXVlc3QsXG4gIHR5cGUgVG9vbFVzZUNvbmZpcm0sXG59IGZyb20gJy4uL2NvbXBvbmVudHMvcGVybWlzc2lvbnMvUGVybWlzc2lvblJlcXVlc3QuanMnXG5pbXBvcnQgeyBFbGljaXRhdGlvbkRpYWxvZyB9IGZyb20gJy4uL2NvbXBvbmVudHMvbWNwL0VsaWNpdGF0aW9uRGlhbG9nLmpzJ1xuaW1wb3J0IHsgUHJvbXB0RGlhbG9nIH0gZnJvbSAnLi4vY29tcG9uZW50cy9ob29rcy9Qcm9tcHREaWFsb2cuanMnXG5pbXBvcnQgdHlwZSB7IFByb21wdFJlcXVlc3QsIFByb21wdFJlc3BvbnNlIH0gZnJvbSAnLi4vdHlwZXMvaG9va3MuanMnXG5pbXBvcnQgUHJvbXB0SW5wdXQgZnJvbSAnLi4vY29tcG9uZW50cy9Qcm9tcHRJbnB1dC9Qcm9tcHRJbnB1dC5qcydcbmltcG9ydCB7IFByb21wdElucHV0UXVldWVkQ29tbWFuZHMgfSBmcm9tICcuLi9jb21wb25lbnRzL1Byb21wdElucHV0L1Byb21wdElucHV0UXVldWVkQ29tbWFuZHMuanMnXG5pbXBvcnQgeyB1c2VSZW1vdGVTZXNzaW9uIH0gZnJvbSAnLi4vaG9va3MvdXNlUmVtb3RlU2Vzc2lvbi5qcydcbmltcG9ydCB7IHVzZURpcmVjdENvbm5lY3QgfSBmcm9tICcuLi9ob29rcy91c2VEaXJlY3RDb25uZWN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBEaXJlY3RDb25uZWN0Q29uZmlnIH0gZnJvbSAnLi4vc2VydmVyL2RpcmVjdENvbm5lY3RNYW5hZ2VyLmpzJ1xuaW1wb3J0IHsgdXNlU1NIU2Vzc2lvbiB9IGZyb20gJy4uL2hvb2tzL3VzZVNTSFNlc3Npb24uanMnXG5pbXBvcnQgeyB1c2VBc3Npc3RhbnRIaXN0b3J5IH0gZnJvbSAnLi4vaG9va3MvdXNlQXNzaXN0YW50SGlzdG9yeS5qcydcbmltcG9ydCB0eXBlIHsgU1NIU2Vzc2lvbiB9IGZyb20gJy4uL3NzaC9jcmVhdGVTU0hTZXNzaW9uLmpzJ1xuaW1wb3J0IHsgU2tpbGxJbXByb3ZlbWVudFN1cnZleSB9IGZyb20gJy4uL2NvbXBvbmVudHMvU2tpbGxJbXByb3ZlbWVudFN1cnZleS5qcydcbmltcG9ydCB7IHVzZVNraWxsSW1wcm92ZW1lbnRTdXJ2ZXkgfSBmcm9tICcuLi9ob29rcy91c2VTa2lsbEltcHJvdmVtZW50U3VydmV5LmpzJ1xuaW1wb3J0IHsgdXNlTW9yZVJpZ2h0IH0gZnJvbSAnLi4vbW9yZXJpZ2h0L3VzZU1vcmVSaWdodC5qcydcbmltcG9ydCB7XG4gIFNwaW5uZXJXaXRoVmVyYixcbiAgQnJpZWZJZGxlU3RhdHVzLFxuICB0eXBlIFNwaW5uZXJNb2RlLFxufSBmcm9tICcuLi9jb21wb25lbnRzL1NwaW5uZXIuanMnXG5pbXBvcnQgeyBnZXRTeXN0ZW1Qcm9tcHQgfSBmcm9tICcuLi9jb25zdGFudHMvcHJvbXB0cy5qcydcbmltcG9ydCB7IGJ1aWxkRWZmZWN0aXZlU3lzdGVtUHJvbXB0IH0gZnJvbSAnLi4vdXRpbHMvc3lzdGVtUHJvbXB0LmpzJ1xuaW1wb3J0IHsgZ2V0U3lzdGVtQ29udGV4dCwgZ2V0VXNlckNvbnRleHQgfSBmcm9tICcuLi9jb250ZXh0LmpzJ1xuaW1wb3J0IHsgZ2V0TWVtb3J5RmlsZXMgfSBmcm9tICcuLi91dGlscy9jbGF1ZGVtZC5qcydcbmltcG9ydCB7IHN0YXJ0QmFja2dyb3VuZEhvdXNla2VlcGluZyB9IGZyb20gJy4uL3V0aWxzL2JhY2tncm91bmRIb3VzZWtlZXBpbmcuanMnXG5pbXBvcnQge1xuICBnZXRUb3RhbENvc3QsXG4gIHNhdmVDdXJyZW50U2Vzc2lvbkNvc3RzLFxuICByZXNldENvc3RTdGF0ZSxcbiAgZ2V0U3RvcmVkU2Vzc2lvbkNvc3RzLFxufSBmcm9tICcuLi9jb3N0LXRyYWNrZXIuanMnXG5pbXBvcnQgeyB1c2VDb3N0U3VtbWFyeSB9IGZyb20gJy4uL2Nvc3RIb29rLmpzJ1xuaW1wb3J0IHsgdXNlRnBzTWV0cmljcyB9IGZyb20gJy4uL2NvbnRleHQvZnBzTWV0cmljcy5qcydcbmltcG9ydCB7IHVzZUFmdGVyRmlyc3RSZW5kZXIgfSBmcm9tICcuLi9ob29rcy91c2VBZnRlckZpcnN0UmVuZGVyLmpzJ1xuaW1wb3J0IHsgdXNlRGVmZXJyZWRIb29rTWVzc2FnZXMgfSBmcm9tICcuLi9ob29rcy91c2VEZWZlcnJlZEhvb2tNZXNzYWdlcy5qcydcbmltcG9ydCB7XG4gIGFkZFRvSGlzdG9yeSxcbiAgcmVtb3ZlTGFzdEZyb21IaXN0b3J5LFxuICBleHBhbmRQYXN0ZWRUZXh0UmVmcyxcbiAgcGFyc2VSZWZlcmVuY2VzLFxufSBmcm9tICcuLi9oaXN0b3J5LmpzJ1xuaW1wb3J0IHsgcHJlcGVuZE1vZGVDaGFyYWN0ZXJUb0lucHV0IH0gZnJvbSAnLi4vY29tcG9uZW50cy9Qcm9tcHRJbnB1dC9pbnB1dE1vZGVzLmpzJ1xuaW1wb3J0IHsgcHJlcGVuZFRvU2hlbGxIaXN0b3J5Q2FjaGUgfSBmcm9tICcuLi91dGlscy9zdWdnZXN0aW9ucy9zaGVsbEhpc3RvcnlDb21wbGV0aW9uLmpzJ1xuaW1wb3J0IHsgdXNlQXBpS2V5VmVyaWZpY2F0aW9uIH0gZnJvbSAnLi4vaG9va3MvdXNlQXBpS2V5VmVyaWZpY2F0aW9uLmpzJ1xuaW1wb3J0IHsgR2xvYmFsS2V5YmluZGluZ0hhbmRsZXJzIH0gZnJvbSAnLi4vaG9va3MvdXNlR2xvYmFsS2V5YmluZGluZ3MuanMnXG5pbXBvcnQgeyBDb21tYW5kS2V5YmluZGluZ0hhbmRsZXJzIH0gZnJvbSAnLi4vaG9va3MvdXNlQ29tbWFuZEtleWJpbmRpbmdzLmpzJ1xuaW1wb3J0IHsgS2V5YmluZGluZ1NldHVwIH0gZnJvbSAnLi4va2V5YmluZGluZ3MvS2V5YmluZGluZ1Byb3ZpZGVyU2V0dXAuanMnXG5pbXBvcnQgeyB1c2VTaG9ydGN1dERpc3BsYXkgfSBmcm9tICcuLi9rZXliaW5kaW5ncy91c2VTaG9ydGN1dERpc3BsYXkuanMnXG5pbXBvcnQgeyBnZXRTaG9ydGN1dERpc3BsYXkgfSBmcm9tICcuLi9rZXliaW5kaW5ncy9zaG9ydGN1dEZvcm1hdC5qcydcbmltcG9ydCB7IENhbmNlbFJlcXVlc3RIYW5kbGVyIH0gZnJvbSAnLi4vaG9va3MvdXNlQ2FuY2VsUmVxdWVzdC5qcydcbmltcG9ydCB7IHVzZUJhY2tncm91bmRUYXNrTmF2aWdhdGlvbiB9IGZyb20gJy4uL2hvb2tzL3VzZUJhY2tncm91bmRUYXNrTmF2aWdhdGlvbi5qcydcbmltcG9ydCB7IHVzZVN3YXJtSW5pdGlhbGl6YXRpb24gfSBmcm9tICcuLi9ob29rcy91c2VTd2FybUluaXRpYWxpemF0aW9uLmpzJ1xuaW1wb3J0IHsgdXNlVGVhbW1hdGVWaWV3QXV0b0V4aXQgfSBmcm9tICcuLi9ob29rcy91c2VUZWFtbWF0ZVZpZXdBdXRvRXhpdC5qcydcbmltcG9ydCB7IGVycm9yTWVzc2FnZSB9IGZyb20gJy4uL3V0aWxzL2Vycm9ycy5qcydcbmltcG9ydCB7IGlzSHVtYW5UdXJuIH0gZnJvbSAnLi4vdXRpbHMvbWVzc2FnZVByZWRpY2F0ZXMuanMnXG5pbXBvcnQgeyBsb2dFcnJvciB9IGZyb20gJy4uL3V0aWxzL2xvZy5qcydcbi8vIERlYWQgY29kZSBlbGltaW5hdGlvbjogY29uZGl0aW9uYWwgaW1wb3J0c1xuLyogZXNsaW50LWRpc2FibGUgY3VzdG9tLXJ1bGVzL25vLXByb2Nlc3MtZW52LXRvcC1sZXZlbCwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuY29uc3QgdXNlVm9pY2VJbnRlZ3JhdGlvbjogdHlwZW9mIGltcG9ydCgnLi4vaG9va3MvdXNlVm9pY2VJbnRlZ3JhdGlvbi5qcycpLnVzZVZvaWNlSW50ZWdyYXRpb24gPVxuICBmZWF0dXJlKCdWT0lDRV9NT0RFJylcbiAgICA/IHJlcXVpcmUoJy4uL2hvb2tzL3VzZVZvaWNlSW50ZWdyYXRpb24uanMnKS51c2VWb2ljZUludGVncmF0aW9uXG4gICAgOiAoKSA9PiAoe1xuICAgICAgICBzdHJpcFRyYWlsaW5nOiAoKSA9PiAwLFxuICAgICAgICBoYW5kbGVLZXlFdmVudDogKCkgPT4ge30sXG4gICAgICAgIHJlc2V0QW5jaG9yOiAoKSA9PiB7fSxcbiAgICAgIH0pXG5jb25zdCBWb2ljZUtleWJpbmRpbmdIYW5kbGVyOiB0eXBlb2YgaW1wb3J0KCcuLi9ob29rcy91c2VWb2ljZUludGVncmF0aW9uLmpzJykuVm9pY2VLZXliaW5kaW5nSGFuZGxlciA9XG4gIGZlYXR1cmUoJ1ZPSUNFX01PREUnKVxuICAgID8gcmVxdWlyZSgnLi4vaG9va3MvdXNlVm9pY2VJbnRlZ3JhdGlvbi5qcycpLlZvaWNlS2V5YmluZGluZ0hhbmRsZXJcbiAgICA6ICgpID0+IG51bGxcbi8vIEZydXN0cmF0aW9uIGRldGVjdGlvbiBpcyBhbnQtb25seSAoZG9nZm9vZGluZykuIENvbmRpdGlvbmFsIHJlcXVpcmUgc28gZXh0ZXJuYWxcbi8vIGJ1aWxkcyBlbGltaW5hdGUgdGhlIG1vZHVsZSBlbnRpcmVseSAoaW5jbHVkaW5nIGl0cyB0d28gTyhuKSB1c2VNZW1vcyB0aGF0IHJ1blxuLy8gb24gZXZlcnkgbWVzc2FnZXMgY2hhbmdlLCBwbHVzIHRoZSBHcm93dGhCb29rIGZldGNoKS5cbmNvbnN0IHVzZUZydXN0cmF0aW9uRGV0ZWN0aW9uOiB0eXBlb2YgaW1wb3J0KCcuLi9jb21wb25lbnRzL0ZlZWRiYWNrU3VydmV5L3VzZUZydXN0cmF0aW9uRGV0ZWN0aW9uLmpzJykudXNlRnJ1c3RyYXRpb25EZXRlY3Rpb24gPVxuICBcImV4dGVybmFsXCIgPT09ICdhbnQnXG4gICAgPyByZXF1aXJlKCcuLi9jb21wb25lbnRzL0ZlZWRiYWNrU3VydmV5L3VzZUZydXN0cmF0aW9uRGV0ZWN0aW9uLmpzJylcbiAgICAgICAgLnVzZUZydXN0cmF0aW9uRGV0ZWN0aW9uXG4gICAgOiAoKSA9PiAoeyBzdGF0ZTogJ2Nsb3NlZCcsIGhhbmRsZVRyYW5zY3JpcHRTZWxlY3Q6ICgpID0+IHt9IH0pXG4vLyBBbnQtb25seSBvcmcgd2FybmluZy4gQ29uZGl0aW9uYWwgcmVxdWlyZSBzbyB0aGUgb3JnIFVVSUQgbGlzdCBpc1xuLy8gZWxpbWluYXRlZCBmcm9tIGV4dGVybmFsIGJ1aWxkcyAob25lIFVVSUQgaXMgb24gZXhjbHVkZWQtc3RyaW5ncykuXG5jb25zdCB1c2VBbnRPcmdXYXJuaW5nTm90aWZpY2F0aW9uOiB0eXBlb2YgaW1wb3J0KCcuLi9ob29rcy9ub3RpZnMvdXNlQW50T3JnV2FybmluZ05vdGlmaWNhdGlvbi5qcycpLnVzZUFudE9yZ1dhcm5pbmdOb3RpZmljYXRpb24gPVxuICBcImV4dGVybmFsXCIgPT09ICdhbnQnXG4gICAgPyByZXF1aXJlKCcuLi9ob29rcy9ub3RpZnMvdXNlQW50T3JnV2FybmluZ05vdGlmaWNhdGlvbi5qcycpXG4gICAgICAgIC51c2VBbnRPcmdXYXJuaW5nTm90aWZpY2F0aW9uXG4gICAgOiAoKSA9PiB7fVxuLy8gRGVhZCBjb2RlIGVsaW1pbmF0aW9uOiBjb25kaXRpb25hbCBpbXBvcnQgZm9yIGNvb3JkaW5hdG9yIG1vZGVcbmNvbnN0IGdldENvb3JkaW5hdG9yVXNlckNvbnRleHQ6IChcbiAgbWNwQ2xpZW50czogUmVhZG9ubHlBcnJheTx7IG5hbWU6IHN0cmluZyB9PixcbiAgc2NyYXRjaHBhZERpcj86IHN0cmluZyxcbikgPT4geyBbazogc3RyaW5nXTogc3RyaW5nIH0gPSBmZWF0dXJlKCdDT09SRElOQVRPUl9NT0RFJylcbiAgPyByZXF1aXJlKCcuLi9jb29yZGluYXRvci9jb29yZGluYXRvck1vZGUuanMnKS5nZXRDb29yZGluYXRvclVzZXJDb250ZXh0XG4gIDogKCkgPT4gKHt9KVxuLyogZXNsaW50LWVuYWJsZSBjdXN0b20tcnVsZXMvbm8tcHJvY2Vzcy1lbnYtdG9wLWxldmVsLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzICovXG5pbXBvcnQgdXNlQ2FuVXNlVG9vbCBmcm9tICcuLi9ob29rcy91c2VDYW5Vc2VUb29sLmpzJ1xuaW1wb3J0IHR5cGUgeyBUb29sUGVybWlzc2lvbkNvbnRleHQsIFRvb2wgfSBmcm9tICcuLi9Ub29sLmpzJ1xuaW1wb3J0IHtcbiAgYXBwbHlQZXJtaXNzaW9uVXBkYXRlLFxuICBhcHBseVBlcm1pc3Npb25VcGRhdGVzLFxuICBwZXJzaXN0UGVybWlzc2lvblVwZGF0ZSxcbn0gZnJvbSAnLi4vdXRpbHMvcGVybWlzc2lvbnMvUGVybWlzc2lvblVwZGF0ZS5qcydcbmltcG9ydCB7IGJ1aWxkUGVybWlzc2lvblVwZGF0ZXMgfSBmcm9tICcuLi9jb21wb25lbnRzL3Blcm1pc3Npb25zL0V4aXRQbGFuTW9kZVBlcm1pc3Npb25SZXF1ZXN0L0V4aXRQbGFuTW9kZVBlcm1pc3Npb25SZXF1ZXN0LmpzJ1xuaW1wb3J0IHsgc3RyaXBEYW5nZXJvdXNQZXJtaXNzaW9uc0ZvckF1dG9Nb2RlIH0gZnJvbSAnLi4vdXRpbHMvcGVybWlzc2lvbnMvcGVybWlzc2lvblNldHVwLmpzJ1xuaW1wb3J0IHtcbiAgZ2V0U2NyYXRjaHBhZERpcixcbiAgaXNTY3JhdGNocGFkRW5hYmxlZCxcbn0gZnJvbSAnLi4vdXRpbHMvcGVybWlzc2lvbnMvZmlsZXN5c3RlbS5qcydcbmltcG9ydCB7IFdFQl9GRVRDSF9UT09MX05BTUUgfSBmcm9tICcuLi90b29scy9XZWJGZXRjaFRvb2wvcHJvbXB0LmpzJ1xuaW1wb3J0IHsgU0xFRVBfVE9PTF9OQU1FIH0gZnJvbSAnLi4vdG9vbHMvU2xlZXBUb29sL3Byb21wdC5qcydcbmltcG9ydCB7IGNsZWFyU3BlY3VsYXRpdmVDaGVja3MgfSBmcm9tICcuLi90b29scy9CYXNoVG9vbC9iYXNoUGVybWlzc2lvbnMuanMnXG5pbXBvcnQgdHlwZSB7IEF1dG9VcGRhdGVyUmVzdWx0IH0gZnJvbSAnLi4vdXRpbHMvYXV0b1VwZGF0ZXIuanMnXG5pbXBvcnQge1xuICBnZXRHbG9iYWxDb25maWcsXG4gIHNhdmVHbG9iYWxDb25maWcsXG4gIGdldEdsb2JhbENvbmZpZ1dyaXRlQ291bnQsXG59IGZyb20gJy4uL3V0aWxzL2NvbmZpZy5qcydcbmltcG9ydCB7IGhhc0NvbnNvbGVCaWxsaW5nQWNjZXNzIH0gZnJvbSAnLi4vdXRpbHMvYmlsbGluZy5qcydcbmltcG9ydCB7XG4gIGxvZ0V2ZW50LFxuICB0eXBlIEFuYWx5dGljc01ldGFkYXRhX0lfVkVSSUZJRURfVEhJU19JU19OT1RfQ09ERV9PUl9GSUxFUEFUSFMsXG59IGZyb20gJ3NyYy9zZXJ2aWNlcy9hbmFseXRpY3MvaW5kZXguanMnXG5pbXBvcnQgeyBnZXRGZWF0dXJlVmFsdWVfQ0FDSEVEX01BWV9CRV9TVEFMRSB9IGZyb20gJ3NyYy9zZXJ2aWNlcy9hbmFseXRpY3MvZ3Jvd3RoYm9vay5qcydcbmltcG9ydCB7XG4gIHRleHRGb3JSZXN1Ym1pdCxcbiAgaGFuZGxlTWVzc2FnZUZyb21TdHJlYW0sXG4gIHR5cGUgU3RyZWFtaW5nVG9vbFVzZSxcbiAgdHlwZSBTdHJlYW1pbmdUaGlua2luZyxcbiAgaXNDb21wYWN0Qm91bmRhcnlNZXNzYWdlLFxuICBnZXRNZXNzYWdlc0FmdGVyQ29tcGFjdEJvdW5kYXJ5LFxuICBnZXRDb250ZW50VGV4dCxcbiAgY3JlYXRlVXNlck1lc3NhZ2UsXG4gIGNyZWF0ZUFzc2lzdGFudE1lc3NhZ2UsXG4gIGNyZWF0ZVR1cm5EdXJhdGlvbk1lc3NhZ2UsXG4gIGNyZWF0ZUFnZW50c0tpbGxlZE1lc3NhZ2UsXG4gIGNyZWF0ZUFwaU1ldHJpY3NNZXNzYWdlLFxuICBjcmVhdGVTeXN0ZW1NZXNzYWdlLFxuICBjcmVhdGVDb21tYW5kSW5wdXRNZXNzYWdlLFxuICBmb3JtYXRDb21tYW5kSW5wdXRUYWdzLFxufSBmcm9tICcuLi91dGlscy9tZXNzYWdlcy5qcydcbmltcG9ydCB7IGdlbmVyYXRlU2Vzc2lvblRpdGxlIH0gZnJvbSAnLi4vdXRpbHMvc2Vzc2lvblRpdGxlLmpzJ1xuaW1wb3J0IHtcbiAgQkFTSF9JTlBVVF9UQUcsXG4gIENPTU1BTkRfTUVTU0FHRV9UQUcsXG4gIENPTU1BTkRfTkFNRV9UQUcsXG4gIExPQ0FMX0NPTU1BTkRfU1RET1VUX1RBRyxcbn0gZnJvbSAnLi4vY29uc3RhbnRzL3htbC5qcydcbmltcG9ydCB7IGVzY2FwZVhtbCB9IGZyb20gJy4uL3V0aWxzL3htbC5qcydcbmltcG9ydCB0eXBlIHsgVGhpbmtpbmdDb25maWcgfSBmcm9tICcuLi91dGlscy90aGlua2luZy5qcydcbmltcG9ydCB7IGdyYWNlZnVsU2h1dGRvd25TeW5jIH0gZnJvbSAnLi4vdXRpbHMvZ3JhY2VmdWxTaHV0ZG93bi5qcydcbmltcG9ydCB7XG4gIGhhbmRsZVByb21wdFN1Ym1pdCxcbiAgdHlwZSBQcm9tcHRJbnB1dEhlbHBlcnMsXG59IGZyb20gJy4uL3V0aWxzL2hhbmRsZVByb21wdFN1Ym1pdC5qcydcbmltcG9ydCB7IHVzZVF1ZXVlUHJvY2Vzc29yIH0gZnJvbSAnLi4vaG9va3MvdXNlUXVldWVQcm9jZXNzb3IuanMnXG5pbXBvcnQgeyB1c2VNYWlsYm94QnJpZGdlIH0gZnJvbSAnLi4vaG9va3MvdXNlTWFpbGJveEJyaWRnZS5qcydcbmltcG9ydCB7XG4gIHF1ZXJ5Q2hlY2twb2ludCxcbiAgbG9nUXVlcnlQcm9maWxlUmVwb3J0LFxufSBmcm9tICcuLi91dGlscy9xdWVyeVByb2ZpbGVyLmpzJ1xuaW1wb3J0IHR5cGUge1xuICBNZXNzYWdlIGFzIE1lc3NhZ2VUeXBlLFxuICBVc2VyTWVzc2FnZSxcbiAgUHJvZ3Jlc3NNZXNzYWdlLFxuICBIb29rUmVzdWx0TWVzc2FnZSxcbn0gZnJvbSAnLi4vdHlwZXMvbWVzc2FnZS5qcydcbmltcG9ydCB0eXBlIHsgUGFydGlhbENvbXBhY3REaXJlY3Rpb24gfSBmcm9tICcuLi90eXBlcy9wYXJ0aWFsQ29tcGFjdERpcmVjdGlvbi5qcydcbmltcG9ydCB7IHF1ZXJ5IH0gZnJvbSAnLi4vcXVlcnkuanMnXG5pbXBvcnQgeyBtZXJnZUNsaWVudHMsIHVzZU1lcmdlZENsaWVudHMgfSBmcm9tICcuLi9ob29rcy91c2VNZXJnZWRDbGllbnRzLmpzJ1xuaW1wb3J0IHsgZ2V0UXVlcnlTb3VyY2VGb3JSRVBMIH0gZnJvbSAnLi4vdXRpbHMvcHJvbXB0Q2F0ZWdvcnkuanMnXG5pbXBvcnQgeyB1c2VNZXJnZWRUb29scyB9IGZyb20gJy4uL2hvb2tzL3VzZU1lcmdlZFRvb2xzLmpzJ1xuaW1wb3J0IHsgbWVyZ2VBbmRGaWx0ZXJUb29scyB9IGZyb20gJy4uL3V0aWxzL3Rvb2xQb29sLmpzJ1xuaW1wb3J0IHsgdXNlTWVyZ2VkQ29tbWFuZHMgfSBmcm9tICcuLi9ob29rcy91c2VNZXJnZWRDb21tYW5kcy5qcydcbmltcG9ydCB7IHVzZVNraWxsc0NoYW5nZSB9IGZyb20gJy4uL2hvb2tzL3VzZVNraWxsc0NoYW5nZS5qcydcbmltcG9ydCB7IHVzZU1hbmFnZVBsdWdpbnMgfSBmcm9tICcuLi9ob29rcy91c2VNYW5hZ2VQbHVnaW5zLmpzJ1xuaW1wb3J0IHsgTWVzc2FnZXMgfSBmcm9tICcuLi9jb21wb25lbnRzL01lc3NhZ2VzLmpzJ1xuaW1wb3J0IHsgVGFza0xpc3RWMiB9IGZyb20gJy4uL2NvbXBvbmVudHMvVGFza0xpc3RWMi5qcydcbmltcG9ydCB7IFRlYW1tYXRlVmlld0hlYWRlciB9IGZyb20gJy4uL2NvbXBvbmVudHMvVGVhbW1hdGVWaWV3SGVhZGVyLmpzJ1xuaW1wb3J0IHsgdXNlVGFza3NWMldpdGhDb2xsYXBzZUVmZmVjdCB9IGZyb20gJy4uL2hvb2tzL3VzZVRhc2tzVjIuanMnXG5pbXBvcnQgeyBtYXliZU1hcmtQcm9qZWN0T25ib2FyZGluZ0NvbXBsZXRlIH0gZnJvbSAnLi4vcHJvamVjdE9uYm9hcmRpbmdTdGF0ZS5qcydcbmltcG9ydCB0eXBlIHsgTUNQU2VydmVyQ29ubmVjdGlvbiB9IGZyb20gJy4uL3NlcnZpY2VzL21jcC90eXBlcy5qcydcbmltcG9ydCB0eXBlIHsgU2NvcGVkTWNwU2VydmVyQ29uZmlnIH0gZnJvbSAnLi4vc2VydmljZXMvbWNwL3R5cGVzLmpzJ1xuaW1wb3J0IHsgcmFuZG9tVVVJRCwgdHlwZSBVVUlEIH0gZnJvbSAnY3J5cHRvJ1xuaW1wb3J0IHsgcHJvY2Vzc1Nlc3Npb25TdGFydEhvb2tzIH0gZnJvbSAnLi4vdXRpbHMvc2Vzc2lvblN0YXJ0LmpzJ1xuaW1wb3J0IHtcbiAgZXhlY3V0ZVNlc3Npb25FbmRIb29rcyxcbiAgZ2V0U2Vzc2lvbkVuZEhvb2tUaW1lb3V0TXMsXG59IGZyb20gJy4uL3V0aWxzL2hvb2tzLmpzJ1xuaW1wb3J0IHsgdHlwZSBJREVTZWxlY3Rpb24sIHVzZUlkZVNlbGVjdGlvbiB9IGZyb20gJy4uL2hvb2tzL3VzZUlkZVNlbGVjdGlvbi5qcydcbmltcG9ydCB7IGdldFRvb2xzLCBhc3NlbWJsZVRvb2xQb29sIH0gZnJvbSAnLi4vdG9vbHMuanMnXG5pbXBvcnQgdHlwZSB7IEFnZW50RGVmaW5pdGlvbiB9IGZyb20gJy4uL3Rvb2xzL0FnZW50VG9vbC9sb2FkQWdlbnRzRGlyLmpzJ1xuaW1wb3J0IHsgcmVzb2x2ZUFnZW50VG9vbHMgfSBmcm9tICcuLi90b29scy9BZ2VudFRvb2wvYWdlbnRUb29sVXRpbHMuanMnXG5pbXBvcnQgeyByZXN1bWVBZ2VudEJhY2tncm91bmQgfSBmcm9tICcuLi90b29scy9BZ2VudFRvb2wvcmVzdW1lQWdlbnQuanMnXG5pbXBvcnQgeyB1c2VNYWluTG9vcE1vZGVsIH0gZnJvbSAnLi4vaG9va3MvdXNlTWFpbkxvb3BNb2RlbC5qcydcbmltcG9ydCB7XG4gIHVzZUFwcFN0YXRlLFxuICB1c2VTZXRBcHBTdGF0ZSxcbiAgdXNlQXBwU3RhdGVTdG9yZSxcbn0gZnJvbSAnLi4vc3RhdGUvQXBwU3RhdGUuanMnXG5pbXBvcnQgdHlwZSB7XG4gIENvbnRlbnRCbG9ja1BhcmFtLFxuICBJbWFnZUJsb2NrUGFyYW0sXG59IGZyb20gJ0BhbnRocm9waWMtYWkvc2RrL3Jlc291cmNlcy9tZXNzYWdlcy5tanMnXG5pbXBvcnQgdHlwZSB7IFByb2Nlc3NVc2VySW5wdXRDb250ZXh0IH0gZnJvbSAnLi4vdXRpbHMvcHJvY2Vzc1VzZXJJbnB1dC9wcm9jZXNzVXNlcklucHV0LmpzJ1xuaW1wb3J0IHR5cGUgeyBQYXN0ZWRDb250ZW50IH0gZnJvbSAnLi4vdXRpbHMvY29uZmlnLmpzJ1xuaW1wb3J0IHtcbiAgY29weVBsYW5Gb3JGb3JrLFxuICBjb3B5UGxhbkZvclJlc3VtZSxcbiAgZ2V0UGxhblNsdWcsXG4gIHNldFBsYW5TbHVnLFxufSBmcm9tICcuLi91dGlscy9wbGFucy5qcydcbmltcG9ydCB7XG4gIGNsZWFyU2Vzc2lvbk1ldGFkYXRhLFxuICByZXNldFNlc3Npb25GaWxlUG9pbnRlcixcbiAgYWRvcHRSZXN1bWVkU2Vzc2lvbkZpbGUsXG4gIHJlbW92ZVRyYW5zY3JpcHRNZXNzYWdlLFxuICByZXN0b3JlU2Vzc2lvbk1ldGFkYXRhLFxuICBnZXRDdXJyZW50U2Vzc2lvblRpdGxlLFxuICBpc0VwaGVtZXJhbFRvb2xQcm9ncmVzcyxcbiAgaXNMb2dnYWJsZU1lc3NhZ2UsXG4gIHNhdmVXb3JrdHJlZVN0YXRlLFxuICBnZXRBZ2VudFRyYW5zY3JpcHQsXG59IGZyb20gJy4uL3V0aWxzL3Nlc3Npb25TdG9yYWdlLmpzJ1xuaW1wb3J0IHsgZGVzZXJpYWxpemVNZXNzYWdlcyB9IGZyb20gJy4uL3V0aWxzL2NvbnZlcnNhdGlvblJlY292ZXJ5LmpzJ1xuaW1wb3J0IHtcbiAgZXh0cmFjdFJlYWRGaWxlc0Zyb21NZXNzYWdlcyxcbiAgZXh0cmFjdEJhc2hUb29sc0Zyb21NZXNzYWdlcyxcbn0gZnJvbSAnLi4vdXRpbHMvcXVlcnlIZWxwZXJzLmpzJ1xuaW1wb3J0IHsgcmVzZXRNaWNyb2NvbXBhY3RTdGF0ZSB9IGZyb20gJy4uL3NlcnZpY2VzL2NvbXBhY3QvbWljcm9Db21wYWN0LmpzJ1xuaW1wb3J0IHsgcnVuUG9zdENvbXBhY3RDbGVhbnVwIH0gZnJvbSAnLi4vc2VydmljZXMvY29tcGFjdC9wb3N0Q29tcGFjdENsZWFudXAuanMnXG5pbXBvcnQge1xuICBwcm92aXNpb25Db250ZW50UmVwbGFjZW1lbnRTdGF0ZSxcbiAgcmVjb25zdHJ1Y3RDb250ZW50UmVwbGFjZW1lbnRTdGF0ZSxcbiAgdHlwZSBDb250ZW50UmVwbGFjZW1lbnRSZWNvcmQsXG59IGZyb20gJy4uL3V0aWxzL3Rvb2xSZXN1bHRTdG9yYWdlLmpzJ1xuaW1wb3J0IHsgcGFydGlhbENvbXBhY3RDb252ZXJzYXRpb24gfSBmcm9tICcuLi9zZXJ2aWNlcy9jb21wYWN0L2NvbXBhY3QuanMnXG5pbXBvcnQgdHlwZSB7IExvZ09wdGlvbiB9IGZyb20gJy4uL3R5cGVzL2xvZ3MuanMnXG5pbXBvcnQgdHlwZSB7IEFnZW50Q29sb3JOYW1lIH0gZnJvbSAnLi4vdG9vbHMvQWdlbnRUb29sL2FnZW50Q29sb3JNYW5hZ2VyLmpzJ1xuaW1wb3J0IHtcbiAgZmlsZUhpc3RvcnlNYWtlU25hcHNob3QsXG4gIHR5cGUgRmlsZUhpc3RvcnlTdGF0ZSxcbiAgZmlsZUhpc3RvcnlSZXdpbmQsXG4gIHR5cGUgRmlsZUhpc3RvcnlTbmFwc2hvdCxcbiAgY29weUZpbGVIaXN0b3J5Rm9yUmVzdW1lLFxuICBmaWxlSGlzdG9yeUVuYWJsZWQsXG4gIGZpbGVIaXN0b3J5SGFzQW55Q2hhbmdlcyxcbn0gZnJvbSAnLi4vdXRpbHMvZmlsZUhpc3RvcnkuanMnXG5pbXBvcnQge1xuICB0eXBlIEF0dHJpYnV0aW9uU3RhdGUsXG4gIGluY3JlbWVudFByb21wdENvdW50LFxufSBmcm9tICcuLi91dGlscy9jb21taXRBdHRyaWJ1dGlvbi5qcydcbmltcG9ydCB7IHJlY29yZEF0dHJpYnV0aW9uU25hcHNob3QgfSBmcm9tICcuLi91dGlscy9zZXNzaW9uU3RvcmFnZS5qcydcbmltcG9ydCB7XG4gIGNvbXB1dGVTdGFuZGFsb25lQWdlbnRDb250ZXh0LFxuICByZXN0b3JlQWdlbnRGcm9tU2Vzc2lvbixcbiAgcmVzdG9yZVNlc3Npb25TdGF0ZUZyb21Mb2csXG4gIHJlc3RvcmVXb3JrdHJlZUZvclJlc3VtZSxcbiAgZXhpdFJlc3RvcmVkV29ya3RyZWUsXG59IGZyb20gJy4uL3V0aWxzL3Nlc3Npb25SZXN0b3JlLmpzJ1xuaW1wb3J0IHtcbiAgaXNCZ1Nlc3Npb24sXG4gIHVwZGF0ZVNlc3Npb25OYW1lLFxuICB1cGRhdGVTZXNzaW9uQWN0aXZpdHksXG59IGZyb20gJy4uL3V0aWxzL2NvbmN1cnJlbnRTZXNzaW9ucy5qcydcbmltcG9ydCB7XG4gIGlzSW5Qcm9jZXNzVGVhbW1hdGVUYXNrLFxuICB0eXBlIEluUHJvY2Vzc1RlYW1tYXRlVGFza1N0YXRlLFxufSBmcm9tICcuLi90YXNrcy9JblByb2Nlc3NUZWFtbWF0ZVRhc2svdHlwZXMuanMnXG5pbXBvcnQgeyByZXN0b3JlUmVtb3RlQWdlbnRUYXNrcyB9IGZyb20gJy4uL3Rhc2tzL1JlbW90ZUFnZW50VGFzay9SZW1vdGVBZ2VudFRhc2suanMnXG5pbXBvcnQgeyB1c2VJbmJveFBvbGxlciB9IGZyb20gJy4uL2hvb2tzL3VzZUluYm94UG9sbGVyLmpzJ1xuLy8gRGVhZCBjb2RlIGVsaW1pbmF0aW9uOiBjb25kaXRpb25hbCBpbXBvcnQgZm9yIGxvb3AgbW9kZVxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuY29uc3QgcHJvYWN0aXZlTW9kdWxlID1cbiAgZmVhdHVyZSgnUFJPQUNUSVZFJykgfHwgZmVhdHVyZSgnS0FJUk9TJylcbiAgICA/IHJlcXVpcmUoJy4uL3Byb2FjdGl2ZS9pbmRleC5qcycpXG4gICAgOiBudWxsXG5jb25zdCBQUk9BQ1RJVkVfTk9fT1BfU1VCU0NSSUJFID0gKF9jYjogKCkgPT4gdm9pZCkgPT4gKCkgPT4ge31cbmNvbnN0IFBST0FDVElWRV9GQUxTRSA9ICgpID0+IGZhbHNlXG5jb25zdCBTVUdHRVNUX0JHX1BSX05PT1AgPSAoX3A6IHN0cmluZywgX246IHN0cmluZyk6IGJvb2xlYW4gPT4gZmFsc2VcbmNvbnN0IHVzZVByb2FjdGl2ZSA9XG4gIGZlYXR1cmUoJ1BST0FDVElWRScpIHx8IGZlYXR1cmUoJ0tBSVJPUycpXG4gICAgPyByZXF1aXJlKCcuLi9wcm9hY3RpdmUvdXNlUHJvYWN0aXZlLmpzJykudXNlUHJvYWN0aXZlXG4gICAgOiBudWxsXG5jb25zdCB1c2VTY2hlZHVsZWRUYXNrcyA9IGZlYXR1cmUoJ0FHRU5UX1RSSUdHRVJTJylcbiAgPyByZXF1aXJlKCcuLi9ob29rcy91c2VTY2hlZHVsZWRUYXNrcy5qcycpLnVzZVNjaGVkdWxlZFRhc2tzXG4gIDogbnVsbFxuLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzICovXG5pbXBvcnQgeyBpc0FnZW50U3dhcm1zRW5hYmxlZCB9IGZyb20gJy4uL3V0aWxzL2FnZW50U3dhcm1zRW5hYmxlZC5qcydcbmltcG9ydCB7IHVzZVRhc2tMaXN0V2F0Y2hlciB9IGZyb20gJy4uL2hvb2tzL3VzZVRhc2tMaXN0V2F0Y2hlci5qcydcbmltcG9ydCB0eXBlIHtcbiAgU2FuZGJveEFza0NhbGxiYWNrLFxuICBOZXR3b3JrSG9zdFBhdHRlcm4sXG59IGZyb20gJy4uL3V0aWxzL3NhbmRib3gvc2FuZGJveC1hZGFwdGVyLmpzJ1xuXG5pbXBvcnQge1xuICB0eXBlIElERUV4dGVuc2lvbkluc3RhbGxhdGlvblN0YXR1cyxcbiAgY2xvc2VPcGVuRGlmZnMsXG4gIGdldENvbm5lY3RlZElkZUNsaWVudCxcbiAgdHlwZSBJZGVUeXBlLFxufSBmcm9tICcuLi91dGlscy9pZGUuanMnXG5pbXBvcnQgeyB1c2VJREVJbnRlZ3JhdGlvbiB9IGZyb20gJy4uL2hvb2tzL3VzZUlERUludGVncmF0aW9uLmpzJ1xuaW1wb3J0IGV4aXQgZnJvbSAnLi4vY29tbWFuZHMvZXhpdC9pbmRleC5qcydcbmltcG9ydCB7IEV4aXRGbG93IH0gZnJvbSAnLi4vY29tcG9uZW50cy9FeGl0Rmxvdy5qcydcbmltcG9ydCB7IGdldEN1cnJlbnRXb3JrdHJlZVNlc3Npb24gfSBmcm9tICcuLi91dGlscy93b3JrdHJlZS5qcydcbmltcG9ydCB7XG4gIHBvcEFsbEVkaXRhYmxlLFxuICBlbnF1ZXVlLFxuICB0eXBlIFNldEFwcFN0YXRlLFxuICBnZXRDb21tYW5kUXVldWUsXG4gIGdldENvbW1hbmRRdWV1ZUxlbmd0aCxcbiAgcmVtb3ZlQnlGaWx0ZXIsXG59IGZyb20gJy4uL3V0aWxzL21lc3NhZ2VRdWV1ZU1hbmFnZXIuanMnXG5pbXBvcnQgeyB1c2VDb21tYW5kUXVldWUgfSBmcm9tICcuLi9ob29rcy91c2VDb21tYW5kUXVldWUuanMnXG5pbXBvcnQgeyBTZXNzaW9uQmFja2dyb3VuZEhpbnQgfSBmcm9tICcuLi9jb21wb25lbnRzL1Nlc3Npb25CYWNrZ3JvdW5kSGludC5qcydcbmltcG9ydCB7IHN0YXJ0QmFja2dyb3VuZFNlc3Npb24gfSBmcm9tICcuLi90YXNrcy9Mb2NhbE1haW5TZXNzaW9uVGFzay5qcydcbmltcG9ydCB7IHVzZVNlc3Npb25CYWNrZ3JvdW5kaW5nIH0gZnJvbSAnLi4vaG9va3MvdXNlU2Vzc2lvbkJhY2tncm91bmRpbmcuanMnXG5pbXBvcnQgeyBkaWFnbm9zdGljVHJhY2tlciB9IGZyb20gJy4uL3NlcnZpY2VzL2RpYWdub3N0aWNUcmFja2luZy5qcydcbmltcG9ydCB7XG4gIGhhbmRsZVNwZWN1bGF0aW9uQWNjZXB0LFxuICB0eXBlIEFjdGl2ZVNwZWN1bGF0aW9uU3RhdGUsXG59IGZyb20gJy4uL3NlcnZpY2VzL1Byb21wdFN1Z2dlc3Rpb24vc3BlY3VsYXRpb24uanMnXG5pbXBvcnQgeyBJZGVPbmJvYXJkaW5nRGlhbG9nIH0gZnJvbSAnLi4vY29tcG9uZW50cy9JZGVPbmJvYXJkaW5nRGlhbG9nLmpzJ1xuaW1wb3J0IHtcbiAgRWZmb3J0Q2FsbG91dCxcbiAgc2hvdWxkU2hvd0VmZm9ydENhbGxvdXQsXG59IGZyb20gJy4uL2NvbXBvbmVudHMvRWZmb3J0Q2FsbG91dC5qcydcbmltcG9ydCB0eXBlIHsgRWZmb3J0VmFsdWUgfSBmcm9tICcuLi91dGlscy9lZmZvcnQuanMnXG5pbXBvcnQgeyBSZW1vdGVDYWxsb3V0IH0gZnJvbSAnLi4vY29tcG9uZW50cy9SZW1vdGVDYWxsb3V0LmpzJ1xuLyogZXNsaW50LWRpc2FibGUgY3VzdG9tLXJ1bGVzL25vLXByb2Nlc3MtZW52LXRvcC1sZXZlbCwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuY29uc3QgQW50TW9kZWxTd2l0Y2hDYWxsb3V0ID1cbiAgXCJleHRlcm5hbFwiID09PSAnYW50J1xuICAgID8gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9BbnRNb2RlbFN3aXRjaENhbGxvdXQuanMnKS5BbnRNb2RlbFN3aXRjaENhbGxvdXRcbiAgICA6IG51bGxcbmNvbnN0IHNob3VsZFNob3dBbnRNb2RlbFN3aXRjaCA9XG4gIFwiZXh0ZXJuYWxcIiA9PT0gJ2FudCdcbiAgICA/IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvQW50TW9kZWxTd2l0Y2hDYWxsb3V0LmpzJylcbiAgICAgICAgLnNob3VsZFNob3dNb2RlbFN3aXRjaENhbGxvdXRcbiAgICA6ICgpOiBib29sZWFuID0+IGZhbHNlXG5jb25zdCBVbmRlcmNvdmVyQXV0b0NhbGxvdXQgPVxuICBcImV4dGVybmFsXCIgPT09ICdhbnQnXG4gICAgPyByZXF1aXJlKCcuLi9jb21wb25lbnRzL1VuZGVyY292ZXJBdXRvQ2FsbG91dC5qcycpLlVuZGVyY292ZXJBdXRvQ2FsbG91dFxuICAgIDogbnVsbFxuLyogZXNsaW50LWVuYWJsZSBjdXN0b20tcnVsZXMvbm8tcHJvY2Vzcy1lbnYtdG9wLWxldmVsLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzICovXG5pbXBvcnQgeyBhY3Rpdml0eU1hbmFnZXIgfSBmcm9tICcuLi91dGlscy9hY3Rpdml0eU1hbmFnZXIuanMnXG5pbXBvcnQgeyBjcmVhdGVBYm9ydENvbnRyb2xsZXIgfSBmcm9tICcuLi91dGlscy9hYm9ydENvbnRyb2xsZXIuanMnXG5pbXBvcnQgeyBNQ1BDb25uZWN0aW9uTWFuYWdlciB9IGZyb20gJ3NyYy9zZXJ2aWNlcy9tY3AvTUNQQ29ubmVjdGlvbk1hbmFnZXIuanMnXG5pbXBvcnQgeyB1c2VGZWVkYmFja1N1cnZleSB9IGZyb20gJ3NyYy9jb21wb25lbnRzL0ZlZWRiYWNrU3VydmV5L3VzZUZlZWRiYWNrU3VydmV5LmpzJ1xuaW1wb3J0IHsgdXNlTWVtb3J5U3VydmV5IH0gZnJvbSAnc3JjL2NvbXBvbmVudHMvRmVlZGJhY2tTdXJ2ZXkvdXNlTWVtb3J5U3VydmV5LmpzJ1xuaW1wb3J0IHsgdXNlUG9zdENvbXBhY3RTdXJ2ZXkgfSBmcm9tICdzcmMvY29tcG9uZW50cy9GZWVkYmFja1N1cnZleS91c2VQb3N0Q29tcGFjdFN1cnZleS5qcydcbmltcG9ydCB7IEZlZWRiYWNrU3VydmV5IH0gZnJvbSAnc3JjL2NvbXBvbmVudHMvRmVlZGJhY2tTdXJ2ZXkvRmVlZGJhY2tTdXJ2ZXkuanMnXG5pbXBvcnQgeyB1c2VJbnN0YWxsTWVzc2FnZXMgfSBmcm9tICdzcmMvaG9va3Mvbm90aWZzL3VzZUluc3RhbGxNZXNzYWdlcy5qcydcbmltcG9ydCB7IHVzZUF3YXlTdW1tYXJ5IH0gZnJvbSAnc3JjL2hvb2tzL3VzZUF3YXlTdW1tYXJ5LmpzJ1xuaW1wb3J0IHsgdXNlQ2hyb21lRXh0ZW5zaW9uTm90aWZpY2F0aW9uIH0gZnJvbSAnc3JjL2hvb2tzL3VzZUNocm9tZUV4dGVuc2lvbk5vdGlmaWNhdGlvbi5qcydcbmltcG9ydCB7IHVzZU9mZmljaWFsTWFya2V0cGxhY2VOb3RpZmljYXRpb24gfSBmcm9tICdzcmMvaG9va3MvdXNlT2ZmaWNpYWxNYXJrZXRwbGFjZU5vdGlmaWNhdGlvbi5qcydcbmltcG9ydCB7IHVzZVByb21wdHNGcm9tQ2xhdWRlSW5DaHJvbWUgfSBmcm9tICdzcmMvaG9va3MvdXNlUHJvbXB0c0Zyb21DbGF1ZGVJbkNocm9tZS5qcydcbmltcG9ydCB7XG4gIGdldFRpcFRvU2hvd09uU3Bpbm5lcixcbiAgcmVjb3JkU2hvd25UaXAsXG59IGZyb20gJ3NyYy9zZXJ2aWNlcy90aXBzL3RpcFNjaGVkdWxlci5qcydcbmltcG9ydCB0eXBlIHsgVGhlbWUgfSBmcm9tICdzcmMvdXRpbHMvdGhlbWUuanMnXG5pbXBvcnQge1xuICBjaGVja0FuZERpc2FibGVCeXBhc3NQZXJtaXNzaW9uc0lmTmVlZGVkLFxuICBjaGVja0FuZERpc2FibGVBdXRvTW9kZUlmTmVlZGVkLFxuICB1c2VLaWNrT2ZmQ2hlY2tBbmREaXNhYmxlQnlwYXNzUGVybWlzc2lvbnNJZk5lZWRlZCxcbiAgdXNlS2lja09mZkNoZWNrQW5kRGlzYWJsZUF1dG9Nb2RlSWZOZWVkZWQsXG59IGZyb20gJ3NyYy91dGlscy9wZXJtaXNzaW9ucy9ieXBhc3NQZXJtaXNzaW9uc0tpbGxzd2l0Y2guanMnXG5pbXBvcnQgeyBTYW5kYm94TWFuYWdlciB9IGZyb20gJ3NyYy91dGlscy9zYW5kYm94L3NhbmRib3gtYWRhcHRlci5qcydcbmltcG9ydCB7IFNBTkRCT1hfTkVUV09SS19BQ0NFU1NfVE9PTF9OQU1FIH0gZnJvbSAnc3JjL2NsaS9zdHJ1Y3R1cmVkSU8uanMnXG5pbXBvcnQgeyB1c2VGaWxlSGlzdG9yeVNuYXBzaG90SW5pdCB9IGZyb20gJ3NyYy9ob29rcy91c2VGaWxlSGlzdG9yeVNuYXBzaG90SW5pdC5qcydcbmltcG9ydCB7IFNhbmRib3hQZXJtaXNzaW9uUmVxdWVzdCB9IGZyb20gJ3NyYy9jb21wb25lbnRzL3Blcm1pc3Npb25zL1NhbmRib3hQZXJtaXNzaW9uUmVxdWVzdC5qcydcbmltcG9ydCB7IFNhbmRib3hWaW9sYXRpb25FeHBhbmRlZFZpZXcgfSBmcm9tICdzcmMvY29tcG9uZW50cy9TYW5kYm94VmlvbGF0aW9uRXhwYW5kZWRWaWV3LmpzJ1xuaW1wb3J0IHsgdXNlU2V0dGluZ3NFcnJvcnMgfSBmcm9tICdzcmMvaG9va3Mvbm90aWZzL3VzZVNldHRpbmdzRXJyb3JzLmpzJ1xuaW1wb3J0IHsgdXNlTWNwQ29ubmVjdGl2aXR5U3RhdHVzIH0gZnJvbSAnc3JjL2hvb2tzL25vdGlmcy91c2VNY3BDb25uZWN0aXZpdHlTdGF0dXMuanMnXG5pbXBvcnQgeyB1c2VBdXRvTW9kZVVuYXZhaWxhYmxlTm90aWZpY2F0aW9uIH0gZnJvbSAnc3JjL2hvb2tzL25vdGlmcy91c2VBdXRvTW9kZVVuYXZhaWxhYmxlTm90aWZpY2F0aW9uLmpzJ1xuaW1wb3J0IHsgQVVUT19NT0RFX0RFU0NSSVBUSU9OIH0gZnJvbSAnc3JjL2NvbXBvbmVudHMvQXV0b01vZGVPcHRJbkRpYWxvZy5qcydcbmltcG9ydCB7IHVzZUxzcEluaXRpYWxpemF0aW9uTm90aWZpY2F0aW9uIH0gZnJvbSAnc3JjL2hvb2tzL25vdGlmcy91c2VMc3BJbml0aWFsaXphdGlvbk5vdGlmaWNhdGlvbi5qcydcbmltcG9ydCB7IHVzZUxzcFBsdWdpblJlY29tbWVuZGF0aW9uIH0gZnJvbSAnc3JjL2hvb2tzL3VzZUxzcFBsdWdpblJlY29tbWVuZGF0aW9uLmpzJ1xuaW1wb3J0IHsgTHNwUmVjb21tZW5kYXRpb25NZW51IH0gZnJvbSAnc3JjL2NvbXBvbmVudHMvTHNwUmVjb21tZW5kYXRpb24vTHNwUmVjb21tZW5kYXRpb25NZW51LmpzJ1xuaW1wb3J0IHsgdXNlQ2xhdWRlQ29kZUhpbnRSZWNvbW1lbmRhdGlvbiB9IGZyb20gJ3NyYy9ob29rcy91c2VDbGF1ZGVDb2RlSGludFJlY29tbWVuZGF0aW9uLmpzJ1xuaW1wb3J0IHsgUGx1Z2luSGludE1lbnUgfSBmcm9tICdzcmMvY29tcG9uZW50cy9DbGF1ZGVDb2RlSGludC9QbHVnaW5IaW50TWVudS5qcydcbmltcG9ydCB7XG4gIERlc2t0b3BVcHNlbGxTdGFydHVwLFxuICBzaG91bGRTaG93RGVza3RvcFVwc2VsbFN0YXJ0dXAsXG59IGZyb20gJ3NyYy9jb21wb25lbnRzL0Rlc2t0b3BVcHNlbGwvRGVza3RvcFVwc2VsbFN0YXJ0dXAuanMnXG5pbXBvcnQgeyB1c2VQbHVnaW5JbnN0YWxsYXRpb25TdGF0dXMgfSBmcm9tICdzcmMvaG9va3Mvbm90aWZzL3VzZVBsdWdpbkluc3RhbGxhdGlvblN0YXR1cy5qcydcbmltcG9ydCB7IHVzZVBsdWdpbkF1dG91cGRhdGVOb3RpZmljYXRpb24gfSBmcm9tICdzcmMvaG9va3Mvbm90aWZzL3VzZVBsdWdpbkF1dG91cGRhdGVOb3RpZmljYXRpb24uanMnXG5pbXBvcnQgeyBwZXJmb3JtU3RhcnR1cENoZWNrcyB9IGZyb20gJ3NyYy91dGlscy9wbHVnaW5zL3BlcmZvcm1TdGFydHVwQ2hlY2tzLmpzJ1xuaW1wb3J0IHsgVXNlclRleHRNZXNzYWdlIH0gZnJvbSAnc3JjL2NvbXBvbmVudHMvbWVzc2FnZXMvVXNlclRleHRNZXNzYWdlLmpzJ1xuaW1wb3J0IHsgQXdzQXV0aFN0YXR1c0JveCB9IGZyb20gJy4uL2NvbXBvbmVudHMvQXdzQXV0aFN0YXR1c0JveC5qcydcbmltcG9ydCB7IHVzZVJhdGVMaW1pdFdhcm5pbmdOb3RpZmljYXRpb24gfSBmcm9tICdzcmMvaG9va3Mvbm90aWZzL3VzZVJhdGVMaW1pdFdhcm5pbmdOb3RpZmljYXRpb24uanMnXG5pbXBvcnQgeyB1c2VEZXByZWNhdGlvbldhcm5pbmdOb3RpZmljYXRpb24gfSBmcm9tICdzcmMvaG9va3Mvbm90aWZzL3VzZURlcHJlY2F0aW9uV2FybmluZ05vdGlmaWNhdGlvbi5qcydcbmltcG9ydCB7IHVzZU5wbURlcHJlY2F0aW9uTm90aWZpY2F0aW9uIH0gZnJvbSAnc3JjL2hvb2tzL25vdGlmcy91c2VOcG1EZXByZWNhdGlvbk5vdGlmaWNhdGlvbi5qcydcbmltcG9ydCB7IHVzZUlERVN0YXR1c0luZGljYXRvciB9IGZyb20gJ3NyYy9ob29rcy9ub3RpZnMvdXNlSURFU3RhdHVzSW5kaWNhdG9yLmpzJ1xuaW1wb3J0IHsgdXNlTW9kZWxNaWdyYXRpb25Ob3RpZmljYXRpb25zIH0gZnJvbSAnc3JjL2hvb2tzL25vdGlmcy91c2VNb2RlbE1pZ3JhdGlvbk5vdGlmaWNhdGlvbnMuanMnXG5pbXBvcnQgeyB1c2VDYW5Td2l0Y2hUb0V4aXN0aW5nU3Vic2NyaXB0aW9uIH0gZnJvbSAnc3JjL2hvb2tzL25vdGlmcy91c2VDYW5Td2l0Y2hUb0V4aXN0aW5nU3Vic2NyaXB0aW9uLmpzJ1xuaW1wb3J0IHsgdXNlVGVhbW1hdGVMaWZlY3ljbGVOb3RpZmljYXRpb24gfSBmcm9tICdzcmMvaG9va3Mvbm90aWZzL3VzZVRlYW1tYXRlU2h1dGRvd25Ob3RpZmljYXRpb24uanMnXG5pbXBvcnQgeyB1c2VGYXN0TW9kZU5vdGlmaWNhdGlvbiB9IGZyb20gJ3NyYy9ob29rcy9ub3RpZnMvdXNlRmFzdE1vZGVOb3RpZmljYXRpb24uanMnXG5pbXBvcnQge1xuICBBdXRvUnVuSXNzdWVOb3RpZmljYXRpb24sXG4gIHNob3VsZEF1dG9SdW5Jc3N1ZSxcbiAgZ2V0QXV0b1J1bklzc3VlUmVhc29uVGV4dCxcbiAgZ2V0QXV0b1J1bkNvbW1hbmQsXG4gIHR5cGUgQXV0b1J1bklzc3VlUmVhc29uLFxufSBmcm9tICcuLi91dGlscy9hdXRvUnVuSXNzdWUuanMnXG5pbXBvcnQgdHlwZSB7IEhvb2tQcm9ncmVzcyB9IGZyb20gJy4uL3R5cGVzL2hvb2tzLmpzJ1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuLy8gS2VlcCB0aGUgaW1wb3J0IGJlaGluZCB0aGUgc2FtZSBsaXRlcmFsIGNvbmRpdGlvbiBhcyB0aGUgZXhpc3RpbmcgcmVuZGVyLlxuY29uc3QgVHVuZ3N0ZW5MaXZlTW9uaXRvciA9XG4gIFwiZXh0ZXJuYWxcIiA9PT0gJ2FudCdcbiAgICA/IHJlcXVpcmUoJy4uL3Rvb2xzL1R1bmdzdGVuVG9vbC9UdW5nc3RlbkxpdmVNb25pdG9yLmpzJykuVHVuZ3N0ZW5MaXZlTW9uaXRvclxuICAgIDogbnVsbFxuY29uc3QgV2ViQnJvd3NlclBhbmVsTW9kdWxlID0gZmVhdHVyZSgnV0VCX0JST1dTRVJfVE9PTCcpXG4gID8gKHJlcXVpcmUoJy4uL3Rvb2xzL1dlYkJyb3dzZXJUb29sL1dlYkJyb3dzZXJQYW5lbC5qcycpIGFzIHR5cGVvZiBpbXBvcnQoJy4uL3Rvb2xzL1dlYkJyb3dzZXJUb29sL1dlYkJyb3dzZXJQYW5lbC5qcycpKVxuICA6IG51bGxcbi8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuaW1wb3J0IHsgSXNzdWVGbGFnQmFubmVyIH0gZnJvbSAnLi4vY29tcG9uZW50cy9Qcm9tcHRJbnB1dC9Jc3N1ZUZsYWdCYW5uZXIuanMnXG5pbXBvcnQgeyB1c2VJc3N1ZUZsYWdCYW5uZXIgfSBmcm9tICcuLi9ob29rcy91c2VJc3N1ZUZsYWdCYW5uZXIuanMnXG5pbXBvcnQge1xuICBDb21wYW5pb25TcHJpdGUsXG4gIENvbXBhbmlvbkZsb2F0aW5nQnViYmxlLFxuICBNSU5fQ09MU19GT1JfRlVMTF9TUFJJVEUsXG59IGZyb20gJy4uL2J1ZGR5L0NvbXBhbmlvblNwcml0ZS5qcydcbmltcG9ydCB7IERldkJhciB9IGZyb20gJy4uL2NvbXBvbmVudHMvRGV2QmFyLmpzJ1xuLy8gU2Vzc2lvbiBtYW5hZ2VyIHJlbW92ZWQgLSB1c2luZyBBcHBTdGF0ZSBub3dcbmltcG9ydCB0eXBlIHsgUmVtb3RlU2Vzc2lvbkNvbmZpZyB9IGZyb20gJy4uL3JlbW90ZS9SZW1vdGVTZXNzaW9uTWFuYWdlci5qcydcbmltcG9ydCB7IFJFTU9URV9TQUZFX0NPTU1BTkRTIH0gZnJvbSAnLi4vY29tbWFuZHMuanMnXG5pbXBvcnQgdHlwZSB7IFJlbW90ZU1lc3NhZ2VDb250ZW50IH0gZnJvbSAnLi4vdXRpbHMvdGVsZXBvcnQvYXBpLmpzJ1xuaW1wb3J0IHtcbiAgRnVsbHNjcmVlbkxheW91dCxcbiAgdXNlVW5zZWVuRGl2aWRlcixcbiAgY29tcHV0ZVVuc2VlbkRpdmlkZXIsXG59IGZyb20gJy4uL2NvbXBvbmVudHMvRnVsbHNjcmVlbkxheW91dC5qcydcbmltcG9ydCB7XG4gIGlzRnVsbHNjcmVlbkVudkVuYWJsZWQsXG4gIG1heWJlR2V0VG11eE1vdXNlSGludCxcbiAgaXNNb3VzZVRyYWNraW5nRW5hYmxlZCxcbn0gZnJvbSAnLi4vdXRpbHMvZnVsbHNjcmVlbi5qcydcbmltcG9ydCB7IEFsdGVybmF0ZVNjcmVlbiB9IGZyb20gJy4uL2luay9jb21wb25lbnRzL0FsdGVybmF0ZVNjcmVlbi5qcydcbmltcG9ydCB7IFNjcm9sbEtleWJpbmRpbmdIYW5kbGVyIH0gZnJvbSAnLi4vY29tcG9uZW50cy9TY3JvbGxLZXliaW5kaW5nSGFuZGxlci5qcydcbmltcG9ydCB7XG4gIHVzZU1lc3NhZ2VBY3Rpb25zLFxuICBNZXNzYWdlQWN0aW9uc0tleWJpbmRpbmdzLFxuICBNZXNzYWdlQWN0aW9uc0JhcixcbiAgdHlwZSBNZXNzYWdlQWN0aW9uc1N0YXRlLFxuICB0eXBlIE1lc3NhZ2VBY3Rpb25zTmF2LFxuICB0eXBlIE1lc3NhZ2VBY3Rpb25DYXBzLFxufSBmcm9tICcuLi9jb21wb25lbnRzL21lc3NhZ2VBY3Rpb25zLmpzJ1xuaW1wb3J0IHsgc2V0Q2xpcGJvYXJkIH0gZnJvbSAnLi4vaW5rL3Rlcm1pby9vc2MuanMnXG5pbXBvcnQgdHlwZSB7IFNjcm9sbEJveEhhbmRsZSB9IGZyb20gJy4uL2luay9jb21wb25lbnRzL1Njcm9sbEJveC5qcydcbmltcG9ydCB7XG4gIGNyZWF0ZUF0dGFjaG1lbnRNZXNzYWdlLFxuICBnZXRRdWV1ZWRDb21tYW5kQXR0YWNobWVudHMsXG59IGZyb20gJy4uL3V0aWxzL2F0dGFjaG1lbnRzLmpzJ1xuXG4vLyBTdGFibGUgZW1wdHkgYXJyYXkgZm9yIGhvb2tzIHRoYXQgYWNjZXB0IE1DUFNlcnZlckNvbm5lY3Rpb25bXSDigJQgYXZvaWRzXG4vLyBjcmVhdGluZyBhIG5ldyBbXSBsaXRlcmFsIG9uIGV2ZXJ5IHJlbmRlciBpbiByZW1vdGUgbW9kZSwgd2hpY2ggd291bGRcbi8vIGNhdXNlIHVzZUVmZmVjdCBkZXBlbmRlbmN5IGNoYW5nZXMgYW5kIGluZmluaXRlIHJlLXJlbmRlciBsb29wcy5cbmNvbnN0IEVNUFRZX01DUF9DTElFTlRTOiBNQ1BTZXJ2ZXJDb25uZWN0aW9uW10gPSBbXVxuXG4vLyBTdGFibGUgc3R1YiBmb3IgdXNlQXNzaXN0YW50SGlzdG9yeSdzIG5vbi1LQUlST1MgYnJhbmNoIOKAlCBhdm9pZHMgYSBuZXdcbi8vIGZ1bmN0aW9uIGlkZW50aXR5IGVhY2ggcmVuZGVyLCB3aGljaCB3b3VsZCBicmVhayBjb21wb3NlZE9uU2Nyb2xsJ3MgbWVtby5cbmNvbnN0IEhJU1RPUllfU1RVQiA9IHsgbWF5YmVMb2FkT2xkZXI6IChfOiBTY3JvbGxCb3hIYW5kbGUpID0+IHt9IH1cbi8vIFdpbmRvdyBhZnRlciBhIHVzZXItaW5pdGlhdGVkIHNjcm9sbCBkdXJpbmcgd2hpY2ggdHlwZS1pbnRvLWVtcHR5IGRvZXMgTk9UXG4vLyByZXBpbiB0byBib3R0b20uIEpvc2ggUm9zZW4ncyB3b3JrZmxvdzogQ2xhdWRlIGVtaXRzIGxvbmcgb3V0cHV0IOKGkiBzY3JvbGxcbi8vIHVwIHRvIHJlYWQgdGhlIHN0YXJ0IOKGkiBzdGFydCB0eXBpbmcg4oaSIGJlZm9yZSB0aGlzIGZpeCwgc25hcHBlZCB0byBib3R0b20uXG4vLyBodHRwczovL2FudGhyb3BpYy5zbGFjay5jb20vYXJjaGl2ZXMvQzA3VkJTSFY3RVYvcDE3NzM1NDU0NDk4NzE3MzlcbmNvbnN0IFJFQ0VOVF9TQ1JPTExfUkVQSU5fV0lORE9XX01TID0gMzAwMFxuXG4vLyBVc2UgTFJVIGNhY2hlIHRvIHByZXZlbnQgdW5ib3VuZGVkIG1lbW9yeSBncm93dGhcbi8vIDEwMCBmaWxlcyBzaG91bGQgYmUgc3VmZmljaWVudCBmb3IgbW9zdCBjb2Rpbmcgc2Vzc2lvbnMgd2hpbGUgcHJldmVudGluZ1xuLy8gbWVtb3J5IGlzc3VlcyB3aGVuIHdvcmtpbmcgYWNyb3NzIG1hbnkgZmlsZXMgaW4gbGFyZ2UgcHJvamVjdHNcblxuZnVuY3Rpb24gbWVkaWFuKHZhbHVlczogbnVtYmVyW10pOiBudW1iZXIge1xuICBjb25zdCBzb3J0ZWQgPSBbLi4udmFsdWVzXS5zb3J0KChhLCBiKSA9PiBhIC0gYilcbiAgY29uc3QgbWlkID0gTWF0aC5mbG9vcihzb3J0ZWQubGVuZ3RoIC8gMilcbiAgcmV0dXJuIHNvcnRlZC5sZW5ndGggJSAyID09PSAwXG4gICAgPyBNYXRoLnJvdW5kKChzb3J0ZWRbbWlkIC0gMV0hICsgc29ydGVkW21pZF0hKSAvIDIpXG4gICAgOiBzb3J0ZWRbbWlkXSFcbn1cblxuLyoqXG4gKiBTbWFsbCBjb21wb25lbnQgdG8gZGlzcGxheSB0cmFuc2NyaXB0IG1vZGUgZm9vdGVyIHdpdGggZHluYW1pYyBrZXliaW5kaW5nLlxuICogTXVzdCBiZSByZW5kZXJlZCBpbnNpZGUgS2V5YmluZGluZ1NldHVwIHRvIGFjY2VzcyBrZXliaW5kaW5nIGNvbnRleHQuXG4gKi9cbmZ1bmN0aW9uIFRyYW5zY3JpcHRNb2RlRm9vdGVyKHtcbiAgc2hvd0FsbEluVHJhbnNjcmlwdCxcbiAgdmlydHVhbFNjcm9sbCxcbiAgc2VhcmNoQmFkZ2UsXG4gIHN1cHByZXNzU2hvd0FsbCA9IGZhbHNlLFxuICBzdGF0dXMsXG59OiB7XG4gIHNob3dBbGxJblRyYW5zY3JpcHQ6IGJvb2xlYW5cbiAgdmlydHVhbFNjcm9sbDogYm9vbGVhblxuICAvKiogTWluaW1hcCB3aGlsZSBuYXZpZ2F0aW5nIGEgY2xvc2VkLWJhciBzZWFyY2guIFNob3dzIG4vTiBoaW50cyArXG4gICAqICByaWdodC1hbGlnbmVkIGNvdW50IGluc3RlYWQgb2Ygc2Nyb2xsIGhpbnRzLiAqL1xuICBzZWFyY2hCYWRnZT86IHsgY3VycmVudDogbnVtYmVyOyBjb3VudDogbnVtYmVyIH1cbiAgLyoqIEhpZGUgdGhlIGN0cmwrZSBoaW50LiBUaGUgWyBkdW1wIHBhdGggc2hhcmVzIHRoaXMgZm9vdGVyIHdpdGhcbiAgICogIGVudi1vcHRlZCBkdW1wIChDTEFVREVfQ09ERV9OT19GTElDS0VSPTAgLyBESVNBQkxFX1ZJUlRVQUxfU0NST0xMPTEpLFxuICAgKiAgYnV0IGN0cmwrZSBvbmx5IHdvcmtzIGluIHRoZSBlbnYgY2FzZSDigJQgdXNlR2xvYmFsS2V5YmluZGluZ3MudHN4XG4gICAqICBnYXRlcyBvbiAhdmlydHVhbFNjcm9sbEFjdGl2ZSB3aGljaCBpcyBlbnYtZGVyaXZlZCwgZG9lc24ndCBrbm93XG4gICAqICBbIGhhcHBlbmVkLiAqL1xuICBzdXBwcmVzc1Nob3dBbGw/OiBib29sZWFuXG4gIC8qKiBUcmFuc2llbnQgc3RhdHVzICh2LWZvci1lZGl0b3IgcHJvZ3Jlc3MpLiBOb3RpZmljYXRpb25zIHJlbmRlciBpbnNpZGVcbiAgICogIFByb21wdElucHV0IHdoaWNoIGlzbid0IG1vdW50ZWQgaW4gdHJhbnNjcmlwdCDigJQgYWRkTm90aWZpY2F0aW9uIHF1ZXVlc1xuICAgKiAgYnV0IG5vdGhpbmcgZHJhd3MgaXQuICovXG4gIHN0YXR1cz86IHN0cmluZ1xufSk6IFJlYWN0LlJlYWN0Tm9kZSB7XG4gIGNvbnN0IHRvZ2dsZVNob3J0Y3V0ID0gdXNlU2hvcnRjdXREaXNwbGF5KFxuICAgICdhcHA6dG9nZ2xlVHJhbnNjcmlwdCcsXG4gICAgJ0dsb2JhbCcsXG4gICAgJ2N0cmwrbycsXG4gIClcbiAgY29uc3Qgc2hvd0FsbFNob3J0Y3V0ID0gdXNlU2hvcnRjdXREaXNwbGF5KFxuICAgICd0cmFuc2NyaXB0OnRvZ2dsZVNob3dBbGwnLFxuICAgICdUcmFuc2NyaXB0JyxcbiAgICAnY3RybCtlJyxcbiAgKVxuICByZXR1cm4gKFxuICAgIDxCb3hcbiAgICAgIG5vU2VsZWN0XG4gICAgICBhbGlnbkl0ZW1zPVwiY2VudGVyXCJcbiAgICAgIGFsaWduU2VsZj1cImNlbnRlclwiXG4gICAgICBib3JkZXJUb3BEaW1Db2xvclxuICAgICAgYm9yZGVyQm90dG9tPXtmYWxzZX1cbiAgICAgIGJvcmRlckxlZnQ9e2ZhbHNlfVxuICAgICAgYm9yZGVyUmlnaHQ9e2ZhbHNlfVxuICAgICAgYm9yZGVyU3R5bGU9XCJzaW5nbGVcIlxuICAgICAgbWFyZ2luVG9wPXsxfVxuICAgICAgcGFkZGluZ0xlZnQ9ezJ9XG4gICAgICB3aWR0aD1cIjEwMCVcIlxuICAgID5cbiAgICAgIDxUZXh0IGRpbUNvbG9yPlxuICAgICAgICBTaG93aW5nIGRldGFpbGVkIHRyYW5zY3JpcHQgwrcge3RvZ2dsZVNob3J0Y3V0fSB0byB0b2dnbGVcbiAgICAgICAge3NlYXJjaEJhZGdlXG4gICAgICAgICAgPyAnIMK3IG4vTiB0byBuYXZpZ2F0ZSdcbiAgICAgICAgICA6IHZpcnR1YWxTY3JvbGxcbiAgICAgICAgICAgID8gYCDCtyAke2ZpZ3VyZXMuYXJyb3dVcH0ke2ZpZ3VyZXMuYXJyb3dEb3dufSBzY3JvbGwgwrcgaG9tZS9lbmQgdG9wL2JvdHRvbWBcbiAgICAgICAgICAgIDogc3VwcHJlc3NTaG93QWxsXG4gICAgICAgICAgICAgID8gJydcbiAgICAgICAgICAgICAgOiBgIMK3ICR7c2hvd0FsbFNob3J0Y3V0fSB0byAke3Nob3dBbGxJblRyYW5zY3JpcHQgPyAnY29sbGFwc2UnIDogJ3Nob3cgYWxsJ31gfVxuICAgICAgPC9UZXh0PlxuICAgICAge3N0YXR1cyA/IChcbiAgICAgICAgLy8gdi1mb3ItZWRpdG9yIHJlbmRlciBwcm9ncmVzcyDigJQgdHJhbnNpZW50LCBwcmVlbXB0cyB0aGUgc2VhcmNoXG4gICAgICAgIC8vIGJhZGdlIHNpbmNlIHRoZSB1c2VyIGp1c3QgcHJlc3NlZCB2IGFuZCB3YW50cyB0byBzZWUgd2hhdCdzXG4gICAgICAgIC8vIGhhcHBlbmluZy4gQ2xlYXJzIGFmdGVyIDRzLlxuICAgICAgICA8PlxuICAgICAgICAgIDxCb3ggZmxleEdyb3c9ezF9IC8+XG4gICAgICAgICAgPFRleHQ+e3N0YXR1c30gPC9UZXh0PlxuICAgICAgICA8Lz5cbiAgICAgICkgOiBzZWFyY2hCYWRnZSA/IChcbiAgICAgICAgLy8gRW5naW5lLWNvdW50ZWQg4oCUIGNsb3NlIGVub3VnaCBmb3IgYSByb3VnaCBsb2NhdGlvbiBoaW50LiBNYXlcbiAgICAgICAgLy8gZHJpZnQgZnJvbSByZW5kZXItY291bnQgZm9yIGdob3N0L3BoYW50b20gbWVzc2FnZXMuXG4gICAgICAgIDw+XG4gICAgICAgICAgPEJveCBmbGV4R3Jvdz17MX0gLz5cbiAgICAgICAgICA8VGV4dCBkaW1Db2xvcj5cbiAgICAgICAgICAgIHtzZWFyY2hCYWRnZS5jdXJyZW50fS97c2VhcmNoQmFkZ2UuY291bnR9XG4gICAgICAgICAgICB7JyAgJ31cbiAgICAgICAgICA8L1RleHQ+XG4gICAgICAgIDwvPlxuICAgICAgKSA6IG51bGx9XG4gICAgPC9Cb3g+XG4gIClcbn1cblxuLyoqIGxlc3Mtc3R5bGUgLyBiYXIuIDEtcm93LCBzYW1lIGJvcmRlci10b3Agc3R5bGluZyBhcyBUcmFuc2NyaXB0TW9kZUZvb3RlclxuICogIHNvIHN3YXBwaW5nIHRoZW0gaW4gdGhlIGJvdHRvbSBzbG90IGRvZXNuJ3Qgc2hpZnQgU2Nyb2xsQm94IGhlaWdodC5cbiAqICB1c2VTZWFyY2hJbnB1dCBoYW5kbGVzIHJlYWRsaW5lIGVkaXRpbmc7IHdlIHJlcG9ydCBxdWVyeSBjaGFuZ2VzIGFuZFxuICogIHJlbmRlciB0aGUgY291bnRlci4gSW5jcmVtZW50YWwg4oCUIHJlLXNlYXJjaCArIGhpZ2hsaWdodCBwZXIga2V5c3Ryb2tlLiAqL1xuZnVuY3Rpb24gVHJhbnNjcmlwdFNlYXJjaEJhcih7XG4gIGp1bXBSZWYsXG4gIGNvdW50LFxuICBjdXJyZW50LFxuICBvbkNsb3NlLFxuICBvbkNhbmNlbCxcbiAgc2V0SGlnaGxpZ2h0LFxuICBpbml0aWFsUXVlcnksXG59OiB7XG4gIGp1bXBSZWY6IFJlZk9iamVjdDxKdW1wSGFuZGxlIHwgbnVsbD5cbiAgY291bnQ6IG51bWJlclxuICBjdXJyZW50OiBudW1iZXJcbiAgLyoqIEVudGVyIOKAlCBjb21taXQuIFF1ZXJ5IHBlcnNpc3RzIGZvciBuL04uICovXG4gIG9uQ2xvc2U6IChsYXN0UXVlcnk6IHN0cmluZykgPT4gdm9pZFxuICAvKiogRXNjL2N0cmwrYy9jdHJsK2cg4oCUIHVuZG8gdG8gcHJlLS8gc3RhdGUuICovXG4gIG9uQ2FuY2VsOiAoKSA9PiB2b2lkXG4gIHNldEhpZ2hsaWdodDogKHF1ZXJ5OiBzdHJpbmcpID0+IHZvaWRcbiAgLy8gU2VlZCB3aXRoIHRoZSBwcmV2aW91cyBxdWVyeSAobGVzczogLyBzaG93cyBsYXN0IHBhdHRlcm4pLiBNb3VudC1maXJlXG4gIC8vIG9mIHRoZSBlZmZlY3QgcmUtc2NhbnMgd2l0aCB0aGUgc2FtZSBxdWVyeSDigJQgaWRlbXBvdGVudCAoc2FtZSBtYXRjaGVzLFxuICAvLyBuZWFyZXN0LXB0ciwgc2FtZSBoaWdobGlnaHRzKS4gVXNlciBjYW4gZWRpdCBvciBjbGVhci5cbiAgaW5pdGlhbFF1ZXJ5OiBzdHJpbmdcbn0pOiBSZWFjdC5SZWFjdE5vZGUge1xuICBjb25zdCB7IHF1ZXJ5LCBjdXJzb3JPZmZzZXQgfSA9IHVzZVNlYXJjaElucHV0KHtcbiAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICBpbml0aWFsUXVlcnksXG4gICAgb25FeGl0OiAoKSA9PiBvbkNsb3NlKHF1ZXJ5KSxcbiAgICBvbkNhbmNlbCxcbiAgfSlcbiAgLy8gSW5kZXggd2FybS11cCBydW5zIGJlZm9yZSB0aGUgcXVlcnkgZWZmZWN0IHNvIGl0IG1lYXN1cmVzIHRoZSByZWFsXG4gIC8vIGNvc3Qg4oCUIG90aGVyd2lzZSBzZXRTZWFyY2hRdWVyeSBmaWxscyB0aGUgY2FjaGUgZmlyc3QgYW5kIHdhcm1cbiAgLy8gcmVwb3J0cyB+MG1zIHdoaWxlIHRoZSB1c2VyIGZlbHQgdGhlIGFjdHVhbCBsYWcuXG4gIC8vIEZpcnN0IC8gaW4gYSB0cmFuc2NyaXB0IHNlc3Npb24gcGF5cyB0aGUgZXh0cmFjdFNlYXJjaFRleHQgY29zdC5cbiAgLy8gU3Vic2VxdWVudCAvIHJldHVybiAwIGltbWVkaWF0ZWx5IChpbmRleFdhcm1lZCByZWYgaW4gVk1MKS5cbiAgLy8gVHJhbnNjcmlwdCBpcyBmcm96ZW4gYXQgY3RybCtvIHNvIHRoZSBjYWNoZSBzdGF5cyB2YWxpZC5cbiAgLy8gSW5pdGlhbCAnYnVpbGRpbmcnIHNvIHdhcm1Eb25lIGlzIGZhbHNlIG9uIG1vdW50IOKAlCB0aGUgW3F1ZXJ5XSBlZmZlY3RcbiAgLy8gd2FpdHMgZm9yIHRoZSB3YXJtIGVmZmVjdCdzIGZpcnN0IHJlc29sdmUgaW5zdGVhZCBvZiByYWNpbmcgaXQuIFdpdGhcbiAgLy8gbnVsbCBpbml0aWFsLCB3YXJtRG9uZSB3b3VsZCBiZSB0cnVlIG9uIG1vdW50IOKGkiBbcXVlcnldIGZpcmVzIOKGklxuICAvLyBzZXRTZWFyY2hRdWVyeSBmaWxscyBjYWNoZSDihpIgd2FybSByZXBvcnRzIH4wbXMgd2hpbGUgdGhlIHVzZXIgZmVsdFxuICAvLyB0aGUgcmVhbCBsYWcuXG4gIGNvbnN0IFtpbmRleFN0YXR1cywgc2V0SW5kZXhTdGF0dXNdID0gUmVhY3QudXNlU3RhdGU8XG4gICAgJ2J1aWxkaW5nJyB8IHsgbXM6IG51bWJlciB9IHwgbnVsbFxuICA+KCdidWlsZGluZycpXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgbGV0IGFsaXZlID0gdHJ1ZVxuICAgIGNvbnN0IHdhcm0gPSBqdW1wUmVmLmN1cnJlbnQ/Lndhcm1TZWFyY2hJbmRleFxuICAgIGlmICghd2FybSkge1xuICAgICAgc2V0SW5kZXhTdGF0dXMobnVsbCkgLy8gVk1MIG5vdCBtb3VudGVkIHlldCDigJQgcmFyZSwgc2tpcCBpbmRpY2F0b3JcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBzZXRJbmRleFN0YXR1cygnYnVpbGRpbmcnKVxuICAgIHdhcm0oKS50aGVuKG1zID0+IHtcbiAgICAgIGlmICghYWxpdmUpIHJldHVyblxuICAgICAgLy8gPDIwbXMgPSBpbXBlcmNlcHRpYmxlLiBObyBwb2ludCBzaG93aW5nIFwiaW5kZXhlZCBpbiAzbXNcIi5cbiAgICAgIGlmIChtcyA8IDIwKSB7XG4gICAgICAgIHNldEluZGV4U3RhdHVzKG51bGwpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRJbmRleFN0YXR1cyh7IG1zIH0pXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gYWxpdmUgJiYgc2V0SW5kZXhTdGF0dXMobnVsbCksIDIwMDApXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgYWxpdmUgPSBmYWxzZVxuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKSAvLyBtb3VudC1vbmx5OiBiYXIgb3BlbnMgb25jZSBwZXIgL1xuICAvLyBHYXRlIHRoZSBxdWVyeSBlZmZlY3Qgb24gd2FybSBjb21wbGV0aW9uLiBzZXRIaWdobGlnaHQgc3RheXMgaW5zdGFudFxuICAvLyAoc2NyZWVuLXNwYWNlIG92ZXJsYXksIG5vIGluZGV4aW5nKS4gc2V0U2VhcmNoUXVlcnkgKHRoZSBzY2FuKSB3YWl0cy5cbiAgY29uc3Qgd2FybURvbmUgPSBpbmRleFN0YXR1cyAhPT0gJ2J1aWxkaW5nJ1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghd2FybURvbmUpIHJldHVyblxuICAgIGp1bXBSZWYuY3VycmVudD8uc2V0U2VhcmNoUXVlcnkocXVlcnkpXG4gICAgc2V0SGlnaGxpZ2h0KHF1ZXJ5KVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgW3F1ZXJ5LCB3YXJtRG9uZV0pXG4gIGNvbnN0IG9mZiA9IGN1cnNvck9mZnNldFxuICBjb25zdCBjdXJzb3JDaGFyID0gb2ZmIDwgcXVlcnkubGVuZ3RoID8gcXVlcnlbb2ZmXSA6ICcgJ1xuICByZXR1cm4gKFxuICAgIDxCb3hcbiAgICAgIGJvcmRlclRvcERpbUNvbG9yXG4gICAgICBib3JkZXJCb3R0b209e2ZhbHNlfVxuICAgICAgYm9yZGVyTGVmdD17ZmFsc2V9XG4gICAgICBib3JkZXJSaWdodD17ZmFsc2V9XG4gICAgICBib3JkZXJTdHlsZT1cInNpbmdsZVwiXG4gICAgICBtYXJnaW5Ub3A9ezF9XG4gICAgICBwYWRkaW5nTGVmdD17Mn1cbiAgICAgIHdpZHRoPVwiMTAwJVwiXG4gICAgICAvLyBhcHBseVNlYXJjaEhpZ2hsaWdodCBzY2FucyB0aGUgd2hvbGUgc2NyZWVuIGJ1ZmZlci4gVGhlIHF1ZXJ5XG4gICAgICAvLyB0ZXh0IHJlbmRlcmVkIGhlcmUgSVMgb24gc2NyZWVuIOKAlCAvZm9vIG1hdGNoZXMgaXRzIG93biAnZm9vJyBpblxuICAgICAgLy8gdGhlIGJhci4gV2l0aCBubyBjb250ZW50IG1hdGNoZXMgdGhhdCdzIHRoZSBPTkxZIHZpc2libGUgbWF0Y2gg4oaSXG4gICAgICAvLyBnZXRzIENVUlJFTlQg4oaSIHVuZGVybGluZWQuIG5vU2VsZWN0IG1ha2VzIHNlYXJjaEhpZ2hsaWdodC50czo3NlxuICAgICAgLy8gc2tpcCB0aGVzZSBjZWxscyAoc2FtZSBleGNsdXNpb24gYXMgZ3V0dGVycykuIFlvdSBjYW4ndCB0ZXh0LVxuICAgICAgLy8gc2VsZWN0IHRoZSBiYXIgZWl0aGVyOyBpdCdzIHRyYW5zaWVudCBjaHJvbWUsIGZpbmUuXG4gICAgICBub1NlbGVjdFxuICAgID5cbiAgICAgIDxUZXh0Pi88L1RleHQ+XG4gICAgICA8VGV4dD57cXVlcnkuc2xpY2UoMCwgb2ZmKX08L1RleHQ+XG4gICAgICA8VGV4dCBpbnZlcnNlPntjdXJzb3JDaGFyfTwvVGV4dD5cbiAgICAgIHtvZmYgPCBxdWVyeS5sZW5ndGggJiYgPFRleHQ+e3F1ZXJ5LnNsaWNlKG9mZiArIDEpfTwvVGV4dD59XG4gICAgICA8Qm94IGZsZXhHcm93PXsxfSAvPlxuICAgICAge2luZGV4U3RhdHVzID09PSAnYnVpbGRpbmcnID8gKFxuICAgICAgICA8VGV4dCBkaW1Db2xvcj5pbmRleGluZ+KApiA8L1RleHQ+XG4gICAgICApIDogaW5kZXhTdGF0dXMgPyAoXG4gICAgICAgIDxUZXh0IGRpbUNvbG9yPmluZGV4ZWQgaW4ge2luZGV4U3RhdHVzLm1zfW1zIDwvVGV4dD5cbiAgICAgICkgOiBjb3VudCA9PT0gMCAmJiBxdWVyeSA/IChcbiAgICAgICAgPFRleHQgY29sb3I9XCJlcnJvclwiPm5vIG1hdGNoZXMgPC9UZXh0PlxuICAgICAgKSA6IGNvdW50ID4gMCA/IChcbiAgICAgICAgLy8gRW5naW5lLWNvdW50ZWQgKGluZGV4T2Ygb24gZXh0cmFjdFNlYXJjaFRleHQpLiBNYXkgZHJpZnQgZnJvbVxuICAgICAgICAvLyByZW5kZXItY291bnQgZm9yIGdob3N0L3BoYW50b20gbWVzc2FnZXMg4oCUIGJhZGdlIGlzIGEgcm91Z2hcbiAgICAgICAgLy8gbG9jYXRpb24gaGludC4gc2NhbkVsZW1lbnQgZ2l2ZXMgZXhhY3QgcGVyLW1lc3NhZ2UgcG9zaXRpb25zXG4gICAgICAgIC8vIGJ1dCBjb3VudGluZyBBTEwgd291bGQgY29zdCB+MS0zbXMgw5cgbWF0Y2hlZC1tZXNzYWdlcy5cbiAgICAgICAgPFRleHQgZGltQ29sb3I+XG4gICAgICAgICAge2N1cnJlbnR9L3tjb3VudH1cbiAgICAgICAgICB7JyAgJ31cbiAgICAgICAgPC9UZXh0PlxuICAgICAgKSA6IG51bGx9XG4gICAgPC9Cb3g+XG4gIClcbn1cblxuY29uc3QgVElUTEVfQU5JTUFUSU9OX0ZSQU1FUyA9IFsn4qCCJywgJ+KgkCddXG5jb25zdCBUSVRMRV9TVEFUSUNfUFJFRklYID0gJ+KcsydcbmNvbnN0IFRJVExFX0FOSU1BVElPTl9JTlRFUlZBTF9NUyA9IDk2MFxuXG4vKipcbiAqIFNldHMgdGhlIHRlcm1pbmFsIHRhYiB0aXRsZSwgd2l0aCBhbiBhbmltYXRlZCBwcmVmaXggZ2x5cGggd2hpbGUgYSBxdWVyeVxuICogaXMgcnVubmluZy4gSXNvbGF0ZWQgZnJvbSBSRVBMIHNvIHRoZSA5NjBtcyBhbmltYXRpb24gdGljayByZS1yZW5kZXJzIG9ubHlcbiAqIHRoaXMgbGVhZiBjb21wb25lbnQgKHdoaWNoIHJldHVybnMgbnVsbCDigJQgcHVyZSBzaWRlLWVmZmVjdCkgaW5zdGVhZCBvZiB0aGVcbiAqIGVudGlyZSBSRVBMIHRyZWUuIEJlZm9yZSBleHRyYWN0aW9uLCB0aGUgdGljayB3YXMgfjEgUkVQTCByZW5kZXIvc2VjIGZvclxuICogdGhlIGR1cmF0aW9uIG9mIGV2ZXJ5IHR1cm4sIGRyYWdnaW5nIFByb21wdElucHV0IGFuZCBmcmllbmRzIGFsb25nLlxuICovXG5mdW5jdGlvbiBBbmltYXRlZFRlcm1pbmFsVGl0bGUoe1xuICBpc0FuaW1hdGluZyxcbiAgdGl0bGUsXG4gIGRpc2FibGVkLFxuICBub1ByZWZpeCxcbn06IHtcbiAgaXNBbmltYXRpbmc6IGJvb2xlYW5cbiAgdGl0bGU6IHN0cmluZ1xuICBkaXNhYmxlZDogYm9vbGVhblxuICBub1ByZWZpeDogYm9vbGVhblxufSk6IG51bGwge1xuICBjb25zdCB0ZXJtaW5hbEZvY3VzZWQgPSB1c2VUZXJtaW5hbEZvY3VzKClcbiAgY29uc3QgW2ZyYW1lLCBzZXRGcmFtZV0gPSB1c2VTdGF0ZSgwKVxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChkaXNhYmxlZCB8fCBub1ByZWZpeCB8fCAhaXNBbmltYXRpbmcgfHwgIXRlcm1pbmFsRm9jdXNlZCkgcmV0dXJuXG4gICAgY29uc3QgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChcbiAgICAgIHNldEZyYW1lID0+IHNldEZyYW1lKGYgPT4gKGYgKyAxKSAlIFRJVExFX0FOSU1BVElPTl9GUkFNRVMubGVuZ3RoKSxcbiAgICAgIFRJVExFX0FOSU1BVElPTl9JTlRFUlZBTF9NUyxcbiAgICAgIHNldEZyYW1lLFxuICAgIClcbiAgICByZXR1cm4gKCkgPT4gY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgfSwgW2Rpc2FibGVkLCBub1ByZWZpeCwgaXNBbmltYXRpbmcsIHRlcm1pbmFsRm9jdXNlZF0pXG4gIGNvbnN0IHByZWZpeCA9IGlzQW5pbWF0aW5nXG4gICAgPyAoVElUTEVfQU5JTUFUSU9OX0ZSQU1FU1tmcmFtZV0gPz8gVElUTEVfU1RBVElDX1BSRUZJWClcbiAgICA6IFRJVExFX1NUQVRJQ19QUkVGSVhcbiAgdXNlVGVybWluYWxUaXRsZShkaXNhYmxlZCA/IG51bGwgOiBub1ByZWZpeCA/IHRpdGxlIDogYCR7cHJlZml4fSAke3RpdGxlfWApXG4gIHJldHVybiBudWxsXG59XG5cbmV4cG9ydCB0eXBlIFByb3BzID0ge1xuICBjb21tYW5kczogQ29tbWFuZFtdXG4gIGRlYnVnOiBib29sZWFuXG4gIGluaXRpYWxUb29sczogVG9vbFtdXG4gIC8vIEluaXRpYWwgbWVzc2FnZXMgdG8gcG9wdWxhdGUgdGhlIFJFUEwgd2l0aFxuICBpbml0aWFsTWVzc2FnZXM/OiBNZXNzYWdlVHlwZVtdXG4gIC8vIERlZmVycmVkIGhvb2sgbWVzc2FnZXMgcHJvbWlzZSDigJQgUkVQTCByZW5kZXJzIGltbWVkaWF0ZWx5IGFuZCBpbmplY3RzXG4gIC8vIGhvb2sgbWVzc2FnZXMgd2hlbiB0aGV5IHJlc29sdmUuIEF3YWl0ZWQgYmVmb3JlIHRoZSBmaXJzdCBBUEkgY2FsbC5cbiAgcGVuZGluZ0hvb2tNZXNzYWdlcz86IFByb21pc2U8SG9va1Jlc3VsdE1lc3NhZ2VbXT5cbiAgaW5pdGlhbEZpbGVIaXN0b3J5U25hcHNob3RzPzogRmlsZUhpc3RvcnlTbmFwc2hvdFtdXG4gIC8vIENvbnRlbnQtcmVwbGFjZW1lbnQgcmVjb3JkcyBmcm9tIGEgcmVzdW1lZCBzZXNzaW9uJ3MgdHJhbnNjcmlwdCDigJQgdXNlZCB0b1xuICAvLyByZWNvbnN0cnVjdCBjb250ZW50UmVwbGFjZW1lbnRTdGF0ZSBzbyB0aGUgc2FtZSByZXN1bHRzIGFyZSByZS1yZXBsYWNlZFxuICBpbml0aWFsQ29udGVudFJlcGxhY2VtZW50cz86IENvbnRlbnRSZXBsYWNlbWVudFJlY29yZFtdXG4gIC8vIEluaXRpYWwgYWdlbnQgY29udGV4dCBmb3Igc2Vzc2lvbiByZXN1bWUgKG5hbWUvY29sb3Igc2V0IHZpYSAvcmVuYW1lIG9yIC9jb2xvcilcbiAgaW5pdGlhbEFnZW50TmFtZT86IHN0cmluZ1xuICBpbml0aWFsQWdlbnRDb2xvcj86IEFnZW50Q29sb3JOYW1lXG4gIG1jcENsaWVudHM/OiBNQ1BTZXJ2ZXJDb25uZWN0aW9uW11cbiAgZHluYW1pY01jcENvbmZpZz86IFJlY29yZDxzdHJpbmcsIFNjb3BlZE1jcFNlcnZlckNvbmZpZz5cbiAgYXV0b0Nvbm5lY3RJZGVGbGFnPzogYm9vbGVhblxuICBzdHJpY3RNY3BDb25maWc/OiBib29sZWFuXG4gIHN5c3RlbVByb21wdD86IHN0cmluZ1xuICBhcHBlbmRTeXN0ZW1Qcm9tcHQ/OiBzdHJpbmdcbiAgLy8gT3B0aW9uYWwgY2FsbGJhY2sgaW52b2tlZCBiZWZvcmUgcXVlcnkgZXhlY3V0aW9uXG4gIC8vIENhbGxlZCBhZnRlciB1c2VyIG1lc3NhZ2UgaXMgYWRkZWQgdG8gY29udmVyc2F0aW9uIGJ1dCBiZWZvcmUgQVBJIGNhbGxcbiAgLy8gUmV0dXJuIGZhbHNlIHRvIHByZXZlbnQgcXVlcnkgZXhlY3V0aW9uXG4gIG9uQmVmb3JlUXVlcnk/OiAoXG4gICAgaW5wdXQ6IHN0cmluZyxcbiAgICBuZXdNZXNzYWdlczogTWVzc2FnZVR5cGVbXSxcbiAgKSA9PiBQcm9taXNlPGJvb2xlYW4+XG4gIC8vIE9wdGlvbmFsIGNhbGxiYWNrIHdoZW4gYSB0dXJuIGNvbXBsZXRlcyAobW9kZWwgZmluaXNoZXMgcmVzcG9uZGluZylcbiAgb25UdXJuQ29tcGxldGU/OiAobWVzc2FnZXM6IE1lc3NhZ2VUeXBlW10pID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+XG4gIC8vIFdoZW4gdHJ1ZSwgZGlzYWJsZXMgUkVQTCBpbnB1dCAoaGlkZXMgcHJvbXB0IGFuZCBwcmV2ZW50cyBtZXNzYWdlIHNlbGVjdG9yKVxuICBkaXNhYmxlZD86IGJvb2xlYW5cbiAgLy8gT3B0aW9uYWwgYWdlbnQgZGVmaW5pdGlvbiB0byB1c2UgZm9yIHRoZSBtYWluIHRocmVhZFxuICBtYWluVGhyZWFkQWdlbnREZWZpbml0aW9uPzogQWdlbnREZWZpbml0aW9uXG4gIC8vIFdoZW4gdHJ1ZSwgZGlzYWJsZXMgYWxsIHNsYXNoIGNvbW1hbmRzXG4gIGRpc2FibGVTbGFzaENvbW1hbmRzPzogYm9vbGVhblxuICAvLyBUYXNrIGxpc3QgaWQ6IHdoZW4gc2V0LCBlbmFibGVzIHRhc2tzIG1vZGUgdGhhdCB3YXRjaGVzIGEgdGFzayBsaXN0IGFuZCBhdXRvLXByb2Nlc3NlcyB0YXNrcy5cbiAgdGFza0xpc3RJZD86IHN0cmluZ1xuICAvLyBSZW1vdGUgc2Vzc2lvbiBjb25maWcgZm9yIC0tcmVtb3RlIG1vZGUgKHVzZXMgQ0NSIGFzIGV4ZWN1dGlvbiBlbmdpbmUpXG4gIHJlbW90ZVNlc3Npb25Db25maWc/OiBSZW1vdGVTZXNzaW9uQ29uZmlnXG4gIC8vIERpcmVjdCBjb25uZWN0IGNvbmZpZyBmb3IgYGNsYXVkZSBjb25uZWN0YCBtb2RlIChjb25uZWN0cyB0byBhIGNsYXVkZSBzZXJ2ZXIpXG4gIGRpcmVjdENvbm5lY3RDb25maWc/OiBEaXJlY3RDb25uZWN0Q29uZmlnXG4gIC8vIFNTSCBzZXNzaW9uIGZvciBgY2xhdWRlIHNzaGAgbW9kZSAobG9jYWwgUkVQTCwgcmVtb3RlIHRvb2xzIG92ZXIgc3NoKVxuICBzc2hTZXNzaW9uPzogU1NIU2Vzc2lvblxuICAvLyBUaGlua2luZyBjb25maWd1cmF0aW9uIHRvIHVzZSB3aGVuIHRoaW5raW5nIGlzIGVuYWJsZWRcbiAgdGhpbmtpbmdDb25maWc6IFRoaW5raW5nQ29uZmlnXG59XG5cbmV4cG9ydCB0eXBlIFNjcmVlbiA9ICdwcm9tcHQnIHwgJ3RyYW5zY3JpcHQnXG5cbmV4cG9ydCBmdW5jdGlvbiBSRVBMKHtcbiAgY29tbWFuZHM6IGluaXRpYWxDb21tYW5kcyxcbiAgZGVidWcsXG4gIGluaXRpYWxUb29scyxcbiAgaW5pdGlhbE1lc3NhZ2VzLFxuICBwZW5kaW5nSG9va01lc3NhZ2VzLFxuICBpbml0aWFsRmlsZUhpc3RvcnlTbmFwc2hvdHMsXG4gIGluaXRpYWxDb250ZW50UmVwbGFjZW1lbnRzLFxuICBpbml0aWFsQWdlbnROYW1lLFxuICBpbml0aWFsQWdlbnRDb2xvcixcbiAgbWNwQ2xpZW50czogaW5pdGlhbE1jcENsaWVudHMsXG4gIGR5bmFtaWNNY3BDb25maWc6IGluaXRpYWxEeW5hbWljTWNwQ29uZmlnLFxuICBhdXRvQ29ubmVjdElkZUZsYWcsXG4gIHN0cmljdE1jcENvbmZpZyA9IGZhbHNlLFxuICBzeXN0ZW1Qcm9tcHQ6IGN1c3RvbVN5c3RlbVByb21wdCxcbiAgYXBwZW5kU3lzdGVtUHJvbXB0LFxuICBvbkJlZm9yZVF1ZXJ5LFxuICBvblR1cm5Db21wbGV0ZSxcbiAgZGlzYWJsZWQgPSBmYWxzZSxcbiAgbWFpblRocmVhZEFnZW50RGVmaW5pdGlvbjogaW5pdGlhbE1haW5UaHJlYWRBZ2VudERlZmluaXRpb24sXG4gIGRpc2FibGVTbGFzaENvbW1hbmRzID0gZmFsc2UsXG4gIHRhc2tMaXN0SWQsXG4gIHJlbW90ZVNlc3Npb25Db25maWcsXG4gIGRpcmVjdENvbm5lY3RDb25maWcsXG4gIHNzaFNlc3Npb24sXG4gIHRoaW5raW5nQ29uZmlnLFxufTogUHJvcHMpOiBSZWFjdC5SZWFjdE5vZGUge1xuICBjb25zdCBpc1JlbW90ZVNlc3Npb24gPSAhIXJlbW90ZVNlc3Npb25Db25maWdcblxuICAvLyBFbnYtdmFyIGdhdGVzIGhvaXN0ZWQgdG8gbW91bnQtdGltZSDigJQgaXNFbnZUcnV0aHkgZG9lcyB0b0xvd2VyQ2FzZSt0cmltK1xuICAvLyBpbmNsdWRlcywgYW5kIHRoZXNlIHdlcmUgb24gdGhlIHJlbmRlciBwYXRoIChob3QgZHVyaW5nIFBhZ2VVcCBzcGFtKS5cbiAgY29uc3QgdGl0bGVEaXNhYmxlZCA9IHVzZU1lbW8oXG4gICAgKCkgPT4gaXNFbnZUcnV0aHkocHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfRElTQUJMRV9URVJNSU5BTF9USVRMRSksXG4gICAgW10sXG4gIClcbiAgY29uc3QgbW9yZVJpZ2h0RW5hYmxlZCA9IHVzZU1lbW8oXG4gICAgKCkgPT5cbiAgICAgIFwiZXh0ZXJuYWxcIiA9PT0gJ2FudCcgJiZcbiAgICAgIGlzRW52VHJ1dGh5KHByb2Nlc3MuZW52LkNMQVVERV9NT1JFUklHSFQpLFxuICAgIFtdLFxuICApXG4gIGNvbnN0IGRpc2FibGVWaXJ0dWFsU2Nyb2xsID0gdXNlTWVtbyhcbiAgICAoKSA9PiBpc0VudlRydXRoeShwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9ESVNBQkxFX1ZJUlRVQUxfU0NST0xMKSxcbiAgICBbXSxcbiAgKVxuICBjb25zdCBkaXNhYmxlTWVzc2FnZUFjdGlvbnMgPSBmZWF0dXJlKCdNRVNTQUdFX0FDVElPTlMnKVxuICAgID8gLy8gYmlvbWUtaWdub3JlIGxpbnQvY29ycmVjdG5lc3MvdXNlSG9va0F0VG9wTGV2ZWw6IGZlYXR1cmUoKSBpcyBhIGNvbXBpbGUtdGltZSBjb25zdGFudFxuICAgICAgdXNlTWVtbyhcbiAgICAgICAgKCkgPT4gaXNFbnZUcnV0aHkocHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfRElTQUJMRV9NRVNTQUdFX0FDVElPTlMpLFxuICAgICAgICBbXSxcbiAgICAgIClcbiAgICA6IGZhbHNlXG5cbiAgLy8gTG9nIFJFUEwgbW91bnQvdW5tb3VudCBsaWZlY3ljbGVcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBsb2dGb3JEZWJ1Z2dpbmcoYFtSRVBMOm1vdW50XSBSRVBMIG1vdW50ZWQsIGRpc2FibGVkPSR7ZGlzYWJsZWR9YClcbiAgICByZXR1cm4gKCkgPT4gbG9nRm9yRGVidWdnaW5nKGBbUkVQTDp1bm1vdW50XSBSRVBMIHVubW91bnRpbmdgKVxuICB9LCBbZGlzYWJsZWRdKVxuXG4gIC8vIEFnZW50IGRlZmluaXRpb24gaXMgc3RhdGUgc28gL3Jlc3VtZSBjYW4gdXBkYXRlIGl0IG1pZC1zZXNzaW9uXG4gIGNvbnN0IFttYWluVGhyZWFkQWdlbnREZWZpbml0aW9uLCBzZXRNYWluVGhyZWFkQWdlbnREZWZpbml0aW9uXSA9IHVzZVN0YXRlKFxuICAgIGluaXRpYWxNYWluVGhyZWFkQWdlbnREZWZpbml0aW9uLFxuICApXG5cbiAgY29uc3QgdG9vbFBlcm1pc3Npb25Db250ZXh0ID0gdXNlQXBwU3RhdGUocyA9PiBzLnRvb2xQZXJtaXNzaW9uQ29udGV4dClcbiAgY29uc3QgdmVyYm9zZSA9IHVzZUFwcFN0YXRlKHMgPT4gcy52ZXJib3NlKVxuICBjb25zdCBtY3AgPSB1c2VBcHBTdGF0ZShzID0+IHMubWNwKVxuICBjb25zdCBwbHVnaW5zID0gdXNlQXBwU3RhdGUocyA9PiBzLnBsdWdpbnMpXG4gIGNvbnN0IGFnZW50RGVmaW5pdGlvbnMgPSB1c2VBcHBTdGF0ZShzID0+IHMuYWdlbnREZWZpbml0aW9ucylcbiAgY29uc3QgZmlsZUhpc3RvcnkgPSB1c2VBcHBTdGF0ZShzID0+IHMuZmlsZUhpc3RvcnkpXG4gIGNvbnN0IGluaXRpYWxNZXNzYWdlID0gdXNlQXBwU3RhdGUocyA9PiBzLmluaXRpYWxNZXNzYWdlKVxuICBjb25zdCBxdWV1ZWRDb21tYW5kcyA9IHVzZUNvbW1hbmRRdWV1ZSgpXG4gIC8vIGZlYXR1cmUoKSBpcyBhIGJ1aWxkLXRpbWUgY29uc3RhbnQg4oCUIGRlYWQgY29kZSBlbGltaW5hdGlvbiByZW1vdmVzIHRoZSBob29rXG4gIC8vIGNhbGwgZW50aXJlbHkgaW4gZXh0ZXJuYWwgYnVpbGRzLCBzbyB0aGlzIGlzIHNhZmUgZGVzcGl0ZSBsb29raW5nIGNvbmRpdGlvbmFsLlxuICAvLyBUaGVzZSBmaWVsZHMgY29udGFpbiBleGNsdWRlZCBzdHJpbmdzIHRoYXQgbXVzdCBub3QgYXBwZWFyIGluIGV4dGVybmFsIGJ1aWxkcy5cbiAgY29uc3Qgc3Bpbm5lclRpcCA9IHVzZUFwcFN0YXRlKHMgPT4gcy5zcGlubmVyVGlwKVxuICBjb25zdCBzaG93RXhwYW5kZWRUb2RvcyA9IHVzZUFwcFN0YXRlKHMgPT4gcy5leHBhbmRlZFZpZXcpID09PSAndGFza3MnXG4gIGNvbnN0IHBlbmRpbmdXb3JrZXJSZXF1ZXN0ID0gdXNlQXBwU3RhdGUocyA9PiBzLnBlbmRpbmdXb3JrZXJSZXF1ZXN0KVxuICBjb25zdCBwZW5kaW5nU2FuZGJveFJlcXVlc3QgPSB1c2VBcHBTdGF0ZShzID0+IHMucGVuZGluZ1NhbmRib3hSZXF1ZXN0KVxuICBjb25zdCB0ZWFtQ29udGV4dCA9IHVzZUFwcFN0YXRlKHMgPT4gcy50ZWFtQ29udGV4dClcbiAgY29uc3QgdGFza3MgPSB1c2VBcHBTdGF0ZShzID0+IHMudGFza3MpXG4gIGNvbnN0IHdvcmtlclNhbmRib3hQZXJtaXNzaW9ucyA9IHVzZUFwcFN0YXRlKHMgPT4gcy53b3JrZXJTYW5kYm94UGVybWlzc2lvbnMpXG4gIGNvbnN0IGVsaWNpdGF0aW9uID0gdXNlQXBwU3RhdGUocyA9PiBzLmVsaWNpdGF0aW9uKVxuICBjb25zdCB1bHRyYXBsYW5QZW5kaW5nQ2hvaWNlID0gdXNlQXBwU3RhdGUocyA9PiBzLnVsdHJhcGxhblBlbmRpbmdDaG9pY2UpXG4gIGNvbnN0IHVsdHJhcGxhbkxhdW5jaFBlbmRpbmcgPSB1c2VBcHBTdGF0ZShzID0+IHMudWx0cmFwbGFuTGF1bmNoUGVuZGluZylcbiAgY29uc3Qgdmlld2luZ0FnZW50VGFza0lkID0gdXNlQXBwU3RhdGUocyA9PiBzLnZpZXdpbmdBZ2VudFRhc2tJZClcbiAgY29uc3Qgc2V0QXBwU3RhdGUgPSB1c2VTZXRBcHBTdGF0ZSgpXG5cbiAgLy8gQm9vdHN0cmFwOiByZXRhaW5lZCBsb2NhbF9hZ2VudCB0aGF0IGhhc24ndCBsb2FkZWQgZGlzayB5ZXQg4oaSIHJlYWRcbiAgLy8gc2lkZWNoYWluIEpTT05MIGFuZCBVVUlELW1lcmdlIHdpdGggd2hhdGV2ZXIgc3RyZWFtIGhhcyBhcHBlbmRlZCBzbyBmYXIuXG4gIC8vIFN0cmVhbSBhcHBlbmRzIGltbWVkaWF0ZWx5IG9uIHJldGFpbiAobm8gZGVmZXIpOyBib290c3RyYXAgZmlsbHMgdGhlXG4gIC8vIHByZWZpeC4gRGlzay13cml0ZS1iZWZvcmUteWllbGQgbWVhbnMgbGl2ZSBpcyBhbHdheXMgYSBzdWZmaXggb2YgZGlzay5cbiAgY29uc3Qgdmlld2VkTG9jYWxBZ2VudCA9IHZpZXdpbmdBZ2VudFRhc2tJZFxuICAgID8gdGFza3Nbdmlld2luZ0FnZW50VGFza0lkXVxuICAgIDogdW5kZWZpbmVkXG4gIGNvbnN0IG5lZWRzQm9vdHN0cmFwID1cbiAgICBpc0xvY2FsQWdlbnRUYXNrKHZpZXdlZExvY2FsQWdlbnQpICYmXG4gICAgdmlld2VkTG9jYWxBZ2VudC5yZXRhaW4gJiZcbiAgICAhdmlld2VkTG9jYWxBZ2VudC5kaXNrTG9hZGVkXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCF2aWV3aW5nQWdlbnRUYXNrSWQgfHwgIW5lZWRzQm9vdHN0cmFwKSByZXR1cm5cbiAgICBjb25zdCB0YXNrSWQgPSB2aWV3aW5nQWdlbnRUYXNrSWRcbiAgICB2b2lkIGdldEFnZW50VHJhbnNjcmlwdChhc0FnZW50SWQodGFza0lkKSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgc2V0QXBwU3RhdGUocHJldiA9PiB7XG4gICAgICAgIGNvbnN0IHQgPSBwcmV2LnRhc2tzW3Rhc2tJZF1cbiAgICAgICAgaWYgKCFpc0xvY2FsQWdlbnRUYXNrKHQpIHx8IHQuZGlza0xvYWRlZCB8fCAhdC5yZXRhaW4pIHJldHVybiBwcmV2XG4gICAgICAgIGNvbnN0IGxpdmUgPSB0Lm1lc3NhZ2VzID8/IFtdXG4gICAgICAgIGNvbnN0IGxpdmVVdWlkcyA9IG5ldyBTZXQobGl2ZS5tYXAobSA9PiBtLnV1aWQpKVxuICAgICAgICBjb25zdCBkaXNrT25seSA9IHJlc3VsdFxuICAgICAgICAgID8gcmVzdWx0Lm1lc3NhZ2VzLmZpbHRlcihtID0+ICFsaXZlVXVpZHMuaGFzKG0udXVpZCkpXG4gICAgICAgICAgOiBbXVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgdGFza3M6IHtcbiAgICAgICAgICAgIC4uLnByZXYudGFza3MsXG4gICAgICAgICAgICBbdGFza0lkXToge1xuICAgICAgICAgICAgICAuLi50LFxuICAgICAgICAgICAgICBtZXNzYWdlczogWy4uLmRpc2tPbmx5LCAuLi5saXZlXSxcbiAgICAgICAgICAgICAgZGlza0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KVxuICB9LCBbdmlld2luZ0FnZW50VGFza0lkLCBuZWVkc0Jvb3RzdHJhcCwgc2V0QXBwU3RhdGVdKVxuXG4gIGNvbnN0IHN0b3JlID0gdXNlQXBwU3RhdGVTdG9yZSgpXG4gIGNvbnN0IHRlcm1pbmFsID0gdXNlVGVybWluYWxOb3RpZmljYXRpb24oKVxuICBjb25zdCBtYWluTG9vcE1vZGVsID0gdXNlTWFpbkxvb3BNb2RlbCgpXG5cbiAgLy8gTm90ZTogc3RhbmRhbG9uZUFnZW50Q29udGV4dCBpcyBpbml0aWFsaXplZCBpbiBtYWluLnRzeCAodmlhIGluaXRpYWxTdGF0ZSkgb3JcbiAgLy8gUmVzdW1lQ29udmVyc2F0aW9uLnRzeCAodmlhIHNldEFwcFN0YXRlIGJlZm9yZSByZW5kZXJpbmcgUkVQTCkgdG8gYXZvaWRcbiAgLy8gdXNlRWZmZWN0LWJhc2VkIHN0YXRlIGluaXRpYWxpemF0aW9uIG9uIG1vdW50IChwZXIgQ0xBVURFLm1kIGd1aWRlbGluZXMpXG5cbiAgLy8gTG9jYWwgc3RhdGUgZm9yIGNvbW1hbmRzIChob3QtcmVsb2FkYWJsZSB3aGVuIHNraWxsIGZpbGVzIGNoYW5nZSlcbiAgY29uc3QgW2xvY2FsQ29tbWFuZHMsIHNldExvY2FsQ29tbWFuZHNdID0gdXNlU3RhdGUoaW5pdGlhbENvbW1hbmRzKVxuXG4gIC8vIFdhdGNoIGZvciBza2lsbCBmaWxlIGNoYW5nZXMgYW5kIHJlbG9hZCBhbGwgY29tbWFuZHNcbiAgdXNlU2tpbGxzQ2hhbmdlKFxuICAgIGlzUmVtb3RlU2Vzc2lvbiA/IHVuZGVmaW5lZCA6IGdldFByb2plY3RSb290KCksXG4gICAgc2V0TG9jYWxDb21tYW5kcyxcbiAgKVxuXG4gIC8vIFRyYWNrIHByb2FjdGl2ZSBtb2RlIGZvciB0b29scyBkZXBlbmRlbmN5IC0gU2xlZXBUb29sIGZpbHRlcnMgYnkgcHJvYWN0aXZlIHN0YXRlXG4gIGNvbnN0IHByb2FjdGl2ZUFjdGl2ZSA9IFJlYWN0LnVzZVN5bmNFeHRlcm5hbFN0b3JlKFxuICAgIHByb2FjdGl2ZU1vZHVsZT8uc3Vic2NyaWJlVG9Qcm9hY3RpdmVDaGFuZ2VzID8/IFBST0FDVElWRV9OT19PUF9TVUJTQ1JJQkUsXG4gICAgcHJvYWN0aXZlTW9kdWxlPy5pc1Byb2FjdGl2ZUFjdGl2ZSA/PyBQUk9BQ1RJVkVfRkFMU0UsXG4gIClcblxuICAvLyBCcmllZlRvb2wuaXNFbmFibGVkKCkgcmVhZHMgZ2V0VXNlck1zZ09wdEluKCkgZnJvbSBib290c3RyYXAgc3RhdGUsIHdoaWNoXG4gIC8vIC9icmllZiBmbGlwcyBtaWQtc2Vzc2lvbiBhbG9uZ3NpZGUgaXNCcmllZk9ubHkuIFRoZSBtZW1vIGJlbG93IG5lZWRzIGFcbiAgLy8gUmVhY3QtdmlzaWJsZSBkZXAgdG8gcmUtcnVuIGdldFRvb2xzKCkgd2hlbiB0aGF0IGhhcHBlbnM7IGlzQnJpZWZPbmx5IGlzXG4gIC8vIHRoZSBBcHBTdGF0ZSBtaXJyb3IgdGhhdCB0cmlnZ2VycyB0aGUgcmUtcmVuZGVyLiBXaXRob3V0IHRoaXMsIHRvZ2dsaW5nXG4gIC8vIC9icmllZiBtaWQtc2Vzc2lvbiBsZWF2ZXMgdGhlIHN0YWxlIHRvb2wgbGlzdCAobm8gU2VuZFVzZXJNZXNzYWdlKSBhbmRcbiAgLy8gdGhlIG1vZGVsIGVtaXRzIHBsYWluIHRleHQgdGhlIGJyaWVmIGZpbHRlciBoaWRlcy5cbiAgY29uc3QgaXNCcmllZk9ubHkgPSB1c2VBcHBTdGF0ZShzID0+IHMuaXNCcmllZk9ubHkpXG5cbiAgY29uc3QgbG9jYWxUb29scyA9IHVzZU1lbW8oXG4gICAgKCkgPT4gZ2V0VG9vbHModG9vbFBlcm1pc3Npb25Db250ZXh0KSxcbiAgICBbdG9vbFBlcm1pc3Npb25Db250ZXh0LCBwcm9hY3RpdmVBY3RpdmUsIGlzQnJpZWZPbmx5XSxcbiAgKVxuXG4gIHVzZUtpY2tPZmZDaGVja0FuZERpc2FibGVCeXBhc3NQZXJtaXNzaW9uc0lmTmVlZGVkKClcbiAgdXNlS2lja09mZkNoZWNrQW5kRGlzYWJsZUF1dG9Nb2RlSWZOZWVkZWQoKVxuXG4gIGNvbnN0IFtkeW5hbWljTWNwQ29uZmlnLCBzZXREeW5hbWljTWNwQ29uZmlnXSA9IHVzZVN0YXRlPFxuICAgIFJlY29yZDxzdHJpbmcsIFNjb3BlZE1jcFNlcnZlckNvbmZpZz4gfCB1bmRlZmluZWRcbiAgPihpbml0aWFsRHluYW1pY01jcENvbmZpZylcblxuICBjb25zdCBvbkNoYW5nZUR5bmFtaWNNY3BDb25maWcgPSB1c2VDYWxsYmFjayhcbiAgICAoY29uZmlnOiBSZWNvcmQ8c3RyaW5nLCBTY29wZWRNY3BTZXJ2ZXJDb25maWc+KSA9PiB7XG4gICAgICBzZXREeW5hbWljTWNwQ29uZmlnKGNvbmZpZylcbiAgICB9LFxuICAgIFtzZXREeW5hbWljTWNwQ29uZmlnXSxcbiAgKVxuXG4gIGNvbnN0IFtzY3JlZW4sIHNldFNjcmVlbl0gPSB1c2VTdGF0ZTxTY3JlZW4+KCdwcm9tcHQnKVxuICBjb25zdCBbc2hvd0FsbEluVHJhbnNjcmlwdCwgc2V0U2hvd0FsbEluVHJhbnNjcmlwdF0gPSB1c2VTdGF0ZShmYWxzZSlcbiAgLy8gWyBmb3JjZXMgdGhlIGR1bXAtdG8tc2Nyb2xsYmFjayBwYXRoIGluc2lkZSB0cmFuc2NyaXB0IG1vZGUuIFNlcGFyYXRlXG4gIC8vIGZyb20gQ0xBVURFX0NPREVfTk9fRkxJQ0tFUj0wICh3aGljaCBpcyBwcm9jZXNzLWxpZmV0aW1lKSDigJQgdGhpcyBpc1xuICAvLyBlcGhlbWVyYWwsIHJlc2V0IG9uIHRyYW5zY3JpcHQgZXhpdC4gRGlhZ25vc3RpYyBlc2NhcGUgaGF0Y2ggc29cbiAgLy8gdGVybWluYWwvdG11eCBuYXRpdmUgY21kLUYgY2FuIHNlYXJjaCB0aGUgZnVsbCBmbGF0IHJlbmRlci5cbiAgY29uc3QgW2R1bXBNb2RlLCBzZXREdW1wTW9kZV0gPSB1c2VTdGF0ZShmYWxzZSlcbiAgLy8gdi1mb3ItZWRpdG9yIHJlbmRlciBwcm9ncmVzcy4gSW5saW5lIGluIHRoZSBmb290ZXIg4oCUIG5vdGlmaWNhdGlvbnNcbiAgLy8gcmVuZGVyIGluc2lkZSBQcm9tcHRJbnB1dCB3aGljaCBpc24ndCBtb3VudGVkIGluIHRyYW5zY3JpcHQuXG4gIGNvbnN0IFtlZGl0b3JTdGF0dXMsIHNldEVkaXRvclN0YXR1c10gPSB1c2VTdGF0ZSgnJylcbiAgLy8gSW5jcmVtZW50ZWQgb24gdHJhbnNjcmlwdCBleGl0LiBBc3luYyB2LXJlbmRlciBjYXB0dXJlcyB0aGlzIGF0IHN0YXJ0O1xuICAvLyBlYWNoIHN0YXR1cyB3cml0ZSBuby1vcHMgaWYgc3RhbGUgKHVzZXIgbGVmdCB0cmFuc2NyaXB0IG1pZC1yZW5kZXIg4oCUXG4gIC8vIHRoZSBzdGFibGUgc2V0U3RhdGUgd291bGQgb3RoZXJ3aXNlIHN0YW1wIGEgZ2hvc3QgdG9hc3QgaW50byB0aGUgbmV4dFxuICAvLyBzZXNzaW9uKS4gQWxzbyBjbGVhcnMgYW55IHBlbmRpbmcgNHMgYXV0by1jbGVhci5cbiAgY29uc3QgZWRpdG9yR2VuUmVmID0gdXNlUmVmKDApXG4gIGNvbnN0IGVkaXRvclRpbWVyUmVmID0gdXNlUmVmPFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgdW5kZWZpbmVkPihcbiAgICB1bmRlZmluZWQsXG4gIClcbiAgY29uc3QgZWRpdG9yUmVuZGVyaW5nUmVmID0gdXNlUmVmKGZhbHNlKVxuICBjb25zdCB7IGFkZE5vdGlmaWNhdGlvbiwgcmVtb3ZlTm90aWZpY2F0aW9uIH0gPSB1c2VOb3RpZmljYXRpb25zKClcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJlZmVyLWNvbnN0XG4gIGxldCB0cnlTdWdnZXN0QmdQUkludGVyY2VwdCA9IFNVR0dFU1RfQkdfUFJfTk9PUFxuXG4gIGNvbnN0IG1jcENsaWVudHMgPSB1c2VNZXJnZWRDbGllbnRzKGluaXRpYWxNY3BDbGllbnRzLCBtY3AuY2xpZW50cylcblxuICAvLyBJREUgaW50ZWdyYXRpb25cbiAgY29uc3QgW2lkZVNlbGVjdGlvbiwgc2V0SURFU2VsZWN0aW9uXSA9IHVzZVN0YXRlPElERVNlbGVjdGlvbiB8IHVuZGVmaW5lZD4oXG4gICAgdW5kZWZpbmVkLFxuICApXG4gIGNvbnN0IFtpZGVUb0luc3RhbGxFeHRlbnNpb24sIHNldElERVRvSW5zdGFsbEV4dGVuc2lvbl0gPVxuICAgIHVzZVN0YXRlPElkZVR5cGUgfCBudWxsPihudWxsKVxuICBjb25zdCBbaWRlSW5zdGFsbGF0aW9uU3RhdHVzLCBzZXRJREVJbnN0YWxsYXRpb25TdGF0dXNdID1cbiAgICB1c2VTdGF0ZTxJREVFeHRlbnNpb25JbnN0YWxsYXRpb25TdGF0dXMgfCBudWxsPihudWxsKVxuICBjb25zdCBbc2hvd0lkZU9uYm9hcmRpbmcsIHNldFNob3dJZGVPbmJvYXJkaW5nXSA9IHVzZVN0YXRlKGZhbHNlKVxuICAvLyBEZWFkIGNvZGUgZWxpbWluYXRpb246IG1vZGVsIHN3aXRjaCBjYWxsb3V0IHN0YXRlIChhbnQtb25seSlcbiAgY29uc3QgW3Nob3dNb2RlbFN3aXRjaENhbGxvdXQsIHNldFNob3dNb2RlbFN3aXRjaENhbGxvdXRdID0gdXNlU3RhdGUoKCkgPT4ge1xuICAgIGlmIChcImV4dGVybmFsXCIgPT09ICdhbnQnKSB7XG4gICAgICByZXR1cm4gc2hvdWxkU2hvd0FudE1vZGVsU3dpdGNoKClcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0pXG4gIGNvbnN0IFtzaG93RWZmb3J0Q2FsbG91dCwgc2V0U2hvd0VmZm9ydENhbGxvdXRdID0gdXNlU3RhdGUoKCkgPT5cbiAgICBzaG91bGRTaG93RWZmb3J0Q2FsbG91dChtYWluTG9vcE1vZGVsKSxcbiAgKVxuICBjb25zdCBzaG93UmVtb3RlQ2FsbG91dCA9IHVzZUFwcFN0YXRlKHMgPT4gcy5zaG93UmVtb3RlQ2FsbG91dClcbiAgY29uc3QgW3Nob3dEZXNrdG9wVXBzZWxsU3RhcnR1cCwgc2V0U2hvd0Rlc2t0b3BVcHNlbGxTdGFydHVwXSA9IHVzZVN0YXRlKCgpID0+XG4gICAgc2hvdWxkU2hvd0Rlc2t0b3BVcHNlbGxTdGFydHVwKCksXG4gIClcbiAgLy8gbm90aWZpY2F0aW9uc1xuICB1c2VNb2RlbE1pZ3JhdGlvbk5vdGlmaWNhdGlvbnMoKVxuICB1c2VDYW5Td2l0Y2hUb0V4aXN0aW5nU3Vic2NyaXB0aW9uKClcbiAgdXNlSURFU3RhdHVzSW5kaWNhdG9yKHsgaWRlU2VsZWN0aW9uLCBtY3BDbGllbnRzLCBpZGVJbnN0YWxsYXRpb25TdGF0dXMgfSlcbiAgdXNlTWNwQ29ubmVjdGl2aXR5U3RhdHVzKHsgbWNwQ2xpZW50cyB9KVxuICB1c2VBdXRvTW9kZVVuYXZhaWxhYmxlTm90aWZpY2F0aW9uKClcbiAgdXNlUGx1Z2luSW5zdGFsbGF0aW9uU3RhdHVzKClcbiAgdXNlUGx1Z2luQXV0b3VwZGF0ZU5vdGlmaWNhdGlvbigpXG4gIHVzZVNldHRpbmdzRXJyb3JzKClcbiAgdXNlUmF0ZUxpbWl0V2FybmluZ05vdGlmaWNhdGlvbihtYWluTG9vcE1vZGVsKVxuICB1c2VGYXN0TW9kZU5vdGlmaWNhdGlvbigpXG4gIHVzZURlcHJlY2F0aW9uV2FybmluZ05vdGlmaWNhdGlvbihtYWluTG9vcE1vZGVsKVxuICB1c2VOcG1EZXByZWNhdGlvbk5vdGlmaWNhdGlvbigpXG4gIHVzZUFudE9yZ1dhcm5pbmdOb3RpZmljYXRpb24oKVxuICB1c2VJbnN0YWxsTWVzc2FnZXMoKVxuICB1c2VDaHJvbWVFeHRlbnNpb25Ob3RpZmljYXRpb24oKVxuICB1c2VPZmZpY2lhbE1hcmtldHBsYWNlTm90aWZpY2F0aW9uKClcbiAgdXNlTHNwSW5pdGlhbGl6YXRpb25Ob3RpZmljYXRpb24oKVxuICB1c2VUZWFtbWF0ZUxpZmVjeWNsZU5vdGlmaWNhdGlvbigpXG4gIGNvbnN0IHtcbiAgICByZWNvbW1lbmRhdGlvbjogbHNwUmVjb21tZW5kYXRpb24sXG4gICAgaGFuZGxlUmVzcG9uc2U6IGhhbmRsZUxzcFJlc3BvbnNlLFxuICB9ID0gdXNlTHNwUGx1Z2luUmVjb21tZW5kYXRpb24oKVxuICBjb25zdCB7XG4gICAgcmVjb21tZW5kYXRpb246IGhpbnRSZWNvbW1lbmRhdGlvbixcbiAgICBoYW5kbGVSZXNwb25zZTogaGFuZGxlSGludFJlc3BvbnNlLFxuICB9ID0gdXNlQ2xhdWRlQ29kZUhpbnRSZWNvbW1lbmRhdGlvbigpXG5cbiAgLy8gTWVtb2l6ZSB0aGUgY29tYmluZWQgaW5pdGlhbCB0b29scyBhcnJheSB0byBwcmV2ZW50IHJlZmVyZW5jZSBjaGFuZ2VzXG4gIGNvbnN0IGNvbWJpbmVkSW5pdGlhbFRvb2xzID0gdXNlTWVtbygoKSA9PiB7XG4gICAgcmV0dXJuIFsuLi5sb2NhbFRvb2xzLCAuLi5pbml0aWFsVG9vbHNdXG4gIH0sIFtsb2NhbFRvb2xzLCBpbml0aWFsVG9vbHNdKVxuXG4gIC8vIEluaXRpYWxpemUgcGx1Z2luIG1hbmFnZW1lbnRcbiAgdXNlTWFuYWdlUGx1Z2lucyh7IGVuYWJsZWQ6ICFpc1JlbW90ZVNlc3Npb24gfSlcblxuICBjb25zdCB0YXNrc1YyID0gdXNlVGFza3NWMldpdGhDb2xsYXBzZUVmZmVjdCgpXG5cbiAgLy8gU3RhcnQgYmFja2dyb3VuZCBwbHVnaW4gaW5zdGFsbGF0aW9uc1xuXG4gIC8vIFNFQ1VSSVRZOiBUaGlzIGNvZGUgaXMgZ3VhcmFudGVlZCB0byBydW4gT05MWSBhZnRlciB0aGUgXCJ0cnVzdCB0aGlzIGZvbGRlclwiIGRpYWxvZ1xuICAvLyBoYXMgYmVlbiBjb25maXJtZWQgYnkgdGhlIHVzZXIuIFRoZSB0cnVzdCBkaWFsb2cgaXMgc2hvd24gaW4gY2xpLnRzeCAobGluZSB+Mzg3KVxuICAvLyBiZWZvcmUgdGhlIFJFUEwgY29tcG9uZW50IGlzIHJlbmRlcmVkLiBUaGUgZGlhbG9nIGJsb2NrcyBleGVjdXRpb24gdW50aWwgdGhlIHVzZXJcbiAgLy8gYWNjZXB0cywgYW5kIG9ubHkgdGhlbiBpcyB0aGUgUkVQTCBjb21wb25lbnQgbW91bnRlZCBhbmQgdGhpcyBlZmZlY3QgcnVucy5cbiAgLy8gVGhpcyBlbnN1cmVzIHRoYXQgcGx1Z2luIGluc3RhbGxhdGlvbnMgZnJvbSByZXBvc2l0b3J5IGFuZCB1c2VyIHNldHRpbmdzIG9ubHlcbiAgLy8gaGFwcGVuIGFmdGVyIGV4cGxpY2l0IHVzZXIgY29uc2VudCB0byB0cnVzdCB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoaXNSZW1vdGVTZXNzaW9uKSByZXR1cm5cbiAgICB2b2lkIHBlcmZvcm1TdGFydHVwQ2hlY2tzKHNldEFwcFN0YXRlKVxuICB9LCBbc2V0QXBwU3RhdGUsIGlzUmVtb3RlU2Vzc2lvbl0pXG5cbiAgLy8gQWxsb3cgQ2xhdWRlIGluIENocm9tZSBNQ1AgdG8gc2VuZCBwcm9tcHRzIHRocm91Z2ggTUNQIG5vdGlmaWNhdGlvbnNcbiAgLy8gYW5kIHN5bmMgcGVybWlzc2lvbiBtb2RlIGNoYW5nZXMgdG8gdGhlIENocm9tZSBleHRlbnNpb25cbiAgdXNlUHJvbXB0c0Zyb21DbGF1ZGVJbkNocm9tZShcbiAgICBpc1JlbW90ZVNlc3Npb24gPyBFTVBUWV9NQ1BfQ0xJRU5UUyA6IG1jcENsaWVudHMsXG4gICAgdG9vbFBlcm1pc3Npb25Db250ZXh0Lm1vZGUsXG4gIClcblxuICAvLyBJbml0aWFsaXplIHN3YXJtIGZlYXR1cmVzOiB0ZWFtbWF0ZSBob29rcyBhbmQgY29udGV4dFxuICAvLyBIYW5kbGVzIGJvdGggZnJlc2ggc3Bhd25zIGFuZCByZXN1bWVkIHRlYW1tYXRlIHNlc3Npb25zXG4gIHVzZVN3YXJtSW5pdGlhbGl6YXRpb24oc2V0QXBwU3RhdGUsIGluaXRpYWxNZXNzYWdlcywge1xuICAgIGVuYWJsZWQ6ICFpc1JlbW90ZVNlc3Npb24sXG4gIH0pXG5cbiAgY29uc3QgbWVyZ2VkVG9vbHMgPSB1c2VNZXJnZWRUb29scyhcbiAgICBjb21iaW5lZEluaXRpYWxUb29scyxcbiAgICBtY3AudG9vbHMsXG4gICAgdG9vbFBlcm1pc3Npb25Db250ZXh0LFxuICApXG5cbiAgLy8gQXBwbHkgYWdlbnQgdG9vbCByZXN0cmljdGlvbnMgaWYgbWFpblRocmVhZEFnZW50RGVmaW5pdGlvbiBpcyBzZXRcbiAgY29uc3QgeyB0b29scywgYWxsb3dlZEFnZW50VHlwZXMgfSA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGlmICghbWFpblRocmVhZEFnZW50RGVmaW5pdGlvbikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9vbHM6IG1lcmdlZFRvb2xzLFxuICAgICAgICBhbGxvd2VkQWdlbnRUeXBlczogdW5kZWZpbmVkIGFzIHN0cmluZ1tdIHwgdW5kZWZpbmVkLFxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCByZXNvbHZlZCA9IHJlc29sdmVBZ2VudFRvb2xzKFxuICAgICAgbWFpblRocmVhZEFnZW50RGVmaW5pdGlvbixcbiAgICAgIG1lcmdlZFRvb2xzLFxuICAgICAgZmFsc2UsXG4gICAgICB0cnVlLFxuICAgIClcbiAgICByZXR1cm4ge1xuICAgICAgdG9vbHM6IHJlc29sdmVkLnJlc29sdmVkVG9vbHMsXG4gICAgICBhbGxvd2VkQWdlbnRUeXBlczogcmVzb2x2ZWQuYWxsb3dlZEFnZW50VHlwZXMsXG4gICAgfVxuICB9LCBbbWFpblRocmVhZEFnZW50RGVmaW5pdGlvbiwgbWVyZ2VkVG9vbHNdKVxuXG4gIC8vIE1lcmdlIGNvbW1hbmRzIGZyb20gbG9jYWwgc3RhdGUsIHBsdWdpbnMsIGFuZCBNQ1BcbiAgY29uc3QgY29tbWFuZHNXaXRoUGx1Z2lucyA9IHVzZU1lcmdlZENvbW1hbmRzKFxuICAgIGxvY2FsQ29tbWFuZHMsXG4gICAgcGx1Z2lucy5jb21tYW5kcyBhcyBDb21tYW5kW10sXG4gIClcbiAgY29uc3QgbWVyZ2VkQ29tbWFuZHMgPSB1c2VNZXJnZWRDb21tYW5kcyhcbiAgICBjb21tYW5kc1dpdGhQbHVnaW5zLFxuICAgIG1jcC5jb21tYW5kcyBhcyBDb21tYW5kW10sXG4gIClcbiAgLy8gRmlsdGVyIG91dCBhbGwgY29tbWFuZHMgaWYgZGlzYWJsZVNsYXNoQ29tbWFuZHMgaXMgdHJ1ZVxuICBjb25zdCBjb21tYW5kcyA9IHVzZU1lbW8oXG4gICAgKCkgPT4gKGRpc2FibGVTbGFzaENvbW1hbmRzID8gW10gOiBtZXJnZWRDb21tYW5kcyksXG4gICAgW2Rpc2FibGVTbGFzaENvbW1hbmRzLCBtZXJnZWRDb21tYW5kc10sXG4gIClcblxuICB1c2VJZGVMb2dnaW5nKGlzUmVtb3RlU2Vzc2lvbiA/IEVNUFRZX01DUF9DTElFTlRTIDogbWNwLmNsaWVudHMpXG4gIHVzZUlkZVNlbGVjdGlvbihcbiAgICBpc1JlbW90ZVNlc3Npb24gPyBFTVBUWV9NQ1BfQ0xJRU5UUyA6IG1jcC5jbGllbnRzLFxuICAgIHNldElERVNlbGVjdGlvbixcbiAgKVxuXG4gIGNvbnN0IFtzdHJlYW1Nb2RlLCBzZXRTdHJlYW1Nb2RlXSA9IHVzZVN0YXRlPFNwaW5uZXJNb2RlPigncmVzcG9uZGluZycpXG4gIC8vIFJlZiBtaXJyb3Igc28gb25TdWJtaXQgY2FuIHJlYWQgdGhlIGxhdGVzdCB2YWx1ZSB3aXRob3V0IGFkZGluZ1xuICAvLyBzdHJlYW1Nb2RlIHRvIGl0cyBkZXBzLiBzdHJlYW1Nb2RlIGZsaXBzIGJldHdlZW5cbiAgLy8gcmVxdWVzdGluZy9yZXNwb25kaW5nL3Rvb2wtdXNlIH4xMHggcGVyIHR1cm4gZHVyaW5nIHN0cmVhbWluZzsgaGF2aW5nIGl0XG4gIC8vIGluIG9uU3VibWl0J3MgZGVwcyB3YXMgcmVjcmVhdGluZyBvblN1Ym1pdCBvbiBldmVyeSBmbGlwLCB3aGljaFxuICAvLyBjYXNjYWRlZCBpbnRvIFByb21wdElucHV0IHByb3AgY2h1cm4gYW5kIGRvd25zdHJlYW0gdXNlQ2FsbGJhY2svdXNlTWVtb1xuICAvLyBpbnZhbGlkYXRpb24uIFRoZSBvbmx5IGNvbnN1bWVycyBpbnNpZGUgY2FsbGJhY2tzIGFyZSBkZWJ1ZyBsb2dnaW5nIGFuZFxuICAvLyB0ZWxlbWV0cnkgKGhhbmRsZVByb21wdFN1Ym1pdC50cyksIHNvIGEgc3RhbGUtYnktb25lLXJlbmRlciB2YWx1ZSBpc1xuICAvLyBoYXJtbGVzcyDigJQgYnV0IHJlZiBtaXJyb3JzIHN5bmMgb24gZXZlcnkgcmVuZGVyIGFueXdheSBzbyBpdCdzIGZyZXNoLlxuICBjb25zdCBzdHJlYW1Nb2RlUmVmID0gdXNlUmVmKHN0cmVhbU1vZGUpXG4gIHN0cmVhbU1vZGVSZWYuY3VycmVudCA9IHN0cmVhbU1vZGVcbiAgY29uc3QgW3N0cmVhbWluZ1Rvb2xVc2VzLCBzZXRTdHJlYW1pbmdUb29sVXNlc10gPSB1c2VTdGF0ZTxcbiAgICBTdHJlYW1pbmdUb29sVXNlW11cbiAgPihbXSlcbiAgY29uc3QgW3N0cmVhbWluZ1RoaW5raW5nLCBzZXRTdHJlYW1pbmdUaGlua2luZ10gPVxuICAgIHVzZVN0YXRlPFN0cmVhbWluZ1RoaW5raW5nIHwgbnVsbD4obnVsbClcblxuICAvLyBBdXRvLWhpZGUgc3RyZWFtaW5nIHRoaW5raW5nIGFmdGVyIDMwIHNlY29uZHMgb2YgYmVpbmcgY29tcGxldGVkXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKFxuICAgICAgc3RyZWFtaW5nVGhpbmtpbmcgJiZcbiAgICAgICFzdHJlYW1pbmdUaGlua2luZy5pc1N0cmVhbWluZyAmJlxuICAgICAgc3RyZWFtaW5nVGhpbmtpbmcuc3RyZWFtaW5nRW5kZWRBdFxuICAgICkge1xuICAgICAgY29uc3QgZWxhcHNlZCA9IERhdGUubm93KCkgLSBzdHJlYW1pbmdUaGlua2luZy5zdHJlYW1pbmdFbmRlZEF0XG4gICAgICBjb25zdCByZW1haW5pbmcgPSAzMDAwMCAtIGVsYXBzZWRcbiAgICAgIGlmIChyZW1haW5pbmcgPiAwKSB7XG4gICAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dChzZXRTdHJlYW1pbmdUaGlua2luZywgcmVtYWluaW5nLCBudWxsKVxuICAgICAgICByZXR1cm4gKCkgPT4gY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0U3RyZWFtaW5nVGhpbmtpbmcobnVsbClcbiAgICAgIH1cbiAgICB9XG4gIH0sIFtzdHJlYW1pbmdUaGlua2luZ10pXG5cbiAgY29uc3QgW2Fib3J0Q29udHJvbGxlciwgc2V0QWJvcnRDb250cm9sbGVyXSA9XG4gICAgdXNlU3RhdGU8QWJvcnRDb250cm9sbGVyIHwgbnVsbD4obnVsbClcbiAgLy8gUmVmIHRoYXQgYWx3YXlzIHBvaW50cyB0byB0aGUgY3VycmVudCBhYm9ydCBjb250cm9sbGVyLCB1c2VkIGJ5IHRoZVxuICAvLyBSRVBMIGJyaWRnZSB0byBhYm9ydCB0aGUgYWN0aXZlIHF1ZXJ5IHdoZW4gYSByZW1vdGUgaW50ZXJydXB0IGFycml2ZXMuXG4gIGNvbnN0IGFib3J0Q29udHJvbGxlclJlZiA9IHVzZVJlZjxBYm9ydENvbnRyb2xsZXIgfCBudWxsPihudWxsKVxuICBhYm9ydENvbnRyb2xsZXJSZWYuY3VycmVudCA9IGFib3J0Q29udHJvbGxlclxuXG4gIC8vIFJlZiBmb3IgdGhlIGJyaWRnZSByZXN1bHQgY2FsbGJhY2sg4oCUIHNldCBhZnRlciB1c2VSZXBsQnJpZGdlIGluaXRpYWxpemVzLFxuICAvLyByZWFkIGluIHRoZSBvblF1ZXJ5IGZpbmFsbHkgYmxvY2sgdG8gbm90aWZ5IG1vYmlsZSBjbGllbnRzIHRoYXQgYSB0dXJuIGVuZGVkLlxuICBjb25zdCBzZW5kQnJpZGdlUmVzdWx0UmVmID0gdXNlUmVmPCgpID0+IHZvaWQ+KCgpID0+IHt9KVxuXG4gIC8vIFJlZiBmb3IgdGhlIHN5bmNocm9ub3VzIHJlc3RvcmUgY2FsbGJhY2sg4oCUIHNldCBhZnRlciByZXN0b3JlTWVzc2FnZVN5bmMgaXNcbiAgLy8gZGVmaW5lZCwgcmVhZCBpbiB0aGUgb25RdWVyeSBmaW5hbGx5IGJsb2NrIGZvciBhdXRvLXJlc3RvcmUgb24gaW50ZXJydXB0LlxuICBjb25zdCByZXN0b3JlTWVzc2FnZVN5bmNSZWYgPSB1c2VSZWY8KG06IFVzZXJNZXNzYWdlKSA9PiB2b2lkPigoKSA9PiB7fSlcblxuICAvLyBSZWYgdG8gdGhlIGZ1bGxzY3JlZW4gbGF5b3V0J3Mgc2Nyb2xsIGJveCBmb3Iga2V5Ym9hcmQgc2Nyb2xsaW5nLlxuICAvLyBOdWxsIHdoZW4gZnVsbHNjcmVlbiBtb2RlIGlzIGRpc2FibGVkIChyZWYgbmV2ZXIgYXR0YWNoZWQpLlxuICBjb25zdCBzY3JvbGxSZWYgPSB1c2VSZWY8U2Nyb2xsQm94SGFuZGxlPihudWxsKVxuICAvLyBTZXBhcmF0ZSByZWYgZm9yIHRoZSBtb2RhbCBzbG90J3MgaW5uZXIgU2Nyb2xsQm94IOKAlCBwYXNzZWQgdGhyb3VnaFxuICAvLyBGdWxsc2NyZWVuTGF5b3V0IOKGkiBNb2RhbENvbnRleHQgc28gVGFicyBjYW4gYXR0YWNoIGl0IHRvIGl0cyBvd25cbiAgLy8gU2Nyb2xsQm94IGZvciB0YWxsIGNvbnRlbnQgKGUuZy4gL3N0YXR1cydzIE1DUC1zZXJ2ZXIgbGlzdCkuIE5PVFxuICAvLyBrZXlib2FyZC1kcml2ZW4g4oCUIFNjcm9sbEtleWJpbmRpbmdIYW5kbGVyIHN0YXlzIG9uIHRoZSBvdXRlciByZWYgc29cbiAgLy8gUGdVcC9QZ0RuL3doZWVsIGFsd2F5cyBzY3JvbGwgdGhlIHRyYW5zY3JpcHQgYmVoaW5kIHRoZSBtb2RhbC5cbiAgLy8gUGx1bWJpbmcga2VwdCBmb3IgZnV0dXJlIG1vZGFsLXNjcm9sbCB3aXJpbmcuXG4gIGNvbnN0IG1vZGFsU2Nyb2xsUmVmID0gdXNlUmVmPFNjcm9sbEJveEhhbmRsZT4obnVsbClcbiAgLy8gVGltZXN0YW1wIG9mIHRoZSBsYXN0IHVzZXItaW5pdGlhdGVkIHNjcm9sbCAod2hlZWwsIFBnVXAvUGdEbiwgY3RybCt1LFxuICAvLyBFbmQvSG9tZSwgRywgZHJhZy10by1zY3JvbGwpLiBTdGFtcGVkIGluIGNvbXBvc2VkT25TY3JvbGwg4oCUIHRoZSBzaW5nbGVcbiAgLy8gY2hva2Vwb2ludCBTY3JvbGxLZXliaW5kaW5nSGFuZGxlciBjYWxscyBmb3IgZXZlcnkgdXNlciBzY3JvbGwgYWN0aW9uLlxuICAvLyBQcm9ncmFtbWF0aWMgc2Nyb2xscyAocmVwaW5TY3JvbGwncyBzY3JvbGxUb0JvdHRvbSwgc3RpY2t5IGF1dG8tZm9sbG93KVxuICAvLyBkbyBOT1QgZ28gdGhyb3VnaCBjb21wb3NlZE9uU2Nyb2xsLCBzbyB0aGV5IGRvbid0IHN0YW1wIHRoaXMuIFJlZiBub3RcbiAgLy8gc3RhdGU6IG5vIHJlLXJlbmRlciBvbiBldmVyeSB3aGVlbCB0aWNrLlxuICBjb25zdCBsYXN0VXNlclNjcm9sbFRzUmVmID0gdXNlUmVmKDApXG5cbiAgLy8gU3luY2hyb25vdXMgc3RhdGUgbWFjaGluZSBmb3IgdGhlIHF1ZXJ5IGxpZmVjeWNsZS4gUmVwbGFjZXMgdGhlXG4gIC8vIGVycm9yLXByb25lIGR1YWwtc3RhdGUgcGF0dGVybiB3aGVyZSBpc0xvYWRpbmcgKFJlYWN0IHN0YXRlLCBhc3luY1xuICAvLyBiYXRjaGVkKSBhbmQgaXNRdWVyeVJ1bm5pbmcgKHJlZiwgc3luYykgY291bGQgZGVzeW5jLiBTZWUgUXVlcnlHdWFyZC50cy5cbiAgY29uc3QgcXVlcnlHdWFyZCA9IFJlYWN0LnVzZVJlZihuZXcgUXVlcnlHdWFyZCgpKS5jdXJyZW50XG5cbiAgLy8gU3Vic2NyaWJlIHRvIHRoZSBndWFyZCDigJQgdHJ1ZSBkdXJpbmcgZGlzcGF0Y2hpbmcgb3IgcnVubmluZy5cbiAgLy8gVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgXCJpcyBhIGxvY2FsIHF1ZXJ5IGluIGZsaWdodFwiLlxuICBjb25zdCBpc1F1ZXJ5QWN0aXZlID0gUmVhY3QudXNlU3luY0V4dGVybmFsU3RvcmUoXG4gICAgcXVlcnlHdWFyZC5zdWJzY3JpYmUsXG4gICAgcXVlcnlHdWFyZC5nZXRTbmFwc2hvdCxcbiAgKVxuXG4gIC8vIFNlcGFyYXRlIGxvYWRpbmcgZmxhZyBmb3Igb3BlcmF0aW9ucyBvdXRzaWRlIHRoZSBsb2NhbCBxdWVyeSBndWFyZDpcbiAgLy8gcmVtb3RlIHNlc3Npb25zICh1c2VSZW1vdGVTZXNzaW9uIC8gdXNlRGlyZWN0Q29ubmVjdCkgYW5kIGZvcmVncm91bmRlZFxuICAvLyBiYWNrZ3JvdW5kIHRhc2tzICh1c2VTZXNzaW9uQmFja2dyb3VuZGluZykuIFRoZXNlIGRvbid0IHJvdXRlIHRocm91Z2hcbiAgLy8gb25RdWVyeSAvIHF1ZXJ5R3VhcmQsIHNvIHRoZXkgbmVlZCB0aGVpciBvd24gc3Bpbm5lci12aXNpYmlsaXR5IHN0YXRlLlxuICAvLyBJbml0aWFsaXplIHRydWUgaWYgcmVtb3RlIG1vZGUgd2l0aCBpbml0aWFsIHByb21wdCAoQ0NSIHByb2Nlc3NpbmcgaXQpLlxuICBjb25zdCBbaXNFeHRlcm5hbExvYWRpbmcsIHNldElzRXh0ZXJuYWxMb2FkaW5nUmF3XSA9IFJlYWN0LnVzZVN0YXRlKFxuICAgIHJlbW90ZVNlc3Npb25Db25maWc/Lmhhc0luaXRpYWxQcm9tcHQgPz8gZmFsc2UsXG4gIClcblxuICAvLyBEZXJpdmVkOiBhbnkgbG9hZGluZyBzb3VyY2UgYWN0aXZlLiBSZWFkLW9ubHkg4oCUIG5vIHNldHRlci4gTG9jYWwgcXVlcnlcbiAgLy8gbG9hZGluZyBpcyBkcml2ZW4gYnkgcXVlcnlHdWFyZCAocmVzZXJ2ZS90cnlTdGFydC9lbmQvY2FuY2VsUmVzZXJ2YXRpb24pLFxuICAvLyBleHRlcm5hbCBsb2FkaW5nIGJ5IHNldElzRXh0ZXJuYWxMb2FkaW5nLlxuICBjb25zdCBpc0xvYWRpbmcgPSBpc1F1ZXJ5QWN0aXZlIHx8IGlzRXh0ZXJuYWxMb2FkaW5nXG5cbiAgLy8gRWxhcHNlZCB0aW1lIGlzIGNvbXB1dGVkIGJ5IFNwaW5uZXJXaXRoVmVyYiBmcm9tIHRoZXNlIHJlZnMgb24gZWFjaFxuICAvLyBhbmltYXRpb24gZnJhbWUsIGF2b2lkaW5nIGEgdXNlSW50ZXJ2YWwgdGhhdCByZS1yZW5kZXJzIHRoZSBlbnRpcmUgUkVQTC5cbiAgY29uc3QgW3VzZXJJbnB1dE9uUHJvY2Vzc2luZywgc2V0VXNlcklucHV0T25Qcm9jZXNzaW5nUmF3XSA9IFJlYWN0LnVzZVN0YXRlPFxuICAgIHN0cmluZyB8IHVuZGVmaW5lZFxuICA+KHVuZGVmaW5lZClcbiAgLy8gbWVzc2FnZXNSZWYuY3VycmVudC5sZW5ndGggYXQgdGhlIG1vbWVudCB1c2VySW5wdXRPblByb2Nlc3Npbmcgd2FzIHNldC5cbiAgLy8gVGhlIHBsYWNlaG9sZGVyIGhpZGVzIG9uY2UgZGlzcGxheWVkTWVzc2FnZXMgZ3Jvd3MgcGFzdCB0aGlzIOKAlCBpLmUuIHRoZVxuICAvLyByZWFsIHVzZXIgbWVzc2FnZSBoYXMgbGFuZGVkIGluIHRoZSB2aXNpYmxlIHRyYW5zY3JpcHQuXG4gIGNvbnN0IHVzZXJJbnB1dEJhc2VsaW5lUmVmID0gUmVhY3QudXNlUmVmKDApXG4gIC8vIFRydWUgd2hpbGUgdGhlIHN1Ym1pdHRlZCBwcm9tcHQgaXMgYmVpbmcgcHJvY2Vzc2VkIGJ1dCBpdHMgdXNlciBtZXNzYWdlXG4gIC8vIGhhc24ndCByZWFjaGVkIHNldE1lc3NhZ2VzIHlldC4gc2V0TWVzc2FnZXMgdXNlcyB0aGlzIHRvIGtlZXAgdGhlXG4gIC8vIGJhc2VsaW5lIGluIHN5bmMgd2hlbiB1bnJlbGF0ZWQgYXN5bmMgbWVzc2FnZXMgKGJyaWRnZSBzdGF0dXMsIGhvb2tcbiAgLy8gcmVzdWx0cywgc2NoZWR1bGVkIHRhc2tzKSBsYW5kIGR1cmluZyB0aGF0IHdpbmRvdy5cbiAgY29uc3QgdXNlck1lc3NhZ2VQZW5kaW5nUmVmID0gUmVhY3QudXNlUmVmKGZhbHNlKVxuXG4gIC8vIFdhbGwtY2xvY2sgdGltZSB0cmFja2luZyByZWZzIGZvciBhY2N1cmF0ZSBlbGFwc2VkIHRpbWUgY2FsY3VsYXRpb25cbiAgY29uc3QgbG9hZGluZ1N0YXJ0VGltZVJlZiA9IFJlYWN0LnVzZVJlZjxudW1iZXI+KDApXG4gIGNvbnN0IHRvdGFsUGF1c2VkTXNSZWYgPSBSZWFjdC51c2VSZWYoMClcbiAgY29uc3QgcGF1c2VTdGFydFRpbWVSZWYgPSBSZWFjdC51c2VSZWY8bnVtYmVyIHwgbnVsbD4obnVsbClcbiAgY29uc3QgcmVzZXRUaW1pbmdSZWZzID0gUmVhY3QudXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIGxvYWRpbmdTdGFydFRpbWVSZWYuY3VycmVudCA9IERhdGUubm93KClcbiAgICB0b3RhbFBhdXNlZE1zUmVmLmN1cnJlbnQgPSAwXG4gICAgcGF1c2VTdGFydFRpbWVSZWYuY3VycmVudCA9IG51bGxcbiAgfSwgW10pXG5cbiAgLy8gUmVzZXQgdGltaW5nIHJlZnMgaW5saW5lIHdoZW4gaXNRdWVyeUFjdGl2ZSB0cmFuc2l0aW9ucyBmYWxzZeKGknRydWUuXG4gIC8vIHF1ZXJ5R3VhcmQucmVzZXJ2ZSgpIChpbiBleGVjdXRlVXNlcklucHV0KSBmaXJlcyBCRUZPUkUgcHJvY2Vzc1VzZXJJbnB1dCdzXG4gIC8vIGZpcnN0IGF3YWl0LCBidXQgdGhlIHJlZiByZXNldCBpbiBvblF1ZXJ5J3MgdHJ5IGJsb2NrIHJ1bnMgQUZURVIuIER1cmluZ1xuICAvLyB0aGF0IGdhcCwgUmVhY3QgcmVuZGVycyB0aGUgc3Bpbm5lciB3aXRoIGxvYWRpbmdTdGFydFRpbWVSZWY9MCwgY29tcHV0aW5nXG4gIC8vIGVsYXBzZWRUaW1lTXMgPSBEYXRlLm5vdygpIC0gMCDiiYggNTYgeWVhcnMuIFRoaXMgaW5saW5lIHJlc2V0IHJ1bnMgb24gdGhlXG4gIC8vIGZpcnN0IHJlbmRlciB3aGVyZSBpc1F1ZXJ5QWN0aXZlIGlzIG9ic2VydmVkIHRydWUg4oCUIHRoZSBzYW1lIHJlbmRlciB0aGF0XG4gIC8vIGZpcnN0IHNob3dzIHRoZSBzcGlubmVyIOKAlCBzbyB0aGUgcmVmIGlzIGNvcnJlY3QgYnkgdGhlIHRpbWUgdGhlIHNwaW5uZXJcbiAgLy8gcmVhZHMgaXQuIFNlZSBJTkMtNDU0OS5cbiAgY29uc3Qgd2FzUXVlcnlBY3RpdmVSZWYgPSBSZWFjdC51c2VSZWYoZmFsc2UpXG4gIGlmIChpc1F1ZXJ5QWN0aXZlICYmICF3YXNRdWVyeUFjdGl2ZVJlZi5jdXJyZW50KSB7XG4gICAgcmVzZXRUaW1pbmdSZWZzKClcbiAgfVxuICB3YXNRdWVyeUFjdGl2ZVJlZi5jdXJyZW50ID0gaXNRdWVyeUFjdGl2ZVxuXG4gIC8vIFdyYXBwZXIgZm9yIHNldElzRXh0ZXJuYWxMb2FkaW5nIHRoYXQgcmVzZXRzIHRpbWluZyByZWZzIG9uIHRyYW5zaXRpb25cbiAgLy8gdG8gdHJ1ZSDigJQgU3Bpbm5lcldpdGhWZXJiIHJlYWRzIHRoZXNlIGZvciBlbGFwc2VkIHRpbWUsIHNvIHRoZXkgbXVzdCBiZVxuICAvLyByZXNldCBmb3IgcmVtb3RlIHNlc3Npb25zIC8gZm9yZWdyb3VuZGVkIHRhc2tzIHRvbyAobm90IGp1c3QgbG9jYWxcbiAgLy8gcXVlcmllcywgd2hpY2ggcmVzZXQgdGhlbSBpbiBvblF1ZXJ5KS4gV2l0aG91dCB0aGlzLCBhIHJlbW90ZS1vbmx5XG4gIC8vIHNlc3Npb24gd291bGQgc2hvdyB+NTYgeWVhcnMgZWxhcHNlZCAoRGF0ZS5ub3coKSAtIDApLlxuICBjb25zdCBzZXRJc0V4dGVybmFsTG9hZGluZyA9IFJlYWN0LnVzZUNhbGxiYWNrKFxuICAgICh2YWx1ZTogYm9vbGVhbikgPT4ge1xuICAgICAgc2V0SXNFeHRlcm5hbExvYWRpbmdSYXcodmFsdWUpXG4gICAgICBpZiAodmFsdWUpIHJlc2V0VGltaW5nUmVmcygpXG4gICAgfSxcbiAgICBbcmVzZXRUaW1pbmdSZWZzXSxcbiAgKVxuXG4gIC8vIFN0YXJ0IHRpbWUgb2YgdGhlIGZpcnN0IHR1cm4gdGhhdCBoYWQgc3dhcm0gdGVhbW1hdGVzIHJ1bm5pbmdcbiAgLy8gVXNlZCB0byBjb21wdXRlIHRvdGFsIGVsYXBzZWQgdGltZSAoaW5jbHVkaW5nIHRlYW1tYXRlIGV4ZWN1dGlvbikgZm9yIHRoZSBkZWZlcnJlZCBtZXNzYWdlXG4gIGNvbnN0IHN3YXJtU3RhcnRUaW1lUmVmID0gUmVhY3QudXNlUmVmPG51bWJlciB8IG51bGw+KG51bGwpXG4gIGNvbnN0IHN3YXJtQnVkZ2V0SW5mb1JlZiA9IFJlYWN0LnVzZVJlZjxcbiAgICB7IHRva2VuczogbnVtYmVyOyBsaW1pdDogbnVtYmVyOyBudWRnZXM6IG51bWJlciB9IHwgdW5kZWZpbmVkXG4gID4odW5kZWZpbmVkKVxuXG4gIC8vIFJlZiB0byB0cmFjayBjdXJyZW50IGZvY3VzZWRJbnB1dERpYWxvZyBmb3IgdXNlIGluIGNhbGxiYWNrc1xuICAvLyBUaGlzIGF2b2lkcyBzdGFsZSBjbG9zdXJlcyB3aGVuIGNoZWNraW5nIGRpYWxvZyBzdGF0ZSBpbiB0aW1lciBjYWxsYmFja3NcbiAgY29uc3QgZm9jdXNlZElucHV0RGlhbG9nUmVmID1cbiAgICBSZWFjdC51c2VSZWY8UmV0dXJuVHlwZTx0eXBlb2YgZ2V0Rm9jdXNlZElucHV0RGlhbG9nPj4odW5kZWZpbmVkKVxuXG4gIC8vIEhvdyBsb25nIGFmdGVyIHRoZSBsYXN0IGtleXN0cm9rZSBiZWZvcmUgZGVmZXJyZWQgZGlhbG9ncyBhcmUgc2hvd25cbiAgY29uc3QgUFJPTVBUX1NVUFBSRVNTSU9OX01TID0gMTUwMFxuICAvLyBUcnVlIHdoZW4gdXNlciBpcyBhY3RpdmVseSB0eXBpbmcg4oCUIGRlZmVycyBpbnRlcnJ1cHQgZGlhbG9ncyBzbyBrZXlzdHJva2VzXG4gIC8vIGRvbid0IGFjY2lkZW50YWxseSBkaXNtaXNzIG9yIGFuc3dlciBhIHBlcm1pc3Npb24gcHJvbXB0IHRoZSB1c2VyIGhhc24ndCByZWFkIHlldC5cbiAgY29uc3QgW2lzUHJvbXB0SW5wdXRBY3RpdmUsIHNldElzUHJvbXB0SW5wdXRBY3RpdmVdID0gUmVhY3QudXNlU3RhdGUoZmFsc2UpXG5cbiAgY29uc3QgW2F1dG9VcGRhdGVyUmVzdWx0LCBzZXRBdXRvVXBkYXRlclJlc3VsdF0gPVxuICAgIHVzZVN0YXRlPEF1dG9VcGRhdGVyUmVzdWx0IHwgbnVsbD4obnVsbClcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChhdXRvVXBkYXRlclJlc3VsdD8ubm90aWZpY2F0aW9ucykge1xuICAgICAgYXV0b1VwZGF0ZXJSZXN1bHQubm90aWZpY2F0aW9ucy5mb3JFYWNoKG5vdGlmaWNhdGlvbiA9PiB7XG4gICAgICAgIGFkZE5vdGlmaWNhdGlvbih7XG4gICAgICAgICAga2V5OiAnYXV0by11cGRhdGVyLW5vdGlmaWNhdGlvbicsXG4gICAgICAgICAgdGV4dDogbm90aWZpY2F0aW9uLFxuICAgICAgICAgIHByaW9yaXR5OiAnbG93JyxcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfVxuICB9LCBbYXV0b1VwZGF0ZXJSZXN1bHQsIGFkZE5vdGlmaWNhdGlvbl0pXG5cbiAgLy8gdG11eCArIGZ1bGxzY3JlZW4gKyBgbW91c2Ugb2ZmYDogb25lLXRpbWUgaGludCB0aGF0IHdoZWVsIHdvbid0IHNjcm9sbC5cbiAgLy8gV2Ugbm8gbG9uZ2VyIG11dGF0ZSB0bXV4J3Mgc2Vzc2lvbi1zY29wZWQgbW91c2Ugb3B0aW9uIChpdCBwb2lzb25lZFxuICAvLyBzaWJsaW5nIHBhbmVzKTsgdG11eCB1c2VycyBhbHJlYWR5IGtub3cgdGhpcyB0cmFkZW9mZiBmcm9tIHZpbS9sZXNzLlxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChpc0Z1bGxzY3JlZW5FbnZFbmFibGVkKCkpIHtcbiAgICAgIHZvaWQgbWF5YmVHZXRUbXV4TW91c2VIaW50KCkudGhlbihoaW50ID0+IHtcbiAgICAgICAgaWYgKGhpbnQpIHtcbiAgICAgICAgICBhZGROb3RpZmljYXRpb24oe1xuICAgICAgICAgICAga2V5OiAndG11eC1tb3VzZS1oaW50JyxcbiAgICAgICAgICAgIHRleHQ6IGhpbnQsXG4gICAgICAgICAgICBwcmlvcml0eTogJ2xvdycsXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSlcblxuICBjb25zdCBbc2hvd1VuZGVyY292ZXJDYWxsb3V0LCBzZXRTaG93VW5kZXJjb3ZlckNhbGxvdXRdID0gdXNlU3RhdGUoZmFsc2UpXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKFwiZXh0ZXJuYWxcIiA9PT0gJ2FudCcpIHtcbiAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgLy8gV2FpdCBmb3IgcmVwbyBjbGFzc2lmaWNhdGlvbiB0byBzZXR0bGUgKG1lbW9pemVkLCBuby1vcCBpZiBwcmltZWQpLlxuICAgICAgICBjb25zdCB7IGlzSW50ZXJuYWxNb2RlbFJlcG8gfSA9IGF3YWl0IGltcG9ydChcbiAgICAgICAgICAnLi4vdXRpbHMvY29tbWl0QXR0cmlidXRpb24uanMnXG4gICAgICAgIClcbiAgICAgICAgYXdhaXQgaXNJbnRlcm5hbE1vZGVsUmVwbygpXG4gICAgICAgIGNvbnN0IHsgc2hvdWxkU2hvd1VuZGVyY292ZXJBdXRvTm90aWNlIH0gPSBhd2FpdCBpbXBvcnQoXG4gICAgICAgICAgJy4uL3V0aWxzL3VuZGVyY292ZXIuanMnXG4gICAgICAgIClcbiAgICAgICAgaWYgKHNob3VsZFNob3dVbmRlcmNvdmVyQXV0b05vdGljZSgpKSB7XG4gICAgICAgICAgc2V0U2hvd1VuZGVyY292ZXJDYWxsb3V0KHRydWUpXG4gICAgICAgIH1cbiAgICAgIH0pKClcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSlcblxuICBjb25zdCBbdG9vbEpTWCwgc2V0VG9vbEpTWEludGVybmFsXSA9IHVzZVN0YXRlPHtcbiAgICBqc3g6IFJlYWN0LlJlYWN0Tm9kZSB8IG51bGxcbiAgICBzaG91bGRIaWRlUHJvbXB0SW5wdXQ6IGJvb2xlYW5cbiAgICBzaG91bGRDb250aW51ZUFuaW1hdGlvbj86IHRydWVcbiAgICBzaG93U3Bpbm5lcj86IGJvb2xlYW5cbiAgICBpc0xvY2FsSlNYQ29tbWFuZD86IGJvb2xlYW5cbiAgICBpc0ltbWVkaWF0ZT86IGJvb2xlYW5cbiAgfSB8IG51bGw+KG51bGwpXG5cbiAgLy8gVHJhY2sgbG9jYWwgSlNYIGNvbW1hbmRzIHNlcGFyYXRlbHkgc28gdG9vbHMgY2FuJ3Qgb3ZlcndyaXRlIHRoZW0uXG4gIC8vIFRoaXMgZW5hYmxlcyBcImltbWVkaWF0ZVwiIGNvbW1hbmRzIChsaWtlIC9idHcpIHRvIHBlcnNpc3Qgd2hpbGUgQ2xhdWRlIGlzIHByb2Nlc3NpbmcuXG4gIGNvbnN0IGxvY2FsSlNYQ29tbWFuZFJlZiA9IHVzZVJlZjx7XG4gICAganN4OiBSZWFjdC5SZWFjdE5vZGUgfCBudWxsXG4gICAgc2hvdWxkSGlkZVByb21wdElucHV0OiBib29sZWFuXG4gICAgc2hvdWxkQ29udGludWVBbmltYXRpb24/OiB0cnVlXG4gICAgc2hvd1NwaW5uZXI/OiBib29sZWFuXG4gICAgaXNMb2NhbEpTWENvbW1hbmQ6IHRydWVcbiAgfSB8IG51bGw+KG51bGwpXG5cbiAgLy8gV3JhcHBlciBmb3Igc2V0VG9vbEpTWCB0aGF0IHByZXNlcnZlcyBsb2NhbCBKU1ggY29tbWFuZHMgKGxpa2UgL2J0dykuXG4gIC8vIFdoZW4gYSBsb2NhbCBKU1ggY29tbWFuZCBpcyBhY3RpdmUsIHdlIGlnbm9yZSB1cGRhdGVzIGZyb20gdG9vbHNcbiAgLy8gdW5sZXNzIHRoZXkgZXhwbGljaXRseSBzZXQgY2xlYXJMb2NhbEpTWDogdHJ1ZSAoZnJvbSBvbkRvbmUgY2FsbGJhY2tzKS5cbiAgLy9cbiAgLy8gVE8gQUREIEEgTkVXIElNTUVESUFURSBDT01NQU5EOlxuICAvLyAxLiBTZXQgYGltbWVkaWF0ZTogdHJ1ZWAgaW4gdGhlIGNvbW1hbmQgZGVmaW5pdGlvblxuICAvLyAyLiBTZXQgYGlzTG9jYWxKU1hDb21tYW5kOiB0cnVlYCB3aGVuIGNhbGxpbmcgc2V0VG9vbEpTWCBpbiB0aGUgY29tbWFuZCdzIEpTWFxuICAvLyAzLiBJbiB0aGUgb25Eb25lIGNhbGxiYWNrLCB1c2UgYHNldFRvb2xKU1goeyBqc3g6IG51bGwsIHNob3VsZEhpZGVQcm9tcHRJbnB1dDogZmFsc2UsIGNsZWFyTG9jYWxKU1g6IHRydWUgfSlgXG4gIC8vICAgIHRvIGV4cGxpY2l0bHkgY2xlYXIgdGhlIG92ZXJsYXkgd2hlbiB0aGUgdXNlciBkaXNtaXNzZXMgaXRcbiAgY29uc3Qgc2V0VG9vbEpTWCA9IHVzZUNhbGxiYWNrKFxuICAgIChcbiAgICAgIGFyZ3M6IHtcbiAgICAgICAganN4OiBSZWFjdC5SZWFjdE5vZGUgfCBudWxsXG4gICAgICAgIHNob3VsZEhpZGVQcm9tcHRJbnB1dDogYm9vbGVhblxuICAgICAgICBzaG91bGRDb250aW51ZUFuaW1hdGlvbj86IHRydWVcbiAgICAgICAgc2hvd1NwaW5uZXI/OiBib29sZWFuXG4gICAgICAgIGlzTG9jYWxKU1hDb21tYW5kPzogYm9vbGVhblxuICAgICAgICBjbGVhckxvY2FsSlNYPzogYm9vbGVhblxuICAgICAgfSB8IG51bGwsXG4gICAgKSA9PiB7XG4gICAgICAvLyBJZiBzZXR0aW5nIGEgbG9jYWwgSlNYIGNvbW1hbmQsIHN0b3JlIGl0IGluIHRoZSByZWZcbiAgICAgIGlmIChhcmdzPy5pc0xvY2FsSlNYQ29tbWFuZCkge1xuICAgICAgICBjb25zdCB7IGNsZWFyTG9jYWxKU1g6IF8sIC4uLnJlc3QgfSA9IGFyZ3NcbiAgICAgICAgbG9jYWxKU1hDb21tYW5kUmVmLmN1cnJlbnQgPSB7IC4uLnJlc3QsIGlzTG9jYWxKU1hDb21tYW5kOiB0cnVlIH1cbiAgICAgICAgc2V0VG9vbEpTWEludGVybmFsKHJlc3QpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGVyZSdzIGFuIGFjdGl2ZSBsb2NhbCBKU1ggY29tbWFuZCBpbiB0aGUgcmVmXG4gICAgICBpZiAobG9jYWxKU1hDb21tYW5kUmVmLmN1cnJlbnQpIHtcbiAgICAgICAgLy8gQWxsb3cgY2xlYXJpbmcgb25seSBpZiBleHBsaWNpdGx5IHJlcXVlc3RlZCAoZnJvbSBvbkRvbmUgY2FsbGJhY2tzKVxuICAgICAgICBpZiAoYXJncz8uY2xlYXJMb2NhbEpTWCkge1xuICAgICAgICAgIGxvY2FsSlNYQ29tbWFuZFJlZi5jdXJyZW50ID0gbnVsbFxuICAgICAgICAgIHNldFRvb2xKU1hJbnRlcm5hbChudWxsKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIC8vIE90aGVyd2lzZSwga2VlcCB0aGUgbG9jYWwgSlNYIGNvbW1hbmQgdmlzaWJsZSAtIGlnbm9yZSB0b29sIHVwZGF0ZXNcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIE5vIGFjdGl2ZSBsb2NhbCBKU1ggY29tbWFuZCwgYWxsb3cgYW55IHVwZGF0ZVxuICAgICAgaWYgKGFyZ3M/LmNsZWFyTG9jYWxKU1gpIHtcbiAgICAgICAgc2V0VG9vbEpTWEludGVybmFsKG51bGwpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgc2V0VG9vbEpTWEludGVybmFsKGFyZ3MpXG4gICAgfSxcbiAgICBbXSxcbiAgKVxuICBjb25zdCBbdG9vbFVzZUNvbmZpcm1RdWV1ZSwgc2V0VG9vbFVzZUNvbmZpcm1RdWV1ZV0gPSB1c2VTdGF0ZTxcbiAgICBUb29sVXNlQ29uZmlybVtdXG4gID4oW10pXG4gIC8vIFN0aWNreSBmb290ZXIgSlNYIHJlZ2lzdGVyZWQgYnkgcGVybWlzc2lvbiByZXF1ZXN0IGNvbXBvbmVudHMgKGN1cnJlbnRseVxuICAvLyBvbmx5IEV4aXRQbGFuTW9kZVBlcm1pc3Npb25SZXF1ZXN0KS4gUmVuZGVycyBpbiBGdWxsc2NyZWVuTGF5b3V0J3MgYGJvdHRvbWBcbiAgLy8gc2xvdCBzbyByZXNwb25zZSBvcHRpb25zIHN0YXkgdmlzaWJsZSB3aGlsZSB0aGUgdXNlciBzY3JvbGxzIGEgbG9uZyBwbGFuLlxuICBjb25zdCBbcGVybWlzc2lvblN0aWNreUZvb3Rlciwgc2V0UGVybWlzc2lvblN0aWNreUZvb3Rlcl0gPVxuICAgIHVzZVN0YXRlPFJlYWN0LlJlYWN0Tm9kZSB8IG51bGw+KG51bGwpXG4gIGNvbnN0IFtzYW5kYm94UGVybWlzc2lvblJlcXVlc3RRdWV1ZSwgc2V0U2FuZGJveFBlcm1pc3Npb25SZXF1ZXN0UXVldWVdID1cbiAgICB1c2VTdGF0ZTxcbiAgICAgIEFycmF5PHtcbiAgICAgICAgaG9zdFBhdHRlcm46IE5ldHdvcmtIb3N0UGF0dGVyblxuICAgICAgICByZXNvbHZlUHJvbWlzZTogKGFsbG93Q29ubmVjdGlvbjogYm9vbGVhbikgPT4gdm9pZFxuICAgICAgfT5cbiAgICA+KFtdKVxuICBjb25zdCBbcHJvbXB0UXVldWUsIHNldFByb21wdFF1ZXVlXSA9IHVzZVN0YXRlPFxuICAgIEFycmF5PHtcbiAgICAgIHJlcXVlc3Q6IFByb21wdFJlcXVlc3RcbiAgICAgIHRpdGxlOiBzdHJpbmdcbiAgICAgIHRvb2xJbnB1dFN1bW1hcnk/OiBzdHJpbmcgfCBudWxsXG4gICAgICByZXNvbHZlOiAocmVzcG9uc2U6IFByb21wdFJlc3BvbnNlKSA9PiB2b2lkXG4gICAgICByZWplY3Q6IChlcnJvcjogRXJyb3IpID0+IHZvaWRcbiAgICB9PlxuICA+KFtdKVxuXG4gIC8vIFRyYWNrIGJyaWRnZSBjbGVhbnVwIGZ1bmN0aW9ucyBmb3Igc2FuZGJveCBwZXJtaXNzaW9uIHJlcXVlc3RzIHNvIHRoZVxuICAvLyBsb2NhbCBkaWFsb2cgaGFuZGxlciBjYW4gY2FuY2VsIHRoZSByZW1vdGUgcHJvbXB0IHdoZW4gdGhlIGxvY2FsIHVzZXJcbiAgLy8gcmVzcG9uZHMgZmlyc3QuIEtleWVkIGJ5IGhvc3QgdG8gc3VwcG9ydCBjb25jdXJyZW50IHNhbWUtaG9zdCByZXF1ZXN0cy5cbiAgY29uc3Qgc2FuZGJveEJyaWRnZUNsZWFudXBSZWYgPSB1c2VSZWY8TWFwPHN0cmluZywgQXJyYXk8KCkgPT4gdm9pZD4+PihcbiAgICBuZXcgTWFwKCksXG4gIClcblxuICAvLyAtLSBUZXJtaW5hbCB0aXRsZSBtYW5hZ2VtZW50XG4gIC8vIFNlc3Npb24gdGl0bGUgKHNldCB2aWEgL3JlbmFtZSBvciByZXN0b3JlZCBvbiByZXN1bWUpIHdpbnMgb3ZlclxuICAvLyB0aGUgYWdlbnQgbmFtZSwgd2hpY2ggd2lucyBvdmVyIHRoZSBIYWlrdS1leHRyYWN0ZWQgdG9waWM7XG4gIC8vIGFsbCBmYWxsIGJhY2sgdG8gdGhlIHByb2R1Y3QgbmFtZS5cbiAgY29uc3QgdGVybWluYWxUaXRsZUZyb21SZW5hbWUgPVxuICAgIHVzZUFwcFN0YXRlKHMgPT4gcy5zZXR0aW5ncy50ZXJtaW5hbFRpdGxlRnJvbVJlbmFtZSkgIT09IGZhbHNlXG4gIGNvbnN0IHNlc3Npb25UaXRsZSA9IHRlcm1pbmFsVGl0bGVGcm9tUmVuYW1lXG4gICAgPyBnZXRDdXJyZW50U2Vzc2lvblRpdGxlKGdldFNlc3Npb25JZCgpKVxuICAgIDogdW5kZWZpbmVkXG4gIGNvbnN0IFtoYWlrdVRpdGxlLCBzZXRIYWlrdVRpdGxlXSA9IHVzZVN0YXRlPHN0cmluZz4oKVxuICAvLyBHYXRlcyB0aGUgb25lLXNob3QgSGFpa3UgY2FsbCB0aGF0IGdlbmVyYXRlcyB0aGUgdGFiIHRpdGxlLiBTZWVkZWQgdHJ1ZVxuICAvLyBvbiByZXN1bWUgKGluaXRpYWxNZXNzYWdlcyBwcmVzZW50KSBzbyB3ZSBkb24ndCByZS10aXRsZSBhIHJlc3VtZWRcbiAgLy8gc2Vzc2lvbiBmcm9tIG1pZC1jb252ZXJzYXRpb24gY29udGV4dC5cbiAgY29uc3QgaGFpa3VUaXRsZUF0dGVtcHRlZFJlZiA9IHVzZVJlZigoaW5pdGlhbE1lc3NhZ2VzPy5sZW5ndGggPz8gMCkgPiAwKVxuICBjb25zdCBhZ2VudFRpdGxlID0gbWFpblRocmVhZEFnZW50RGVmaW5pdGlvbj8uYWdlbnRUeXBlXG4gIGNvbnN0IHRlcm1pbmFsVGl0bGUgPVxuICAgIHNlc3Npb25UaXRsZSA/PyBhZ2VudFRpdGxlID8/IGhhaWt1VGl0bGUgPz8gJ0NsYXVkZSBDb2RlJ1xuICBjb25zdCBpc1dhaXRpbmdGb3JBcHByb3ZhbCA9XG4gICAgdG9vbFVzZUNvbmZpcm1RdWV1ZS5sZW5ndGggPiAwIHx8XG4gICAgcHJvbXB0UXVldWUubGVuZ3RoID4gMCB8fFxuICAgIHBlbmRpbmdXb3JrZXJSZXF1ZXN0IHx8XG4gICAgcGVuZGluZ1NhbmRib3hSZXF1ZXN0XG4gIC8vIExvY2FsLWpzeCBjb21tYW5kcyAobGlrZSAvcGx1Z2luLCAvY29uZmlnKSBzaG93IHVzZXItZmFjaW5nIGRpYWxvZ3MgdGhhdFxuICAvLyB3YWl0IGZvciBpbnB1dC4gUmVxdWlyZSBqc3ggIT0gbnVsbCDigJQgaWYgdGhlIGZsYWcgaXMgc3R1Y2sgdHJ1ZSBidXQganN4XG4gIC8vIGlzIG51bGwsIHRyZWF0IGFzIG5vdC1zaG93aW5nIHNvIFRleHRJbnB1dCBmb2N1cyBhbmQgcXVldWUgcHJvY2Vzc29yXG4gIC8vIGFyZW4ndCBkZWFkbG9ja2VkIGJ5IGEgcGhhbnRvbSBvdmVybGF5LlxuICBjb25zdCBpc1Nob3dpbmdMb2NhbEpTWENvbW1hbmQgPVxuICAgIHRvb2xKU1g/LmlzTG9jYWxKU1hDb21tYW5kID09PSB0cnVlICYmIHRvb2xKU1g/LmpzeCAhPSBudWxsXG4gIGNvbnN0IHRpdGxlSXNBbmltYXRpbmcgPVxuICAgIGlzTG9hZGluZyAmJiAhaXNXYWl0aW5nRm9yQXBwcm92YWwgJiYgIWlzU2hvd2luZ0xvY2FsSlNYQ29tbWFuZFxuICAvLyBUaXRsZSBhbmltYXRpb24gc3RhdGUgbGl2ZXMgaW4gPEFuaW1hdGVkVGVybWluYWxUaXRsZT4gc28gdGhlIDk2MG1zIHRpY2tcbiAgLy8gZG9lc24ndCByZS1yZW5kZXIgUkVQTC4gdGl0bGVEaXNhYmxlZC90ZXJtaW5hbFRpdGxlIGFyZSBzdGlsbCBjb21wdXRlZFxuICAvLyBoZXJlIGJlY2F1c2Ugb25RdWVyeUltcGwgcmVhZHMgdGhlbSAoYmFja2dyb3VuZCBzZXNzaW9uIGRlc2NyaXB0aW9uLFxuICAvLyBoYWlrdSB0aXRsZSBleHRyYWN0aW9uIGdhdGUpLlxuXG4gIC8vIFByZXZlbnQgbWFjT1MgZnJvbSBzbGVlcGluZyB3aGlsZSBDbGF1ZGUgaXMgd29ya2luZ1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChpc0xvYWRpbmcgJiYgIWlzV2FpdGluZ0ZvckFwcHJvdmFsICYmICFpc1Nob3dpbmdMb2NhbEpTWENvbW1hbmQpIHtcbiAgICAgIHN0YXJ0UHJldmVudFNsZWVwKClcbiAgICAgIHJldHVybiAoKSA9PiBzdG9wUHJldmVudFNsZWVwKClcbiAgICB9XG4gIH0sIFtpc0xvYWRpbmcsIGlzV2FpdGluZ0ZvckFwcHJvdmFsLCBpc1Nob3dpbmdMb2NhbEpTWENvbW1hbmRdKVxuXG4gIGNvbnN0IHNlc3Npb25TdGF0dXM6IFRhYlN0YXR1c0tpbmQgPVxuICAgIGlzV2FpdGluZ0ZvckFwcHJvdmFsIHx8IGlzU2hvd2luZ0xvY2FsSlNYQ29tbWFuZFxuICAgICAgPyAnd2FpdGluZydcbiAgICAgIDogaXNMb2FkaW5nXG4gICAgICAgID8gJ2J1c3knXG4gICAgICAgIDogJ2lkbGUnXG5cbiAgY29uc3Qgd2FpdGluZ0ZvciA9XG4gICAgc2Vzc2lvblN0YXR1cyAhPT0gJ3dhaXRpbmcnXG4gICAgICA/IHVuZGVmaW5lZFxuICAgICAgOiB0b29sVXNlQ29uZmlybVF1ZXVlLmxlbmd0aCA+IDBcbiAgICAgICAgPyBgYXBwcm92ZSAke3Rvb2xVc2VDb25maXJtUXVldWVbMF0hLnRvb2wubmFtZX1gXG4gICAgICAgIDogcGVuZGluZ1dvcmtlclJlcXVlc3RcbiAgICAgICAgICA/ICd3b3JrZXIgcmVxdWVzdCdcbiAgICAgICAgICA6IHBlbmRpbmdTYW5kYm94UmVxdWVzdFxuICAgICAgICAgICAgPyAnc2FuZGJveCByZXF1ZXN0J1xuICAgICAgICAgICAgOiBpc1Nob3dpbmdMb2NhbEpTWENvbW1hbmRcbiAgICAgICAgICAgICAgPyAnZGlhbG9nIG9wZW4nXG4gICAgICAgICAgICAgIDogJ2lucHV0IG5lZWRlZCdcblxuICAvLyBQdXNoIHN0YXR1cyB0byB0aGUgUElEIGZpbGUgZm9yIGBjbGF1ZGUgcHNgLiBGaXJlLWFuZC1mb3JnZXQ7IHBzIGZhbGxzXG4gIC8vIGJhY2sgdG8gdHJhbnNjcmlwdC10YWlsIGRlcml2YXRpb24gd2hlbiB0aGlzIGlzIG1pc3Npbmcvc3RhbGUuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKGZlYXR1cmUoJ0JHX1NFU1NJT05TJykpIHtcbiAgICAgIHZvaWQgdXBkYXRlU2Vzc2lvbkFjdGl2aXR5KHsgc3RhdHVzOiBzZXNzaW9uU3RhdHVzLCB3YWl0aW5nRm9yIH0pXG4gICAgfVxuICB9LCBbc2Vzc2lvblN0YXR1cywgd2FpdGluZ0Zvcl0pXG5cbiAgLy8gM1AgZGVmYXVsdDogb2ZmIOKAlCBPU0MgMjEzMzcgaXMgYW50LW9ubHkgd2hpbGUgdGhlIHNwZWMgc3RhYmlsaXplcy5cbiAgLy8gR2F0ZWQgc28gd2UgY2FuIHJvbGwgYmFjayBpZiB0aGUgc2lkZWJhciBpbmRpY2F0b3IgY29uZmxpY3RzIHdpdGhcbiAgLy8gdGhlIHRpdGxlIHNwaW5uZXIgaW4gdGVybWluYWxzIHRoYXQgcmVuZGVyIGJvdGguIFdoZW4gdGhlIGZsYWcgaXNcbiAgLy8gb24sIHRoZSB1c2VyLWZhY2luZyBjb25maWcgc2V0dGluZyBjb250cm9scyB3aGV0aGVyIGl0J3MgYWN0aXZlLlxuICBjb25zdCB0YWJTdGF0dXNHYXRlRW5hYmxlZCA9IGdldEZlYXR1cmVWYWx1ZV9DQUNIRURfTUFZX0JFX1NUQUxFKFxuICAgICd0ZW5ndV90ZXJtaW5hbF9zaWRlYmFyJyxcbiAgICBmYWxzZSxcbiAgKVxuICBjb25zdCBzaG93U3RhdHVzSW5UZXJtaW5hbFRhYiA9XG4gICAgdGFiU3RhdHVzR2F0ZUVuYWJsZWQgJiYgKGdldEdsb2JhbENvbmZpZygpLnNob3dTdGF0dXNJblRlcm1pbmFsVGFiID8/IGZhbHNlKVxuICB1c2VUYWJTdGF0dXModGl0bGVEaXNhYmxlZCB8fCAhc2hvd1N0YXR1c0luVGVybWluYWxUYWIgPyBudWxsIDogc2Vzc2lvblN0YXR1cylcblxuICAvLyBSZWdpc3RlciB0aGUgbGVhZGVyJ3Mgc2V0VG9vbFVzZUNvbmZpcm1RdWV1ZSBmb3IgaW4tcHJvY2VzcyB0ZWFtbWF0ZXNcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICByZWdpc3RlckxlYWRlclRvb2xVc2VDb25maXJtUXVldWUoc2V0VG9vbFVzZUNvbmZpcm1RdWV1ZSlcbiAgICByZXR1cm4gKCkgPT4gdW5yZWdpc3RlckxlYWRlclRvb2xVc2VDb25maXJtUXVldWUoKVxuICB9LCBbc2V0VG9vbFVzZUNvbmZpcm1RdWV1ZV0pXG5cbiAgY29uc3QgW21lc3NhZ2VzLCByYXdTZXRNZXNzYWdlc10gPSB1c2VTdGF0ZTxNZXNzYWdlVHlwZVtdPihcbiAgICBpbml0aWFsTWVzc2FnZXMgPz8gW10sXG4gIClcbiAgY29uc3QgbWVzc2FnZXNSZWYgPSB1c2VSZWYobWVzc2FnZXMpXG4gIC8vIFN0b3JlcyB0aGUgd2lsbG93TW9kZSB2YXJpYW50IHRoYXQgd2FzIHNob3duIChvciBmYWxzZSBpZiBubyBoaW50IHNob3duKS5cbiAgLy8gQ2FwdHVyZWQgYXQgaGludF9zaG93biB0aW1lIHNvIGhpbnRfY29udmVydGVkIHRlbGVtZXRyeSByZXBvcnRzIHRoZSBzYW1lXG4gIC8vIHZhcmlhbnQg4oCUIHRoZSBHcm93dGhCb29rIHZhbHVlIHNob3VsZG4ndCBjaGFuZ2UgbWlkLXNlc3Npb24sIGJ1dCByZWFkaW5nXG4gIC8vIGl0IG9uY2UgZ3VhcmFudGVlcyBjb25zaXN0ZW5jeSBiZXR3ZWVuIHRoZSBwYWlyZWQgZXZlbnRzLlxuICBjb25zdCBpZGxlSGludFNob3duUmVmID0gdXNlUmVmPHN0cmluZyB8IGZhbHNlPihmYWxzZSlcbiAgLy8gV3JhcCBzZXRNZXNzYWdlcyBzbyBtZXNzYWdlc1JlZiBpcyBhbHdheXMgY3VycmVudCB0aGUgaW5zdGFudCB0aGVcbiAgLy8gY2FsbCByZXR1cm5zIOKAlCBub3Qgd2hlbiBSZWFjdCBsYXRlciBwcm9jZXNzZXMgdGhlIGJhdGNoLiAgQXBwbHkgdGhlXG4gIC8vIHVwZGF0ZXIgZWFnZXJseSBhZ2FpbnN0IHRoZSByZWYsIHRoZW4gaGFuZCBSZWFjdCB0aGUgY29tcHV0ZWQgdmFsdWVcbiAgLy8gKG5vdCB0aGUgZnVuY3Rpb24pLiAgcmF3U2V0TWVzc2FnZXMgYmF0Y2hpbmcgYmVjb21lcyBsYXN0LXdyaXRlLXdpbnMsXG4gIC8vIGFuZCB0aGUgbGFzdCB3cml0ZSBpcyBjb3JyZWN0IGJlY2F1c2UgZWFjaCBjYWxsIGNvbXBvc2VzIGFnYWluc3QgdGhlXG4gIC8vIGFscmVhZHktdXBkYXRlZCByZWYuICBUaGlzIGlzIHRoZSBadXN0YW5kIHBhdHRlcm46IHJlZiBpcyBzb3VyY2Ugb2ZcbiAgLy8gdHJ1dGgsIFJlYWN0IHN0YXRlIGlzIHRoZSByZW5kZXIgcHJvamVjdGlvbi4gIFdpdGhvdXQgdGhpcywgcGF0aHNcbiAgLy8gdGhhdCBxdWV1ZSBmdW5jdGlvbmFsIHVwZGF0ZXJzIHRoZW4gc3luY2hyb25vdXNseSByZWFkIHRoZSByZWZcbiAgLy8gKGUuZy4gaGFuZGxlU3BlY3VsYXRpb25BY2NlcHQg4oaSIG9uUXVlcnkpIHNlZSBzdGFsZSBkYXRhLlxuICBjb25zdCBzZXRNZXNzYWdlcyA9IHVzZUNhbGxiYWNrKFxuICAgIChhY3Rpb246IFJlYWN0LlNldFN0YXRlQWN0aW9uPE1lc3NhZ2VUeXBlW10+KSA9PiB7XG4gICAgICBjb25zdCBwcmV2ID0gbWVzc2FnZXNSZWYuY3VycmVudFxuICAgICAgY29uc3QgbmV4dCA9XG4gICAgICAgIHR5cGVvZiBhY3Rpb24gPT09ICdmdW5jdGlvbicgPyBhY3Rpb24obWVzc2FnZXNSZWYuY3VycmVudCkgOiBhY3Rpb25cbiAgICAgIG1lc3NhZ2VzUmVmLmN1cnJlbnQgPSBuZXh0XG4gICAgICBpZiAobmV4dC5sZW5ndGggPCB1c2VySW5wdXRCYXNlbGluZVJlZi5jdXJyZW50KSB7XG4gICAgICAgIC8vIFNocmFuayAoY29tcGFjdC9yZXdpbmQvY2xlYXIpIOKAlCBjbGFtcCBzbyBwbGFjZWhvbGRlclRleHQncyBsZW5ndGhcbiAgICAgICAgLy8gY2hlY2sgY2FuJ3QgZ28gc3RhbGUuXG4gICAgICAgIHVzZXJJbnB1dEJhc2VsaW5lUmVmLmN1cnJlbnQgPSAwXG4gICAgICB9IGVsc2UgaWYgKG5leHQubGVuZ3RoID4gcHJldi5sZW5ndGggJiYgdXNlck1lc3NhZ2VQZW5kaW5nUmVmLmN1cnJlbnQpIHtcbiAgICAgICAgLy8gR3JldyB3aGlsZSB0aGUgc3VibWl0dGVkIHVzZXIgbWVzc2FnZSBoYXNuJ3QgbGFuZGVkIHlldC4gSWYgdGhlXG4gICAgICAgIC8vIGFkZGVkIG1lc3NhZ2VzIGRvbid0IGluY2x1ZGUgaXQgKGJyaWRnZSBzdGF0dXMsIGhvb2sgcmVzdWx0cyxcbiAgICAgICAgLy8gc2NoZWR1bGVkIHRhc2tzIGxhbmRpbmcgYXN5bmMgZHVyaW5nIHByb2Nlc3NVc2VySW5wdXRCYXNlKSwgYnVtcFxuICAgICAgICAvLyBiYXNlbGluZSBzbyB0aGUgcGxhY2Vob2xkZXIgc3RheXMgdmlzaWJsZS4gT25jZSB0aGUgdXNlciBtZXNzYWdlXG4gICAgICAgIC8vIGxhbmRzLCBzdG9wIHRyYWNraW5nIOKAlCBsYXRlciBhZGRpdGlvbnMgKGFzc2lzdGFudCBzdHJlYW0pIHNob3VsZFxuICAgICAgICAvLyBub3QgcmUtc2hvdyB0aGUgcGxhY2Vob2xkZXIuXG4gICAgICAgIGNvbnN0IGRlbHRhID0gbmV4dC5sZW5ndGggLSBwcmV2Lmxlbmd0aFxuICAgICAgICBjb25zdCBhZGRlZCA9XG4gICAgICAgICAgcHJldi5sZW5ndGggPT09IDAgfHwgbmV4dFswXSA9PT0gcHJldlswXVxuICAgICAgICAgICAgPyBuZXh0LnNsaWNlKC1kZWx0YSlcbiAgICAgICAgICAgIDogbmV4dC5zbGljZSgwLCBkZWx0YSlcbiAgICAgICAgaWYgKGFkZGVkLnNvbWUoaXNIdW1hblR1cm4pKSB7XG4gICAgICAgICAgdXNlck1lc3NhZ2VQZW5kaW5nUmVmLmN1cnJlbnQgPSBmYWxzZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVzZXJJbnB1dEJhc2VsaW5lUmVmLmN1cnJlbnQgPSBuZXh0Lmxlbmd0aFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByYXdTZXRNZXNzYWdlcyhuZXh0KVxuICAgIH0sXG4gICAgW10sXG4gIClcbiAgLy8gQ2FwdHVyZSB0aGUgYmFzZWxpbmUgbWVzc2FnZSBjb3VudCBhbG9uZ3NpZGUgdGhlIHBsYWNlaG9sZGVyIHRleHQgc29cbiAgLy8gdGhlIHJlbmRlciBjYW4gaGlkZSBpdCBvbmNlIGRpc3BsYXllZE1lc3NhZ2VzIGdyb3dzIHBhc3QgdGhlIGJhc2VsaW5lLlxuICBjb25zdCBzZXRVc2VySW5wdXRPblByb2Nlc3NpbmcgPSB1c2VDYWxsYmFjaygoaW5wdXQ6IHN0cmluZyB8IHVuZGVmaW5lZCkgPT4ge1xuICAgIGlmIChpbnB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB1c2VySW5wdXRCYXNlbGluZVJlZi5jdXJyZW50ID0gbWVzc2FnZXNSZWYuY3VycmVudC5sZW5ndGhcbiAgICAgIHVzZXJNZXNzYWdlUGVuZGluZ1JlZi5jdXJyZW50ID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICB1c2VyTWVzc2FnZVBlbmRpbmdSZWYuY3VycmVudCA9IGZhbHNlXG4gICAgfVxuICAgIHNldFVzZXJJbnB1dE9uUHJvY2Vzc2luZ1JhdyhpbnB1dClcbiAgfSwgW10pXG4gIC8vIEZ1bGxzY3JlZW46IHRyYWNrIHRoZSB1bnNlZW4tZGl2aWRlciBwb3NpdGlvbi4gZGl2aWRlckluZGV4IGNoYW5nZXNcbiAgLy8gb25seSB+dHdpY2Uvc2Nyb2xsLXNlc3Npb24gKGZpcnN0IHNjcm9sbC1hd2F5ICsgcmVwaW4pLiBwaWxsVmlzaWJsZVxuICAvLyBhbmQgc3RpY2t5UHJvbXB0IG5vdyBsaXZlIGluIEZ1bGxzY3JlZW5MYXlvdXQg4oCUIHRoZXkgc3Vic2NyaWJlIHRvXG4gIC8vIFNjcm9sbEJveCBkaXJlY3RseSBzbyBwZXItZnJhbWUgc2Nyb2xsIG5ldmVyIHJlLXJlbmRlcnMgUkVQTC5cbiAgY29uc3Qge1xuICAgIGRpdmlkZXJJbmRleCxcbiAgICBkaXZpZGVyWVJlZixcbiAgICBvblNjcm9sbEF3YXksXG4gICAgb25SZXBpbixcbiAgICBqdW1wVG9OZXcsXG4gICAgc2hpZnREaXZpZGVyLFxuICB9ID0gdXNlVW5zZWVuRGl2aWRlcihtZXNzYWdlcy5sZW5ndGgpXG4gIGlmIChmZWF0dXJlKCdBV0FZX1NVTU1BUlknKSkge1xuICAgIC8vIGJpb21lLWlnbm9yZSBsaW50L2NvcnJlY3RuZXNzL3VzZUhvb2tBdFRvcExldmVsOiBmZWF0dXJlKCkgaXMgYSBjb21waWxlLXRpbWUgY29uc3RhbnRcbiAgICB1c2VBd2F5U3VtbWFyeShtZXNzYWdlcywgc2V0TWVzc2FnZXMsIGlzTG9hZGluZylcbiAgfVxuICBjb25zdCBbY3Vyc29yLCBzZXRDdXJzb3JdID0gdXNlU3RhdGU8TWVzc2FnZUFjdGlvbnNTdGF0ZSB8IG51bGw+KG51bGwpXG4gIGNvbnN0IGN1cnNvck5hdlJlZiA9IHVzZVJlZjxNZXNzYWdlQWN0aW9uc05hdiB8IG51bGw+KG51bGwpXG4gIC8vIE1lbW9pemVkIHNvIE1lc3NhZ2VzJyBSZWFjdC5tZW1vIGhvbGRzLlxuICBjb25zdCB1bnNlZW5EaXZpZGVyID0gdXNlTWVtbyhcbiAgICAoKSA9PiBjb21wdXRlVW5zZWVuRGl2aWRlcihtZXNzYWdlcywgZGl2aWRlckluZGV4KSxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzIC0tIGxlbmd0aCBjaGFuZ2UgY292ZXJzIGFwcGVuZHM7IHVzZVVuc2VlbkRpdmlkZXIncyBjb3VudC1kcm9wIGd1YXJkIGNsZWFycyBkaXZpZGVySW5kZXggb24gcmVwbGFjZS9yZXdpbmRcbiAgICBbZGl2aWRlckluZGV4LCBtZXNzYWdlcy5sZW5ndGhdLFxuICApXG4gIC8vIFJlLXBpbiBzY3JvbGwgdG8gYm90dG9tIGFuZCBjbGVhciB0aGUgdW5zZWVuLW1lc3NhZ2VzIGJhc2VsaW5lLiBDYWxsZWRcbiAgLy8gb24gYW55IHVzZXItZHJpdmVuIHJldHVybi10by1saXZlIGFjdGlvbiAoc3VibWl0LCB0eXBlLWludG8tZW1wdHksXG4gIC8vIG92ZXJsYXkgYXBwZWFyL2Rpc21pc3MpLlxuICBjb25zdCByZXBpblNjcm9sbCA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzY3JvbGxSZWYuY3VycmVudD8uc2Nyb2xsVG9Cb3R0b20oKVxuICAgIG9uUmVwaW4oKVxuICAgIHNldEN1cnNvcihudWxsKVxuICB9LCBbb25SZXBpbiwgc2V0Q3Vyc29yXSlcbiAgLy8gQmFja3N0b3AgZm9yIHRoZSBzdWJtaXQtaGFuZGxlciByZXBpbiBhdCBvblN1Ym1pdC4gSWYgYSBidWZmZXJlZCBzdGRpblxuICAvLyBldmVudCAod2hlZWwvZHJhZykgcmFjZXMgYmV0d2VlbiBoYW5kbGVyLWZpcmUgYW5kIHN0YXRlLWNvbW1pdCwgdGhlXG4gIC8vIGhhbmRsZXIncyBzY3JvbGxUb0JvdHRvbSBjYW4gYmUgdW5kb25lLiBUaGlzIGVmZmVjdCBmaXJlcyBvbiB0aGUgcmVuZGVyXG4gIC8vIHdoZXJlIHRoZSB1c2VyJ3MgbWVzc2FnZSBhY3R1YWxseSBsYW5kcyDigJQgdGllZCB0byBSZWFjdCdzIGNvbW1pdCBjeWNsZSxcbiAgLy8gc28gaXQgY2FuJ3QgcmFjZSB3aXRoIHN0ZGluLiBLZXllZCBvbiBsYXN0TXNnIGlkZW50aXR5IChub3QgbWVzc2FnZXMubGVuZ3RoKVxuICAvLyBzbyB1c2VBc3Npc3RhbnRIaXN0b3J5J3MgcHJlcGVuZHMgZG9uJ3Qgc3B1cmlvdXNseSByZXBpbi5cbiAgY29uc3QgbGFzdE1zZyA9IG1lc3NhZ2VzLmF0KC0xKVxuICBjb25zdCBsYXN0TXNnSXNIdW1hbiA9IGxhc3RNc2cgIT0gbnVsbCAmJiBpc0h1bWFuVHVybihsYXN0TXNnKVxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChsYXN0TXNnSXNIdW1hbikge1xuICAgICAgcmVwaW5TY3JvbGwoKVxuICAgIH1cbiAgfSwgW2xhc3RNc2dJc0h1bWFuLCBsYXN0TXNnLCByZXBpblNjcm9sbF0pXG4gIC8vIEFzc2lzdGFudC1jaGF0OiBsYXp5LWxvYWQgcmVtb3RlIGhpc3Rvcnkgb24gc2Nyb2xsLXVwLiBOby1vcCB1bmxlc3NcbiAgLy8gS0FJUk9TIGJ1aWxkICsgY29uZmlnLnZpZXdlck9ubHkuIGZlYXR1cmUoKSBpcyBidWlsZC10aW1lIGNvbnN0YW50IHNvXG4gIC8vIHRoZSBicmFuY2ggaXMgZGVhZC1jb2RlLWVsaW1pbmF0ZWQgaW4gbm9uLUtBSVJPUyBidWlsZHMgKHNhbWUgcGF0dGVyblxuICAvLyBhcyB1c2VVbnNlZW5EaXZpZGVyIGFib3ZlKS5cbiAgY29uc3QgeyBtYXliZUxvYWRPbGRlciB9ID0gZmVhdHVyZSgnS0FJUk9TJylcbiAgICA/IC8vIGJpb21lLWlnbm9yZSBsaW50L2NvcnJlY3RuZXNzL3VzZUhvb2tBdFRvcExldmVsOiBmZWF0dXJlKCkgaXMgYSBjb21waWxlLXRpbWUgY29uc3RhbnRcbiAgICAgIHVzZUFzc2lzdGFudEhpc3Rvcnkoe1xuICAgICAgICBjb25maWc6IHJlbW90ZVNlc3Npb25Db25maWcsXG4gICAgICAgIHNldE1lc3NhZ2VzLFxuICAgICAgICBzY3JvbGxSZWYsXG4gICAgICAgIG9uUHJlcGVuZDogc2hpZnREaXZpZGVyLFxuICAgICAgfSlcbiAgICA6IEhJU1RPUllfU1RVQlxuICAvLyBDb21wb3NlIHVzZVVuc2VlbkRpdmlkZXIncyBjYWxsYmFja3Mgd2l0aCB0aGUgbGF6eS1sb2FkIHRyaWdnZXIuXG4gIGNvbnN0IGNvbXBvc2VkT25TY3JvbGwgPSB1c2VDYWxsYmFjayhcbiAgICAoc3RpY2t5OiBib29sZWFuLCBoYW5kbGU6IFNjcm9sbEJveEhhbmRsZSkgPT4ge1xuICAgICAgbGFzdFVzZXJTY3JvbGxUc1JlZi5jdXJyZW50ID0gRGF0ZS5ub3coKVxuICAgICAgaWYgKHN0aWNreSkge1xuICAgICAgICBvblJlcGluKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9uU2Nyb2xsQXdheShoYW5kbGUpXG4gICAgICAgIGlmIChmZWF0dXJlKCdLQUlST1MnKSkgbWF5YmVMb2FkT2xkZXIoaGFuZGxlKVxuICAgICAgICAvLyBEaXNtaXNzIHRoZSBjb21wYW5pb24gYnViYmxlIG9uIHNjcm9sbCDigJQgaXQncyBhYnNvbHV0ZS1wb3NpdGlvbmVkXG4gICAgICAgIC8vIGF0IGJvdHRvbS1yaWdodCBhbmQgY292ZXJzIHRyYW5zY3JpcHQgY29udGVudC4gU2Nyb2xsaW5nID0gdXNlciBpc1xuICAgICAgICAvLyB0cnlpbmcgdG8gcmVhZCBzb21ldGhpbmcgdW5kZXIgaXQuXG4gICAgICAgIGlmIChmZWF0dXJlKCdCVUREWScpKSB7XG4gICAgICAgICAgc2V0QXBwU3RhdGUocHJldiA9PlxuICAgICAgICAgICAgcHJldi5jb21wYW5pb25SZWFjdGlvbiA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8gcHJldlxuICAgICAgICAgICAgICA6IHsgLi4ucHJldiwgY29tcGFuaW9uUmVhY3Rpb246IHVuZGVmaW5lZCB9LFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgW29uUmVwaW4sIG9uU2Nyb2xsQXdheSwgbWF5YmVMb2FkT2xkZXIsIHNldEFwcFN0YXRlXSxcbiAgKVxuICAvLyBEZWZlcnJlZCBTZXNzaW9uU3RhcnQgaG9vayBtZXNzYWdlcyDigJQgUkVQTCByZW5kZXJzIGltbWVkaWF0ZWx5IGFuZFxuICAvLyBob29rIG1lc3NhZ2VzIGFyZSBpbmplY3RlZCB3aGVuIHRoZXkgcmVzb2x2ZS4gYXdhaXRQZW5kaW5nSG9va3MoKVxuICAvLyBtdXN0IGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZpcnN0IEFQSSBjYWxsIHNvIHRoZSBtb2RlbCBzZWVzIGhvb2sgY29udGV4dC5cbiAgY29uc3QgYXdhaXRQZW5kaW5nSG9va3MgPSB1c2VEZWZlcnJlZEhvb2tNZXNzYWdlcyhcbiAgICBwZW5kaW5nSG9va01lc3NhZ2VzLFxuICAgIHNldE1lc3NhZ2VzLFxuICApXG5cbiAgLy8gRGVmZXJyZWQgbWVzc2FnZXMgZm9yIHRoZSBNZXNzYWdlcyBjb21wb25lbnQg4oCUIHJlbmRlcnMgYXQgdHJhbnNpdGlvblxuICAvLyBwcmlvcml0eSBzbyB0aGUgcmVjb25jaWxlciB5aWVsZHMgZXZlcnkgNW1zLCBrZWVwaW5nIGlucHV0IHJlc3BvbnNpdmVcbiAgLy8gd2hpbGUgdGhlIGV4cGVuc2l2ZSBtZXNzYWdlIHByb2Nlc3NpbmcgcGlwZWxpbmUgcnVucy5cbiAgY29uc3QgZGVmZXJyZWRNZXNzYWdlcyA9IHVzZURlZmVycmVkVmFsdWUobWVzc2FnZXMpXG4gIGNvbnN0IGRlZmVycmVkQmVoaW5kID0gbWVzc2FnZXMubGVuZ3RoIC0gZGVmZXJyZWRNZXNzYWdlcy5sZW5ndGhcbiAgaWYgKGRlZmVycmVkQmVoaW5kID4gMCkge1xuICAgIGxvZ0ZvckRlYnVnZ2luZyhcbiAgICAgIGBbdXNlRGVmZXJyZWRWYWx1ZV0gTWVzc2FnZXMgZGVmZXJyZWQgYnkgJHtkZWZlcnJlZEJlaGluZH0gKCR7ZGVmZXJyZWRNZXNzYWdlcy5sZW5ndGh94oaSJHttZXNzYWdlcy5sZW5ndGh9KWAsXG4gICAgKVxuICB9XG5cbiAgLy8gRnJvemVuIHN0YXRlIGZvciB0cmFuc2NyaXB0IG1vZGUgLSBzdG9yZXMgbGVuZ3RocyBpbnN0ZWFkIG9mIGNsb25pbmcgYXJyYXlzIGZvciBtZW1vcnkgZWZmaWNpZW5jeVxuICBjb25zdCBbZnJvemVuVHJhbnNjcmlwdFN0YXRlLCBzZXRGcm96ZW5UcmFuc2NyaXB0U3RhdGVdID0gdXNlU3RhdGU8e1xuICAgIG1lc3NhZ2VzTGVuZ3RoOiBudW1iZXJcbiAgICBzdHJlYW1pbmdUb29sVXNlc0xlbmd0aDogbnVtYmVyXG4gIH0gfCBudWxsPihudWxsKVxuICAvLyBJbml0aWFsaXplIGlucHV0IHdpdGggYW55IGVhcmx5IGlucHV0IHRoYXQgd2FzIGNhcHR1cmVkIGJlZm9yZSBSRVBMIHdhcyByZWFkeS5cbiAgLy8gVXNpbmcgbGF6eSBpbml0aWFsaXphdGlvbiBlbnN1cmVzIGN1cnNvciBvZmZzZXQgaXMgc2V0IGNvcnJlY3RseSBpbiBQcm9tcHRJbnB1dC5cbiAgY29uc3QgW2lucHV0VmFsdWUsIHNldElucHV0VmFsdWVSYXddID0gdXNlU3RhdGUoKCkgPT4gY29uc3VtZUVhcmx5SW5wdXQoKSlcbiAgY29uc3QgaW5wdXRWYWx1ZVJlZiA9IHVzZVJlZihpbnB1dFZhbHVlKVxuICBpbnB1dFZhbHVlUmVmLmN1cnJlbnQgPSBpbnB1dFZhbHVlXG4gIGNvbnN0IGluc2VydFRleHRSZWYgPSB1c2VSZWY8e1xuICAgIGluc2VydDogKHRleHQ6IHN0cmluZykgPT4gdm9pZFxuICAgIHNldElucHV0V2l0aEN1cnNvcjogKHZhbHVlOiBzdHJpbmcsIGN1cnNvcjogbnVtYmVyKSA9PiB2b2lkXG4gICAgY3Vyc29yT2Zmc2V0OiBudW1iZXJcbiAgfSB8IG51bGw+KG51bGwpXG5cbiAgLy8gV3JhcCBzZXRJbnB1dFZhbHVlIHRvIGNvLWxvY2F0ZSBzdXBwcmVzc2lvbiBzdGF0ZSB1cGRhdGVzLlxuICAvLyBCb3RoIHNldFN0YXRlIGNhbGxzIGhhcHBlbiBpbiB0aGUgc2FtZSBzeW5jaHJvbm91cyBjb250ZXh0IHNvIFJlYWN0XG4gIC8vIGJhdGNoZXMgdGhlbSBpbnRvIGEgc2luZ2xlIHJlbmRlciwgZWxpbWluYXRpbmcgdGhlIGV4dHJhIHJlbmRlciB0aGF0XG4gIC8vIHRoZSBwcmV2aW91cyB1c2VFZmZlY3Qg4oaSIHNldFN0YXRlIHBhdHRlcm4gY2F1c2VkLlxuICBjb25zdCBzZXRJbnB1dFZhbHVlID0gdXNlQ2FsbGJhY2soXG4gICAgKHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmICh0cnlTdWdnZXN0QmdQUkludGVyY2VwdChpbnB1dFZhbHVlUmVmLmN1cnJlbnQsIHZhbHVlKSkgcmV0dXJuXG4gICAgICAvLyBJbiBmdWxsc2NyZWVuIG1vZGUsIHR5cGluZyBpbnRvIGFuIGVtcHR5IHByb21wdCByZS1waW5zIHNjcm9sbCB0b1xuICAgICAgLy8gYm90dG9tLiBPbmx5IGZpcmVzIG9uIGVtcHR54oaSbm9uLWVtcHR5IHNvIHNjcm9sbGluZyB1cCB0byByZWZlcmVuY2VcbiAgICAgIC8vIHNvbWV0aGluZyB3aGlsZSBjb21wb3NpbmcgYSBtZXNzYWdlIGRvZXNuJ3QgeWFuayB0aGUgdmlldyBiYWNrIG9uXG4gICAgICAvLyBldmVyeSBrZXlzdHJva2UuIFJlc3RvcmVzIHRoZSBwcmUtZnVsbHNjcmVlbiBtdXNjbGUgbWVtb3J5IG9mXG4gICAgICAvLyB0eXBpbmcgdG8gc25hcCBiYWNrIHRvIHRoZSBlbmQgb2YgdGhlIGNvbnZlcnNhdGlvbi5cbiAgICAgIC8vIFNraXBwZWQgaWYgdGhlIHVzZXIgc2Nyb2xsZWQgd2l0aGluIHRoZSBsYXN0IDNzIOKAlCB0aGV5J3JlIGFjdGl2ZWx5XG4gICAgICAvLyByZWFkaW5nLCBub3QgbG9zdC4gbGFzdFVzZXJTY3JvbGxUc1JlZiBzdGFydHMgYXQgMCBzbyB0aGUgZmlyc3QtXG4gICAgICAvLyBldmVyIGtleXByZXNzIChubyBzY3JvbGwgeWV0KSBhbHdheXMgcmVwaW5zLlxuICAgICAgaWYgKFxuICAgICAgICBpbnB1dFZhbHVlUmVmLmN1cnJlbnQgPT09ICcnICYmXG4gICAgICAgIHZhbHVlICE9PSAnJyAmJlxuICAgICAgICBEYXRlLm5vdygpIC0gbGFzdFVzZXJTY3JvbGxUc1JlZi5jdXJyZW50ID49XG4gICAgICAgICAgUkVDRU5UX1NDUk9MTF9SRVBJTl9XSU5ET1dfTVNcbiAgICAgICkge1xuICAgICAgICByZXBpblNjcm9sbCgpXG4gICAgICB9XG4gICAgICAvLyBTeW5jIHJlZiBpbW1lZGlhdGVseSAobGlrZSBzZXRNZXNzYWdlcykgc28gY2FsbGVycyB0aGF0IHJlYWRcbiAgICAgIC8vIGlucHV0VmFsdWVSZWYgYmVmb3JlIFJlYWN0IGNvbW1pdHMg4oCUIGUuZy4gdGhlIGF1dG8tcmVzdG9yZSBmaW5hbGx5XG4gICAgICAvLyBibG9jaydzIGA9PT0gJydgIGd1YXJkIOKAlCBzZWUgdGhlIGZyZXNoIHZhbHVlLCBub3QgdGhlIHN0YWxlIHJlbmRlci5cbiAgICAgIGlucHV0VmFsdWVSZWYuY3VycmVudCA9IHZhbHVlXG4gICAgICBzZXRJbnB1dFZhbHVlUmF3KHZhbHVlKVxuICAgICAgc2V0SXNQcm9tcHRJbnB1dEFjdGl2ZSh2YWx1ZS50cmltKCkubGVuZ3RoID4gMClcbiAgICB9LFxuICAgIFtzZXRJc1Byb21wdElucHV0QWN0aXZlLCByZXBpblNjcm9sbCwgdHJ5U3VnZ2VzdEJnUFJJbnRlcmNlcHRdLFxuICApXG5cbiAgLy8gU2NoZWR1bGUgYSB0aW1lb3V0IHRvIHN0b3Agc3VwcHJlc3NpbmcgZGlhbG9ncyBhZnRlciB0aGUgdXNlciBzdG9wcyB0eXBpbmcuXG4gIC8vIE9ubHkgbWFuYWdlcyB0aGUgdGltZW91dCDigJQgdGhlIGltbWVkaWF0ZSBhY3RpdmF0aW9uIGlzIGhhbmRsZWQgYnkgc2V0SW5wdXRWYWx1ZSBhYm92ZS5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoaW5wdXRWYWx1ZS50cmltKCkubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoXG4gICAgICBzZXRJc1Byb21wdElucHV0QWN0aXZlLFxuICAgICAgUFJPTVBUX1NVUFBSRVNTSU9OX01TLFxuICAgICAgZmFsc2UsXG4gICAgKVxuICAgIHJldHVybiAoKSA9PiBjbGVhclRpbWVvdXQodGltZXIpXG4gIH0sIFtpbnB1dFZhbHVlXSlcblxuICBjb25zdCBbaW5wdXRNb2RlLCBzZXRJbnB1dE1vZGVdID0gdXNlU3RhdGU8UHJvbXB0SW5wdXRNb2RlPigncHJvbXB0JylcbiAgY29uc3QgW3N0YXNoZWRQcm9tcHQsIHNldFN0YXNoZWRQcm9tcHRdID0gdXNlU3RhdGU8XG4gICAgfCB7XG4gICAgICAgIHRleHQ6IHN0cmluZ1xuICAgICAgICBjdXJzb3JPZmZzZXQ6IG51bWJlclxuICAgICAgICBwYXN0ZWRDb250ZW50czogUmVjb3JkPG51bWJlciwgUGFzdGVkQ29udGVudD5cbiAgICAgIH1cbiAgICB8IHVuZGVmaW5lZFxuICA+KClcblxuICAvLyBDYWxsYmFjayB0byBmaWx0ZXIgY29tbWFuZHMgYmFzZWQgb24gQ0NSJ3MgYXZhaWxhYmxlIHNsYXNoIGNvbW1hbmRzXG4gIGNvbnN0IGhhbmRsZVJlbW90ZUluaXQgPSB1c2VDYWxsYmFjayhcbiAgICAocmVtb3RlU2xhc2hDb21tYW5kczogc3RyaW5nW10pID0+IHtcbiAgICAgIGNvbnN0IHJlbW90ZUNvbW1hbmRTZXQgPSBuZXcgU2V0KHJlbW90ZVNsYXNoQ29tbWFuZHMpXG4gICAgICAvLyBLZWVwIGNvbW1hbmRzIHRoYXQgQ0NSIGxpc3RzIE9SIHRoYXQgYXJlIGluIHRoZSBsb2NhbC1zYWZlIHNldFxuICAgICAgc2V0TG9jYWxDb21tYW5kcyhwcmV2ID0+XG4gICAgICAgIHByZXYuZmlsdGVyKFxuICAgICAgICAgIGNtZCA9PlxuICAgICAgICAgICAgcmVtb3RlQ29tbWFuZFNldC5oYXMoY21kLm5hbWUpIHx8IFJFTU9URV9TQUZFX0NPTU1BTkRTLmhhcyhjbWQpLFxuICAgICAgICApLFxuICAgICAgKVxuICAgIH0sXG4gICAgW3NldExvY2FsQ29tbWFuZHNdLFxuICApXG5cbiAgY29uc3QgW2luUHJvZ3Jlc3NUb29sVXNlSURzLCBzZXRJblByb2dyZXNzVG9vbFVzZUlEc10gPSB1c2VTdGF0ZTxTZXQ8c3RyaW5nPj4oXG4gICAgbmV3IFNldCgpLFxuICApXG4gIGNvbnN0IGhhc0ludGVycnVwdGlibGVUb29sSW5Qcm9ncmVzc1JlZiA9IHVzZVJlZihmYWxzZSlcblxuICAvLyBSZW1vdGUgc2Vzc2lvbiBob29rIC0gbWFuYWdlcyBXZWJTb2NrZXQgY29ubmVjdGlvbiBhbmQgbWVzc2FnZSBoYW5kbGluZyBmb3IgLS1yZW1vdGUgbW9kZVxuICBjb25zdCByZW1vdGVTZXNzaW9uID0gdXNlUmVtb3RlU2Vzc2lvbih7XG4gICAgY29uZmlnOiByZW1vdGVTZXNzaW9uQ29uZmlnLFxuICAgIHNldE1lc3NhZ2VzLFxuICAgIHNldElzTG9hZGluZzogc2V0SXNFeHRlcm5hbExvYWRpbmcsXG4gICAgb25Jbml0OiBoYW5kbGVSZW1vdGVJbml0LFxuICAgIHNldFRvb2xVc2VDb25maXJtUXVldWUsXG4gICAgdG9vbHM6IGNvbWJpbmVkSW5pdGlhbFRvb2xzLFxuICAgIHNldFN0cmVhbWluZ1Rvb2xVc2VzLFxuICAgIHNldFN0cmVhbU1vZGUsXG4gICAgc2V0SW5Qcm9ncmVzc1Rvb2xVc2VJRHMsXG4gIH0pXG5cbiAgLy8gRGlyZWN0IGNvbm5lY3QgaG9vayAtIG1hbmFnZXMgV2ViU29ja2V0IHRvIGEgY2xhdWRlIHNlcnZlciBmb3IgYGNsYXVkZSBjb25uZWN0YCBtb2RlXG4gIGNvbnN0IGRpcmVjdENvbm5lY3QgPSB1c2VEaXJlY3RDb25uZWN0KHtcbiAgICBjb25maWc6IGRpcmVjdENvbm5lY3RDb25maWcsXG4gICAgc2V0TWVzc2FnZXMsXG4gICAgc2V0SXNMb2FkaW5nOiBzZXRJc0V4dGVybmFsTG9hZGluZyxcbiAgICBzZXRUb29sVXNlQ29uZmlybVF1ZXVlLFxuICAgIHRvb2xzOiBjb21iaW5lZEluaXRpYWxUb29scyxcbiAgfSlcblxuICAvLyBTU0ggc2Vzc2lvbiBob29rIC0gbWFuYWdlcyBzc2ggY2hpbGQgcHJvY2VzcyBmb3IgYGNsYXVkZSBzc2hgIG1vZGUuXG4gIC8vIFNhbWUgY2FsbGJhY2sgc2hhcGUgYXMgdXNlRGlyZWN0Q29ubmVjdDsgb25seSB0aGUgdHJhbnNwb3J0IHVuZGVyIHRoZVxuICAvLyBob29kIGRpZmZlcnMgKENoaWxkUHJvY2VzcyBzdGRpbi9zdGRvdXQgdnMgV2ViU29ja2V0KS5cbiAgY29uc3Qgc3NoUmVtb3RlID0gdXNlU1NIU2Vzc2lvbih7XG4gICAgc2Vzc2lvbjogc3NoU2Vzc2lvbixcbiAgICBzZXRNZXNzYWdlcyxcbiAgICBzZXRJc0xvYWRpbmc6IHNldElzRXh0ZXJuYWxMb2FkaW5nLFxuICAgIHNldFRvb2xVc2VDb25maXJtUXVldWUsXG4gICAgdG9vbHM6IGNvbWJpbmVkSW5pdGlhbFRvb2xzLFxuICB9KVxuXG4gIC8vIFVzZSB3aGljaGV2ZXIgcmVtb3RlIG1vZGUgaXMgYWN0aXZlXG4gIGNvbnN0IGFjdGl2ZVJlbW90ZSA9IHNzaFJlbW90ZS5pc1JlbW90ZU1vZGVcbiAgICA/IHNzaFJlbW90ZVxuICAgIDogZGlyZWN0Q29ubmVjdC5pc1JlbW90ZU1vZGVcbiAgICAgID8gZGlyZWN0Q29ubmVjdFxuICAgICAgOiByZW1vdGVTZXNzaW9uXG5cbiAgY29uc3QgW3Bhc3RlZENvbnRlbnRzLCBzZXRQYXN0ZWRDb250ZW50c10gPSB1c2VTdGF0ZTxcbiAgICBSZWNvcmQ8bnVtYmVyLCBQYXN0ZWRDb250ZW50PlxuICA+KHt9KVxuICBjb25zdCBbc3VibWl0Q291bnQsIHNldFN1Ym1pdENvdW50XSA9IHVzZVN0YXRlKDApXG4gIC8vIFJlZiBpbnN0ZWFkIG9mIHN0YXRlIHRvIGF2b2lkIHRyaWdnZXJpbmcgUmVhY3QgcmUtcmVuZGVycyBvbiBldmVyeVxuICAvLyBzdHJlYW1pbmcgdGV4dF9kZWx0YS4gVGhlIHNwaW5uZXIgcmVhZHMgdGhpcyB2aWEgaXRzIGFuaW1hdGlvbiB0aW1lci5cbiAgY29uc3QgcmVzcG9uc2VMZW5ndGhSZWYgPSB1c2VSZWYoMClcbiAgLy8gQVBJIHBlcmZvcm1hbmNlIG1ldHJpY3MgcmVmIGZvciBhbnQtb25seSBzcGlubmVyIGRpc3BsYXkgKFRURlQvT1RQUykuXG4gIC8vIEFjY3VtdWxhdGVzIG1ldHJpY3MgZnJvbSBhbGwgQVBJIHJlcXVlc3RzIGluIGEgdHVybiBmb3IgUDUwIGFnZ3JlZ2F0aW9uLlxuICBjb25zdCBhcGlNZXRyaWNzUmVmID0gdXNlUmVmPFxuICAgIEFycmF5PHtcbiAgICAgIHR0ZnRNczogbnVtYmVyXG4gICAgICBmaXJzdFRva2VuVGltZTogbnVtYmVyXG4gICAgICBsYXN0VG9rZW5UaW1lOiBudW1iZXJcbiAgICAgIHJlc3BvbnNlTGVuZ3RoQmFzZWxpbmU6IG51bWJlclxuICAgICAgLy8gVHJhY2tzIHJlc3BvbnNlTGVuZ3RoUmVmIGF0IHRoZSB0aW1lIG9mIHRoZSBsYXN0IGNvbnRlbnQgYWRkaXRpb24uXG4gICAgICAvLyBVcGRhdGVkIGJ5IGJvdGggc3RyZWFtaW5nIGRlbHRhcyBhbmQgc3ViYWdlbnQgbWVzc2FnZSBjb250ZW50LlxuICAgICAgLy8gbGFzdFRva2VuVGltZSBpcyBhbHNvIHVwZGF0ZWQgYXQgdGhlIHNhbWUgdGltZSwgc28gdGhlIE9UUFNcbiAgICAgIC8vIGRlbm9taW5hdG9yIGNvcnJlY3RseSBpbmNsdWRlcyBzdWJhZ2VudCBwcm9jZXNzaW5nIHRpbWUuXG4gICAgICBlbmRSZXNwb25zZUxlbmd0aDogbnVtYmVyXG4gICAgfT5cbiAgPihbXSlcbiAgY29uc3Qgc2V0UmVzcG9uc2VMZW5ndGggPSB1c2VDYWxsYmFjaygoZjogKHByZXY6IG51bWJlcikgPT4gbnVtYmVyKSA9PiB7XG4gICAgY29uc3QgcHJldiA9IHJlc3BvbnNlTGVuZ3RoUmVmLmN1cnJlbnRcbiAgICByZXNwb25zZUxlbmd0aFJlZi5jdXJyZW50ID0gZihwcmV2KVxuICAgIC8vIFdoZW4gY29udGVudCBpcyBhZGRlZCAobm90IGEgY29tcGFjdGlvbiByZXNldCksIHVwZGF0ZSB0aGUgbGF0ZXN0XG4gICAgLy8gbWV0cmljcyBlbnRyeSBzbyBPVFBTIHJlZmxlY3RzIGFsbCBjb250ZW50IGdlbmVyYXRpb24gYWN0aXZpdHkuXG4gICAgLy8gVXBkYXRpbmcgbGFzdFRva2VuVGltZSBoZXJlIGVuc3VyZXMgdGhlIGRlbm9taW5hdG9yIGluY2x1ZGVzIGJvdGhcbiAgICAvLyBzdHJlYW1pbmcgdGltZSBBTkQgc3ViYWdlbnQgZXhlY3V0aW9uIHRpbWUsIHByZXZlbnRpbmcgaW5mbGF0aW9uLlxuICAgIGlmIChyZXNwb25zZUxlbmd0aFJlZi5jdXJyZW50ID4gcHJldikge1xuICAgICAgY29uc3QgZW50cmllcyA9IGFwaU1ldHJpY3NSZWYuY3VycmVudFxuICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBsYXN0RW50cnkgPSBlbnRyaWVzLmF0KC0xKSFcbiAgICAgICAgbGFzdEVudHJ5Lmxhc3RUb2tlblRpbWUgPSBEYXRlLm5vdygpXG4gICAgICAgIGxhc3RFbnRyeS5lbmRSZXNwb25zZUxlbmd0aCA9IHJlc3BvbnNlTGVuZ3RoUmVmLmN1cnJlbnRcbiAgICAgIH1cbiAgICB9XG4gIH0sIFtdKVxuXG4gIC8vIFN0cmVhbWluZyB0ZXh0IGRpc3BsYXk6IHNldCBzdGF0ZSBkaXJlY3RseSBwZXIgZGVsdGEgKEluaydzIDE2bXMgcmVuZGVyXG4gIC8vIHRocm90dGxlIGJhdGNoZXMgcmFwaWQgdXBkYXRlcykuIENsZWFyZWQgb24gbWVzc2FnZSBhcnJpdmFsIChtZXNzYWdlcy50cylcbiAgLy8gc28gZGlzcGxheWVkTWVzc2FnZXMgc3dpdGNoZXMgZnJvbSBkZWZlcnJlZE1lc3NhZ2VzIHRvIG1lc3NhZ2VzIGF0b21pY2FsbHkuXG4gIGNvbnN0IFtzdHJlYW1pbmdUZXh0LCBzZXRTdHJlYW1pbmdUZXh0XSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpXG4gIGNvbnN0IHJlZHVjZWRNb3Rpb24gPVxuICAgIHVzZUFwcFN0YXRlKHMgPT4gcy5zZXR0aW5ncy5wcmVmZXJzUmVkdWNlZE1vdGlvbikgPz8gZmFsc2VcbiAgY29uc3Qgc2hvd1N0cmVhbWluZ1RleHQgPSAhcmVkdWNlZE1vdGlvbiAmJiAhaGFzQ3Vyc29yVXBWaWV3cG9ydFlhbmtCdWcoKVxuICBjb25zdCBvblN0cmVhbWluZ1RleHQgPSB1c2VDYWxsYmFjayhcbiAgICAoZjogKGN1cnJlbnQ6IHN0cmluZyB8IG51bGwpID0+IHN0cmluZyB8IG51bGwpID0+IHtcbiAgICAgIGlmICghc2hvd1N0cmVhbWluZ1RleHQpIHJldHVyblxuICAgICAgc2V0U3RyZWFtaW5nVGV4dChmKVxuICAgIH0sXG4gICAgW3Nob3dTdHJlYW1pbmdUZXh0XSxcbiAgKVxuXG4gIC8vIEhpZGUgdGhlIGluLXByb2dyZXNzIHNvdXJjZSBsaW5lIHNvIHRleHQgc3RyZWFtcyBsaW5lLWJ5LWxpbmUsIG5vdFxuICAvLyBjaGFyLWJ5LWNoYXIuIGxhc3RJbmRleE9mIHJldHVybnMgLTEgd2hlbiBubyBuZXdsaW5lLCBnaXZpbmcgJycg4oaSIG51bGwuXG4gIC8vIEd1YXJkIG9uIHNob3dTdHJlYW1pbmdUZXh0IHNvIHRvZ2dsaW5nIHJlZHVjZWRNb3Rpb24gbWlkLXN0cmVhbVxuICAvLyBpbW1lZGlhdGVseSBoaWRlcyB0aGUgc3RyZWFtaW5nIHByZXZpZXcuXG4gIGNvbnN0IHZpc2libGVTdHJlYW1pbmdUZXh0ID1cbiAgICBzdHJlYW1pbmdUZXh0ICYmIHNob3dTdHJlYW1pbmdUZXh0XG4gICAgICA/IHN0cmVhbWluZ1RleHQuc3Vic3RyaW5nKDAsIHN0cmVhbWluZ1RleHQubGFzdEluZGV4T2YoJ1xcbicpICsgMSkgfHwgbnVsbFxuICAgICAgOiBudWxsXG5cbiAgY29uc3QgW2xhc3RRdWVyeUNvbXBsZXRpb25UaW1lLCBzZXRMYXN0UXVlcnlDb21wbGV0aW9uVGltZV0gPSB1c2VTdGF0ZSgwKVxuICBjb25zdCBbc3Bpbm5lck1lc3NhZ2UsIHNldFNwaW5uZXJNZXNzYWdlXSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpXG4gIGNvbnN0IFtzcGlubmVyQ29sb3IsIHNldFNwaW5uZXJDb2xvcl0gPSB1c2VTdGF0ZTxrZXlvZiBUaGVtZSB8IG51bGw+KG51bGwpXG4gIGNvbnN0IFtzcGlubmVyU2hpbW1lckNvbG9yLCBzZXRTcGlubmVyU2hpbW1lckNvbG9yXSA9IHVzZVN0YXRlPFxuICAgIGtleW9mIFRoZW1lIHwgbnVsbFxuICA+KG51bGwpXG4gIGNvbnN0IFtpc01lc3NhZ2VTZWxlY3RvclZpc2libGUsIHNldElzTWVzc2FnZVNlbGVjdG9yVmlzaWJsZV0gPVxuICAgIHVzZVN0YXRlKGZhbHNlKVxuICBjb25zdCBbbWVzc2FnZVNlbGVjdG9yUHJlc2VsZWN0LCBzZXRNZXNzYWdlU2VsZWN0b3JQcmVzZWxlY3RdID0gdXNlU3RhdGU8XG4gICAgVXNlck1lc3NhZ2UgfCB1bmRlZmluZWRcbiAgPih1bmRlZmluZWQpXG4gIGNvbnN0IFtzaG93Q29zdERpYWxvZywgc2V0U2hvd0Nvc3REaWFsb2ddID0gdXNlU3RhdGUoZmFsc2UpXG4gIGNvbnN0IFtjb252ZXJzYXRpb25JZCwgc2V0Q29udmVyc2F0aW9uSWRdID0gdXNlU3RhdGUocmFuZG9tVVVJRCgpKVxuXG4gIC8vIElkbGUtcmV0dXJuIGRpYWxvZzogc2hvd24gd2hlbiB1c2VyIHN1Ym1pdHMgYWZ0ZXIgYSBsb25nIGlkbGUgZ2FwXG4gIGNvbnN0IFtpZGxlUmV0dXJuUGVuZGluZywgc2V0SWRsZVJldHVyblBlbmRpbmddID0gdXNlU3RhdGU8e1xuICAgIGlucHV0OiBzdHJpbmdcbiAgICBpZGxlTWludXRlczogbnVtYmVyXG4gIH0gfCBudWxsPihudWxsKVxuICBjb25zdCBza2lwSWRsZUNoZWNrUmVmID0gdXNlUmVmKGZhbHNlKVxuICBjb25zdCBsYXN0UXVlcnlDb21wbGV0aW9uVGltZVJlZiA9IHVzZVJlZihsYXN0UXVlcnlDb21wbGV0aW9uVGltZSlcbiAgbGFzdFF1ZXJ5Q29tcGxldGlvblRpbWVSZWYuY3VycmVudCA9IGxhc3RRdWVyeUNvbXBsZXRpb25UaW1lXG5cbiAgLy8gQWdncmVnYXRlIHRvb2wgcmVzdWx0IGJ1ZGdldDogcGVyLWNvbnZlcnNhdGlvbiBkZWNpc2lvbiB0cmFja2luZy5cbiAgLy8gV2hlbiB0aGUgR3Jvd3RoQm9vayBmbGFnIGlzIG9uLCBxdWVyeS50cyBlbmZvcmNlcyB0aGUgYnVkZ2V0OyB3aGVuXG4gIC8vIG9mZiAodW5kZWZpbmVkKSwgZW5mb3JjZW1lbnQgaXMgc2tpcHBlZCBlbnRpcmVseS4gU3RhbGUgZW50cmllcyBhZnRlclxuICAvLyAvY2xlYXIsIHJld2luZCwgb3IgY29tcGFjdCBhcmUgaGFybWxlc3MgKHRvb2xfdXNlX2lkcyBhcmUgVVVJRHMsIHN0YWxlXG4gIC8vIGtleXMgYXJlIG5ldmVyIGxvb2tlZCB1cCkuIE1lbW9yeSBpcyBib3VuZGVkIGJ5IHRvdGFsIHJlcGxhY2VtZW50IGNvdW50XG4gIC8vIMOXIH4yS0IgcHJldmlldyBvdmVyIHRoZSBSRVBMIGxpZmV0aW1lIOKAlCBuZWdsaWdpYmxlLlxuICAvL1xuICAvLyBMYXp5IGluaXQgdmlhIHVzZVN0YXRlIGluaXRpYWxpemVyIOKAlCB1c2VSZWYoZXhwcikgZXZhbHVhdGVzIGV4cHIgb24gZXZlcnlcbiAgLy8gcmVuZGVyIChSZWFjdCBpZ25vcmVzIGl0IGFmdGVyIGZpcnN0LCBidXQgdGhlIGNvbXB1dGF0aW9uIHN0aWxsIHJ1bnMpLlxuICAvLyBGb3IgbGFyZ2UgcmVzdW1lZCBzZXNzaW9ucywgcmVjb25zdHJ1Y3Rpb24gZG9lcyBPKG1lc3NhZ2VzIMOXIGJsb2NrcylcbiAgLy8gd29yazsgd2Ugb25seSB3YW50IHRoYXQgb25jZS5cbiAgY29uc3QgW2NvbnRlbnRSZXBsYWNlbWVudFN0YXRlUmVmXSA9IHVzZVN0YXRlKCgpID0+ICh7XG4gICAgY3VycmVudDogcHJvdmlzaW9uQ29udGVudFJlcGxhY2VtZW50U3RhdGUoXG4gICAgICBpbml0aWFsTWVzc2FnZXMsXG4gICAgICBpbml0aWFsQ29udGVudFJlcGxhY2VtZW50cyxcbiAgICApLFxuICB9KSlcblxuICBjb25zdCBbaGF2ZVNob3duQ29zdERpYWxvZywgc2V0SGF2ZVNob3duQ29zdERpYWxvZ10gPSB1c2VTdGF0ZShcbiAgICBnZXRHbG9iYWxDb25maWcoKS5oYXNBY2tub3dsZWRnZWRDb3N0VGhyZXNob2xkLFxuICApXG4gIGNvbnN0IFt2aW1Nb2RlLCBzZXRWaW1Nb2RlXSA9IHVzZVN0YXRlPFZpbU1vZGU+KCdJTlNFUlQnKVxuICBjb25zdCBbc2hvd0Jhc2hlc0RpYWxvZywgc2V0U2hvd0Jhc2hlc0RpYWxvZ10gPSB1c2VTdGF0ZTxzdHJpbmcgfCBib29sZWFuPihcbiAgICBmYWxzZSxcbiAgKVxuICBjb25zdCBbaXNTZWFyY2hpbmdIaXN0b3J5LCBzZXRJc1NlYXJjaGluZ0hpc3RvcnldID0gdXNlU3RhdGUoZmFsc2UpXG4gIGNvbnN0IFtpc0hlbHBPcGVuLCBzZXRJc0hlbHBPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKVxuXG4gIC8vIHNob3dCYXNoZXNEaWFsb2cgaXMgUkVQTC1sZXZlbCBzbyBpdCBzdXJ2aXZlcyBQcm9tcHRJbnB1dCB1bm1vdW50aW5nLlxuICAvLyBXaGVuIHVsdHJhcGxhbiBhcHByb3ZhbCBmaXJlcyB3aGlsZSB0aGUgcGlsbCBkaWFsb2cgaXMgb3BlbiwgUHJvbXB0SW5wdXRcbiAgLy8gdW5tb3VudHMgKGZvY3VzZWRJbnB1dERpYWxvZyDihpIgJ3VsdHJhcGxhbi1jaG9pY2UnKSBidXQgdGhpcyBzdGF5cyB0cnVlO1xuICAvLyBhZnRlciBhY2NlcHRpbmcsIFByb21wdElucHV0IHJlbW91bnRzIGludG8gYW4gZW1wdHkgXCJObyB0YXNrc1wiIGRpYWxvZ1xuICAvLyAodGhlIGNvbXBsZXRlZCB1bHRyYXBsYW4gdGFzayBoYXMgYmVlbiBmaWx0ZXJlZCBvdXQpLiBDbG9zZSBpdCBoZXJlLlxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICh1bHRyYXBsYW5QZW5kaW5nQ2hvaWNlICYmIHNob3dCYXNoZXNEaWFsb2cpIHtcbiAgICAgIHNldFNob3dCYXNoZXNEaWFsb2coZmFsc2UpXG4gICAgfVxuICB9LCBbdWx0cmFwbGFuUGVuZGluZ0Nob2ljZSwgc2hvd0Jhc2hlc0RpYWxvZ10pXG5cbiAgY29uc3QgaXNUZXJtaW5hbEZvY3VzZWQgPSB1c2VUZXJtaW5hbEZvY3VzKClcbiAgY29uc3QgdGVybWluYWxGb2N1c1JlZiA9IHVzZVJlZihpc1Rlcm1pbmFsRm9jdXNlZClcbiAgdGVybWluYWxGb2N1c1JlZi5jdXJyZW50ID0gaXNUZXJtaW5hbEZvY3VzZWRcblxuICBjb25zdCBbdGhlbWVdID0gdXNlVGhlbWUoKVxuXG4gIC8vIHJlc2V0TG9hZGluZ1N0YXRlIHJ1bnMgdHdpY2UgcGVyIHR1cm4gKG9uUXVlcnlJbXBsIHRhaWwgKyBvblF1ZXJ5IGZpbmFsbHkpLlxuICAvLyBXaXRob3V0IHRoaXMgZ3VhcmQsIGJvdGggY2FsbHMgcGljayBhIHRpcCDihpIgdHdvIHJlY29yZFNob3duVGlwIOKGkiB0d29cbiAgLy8gc2F2ZUdsb2JhbENvbmZpZyB3cml0ZXMgYmFjay10by1iYWNrLiBSZXNldCBhdCBzdWJtaXQgaW4gb25TdWJtaXQuXG4gIGNvbnN0IHRpcFBpY2tlZFRoaXNUdXJuUmVmID0gUmVhY3QudXNlUmVmKGZhbHNlKVxuICBjb25zdCBwaWNrTmV3U3Bpbm5lclRpcCA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBpZiAodGlwUGlja2VkVGhpc1R1cm5SZWYuY3VycmVudCkgcmV0dXJuXG4gICAgdGlwUGlja2VkVGhpc1R1cm5SZWYuY3VycmVudCA9IHRydWVcbiAgICBjb25zdCBuZXdNZXNzYWdlcyA9IG1lc3NhZ2VzUmVmLmN1cnJlbnQuc2xpY2UoYmFzaFRvb2xzUHJvY2Vzc2VkSWR4LmN1cnJlbnQpXG4gICAgZm9yIChjb25zdCB0b29sIG9mIGV4dHJhY3RCYXNoVG9vbHNGcm9tTWVzc2FnZXMobmV3TWVzc2FnZXMpKSB7XG4gICAgICBiYXNoVG9vbHMuY3VycmVudC5hZGQodG9vbClcbiAgICB9XG4gICAgYmFzaFRvb2xzUHJvY2Vzc2VkSWR4LmN1cnJlbnQgPSBtZXNzYWdlc1JlZi5jdXJyZW50Lmxlbmd0aFxuICAgIHZvaWQgZ2V0VGlwVG9TaG93T25TcGlubmVyKHtcbiAgICAgIHRoZW1lLFxuICAgICAgcmVhZEZpbGVTdGF0ZTogcmVhZEZpbGVTdGF0ZS5jdXJyZW50LFxuICAgICAgYmFzaFRvb2xzOiBiYXNoVG9vbHMuY3VycmVudCxcbiAgICB9KS50aGVuKGFzeW5jIHRpcCA9PiB7XG4gICAgICBpZiAodGlwKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aXAuY29udGVudCh7IHRoZW1lIH0pXG4gICAgICAgIHNldEFwcFN0YXRlKHByZXYgPT4gKHtcbiAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgIHNwaW5uZXJUaXA6IGNvbnRlbnQsXG4gICAgICAgIH0pKVxuICAgICAgICByZWNvcmRTaG93blRpcCh0aXApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+IHtcbiAgICAgICAgICBpZiAocHJldi5zcGlubmVyVGlwID09PSB1bmRlZmluZWQpIHJldHVybiBwcmV2XG4gICAgICAgICAgcmV0dXJuIHsgLi4ucHJldiwgc3Bpbm5lclRpcDogdW5kZWZpbmVkIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9LCBbc2V0QXBwU3RhdGUsIHRoZW1lXSlcblxuICAvLyBSZXNldHMgVUkgbG9hZGluZyBzdGF0ZS4gRG9lcyBOT1QgY2FsbCBvblR1cm5Db21wbGV0ZSAtIHRoYXQgc2hvdWxkIGJlXG4gIC8vIGNhbGxlZCBleHBsaWNpdGx5IG9ubHkgd2hlbiBhIHF1ZXJ5IHR1cm4gYWN0dWFsbHkgY29tcGxldGVzLlxuICBjb25zdCByZXNldExvYWRpbmdTdGF0ZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICAvLyBpc0xvYWRpbmcgaXMgbm93IGRlcml2ZWQgZnJvbSBxdWVyeUd1YXJkIOKAlCBubyBzZXR0ZXIgY2FsbCBuZWVkZWQuXG4gICAgLy8gcXVlcnlHdWFyZC5lbmQoKSAob25RdWVyeSBmaW5hbGx5KSBvciBjYW5jZWxSZXNlcnZhdGlvbigpIChleGVjdXRlVXNlcklucHV0XG4gICAgLy8gZmluYWxseSkgaGF2ZSBhbHJlYWR5IHRyYW5zaXRpb25lZCB0aGUgZ3VhcmQgdG8gaWRsZSBieSB0aGUgdGltZSB0aGlzIHJ1bnMuXG4gICAgLy8gRXh0ZXJuYWwgbG9hZGluZyAocmVtb3RlL2JhY2tncm91bmRpbmcpIGlzIHJlc2V0IHNlcGFyYXRlbHkgYnkgdGhvc2UgaG9va3MuXG4gICAgc2V0SXNFeHRlcm5hbExvYWRpbmcoZmFsc2UpXG4gICAgc2V0VXNlcklucHV0T25Qcm9jZXNzaW5nKHVuZGVmaW5lZClcbiAgICByZXNwb25zZUxlbmd0aFJlZi5jdXJyZW50ID0gMFxuICAgIGFwaU1ldHJpY3NSZWYuY3VycmVudCA9IFtdXG4gICAgc2V0U3RyZWFtaW5nVGV4dChudWxsKVxuICAgIHNldFN0cmVhbWluZ1Rvb2xVc2VzKFtdKVxuICAgIHNldFNwaW5uZXJNZXNzYWdlKG51bGwpXG4gICAgc2V0U3Bpbm5lckNvbG9yKG51bGwpXG4gICAgc2V0U3Bpbm5lclNoaW1tZXJDb2xvcihudWxsKVxuICAgIHBpY2tOZXdTcGlubmVyVGlwKClcbiAgICBlbmRJbnRlcmFjdGlvblNwYW4oKVxuICAgIC8vIFNwZWN1bGF0aXZlIGJhc2ggY2xhc3NpZmllciBjaGVja3MgYXJlIG9ubHkgdmFsaWQgZm9yIHRoZSBjdXJyZW50XG4gICAgLy8gdHVybidzIGNvbW1hbmRzIOKAlCBjbGVhciBhZnRlciBlYWNoIHR1cm4gdG8gYXZvaWQgYWNjdW11bGF0aW5nXG4gICAgLy8gUHJvbWlzZSBjaGFpbnMgZm9yIHVuY29uc3VtZWQgY2hlY2tzIChkZW5pZWQvYWJvcnRlZCBwYXRocykuXG4gICAgY2xlYXJTcGVjdWxhdGl2ZUNoZWNrcygpXG4gIH0sIFtwaWNrTmV3U3Bpbm5lclRpcF0pXG5cbiAgLy8gU2Vzc2lvbiBiYWNrZ3JvdW5kaW5nIOKAlCBob29rIGlzIGJlbG93LCBhZnRlciBnZXRUb29sVXNlQ29udGV4dFxuXG4gIGNvbnN0IGhhc1J1bm5pbmdUZWFtbWF0ZXMgPSB1c2VNZW1vKFxuICAgICgpID0+IGdldEFsbEluUHJvY2Vzc1RlYW1tYXRlVGFza3ModGFza3MpLnNvbWUodCA9PiB0LnN0YXR1cyA9PT0gJ3J1bm5pbmcnKSxcbiAgICBbdGFza3NdLFxuICApXG5cbiAgLy8gU2hvdyBkZWZlcnJlZCB0dXJuIGR1cmF0aW9uIG1lc3NhZ2Ugb25jZSBhbGwgc3dhcm0gdGVhbW1hdGVzIGZpbmlzaFxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghaGFzUnVubmluZ1RlYW1tYXRlcyAmJiBzd2FybVN0YXJ0VGltZVJlZi5jdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICBjb25zdCB0b3RhbE1zID0gRGF0ZS5ub3coKSAtIHN3YXJtU3RhcnRUaW1lUmVmLmN1cnJlbnRcbiAgICAgIGNvbnN0IGRlZmVycmVkQnVkZ2V0ID0gc3dhcm1CdWRnZXRJbmZvUmVmLmN1cnJlbnRcbiAgICAgIHN3YXJtU3RhcnRUaW1lUmVmLmN1cnJlbnQgPSBudWxsXG4gICAgICBzd2FybUJ1ZGdldEluZm9SZWYuY3VycmVudCA9IHVuZGVmaW5lZFxuICAgICAgc2V0TWVzc2FnZXMocHJldiA9PiBbXG4gICAgICAgIC4uLnByZXYsXG4gICAgICAgIGNyZWF0ZVR1cm5EdXJhdGlvbk1lc3NhZ2UoXG4gICAgICAgICAgdG90YWxNcyxcbiAgICAgICAgICBkZWZlcnJlZEJ1ZGdldCxcbiAgICAgICAgICAvLyBDb3VudCBvbmx5IHdoYXQgcmVjb3JkVHJhbnNjcmlwdCB3aWxsIHBlcnNpc3Qg4oCUIGVwaGVtZXJhbFxuICAgICAgICAgIC8vIHByb2dyZXNzIHRpY2tzIGFuZCBub24tYW50IGF0dGFjaG1lbnRzIGFyZSBmaWx0ZXJlZCBieVxuICAgICAgICAgIC8vIGlzTG9nZ2FibGVNZXNzYWdlIGFuZCBuZXZlciByZWFjaCBkaXNrLiBVc2luZyByYXcgcHJldi5sZW5ndGhcbiAgICAgICAgICAvLyB3b3VsZCBtYWtlIGNoZWNrUmVzdW1lQ29uc2lzdGVuY3kgcmVwb3J0IGZhbHNlIGRlbHRhPDAgZm9yXG4gICAgICAgICAgLy8gZXZlcnkgdHVybiB0aGF0IHJhbiBhIHByb2dyZXNzLWVtaXR0aW5nIHRvb2wuXG4gICAgICAgICAgY291bnQocHJldiwgaXNMb2dnYWJsZU1lc3NhZ2UpLFxuICAgICAgICApLFxuICAgICAgXSlcbiAgICB9XG4gIH0sIFtoYXNSdW5uaW5nVGVhbW1hdGVzLCBzZXRNZXNzYWdlc10pXG5cbiAgLy8gU2hvdyBhdXRvIHBlcm1pc3Npb25zIHdhcm5pbmcgd2hlbiBlbnRlcmluZyBhdXRvIG1vZGVcbiAgLy8gKGVpdGhlciB2aWEgU2hpZnQrVGFiIHRvZ2dsZSBvciBvbiBzdGFydHVwKS4gRGVib3VuY2VkIHRvIGF2b2lkXG4gIC8vIGZsYXNoaW5nIHdoZW4gdGhlIHVzZXIgaXMgY3ljbGluZyB0aHJvdWdoIG1vZGVzIHF1aWNrbHkuXG4gIC8vIE9ubHkgc2hvd24gMyB0aW1lcyB0b3RhbCBhY3Jvc3Mgc2Vzc2lvbnMuXG4gIGNvbnN0IHNhZmVZb2xvTWVzc2FnZVNob3duUmVmID0gdXNlUmVmKGZhbHNlKVxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChmZWF0dXJlKCdUUkFOU0NSSVBUX0NMQVNTSUZJRVInKSkge1xuICAgICAgaWYgKHRvb2xQZXJtaXNzaW9uQ29udGV4dC5tb2RlICE9PSAnYXV0bycpIHtcbiAgICAgICAgc2FmZVlvbG9NZXNzYWdlU2hvd25SZWYuY3VycmVudCA9IGZhbHNlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKHNhZmVZb2xvTWVzc2FnZVNob3duUmVmLmN1cnJlbnQpIHJldHVyblxuICAgICAgY29uc3QgY29uZmlnID0gZ2V0R2xvYmFsQ29uZmlnKClcbiAgICAgIGNvbnN0IGNvdW50ID0gY29uZmlnLmF1dG9QZXJtaXNzaW9uc05vdGlmaWNhdGlvbkNvdW50ID8/IDBcbiAgICAgIGlmIChjb3VudCA+PSAzKSByZXR1cm5cbiAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dChcbiAgICAgICAgKHJlZiwgc2V0TWVzc2FnZXMpID0+IHtcbiAgICAgICAgICByZWYuY3VycmVudCA9IHRydWVcbiAgICAgICAgICBzYXZlR2xvYmFsQ29uZmlnKHByZXYgPT4ge1xuICAgICAgICAgICAgY29uc3QgcHJldkNvdW50ID0gcHJldi5hdXRvUGVybWlzc2lvbnNOb3RpZmljYXRpb25Db3VudCA/PyAwXG4gICAgICAgICAgICBpZiAocHJldkNvdW50ID49IDMpIHJldHVybiBwcmV2XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgICAgICBhdXRvUGVybWlzc2lvbnNOb3RpZmljYXRpb25Db3VudDogcHJldkNvdW50ICsgMSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICAgIHNldE1lc3NhZ2VzKHByZXYgPT4gW1xuICAgICAgICAgICAgLi4ucHJldixcbiAgICAgICAgICAgIGNyZWF0ZVN5c3RlbU1lc3NhZ2UoQVVUT19NT0RFX0RFU0NSSVBUSU9OLCAnd2FybmluZycpLFxuICAgICAgICAgIF0pXG4gICAgICAgIH0sXG4gICAgICAgIDgwMCxcbiAgICAgICAgc2FmZVlvbG9NZXNzYWdlU2hvd25SZWYsXG4gICAgICAgIHNldE1lc3NhZ2VzLFxuICAgICAgKVxuICAgICAgcmV0dXJuICgpID0+IGNsZWFyVGltZW91dCh0aW1lcilcbiAgICB9XG4gIH0sIFt0b29sUGVybWlzc2lvbkNvbnRleHQubW9kZSwgc2V0TWVzc2FnZXNdKVxuXG4gIC8vIElmIHdvcmt0cmVlIGNyZWF0aW9uIHdhcyBzbG93IGFuZCBzcGFyc2UtY2hlY2tvdXQgaXNuJ3QgY29uZmlndXJlZCxcbiAgLy8gbnVkZ2UgdGhlIHVzZXIgdG93YXJkIHNldHRpbmdzLndvcmt0cmVlLnNwYXJzZVBhdGhzLlxuICBjb25zdCB3b3JrdHJlZVRpcFNob3duUmVmID0gdXNlUmVmKGZhbHNlKVxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICh3b3JrdHJlZVRpcFNob3duUmVmLmN1cnJlbnQpIHJldHVyblxuICAgIGNvbnN0IHd0ID0gZ2V0Q3VycmVudFdvcmt0cmVlU2Vzc2lvbigpXG4gICAgaWYgKCF3dD8uY3JlYXRpb25EdXJhdGlvbk1zIHx8IHd0LnVzZWRTcGFyc2VQYXRocykgcmV0dXJuXG4gICAgaWYgKHd0LmNyZWF0aW9uRHVyYXRpb25NcyA8IDE1XzAwMCkgcmV0dXJuXG4gICAgd29ya3RyZWVUaXBTaG93blJlZi5jdXJyZW50ID0gdHJ1ZVxuICAgIGNvbnN0IHNlY3MgPSBNYXRoLnJvdW5kKHd0LmNyZWF0aW9uRHVyYXRpb25NcyAvIDEwMDApXG4gICAgc2V0TWVzc2FnZXMocHJldiA9PiBbXG4gICAgICAuLi5wcmV2LFxuICAgICAgY3JlYXRlU3lzdGVtTWVzc2FnZShcbiAgICAgICAgYFdvcmt0cmVlIGNyZWF0aW9uIHRvb2sgJHtzZWNzfXMuIEZvciBsYXJnZSByZXBvcywgc2V0IFxcYHdvcmt0cmVlLnNwYXJzZVBhdGhzXFxgIGluIC5jbGF1ZGUvc2V0dGluZ3MuanNvbiB0byBjaGVjayBvdXQgb25seSB0aGUgZGlyZWN0b3JpZXMgeW91IG5lZWQg4oCUIGUuZy4gXFxge1wid29ya3RyZWVcIjoge1wic3BhcnNlUGF0aHNcIjogW1wic3JjXCIsIFwicGFja2FnZXMvZm9vXCJdfX1cXGAuYCxcbiAgICAgICAgJ2luZm8nLFxuICAgICAgKSxcbiAgICBdKVxuICB9LCBbc2V0TWVzc2FnZXNdKVxuXG4gIC8vIEhpZGUgc3Bpbm5lciB3aGVuIHRoZSBvbmx5IGluLXByb2dyZXNzIHRvb2wgaXMgU2xlZXBcbiAgY29uc3Qgb25seVNsZWVwVG9vbEFjdGl2ZSA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IGxhc3RBc3Npc3RhbnQgPSBtZXNzYWdlcy5maW5kTGFzdChtID0+IG0udHlwZSA9PT0gJ2Fzc2lzdGFudCcpXG4gICAgaWYgKGxhc3RBc3Npc3RhbnQ/LnR5cGUgIT09ICdhc3Npc3RhbnQnKSByZXR1cm4gZmFsc2VcbiAgICBjb25zdCBpblByb2dyZXNzVG9vbFVzZXMgPSBsYXN0QXNzaXN0YW50Lm1lc3NhZ2UuY29udGVudC5maWx0ZXIoXG4gICAgICBiID0+IGIudHlwZSA9PT0gJ3Rvb2xfdXNlJyAmJiBpblByb2dyZXNzVG9vbFVzZUlEcy5oYXMoYi5pZCksXG4gICAgKVxuICAgIHJldHVybiAoXG4gICAgICBpblByb2dyZXNzVG9vbFVzZXMubGVuZ3RoID4gMCAmJlxuICAgICAgaW5Qcm9ncmVzc1Rvb2xVc2VzLmV2ZXJ5KFxuICAgICAgICBiID0+IGIudHlwZSA9PT0gJ3Rvb2xfdXNlJyAmJiBiLm5hbWUgPT09IFNMRUVQX1RPT0xfTkFNRSxcbiAgICAgIClcbiAgICApXG4gIH0sIFttZXNzYWdlcywgaW5Qcm9ncmVzc1Rvb2xVc2VJRHNdKVxuXG4gIGNvbnN0IHtcbiAgICBvbkJlZm9yZVF1ZXJ5OiBtck9uQmVmb3JlUXVlcnksXG4gICAgb25UdXJuQ29tcGxldGU6IG1yT25UdXJuQ29tcGxldGUsXG4gICAgcmVuZGVyOiBtclJlbmRlcixcbiAgfSA9IHVzZU1vcmVSaWdodCh7XG4gICAgZW5hYmxlZDogbW9yZVJpZ2h0RW5hYmxlZCxcbiAgICBzZXRNZXNzYWdlcyxcbiAgICBpbnB1dFZhbHVlLFxuICAgIHNldElucHV0VmFsdWUsXG4gICAgc2V0VG9vbEpTWCxcbiAgfSlcblxuICBjb25zdCBzaG93U3Bpbm5lciA9XG4gICAgKCF0b29sSlNYIHx8IHRvb2xKU1guc2hvd1NwaW5uZXIgPT09IHRydWUpICYmXG4gICAgdG9vbFVzZUNvbmZpcm1RdWV1ZS5sZW5ndGggPT09IDAgJiZcbiAgICBwcm9tcHRRdWV1ZS5sZW5ndGggPT09IDAgJiZcbiAgICAvLyBTaG93IHNwaW5uZXIgZHVyaW5nIGlucHV0IHByb2Nlc3NpbmcsIEFQSSBjYWxsLCB3aGlsZSB0ZWFtbWF0ZXMgYXJlIHJ1bm5pbmcsXG4gICAgLy8gb3Igd2hpbGUgcGVuZGluZyB0YXNrIG5vdGlmaWNhdGlvbnMgYXJlIHF1ZXVlZCAocHJldmVudHMgc3Bpbm5lciBib3VuY2UgYmV0d2VlbiBjb25zZWN1dGl2ZSBub3RpZmljYXRpb25zKVxuICAgIChpc0xvYWRpbmcgfHxcbiAgICAgIHVzZXJJbnB1dE9uUHJvY2Vzc2luZyB8fFxuICAgICAgaGFzUnVubmluZ1RlYW1tYXRlcyB8fFxuICAgICAgLy8gS2VlcCBzcGlubmVyIHZpc2libGUgd2hpbGUgdGFzayBub3RpZmljYXRpb25zIGFyZSBxdWV1ZWQgZm9yIHByb2Nlc3NpbmcuXG4gICAgICAvLyBXaXRob3V0IHRoaXMsIHRoZSBzcGlubmVyIGJyaWVmbHkgZGlzYXBwZWFycyBiZXR3ZWVuIGNvbnNlY3V0aXZlIG5vdGlmaWNhdGlvbnNcbiAgICAgIC8vIChlLmcuLCBtdWx0aXBsZSBiYWNrZ3JvdW5kIGFnZW50cyBjb21wbGV0aW5nIGluIHJhcGlkIHN1Y2Nlc3Npb24pIGJlY2F1c2VcbiAgICAgIC8vIGlzTG9hZGluZyBnb2VzIGZhbHNlIG1vbWVudGFyaWx5IGJldHdlZW4gcHJvY2Vzc2luZyBlYWNoIG9uZS5cbiAgICAgIGdldENvbW1hbmRRdWV1ZUxlbmd0aCgpID4gMCkgJiZcbiAgICAvLyBIaWRlIHNwaW5uZXIgd2hlbiB3YWl0aW5nIGZvciBsZWFkZXIgdG8gYXBwcm92ZSBwZXJtaXNzaW9uIHJlcXVlc3RcbiAgICAhcGVuZGluZ1dvcmtlclJlcXVlc3QgJiZcbiAgICAhb25seVNsZWVwVG9vbEFjdGl2ZSAmJlxuICAgIC8vIEhpZGUgc3Bpbm5lciB3aGVuIHN0cmVhbWluZyB0ZXh0IGlzIHZpc2libGUgKHRoZSB0ZXh0IElTIHRoZSBmZWVkYmFjayksXG4gICAgLy8gYnV0IGtlZXAgaXQgd2hlbiBpc0JyaWVmT25seSBzdXBwcmVzc2VzIHRoZSBzdHJlYW1pbmcgdGV4dCBkaXNwbGF5XG4gICAgKCF2aXNpYmxlU3RyZWFtaW5nVGV4dCB8fCBpc0JyaWVmT25seSlcblxuICAvLyBDaGVjayBpZiBhbnkgcGVybWlzc2lvbiBvciBhc2sgcXVlc3Rpb24gcHJvbXB0IGlzIGN1cnJlbnRseSB2aXNpYmxlXG4gIC8vIFRoaXMgaXMgdXNlZCB0byBwcmV2ZW50IHRoZSBzdXJ2ZXkgZnJvbSBvcGVuaW5nIHdoaWxlIHByb21wdHMgYXJlIGFjdGl2ZVxuICBjb25zdCBoYXNBY3RpdmVQcm9tcHQgPVxuICAgIHRvb2xVc2VDb25maXJtUXVldWUubGVuZ3RoID4gMCB8fFxuICAgIHByb21wdFF1ZXVlLmxlbmd0aCA+IDAgfHxcbiAgICBzYW5kYm94UGVybWlzc2lvblJlcXVlc3RRdWV1ZS5sZW5ndGggPiAwIHx8XG4gICAgZWxpY2l0YXRpb24ucXVldWUubGVuZ3RoID4gMCB8fFxuICAgIHdvcmtlclNhbmRib3hQZXJtaXNzaW9ucy5xdWV1ZS5sZW5ndGggPiAwXG5cbiAgY29uc3QgZmVlZGJhY2tTdXJ2ZXlPcmlnaW5hbCA9IHVzZUZlZWRiYWNrU3VydmV5KFxuICAgIG1lc3NhZ2VzLFxuICAgIGlzTG9hZGluZyxcbiAgICBzdWJtaXRDb3VudCxcbiAgICAnc2Vzc2lvbicsXG4gICAgaGFzQWN0aXZlUHJvbXB0LFxuICApXG5cbiAgY29uc3Qgc2tpbGxJbXByb3ZlbWVudFN1cnZleSA9IHVzZVNraWxsSW1wcm92ZW1lbnRTdXJ2ZXkoc2V0TWVzc2FnZXMpXG5cbiAgY29uc3Qgc2hvd0lzc3VlRmxhZ0Jhbm5lciA9IHVzZUlzc3VlRmxhZ0Jhbm5lcihtZXNzYWdlcywgc3VibWl0Q291bnQpXG5cbiAgLy8gV3JhcCBmZWVkYmFjayBzdXJ2ZXkgaGFuZGxlciB0byB0cmlnZ2VyIGF1dG8tcnVuIC9pc3N1ZVxuICBjb25zdCBmZWVkYmFja1N1cnZleSA9IHVzZU1lbW8oXG4gICAgKCkgPT4gKHtcbiAgICAgIC4uLmZlZWRiYWNrU3VydmV5T3JpZ2luYWwsXG4gICAgICBoYW5kbGVTZWxlY3Q6IChzZWxlY3RlZDogJ2Rpc21pc3NlZCcgfCAnYmFkJyB8ICdmaW5lJyB8ICdnb29kJykgPT4ge1xuICAgICAgICAvLyBSZXNldCB0aGUgcmVmIHdoZW4gYSBuZXcgc3VydmV5IHJlc3BvbnNlIGNvbWVzIGluXG4gICAgICAgIGRpZEF1dG9SdW5Jc3N1ZVJlZi5jdXJyZW50ID0gZmFsc2VcbiAgICAgICAgY29uc3Qgc2hvd2VkVHJhbnNjcmlwdFByb21wdCA9XG4gICAgICAgICAgZmVlZGJhY2tTdXJ2ZXlPcmlnaW5hbC5oYW5kbGVTZWxlY3Qoc2VsZWN0ZWQpXG4gICAgICAgIC8vIEF1dG8tcnVuIC9pc3N1ZSBmb3IgXCJiYWRcIiBpZiB0cmFuc2NyaXB0IHByb21wdCB3YXNuJ3Qgc2hvd25cbiAgICAgICAgaWYgKFxuICAgICAgICAgIHNlbGVjdGVkID09PSAnYmFkJyAmJlxuICAgICAgICAgICFzaG93ZWRUcmFuc2NyaXB0UHJvbXB0ICYmXG4gICAgICAgICAgc2hvdWxkQXV0b1J1bklzc3VlKCdmZWVkYmFja19zdXJ2ZXlfYmFkJylcbiAgICAgICAgKSB7XG4gICAgICAgICAgc2V0QXV0b1J1bklzc3VlUmVhc29uKCdmZWVkYmFja19zdXJ2ZXlfYmFkJylcbiAgICAgICAgICBkaWRBdXRvUnVuSXNzdWVSZWYuY3VycmVudCA9IHRydWVcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KSxcbiAgICBbZmVlZGJhY2tTdXJ2ZXlPcmlnaW5hbF0sXG4gIClcblxuICAvLyBQb3N0LWNvbXBhY3Qgc3VydmV5OiBzaG93biBhZnRlciBjb21wYWN0aW9uIGlmIGZlYXR1cmUgZ2F0ZSBpcyBlbmFibGVkXG4gIGNvbnN0IHBvc3RDb21wYWN0U3VydmV5ID0gdXNlUG9zdENvbXBhY3RTdXJ2ZXkoXG4gICAgbWVzc2FnZXMsXG4gICAgaXNMb2FkaW5nLFxuICAgIGhhc0FjdGl2ZVByb21wdCxcbiAgICB7IGVuYWJsZWQ6ICFpc1JlbW90ZVNlc3Npb24gfSxcbiAgKVxuXG4gIC8vIE1lbW9yeSBzdXJ2ZXk6IHNob3duIHdoZW4gdGhlIGFzc2lzdGFudCBtZW50aW9ucyBtZW1vcnkgYW5kIGEgbWVtb3J5IGZpbGVcbiAgLy8gd2FzIHJlYWQgdGhpcyBjb252ZXJzYXRpb25cbiAgY29uc3QgbWVtb3J5U3VydmV5ID0gdXNlTWVtb3J5U3VydmV5KG1lc3NhZ2VzLCBpc0xvYWRpbmcsIGhhc0FjdGl2ZVByb21wdCwge1xuICAgIGVuYWJsZWQ6ICFpc1JlbW90ZVNlc3Npb24sXG4gIH0pXG5cbiAgLy8gRnJ1c3RyYXRpb24gZGV0ZWN0aW9uOiBzaG93IHRyYW5zY3JpcHQgc2hhcmluZyBwcm9tcHQgYWZ0ZXIgZGV0ZWN0aW5nIGZydXN0cmF0ZWQgbWVzc2FnZXNcbiAgY29uc3QgZnJ1c3RyYXRpb25EZXRlY3Rpb24gPSB1c2VGcnVzdHJhdGlvbkRldGVjdGlvbihcbiAgICBtZXNzYWdlcyxcbiAgICBpc0xvYWRpbmcsXG4gICAgaGFzQWN0aXZlUHJvbXB0LFxuICAgIGZlZWRiYWNrU3VydmV5LnN0YXRlICE9PSAnY2xvc2VkJyB8fFxuICAgICAgcG9zdENvbXBhY3RTdXJ2ZXkuc3RhdGUgIT09ICdjbG9zZWQnIHx8XG4gICAgICBtZW1vcnlTdXJ2ZXkuc3RhdGUgIT09ICdjbG9zZWQnLFxuICApXG5cbiAgLy8gSW5pdGlhbGl6ZSBJREUgaW50ZWdyYXRpb25cbiAgdXNlSURFSW50ZWdyYXRpb24oe1xuICAgIGF1dG9Db25uZWN0SWRlRmxhZyxcbiAgICBpZGVUb0luc3RhbGxFeHRlbnNpb24sXG4gICAgc2V0RHluYW1pY01jcENvbmZpZyxcbiAgICBzZXRTaG93SWRlT25ib2FyZGluZyxcbiAgICBzZXRJREVJbnN0YWxsYXRpb25TdGF0ZTogc2V0SURFSW5zdGFsbGF0aW9uU3RhdHVzLFxuICB9KVxuXG4gIHVzZUZpbGVIaXN0b3J5U25hcHNob3RJbml0KFxuICAgIGluaXRpYWxGaWxlSGlzdG9yeVNuYXBzaG90cyxcbiAgICBmaWxlSGlzdG9yeSxcbiAgICBmaWxlSGlzdG9yeVN0YXRlID0+XG4gICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+ICh7XG4gICAgICAgIC4uLnByZXYsXG4gICAgICAgIGZpbGVIaXN0b3J5OiBmaWxlSGlzdG9yeVN0YXRlLFxuICAgICAgfSkpLFxuICApXG5cbiAgY29uc3QgcmVzdW1lID0gdXNlQ2FsbGJhY2soXG4gICAgYXN5bmMgKHNlc3Npb25JZDogVVVJRCwgbG9nOiBMb2dPcHRpb24sIGVudHJ5cG9pbnQ6IFJlc3VtZUVudHJ5cG9pbnQpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VtZVN0YXJ0ID0gcGVyZm9ybWFuY2Uubm93KClcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIERlc2VyaWFsaXplIG1lc3NhZ2VzIHRvIHByb3Blcmx5IGNsZWFuIHVwIHRoZSBjb252ZXJzYXRpb25cbiAgICAgICAgLy8gVGhpcyBmaWx0ZXJzIHVucmVzb2x2ZWQgdG9vbCB1c2VzIGFuZCBhZGRzIGEgc3ludGhldGljIGFzc2lzdGFudCBtZXNzYWdlIGlmIG5lZWRlZFxuICAgICAgICBjb25zdCBtZXNzYWdlcyA9IGRlc2VyaWFsaXplTWVzc2FnZXMobG9nLm1lc3NhZ2VzKVxuXG4gICAgICAgIC8vIE1hdGNoIGNvb3JkaW5hdG9yL25vcm1hbCBtb2RlIHRvIHRoZSByZXN1bWVkIHNlc3Npb25cbiAgICAgICAgaWYgKGZlYXR1cmUoJ0NPT1JESU5BVE9SX01PREUnKSkge1xuICAgICAgICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZXF1aXJlLWltcG9ydHMgKi9cbiAgICAgICAgICBjb25zdCBjb29yZGluYXRvck1vZHVsZSA9XG4gICAgICAgICAgICByZXF1aXJlKCcuLi9jb29yZGluYXRvci9jb29yZGluYXRvck1vZGUuanMnKSBhcyB0eXBlb2YgaW1wb3J0KCcuLi9jb29yZGluYXRvci9jb29yZGluYXRvck1vZGUuanMnKVxuICAgICAgICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBjb29yZGluYXRvck1vZHVsZS5tYXRjaFNlc3Npb25Nb2RlKGxvZy5tb2RlKVxuICAgICAgICAgIGlmICh3YXJuaW5nKSB7XG4gICAgICAgICAgICAvLyBSZS1kZXJpdmUgYWdlbnQgZGVmaW5pdGlvbnMgYWZ0ZXIgbW9kZSBzd2l0Y2ggc28gYnVpbHQtaW4gYWdlbnRzXG4gICAgICAgICAgICAvLyByZWZsZWN0IHRoZSBuZXcgY29vcmRpbmF0b3Ivbm9ybWFsIG1vZGVcbiAgICAgICAgICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZXF1aXJlLWltcG9ydHMgKi9cbiAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgZ2V0QWdlbnREZWZpbml0aW9uc1dpdGhPdmVycmlkZXMsXG4gICAgICAgICAgICAgIGdldEFjdGl2ZUFnZW50c0Zyb21MaXN0LFxuICAgICAgICAgICAgfSA9XG4gICAgICAgICAgICAgIHJlcXVpcmUoJy4uL3Rvb2xzL0FnZW50VG9vbC9sb2FkQWdlbnRzRGlyLmpzJykgYXMgdHlwZW9mIGltcG9ydCgnLi4vdG9vbHMvQWdlbnRUb29sL2xvYWRBZ2VudHNEaXIuanMnKVxuICAgICAgICAgICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzICovXG4gICAgICAgICAgICBnZXRBZ2VudERlZmluaXRpb25zV2l0aE92ZXJyaWRlcy5jYWNoZS5jbGVhcj8uKClcbiAgICAgICAgICAgIGNvbnN0IGZyZXNoQWdlbnREZWZzID0gYXdhaXQgZ2V0QWdlbnREZWZpbml0aW9uc1dpdGhPdmVycmlkZXMoXG4gICAgICAgICAgICAgIGdldE9yaWdpbmFsQ3dkKCksXG4gICAgICAgICAgICApXG5cbiAgICAgICAgICAgIHNldEFwcFN0YXRlKHByZXYgPT4gKHtcbiAgICAgICAgICAgICAgLi4ucHJldixcbiAgICAgICAgICAgICAgYWdlbnREZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgIC4uLmZyZXNoQWdlbnREZWZzLFxuICAgICAgICAgICAgICAgIGFsbEFnZW50czogZnJlc2hBZ2VudERlZnMuYWxsQWdlbnRzLFxuICAgICAgICAgICAgICAgIGFjdGl2ZUFnZW50czogZ2V0QWN0aXZlQWdlbnRzRnJvbUxpc3QoZnJlc2hBZ2VudERlZnMuYWxsQWdlbnRzKSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgbWVzc2FnZXMucHVzaChjcmVhdGVTeXN0ZW1NZXNzYWdlKHdhcm5pbmcsICd3YXJuaW5nJykpXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmlyZSBTZXNzaW9uRW5kIGhvb2tzIGZvciB0aGUgY3VycmVudCBzZXNzaW9uIGJlZm9yZSBzdGFydGluZyB0aGVcbiAgICAgICAgLy8gcmVzdW1lZCBvbmUsIG1pcnJvcmluZyB0aGUgL2NsZWFyIGZsb3cgaW4gY29udmVyc2F0aW9uLnRzLlxuICAgICAgICBjb25zdCBzZXNzaW9uRW5kVGltZW91dE1zID0gZ2V0U2Vzc2lvbkVuZEhvb2tUaW1lb3V0TXMoKVxuICAgICAgICBhd2FpdCBleGVjdXRlU2Vzc2lvbkVuZEhvb2tzKCdyZXN1bWUnLCB7XG4gICAgICAgICAgZ2V0QXBwU3RhdGU6ICgpID0+IHN0b3JlLmdldFN0YXRlKCksXG4gICAgICAgICAgc2V0QXBwU3RhdGUsXG4gICAgICAgICAgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KHNlc3Npb25FbmRUaW1lb3V0TXMpLFxuICAgICAgICAgIHRpbWVvdXRNczogc2Vzc2lvbkVuZFRpbWVvdXRNcyxcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBQcm9jZXNzIHNlc3Npb24gc3RhcnQgaG9va3MgZm9yIHJlc3VtZVxuICAgICAgICBjb25zdCBob29rTWVzc2FnZXMgPSBhd2FpdCBwcm9jZXNzU2Vzc2lvblN0YXJ0SG9va3MoJ3Jlc3VtZScsIHtcbiAgICAgICAgICBzZXNzaW9uSWQsXG4gICAgICAgICAgYWdlbnRUeXBlOiBtYWluVGhyZWFkQWdlbnREZWZpbml0aW9uPy5hZ2VudFR5cGUsXG4gICAgICAgICAgbW9kZWw6IG1haW5Mb29wTW9kZWwsXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gQXBwZW5kIGhvb2sgbWVzc2FnZXMgdG8gdGhlIGNvbnZlcnNhdGlvblxuICAgICAgICBtZXNzYWdlcy5wdXNoKC4uLmhvb2tNZXNzYWdlcylcbiAgICAgICAgLy8gRm9yIGZvcmtzLCBnZW5lcmF0ZSBhIG5ldyBwbGFuIHNsdWcgYW5kIGNvcHkgdGhlIHBsYW4gY29udGVudCBzbyB0aGVcbiAgICAgICAgLy8gb3JpZ2luYWwgYW5kIGZvcmtlZCBzZXNzaW9ucyBkb24ndCBjbG9iYmVyIGVhY2ggb3RoZXIncyBwbGFuIGZpbGVzLlxuICAgICAgICAvLyBGb3IgcmVndWxhciByZXN1bWVzLCByZXVzZSB0aGUgb3JpZ2luYWwgc2Vzc2lvbidzIHBsYW4gc2x1Zy5cbiAgICAgICAgaWYgKGVudHJ5cG9pbnQgPT09ICdmb3JrJykge1xuICAgICAgICAgIHZvaWQgY29weVBsYW5Gb3JGb3JrKGxvZywgYXNTZXNzaW9uSWQoc2Vzc2lvbklkKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2b2lkIGNvcHlQbGFuRm9yUmVzdW1lKGxvZywgYXNTZXNzaW9uSWQoc2Vzc2lvbklkKSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc3RvcmUgZmlsZSBoaXN0b3J5IGFuZCBhdHRyaWJ1dGlvbiBzdGF0ZSBmcm9tIHRoZSByZXN1bWVkIGNvbnZlcnNhdGlvblxuICAgICAgICByZXN0b3JlU2Vzc2lvblN0YXRlRnJvbUxvZyhsb2csIHNldEFwcFN0YXRlKVxuICAgICAgICBpZiAobG9nLmZpbGVIaXN0b3J5U25hcHNob3RzKSB7XG4gICAgICAgICAgdm9pZCBjb3B5RmlsZUhpc3RvcnlGb3JSZXN1bWUobG9nKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBhZ2VudCBzZXR0aW5nIGZyb20gdGhlIHJlc3VtZWQgY29udmVyc2F0aW9uXG4gICAgICAgIC8vIEFsd2F5cyByZXNldCB0byB0aGUgbmV3IHNlc3Npb24ncyB2YWx1ZXMgKG9yIGNsZWFyIGlmIG5vbmUpLFxuICAgICAgICAvLyBtYXRjaGluZyB0aGUgc3RhbmRhbG9uZUFnZW50Q29udGV4dCBwYXR0ZXJuIGJlbG93XG4gICAgICAgIGNvbnN0IHsgYWdlbnREZWZpbml0aW9uOiByZXN0b3JlZEFnZW50IH0gPSByZXN0b3JlQWdlbnRGcm9tU2Vzc2lvbihcbiAgICAgICAgICBsb2cuYWdlbnRTZXR0aW5nLFxuICAgICAgICAgIGluaXRpYWxNYWluVGhyZWFkQWdlbnREZWZpbml0aW9uLFxuICAgICAgICAgIGFnZW50RGVmaW5pdGlvbnMsXG4gICAgICAgIClcbiAgICAgICAgc2V0TWFpblRocmVhZEFnZW50RGVmaW5pdGlvbihyZXN0b3JlZEFnZW50KVxuICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+ICh7IC4uLnByZXYsIGFnZW50OiByZXN0b3JlZEFnZW50Py5hZ2VudFR5cGUgfSkpXG5cbiAgICAgICAgLy8gUmVzdG9yZSBzdGFuZGFsb25lIGFnZW50IGNvbnRleHQgZnJvbSB0aGUgcmVzdW1lZCBjb252ZXJzYXRpb25cbiAgICAgICAgLy8gQWx3YXlzIHJlc2V0IHRvIHRoZSBuZXcgc2Vzc2lvbidzIHZhbHVlcyAob3IgY2xlYXIgaWYgbm9uZSlcbiAgICAgICAgc2V0QXBwU3RhdGUocHJldiA9PiAoe1xuICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgc3RhbmRhbG9uZUFnZW50Q29udGV4dDogY29tcHV0ZVN0YW5kYWxvbmVBZ2VudENvbnRleHQoXG4gICAgICAgICAgICBsb2cuYWdlbnROYW1lLFxuICAgICAgICAgICAgbG9nLmFnZW50Q29sb3IsXG4gICAgICAgICAgKSxcbiAgICAgICAgfSkpXG4gICAgICAgIHZvaWQgdXBkYXRlU2Vzc2lvbk5hbWUobG9nLmFnZW50TmFtZSlcblxuICAgICAgICAvLyBSZXN0b3JlIHJlYWQgZmlsZSBzdGF0ZSBmcm9tIHRoZSBtZXNzYWdlIGhpc3RvcnlcbiAgICAgICAgcmVzdG9yZVJlYWRGaWxlU3RhdGUobWVzc2FnZXMsIGxvZy5wcm9qZWN0UGF0aCA/PyBnZXRPcmlnaW5hbEN3ZCgpKVxuXG4gICAgICAgIC8vIENsZWFyIGFueSBhY3RpdmUgbG9hZGluZyBzdGF0ZSAobm8gcXVlcnlJZCBzaW5jZSB3ZSdyZSBub3QgaW4gYSBxdWVyeSlcbiAgICAgICAgcmVzZXRMb2FkaW5nU3RhdGUoKVxuICAgICAgICBzZXRBYm9ydENvbnRyb2xsZXIobnVsbClcblxuICAgICAgICBzZXRDb252ZXJzYXRpb25JZChzZXNzaW9uSWQpXG5cbiAgICAgICAgLy8gR2V0IHRhcmdldCBzZXNzaW9uJ3MgY29zdHMgQkVGT1JFIHNhdmluZyBjdXJyZW50IHNlc3Npb25cbiAgICAgICAgLy8gKHNhdmVDdXJyZW50U2Vzc2lvbkNvc3RzIG92ZXJ3cml0ZXMgdGhlIGNvbmZpZywgc28gd2UgbmVlZCB0byByZWFkIGZpcnN0KVxuICAgICAgICBjb25zdCB0YXJnZXRTZXNzaW9uQ29zdHMgPSBnZXRTdG9yZWRTZXNzaW9uQ29zdHMoc2Vzc2lvbklkKVxuXG4gICAgICAgIC8vIFNhdmUgY3VycmVudCBzZXNzaW9uJ3MgY29zdHMgYmVmb3JlIHN3aXRjaGluZyB0byBhdm9pZCBsb3NpbmcgYWNjdW11bGF0ZWQgY29zdHNcbiAgICAgICAgc2F2ZUN1cnJlbnRTZXNzaW9uQ29zdHMoKVxuXG4gICAgICAgIC8vIFJlc2V0IGNvc3Qgc3RhdGUgZm9yIGNsZWFuIHNsYXRlIGJlZm9yZSByZXN0b3JpbmcgdGFyZ2V0IHNlc3Npb25cbiAgICAgICAgcmVzZXRDb3N0U3RhdGUoKVxuXG4gICAgICAgIC8vIFN3aXRjaCBzZXNzaW9uIChpZCArIHByb2plY3QgZGlyIGF0b21pY2FsbHkpLiBmdWxsUGF0aCBtYXkgcG9pbnQgdG9cbiAgICAgICAgLy8gYSBkaWZmZXJlbnQgcHJvamVjdCAoY3Jvc3Mtd29ya3RyZWUsIC9icmFuY2gpOyBudWxsIGRlcml2ZXMgZnJvbVxuICAgICAgICAvLyBjdXJyZW50IG9yaWdpbmFsQ3dkLlxuICAgICAgICBzd2l0Y2hTZXNzaW9uKFxuICAgICAgICAgIGFzU2Vzc2lvbklkKHNlc3Npb25JZCksXG4gICAgICAgICAgbG9nLmZ1bGxQYXRoID8gZGlybmFtZShsb2cuZnVsbFBhdGgpIDogbnVsbCxcbiAgICAgICAgKVxuICAgICAgICAvLyBSZW5hbWUgYXNjaWljYXN0IHJlY29yZGluZyB0byBtYXRjaCB0aGUgcmVzdW1lZCBzZXNzaW9uIElEXG4gICAgICAgIGNvbnN0IHsgcmVuYW1lUmVjb3JkaW5nRm9yU2Vzc2lvbiB9ID0gYXdhaXQgaW1wb3J0KFxuICAgICAgICAgICcuLi91dGlscy9hc2NpaWNhc3QuanMnXG4gICAgICAgIClcbiAgICAgICAgYXdhaXQgcmVuYW1lUmVjb3JkaW5nRm9yU2Vzc2lvbigpXG4gICAgICAgIGF3YWl0IHJlc2V0U2Vzc2lvbkZpbGVQb2ludGVyKClcblxuICAgICAgICAvLyBDbGVhciB0aGVuIHJlc3RvcmUgc2Vzc2lvbiBtZXRhZGF0YSBzbyBpdCdzIHJlLWFwcGVuZGVkIG9uIGV4aXQgdmlhXG4gICAgICAgIC8vIHJlQXBwZW5kU2Vzc2lvbk1ldGFkYXRhLiBjbGVhclNlc3Npb25NZXRhZGF0YSBtdXN0IGJlIGNhbGxlZCBmaXJzdDpcbiAgICAgICAgLy8gcmVzdG9yZVNlc3Npb25NZXRhZGF0YSBvbmx5IHNldHMtaWYtdHJ1dGh5LCBzbyB3aXRob3V0IHRoZSBjbGVhcixcbiAgICAgICAgLy8gYSBzZXNzaW9uIHdpdGhvdXQgYW4gYWdlbnQgbmFtZSB3b3VsZCBpbmhlcml0IHRoZSBwcmV2aW91cyBzZXNzaW9uJ3NcbiAgICAgICAgLy8gY2FjaGVkIG5hbWUgYW5kIHdyaXRlIGl0IHRvIHRoZSB3cm9uZyB0cmFuc2NyaXB0IG9uIGZpcnN0IG1lc3NhZ2UuXG4gICAgICAgIGNsZWFyU2Vzc2lvbk1ldGFkYXRhKClcbiAgICAgICAgcmVzdG9yZVNlc3Npb25NZXRhZGF0YShsb2cpXG4gICAgICAgIC8vIFJlc3VtZWQgc2Vzc2lvbnMgc2hvdWxkbid0IHJlLXRpdGxlIGZyb20gbWlkLWNvbnZlcnNhdGlvbiBjb250ZXh0XG4gICAgICAgIC8vIChzYW1lIHJlYXNvbmluZyBhcyB0aGUgdXNlUmVmIHNlZWQpLCBhbmQgdGhlIHByZXZpb3VzIHNlc3Npb24nc1xuICAgICAgICAvLyBIYWlrdSB0aXRsZSBzaG91bGRuJ3QgY2Fycnkgb3Zlci5cbiAgICAgICAgaGFpa3VUaXRsZUF0dGVtcHRlZFJlZi5jdXJyZW50ID0gdHJ1ZVxuICAgICAgICBzZXRIYWlrdVRpdGxlKHVuZGVmaW5lZClcblxuICAgICAgICAvLyBFeGl0IGFueSB3b3JrdHJlZSBhIHByaW9yIC9yZXN1bWUgZW50ZXJlZCwgdGhlbiBjZCBpbnRvIHRoZSBvbmVcbiAgICAgICAgLy8gdGhpcyBzZXNzaW9uIHdhcyBpbi4gV2l0aG91dCB0aGUgZXhpdCwgcmVzdW1pbmcgZnJvbSB3b3JrdHJlZSBCXG4gICAgICAgIC8vIHRvIG5vbi13b3JrdHJlZSBDIGxlYXZlcyBjd2QvY3VycmVudFdvcmt0cmVlU2Vzc2lvbiBzdGFsZTtcbiAgICAgICAgLy8gcmVzdW1pbmcgQuKGkkMgd2hlcmUgQyBpcyBhbHNvIGEgd29ya3RyZWUgZmFpbHMgZW50aXJlbHlcbiAgICAgICAgLy8gKGdldEN1cnJlbnRXb3JrdHJlZVNlc3Npb24gZ3VhcmQgYmxvY2tzIHRoZSBzd2l0Y2gpLlxuICAgICAgICAvL1xuICAgICAgICAvLyBTa2lwcGVkIGZvciAvYnJhbmNoOiBmb3JrTG9nIGRvZXNuJ3QgY2Fycnkgd29ya3RyZWVTZXNzaW9uLCBzb1xuICAgICAgICAvLyB0aGlzIHdvdWxkIGtpY2sgdGhlIHVzZXIgb3V0IG9mIGEgd29ya3RyZWUgdGhleSdyZSBzdGlsbCB3b3JraW5nXG4gICAgICAgIC8vIGluLiBTYW1lIGZvcmsgc2tpcCBhcyBwcm9jZXNzUmVzdW1lZENvbnZlcnNhdGlvbiBmb3IgdGhlIGFkb3B0IOKAlFxuICAgICAgICAvLyBmb3JrIG1hdGVyaWFsaXplcyBpdHMgb3duIGZpbGUgdmlhIHJlY29yZFRyYW5zY3JpcHQgb24gUkVQTCBtb3VudC5cbiAgICAgICAgaWYgKGVudHJ5cG9pbnQgIT09ICdmb3JrJykge1xuICAgICAgICAgIGV4aXRSZXN0b3JlZFdvcmt0cmVlKClcbiAgICAgICAgICByZXN0b3JlV29ya3RyZWVGb3JSZXN1bWUobG9nLndvcmt0cmVlU2Vzc2lvbilcbiAgICAgICAgICBhZG9wdFJlc3VtZWRTZXNzaW9uRmlsZSgpXG4gICAgICAgICAgdm9pZCByZXN0b3JlUmVtb3RlQWdlbnRUYXNrcyh7XG4gICAgICAgICAgICBhYm9ydENvbnRyb2xsZXI6IG5ldyBBYm9ydENvbnRyb2xsZXIoKSxcbiAgICAgICAgICAgIGdldEFwcFN0YXRlOiAoKSA9PiBzdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICAgICAgc2V0QXBwU3RhdGUsXG4gICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBGb3JrOiBzYW1lIHJlLXBlcnNpc3QgYXMgL2NsZWFyIChjb252ZXJzYXRpb24udHMpLiBUaGUgY2xlYXJcbiAgICAgICAgICAvLyBhYm92ZSB3aXBlZCBjdXJyZW50U2Vzc2lvbldvcmt0cmVlLCBmb3JrTG9nIGRvZXNuJ3QgY2FycnkgaXQsXG4gICAgICAgICAgLy8gYW5kIHRoZSBwcm9jZXNzIGlzIHN0aWxsIGluIHRoZSBzYW1lIHdvcmt0cmVlLlxuICAgICAgICAgIGNvbnN0IHdzID0gZ2V0Q3VycmVudFdvcmt0cmVlU2Vzc2lvbigpXG4gICAgICAgICAgaWYgKHdzKSBzYXZlV29ya3RyZWVTdGF0ZSh3cylcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBlcnNpc3QgdGhlIGN1cnJlbnQgbW9kZSBzbyBmdXR1cmUgcmVzdW1lcyBrbm93IHdoYXQgbW9kZSB0aGlzIHNlc3Npb24gd2FzIGluXG4gICAgICAgIGlmIChmZWF0dXJlKCdDT09SRElOQVRPUl9NT0RFJykpIHtcbiAgICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzICovXG4gICAgICAgICAgY29uc3QgeyBzYXZlTW9kZSB9ID0gcmVxdWlyZSgnLi4vdXRpbHMvc2Vzc2lvblN0b3JhZ2UuanMnKVxuICAgICAgICAgIGNvbnN0IHsgaXNDb29yZGluYXRvck1vZGUgfSA9XG4gICAgICAgICAgICByZXF1aXJlKCcuLi9jb29yZGluYXRvci9jb29yZGluYXRvck1vZGUuanMnKSBhcyB0eXBlb2YgaW1wb3J0KCcuLi9jb29yZGluYXRvci9jb29yZGluYXRvck1vZGUuanMnKVxuICAgICAgICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuICAgICAgICAgIHNhdmVNb2RlKGlzQ29vcmRpbmF0b3JNb2RlKCkgPyAnY29vcmRpbmF0b3InIDogJ25vcm1hbCcpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXN0b3JlIHRhcmdldCBzZXNzaW9uJ3MgY29zdHMgZnJvbSB0aGUgZGF0YSB3ZSByZWFkIGVhcmxpZXJcbiAgICAgICAgaWYgKHRhcmdldFNlc3Npb25Db3N0cykge1xuICAgICAgICAgIHNldENvc3RTdGF0ZUZvclJlc3RvcmUodGFyZ2V0U2Vzc2lvbkNvc3RzKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVjb25zdHJ1Y3QgcmVwbGFjZW1lbnQgc3RhdGUgZm9yIHRoZSByZXN1bWVkIHNlc3Npb24uIFJ1bnMgYWZ0ZXJcbiAgICAgICAgLy8gc2V0U2Vzc2lvbklkIHNvIGFueSBORVcgcmVwbGFjZW1lbnRzIHBvc3QtcmVzdW1lIHdyaXRlIHRvIHRoZVxuICAgICAgICAvLyByZXN1bWVkIHNlc3Npb24ncyB0b29sLXJlc3VsdHMgZGlyLiBHYXRlZCBvbiByZWYuY3VycmVudDogdGhlXG4gICAgICAgIC8vIGluaXRpYWwgbW91bnQgYWxyZWFkeSByZWFkIHRoZSBmZWF0dXJlIGZsYWcsIHNvIHdlIGRvbid0IHJlLXJlYWRcbiAgICAgICAgLy8gaXQgaGVyZSAobWlkLXNlc3Npb24gZmxhZyBmbGlwcyBzdGF5IHVub2JzZXJ2YWJsZSBpbiBib3RoXG4gICAgICAgIC8vIGRpcmVjdGlvbnMpLlxuICAgICAgICAvL1xuICAgICAgICAvLyBTa2lwcGVkIGZvciBpbi1zZXNzaW9uIC9icmFuY2g6IHRoZSBleGlzdGluZyByZWYgaXMgYWxyZWFkeSBjb3JyZWN0XG4gICAgICAgIC8vIChicmFuY2ggcHJlc2VydmVzIHRvb2xfdXNlX2lkcyksIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byByZWNvbnN0cnVjdC5cbiAgICAgICAgLy8gY3JlYXRlRm9yaygpIGRvZXMgd3JpdGUgY29udGVudC1yZXBsYWNlbWVudCBlbnRyaWVzIHRvIHRoZSBmb3JrZWRcbiAgICAgICAgLy8gSlNPTkwgd2l0aCB0aGUgZm9yaydzIHNlc3Npb25JZCwgc28gYGNsYXVkZSAtciB7Zm9ya0lkfWAgYWxzbyB3b3Jrcy5cbiAgICAgICAgaWYgKGNvbnRlbnRSZXBsYWNlbWVudFN0YXRlUmVmLmN1cnJlbnQgJiYgZW50cnlwb2ludCAhPT0gJ2ZvcmsnKSB7XG4gICAgICAgICAgY29udGVudFJlcGxhY2VtZW50U3RhdGVSZWYuY3VycmVudCA9XG4gICAgICAgICAgICByZWNvbnN0cnVjdENvbnRlbnRSZXBsYWNlbWVudFN0YXRlKFxuICAgICAgICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgICAgICAgbG9nLmNvbnRlbnRSZXBsYWNlbWVudHMgPz8gW10sXG4gICAgICAgICAgICApXG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXNldCBtZXNzYWdlcyB0byB0aGUgcHJvdmlkZWQgaW5pdGlhbCBtZXNzYWdlc1xuICAgICAgICAvLyBVc2UgYSBjYWxsYmFjayB0byBlbnN1cmUgd2UncmUgbm90IGRlcGVuZGVudCBvbiBzdGFsZSBzdGF0ZVxuICAgICAgICBzZXRNZXNzYWdlcygoKSA9PiBtZXNzYWdlcylcblxuICAgICAgICAvLyBDbGVhciBhbnkgYWN0aXZlIHRvb2wgSlNYXG4gICAgICAgIHNldFRvb2xKU1gobnVsbClcblxuICAgICAgICAvLyBDbGVhciBpbnB1dCB0byBlbnN1cmUgbm8gcmVzaWR1YWwgc3RhdGVcbiAgICAgICAgc2V0SW5wdXRWYWx1ZSgnJylcblxuICAgICAgICBsb2dFdmVudCgndGVuZ3Vfc2Vzc2lvbl9yZXN1bWVkJywge1xuICAgICAgICAgIGVudHJ5cG9pbnQ6XG4gICAgICAgICAgICBlbnRyeXBvaW50IGFzIEFuYWx5dGljc01ldGFkYXRhX0lfVkVSSUZJRURfVEhJU19JU19OT1RfQ09ERV9PUl9GSUxFUEFUSFMsXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICByZXN1bWVfZHVyYXRpb25fbXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSByZXN1bWVTdGFydCksXG4gICAgICAgIH0pXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBsb2dFdmVudCgndGVuZ3Vfc2Vzc2lvbl9yZXN1bWVkJywge1xuICAgICAgICAgIGVudHJ5cG9pbnQ6XG4gICAgICAgICAgICBlbnRyeXBvaW50IGFzIEFuYWx5dGljc01ldGFkYXRhX0lfVkVSSUZJRURfVEhJU19JU19OT1RfQ09ERV9PUl9GSUxFUEFUSFMsXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIH0pXG4gICAgICAgIHRocm93IGVycm9yXG4gICAgICB9XG4gICAgfSxcbiAgICBbcmVzZXRMb2FkaW5nU3RhdGUsIHNldEFwcFN0YXRlXSxcbiAgKVxuXG4gIC8vIExhenkgaW5pdDogdXNlUmVmKGNyZWF0ZVgoKSkgd291bGQgY2FsbCBjcmVhdGVYIG9uIGV2ZXJ5IHJlbmRlciBhbmRcbiAgLy8gZGlzY2FyZCB0aGUgcmVzdWx0LiBMUlVDYWNoZSBjb25zdHJ1Y3Rpb24gaW5zaWRlIEZpbGVTdGF0ZUNhY2hlIGlzXG4gIC8vIGV4cGVuc2l2ZSAofjE3MG1zKSwgc28gd2UgdXNlIHVzZVN0YXRlJ3MgbGF6eSBpbml0aWFsaXplciB0byBjcmVhdGVcbiAgLy8gaXQgZXhhY3RseSBvbmNlLCB0aGVuIGZlZWQgdGhhdCBzdGFibGUgcmVmZXJlbmNlIGludG8gdXNlUmVmLlxuICBjb25zdCBbaW5pdGlhbFJlYWRGaWxlU3RhdGVdID0gdXNlU3RhdGUoKCkgPT5cbiAgICBjcmVhdGVGaWxlU3RhdGVDYWNoZVdpdGhTaXplTGltaXQoUkVBRF9GSUxFX1NUQVRFX0NBQ0hFX1NJWkUpLFxuICApXG4gIGNvbnN0IHJlYWRGaWxlU3RhdGUgPSB1c2VSZWYoaW5pdGlhbFJlYWRGaWxlU3RhdGUpXG4gIGNvbnN0IGJhc2hUb29scyA9IHVzZVJlZihuZXcgU2V0PHN0cmluZz4oKSlcbiAgY29uc3QgYmFzaFRvb2xzUHJvY2Vzc2VkSWR4ID0gdXNlUmVmKDApXG4gIC8vIFNlc3Npb24tc2NvcGVkIHNraWxsIGRpc2NvdmVyeSB0cmFja2luZyAoZmVlZHMgd2FzX2Rpc2NvdmVyZWQgb25cbiAgLy8gdGVuZ3Vfc2tpbGxfdG9vbF9pbnZvY2F0aW9uKS4gTXVzdCBwZXJzaXN0IGFjcm9zcyBnZXRUb29sVXNlQ29udGV4dFxuICAvLyByZWJ1aWxkcyB3aXRoaW4gYSBzZXNzaW9uOiB0dXJuLTAgZGlzY292ZXJ5IHdyaXRlcyB2aWEgcHJvY2Vzc1VzZXJJbnB1dFxuICAvLyBiZWZvcmUgb25RdWVyeSBidWlsZHMgaXRzIG93biBjb250ZXh0LCBhbmQgZGlzY292ZXJ5IG9uIHR1cm4gTiBtdXN0XG4gIC8vIHN0aWxsIGF0dHJpYnV0ZSBhIFNraWxsVG9vbCBjYWxsIG9uIHR1cm4gTitrLiBDbGVhcmVkIGluIGNsZWFyQ29udmVyc2F0aW9uLlxuICBjb25zdCBkaXNjb3ZlcmVkU2tpbGxOYW1lc1JlZiA9IHVzZVJlZihuZXcgU2V0PHN0cmluZz4oKSlcbiAgLy8gU2Vzc2lvbi1sZXZlbCBkZWR1cCBmb3IgbmVzdGVkX21lbW9yeSBDTEFVREUubWQgYXR0YWNobWVudHMuXG4gIC8vIHJlYWRGaWxlU3RhdGUgaXMgYSAxMDAtZW50cnkgTFJVOyBvbmNlIGl0IGV2aWN0cyBhIENMQVVERS5tZCBwYXRoLFxuICAvLyB0aGUgbmV4dCBkaXNjb3ZlcnkgY3ljbGUgcmUtaW5qZWN0cyBpdC4gQ2xlYXJlZCBpbiBjbGVhckNvbnZlcnNhdGlvbi5cbiAgY29uc3QgbG9hZGVkTmVzdGVkTWVtb3J5UGF0aHNSZWYgPSB1c2VSZWYobmV3IFNldDxzdHJpbmc+KCkpXG5cbiAgLy8gSGVscGVyIHRvIHJlc3RvcmUgcmVhZCBmaWxlIHN0YXRlIGZyb20gbWVzc2FnZXMgKHVzZWQgZm9yIHJlc3VtZSBmbG93cylcbiAgLy8gVGhpcyBhbGxvd3MgQ2xhdWRlIHRvIGVkaXQgZmlsZXMgdGhhdCB3ZXJlIHJlYWQgaW4gcHJldmlvdXMgc2Vzc2lvbnNcbiAgY29uc3QgcmVzdG9yZVJlYWRGaWxlU3RhdGUgPSB1c2VDYWxsYmFjayhcbiAgICAobWVzc2FnZXM6IE1lc3NhZ2VUeXBlW10sIGN3ZDogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBleHRyYWN0ZWQgPSBleHRyYWN0UmVhZEZpbGVzRnJvbU1lc3NhZ2VzKFxuICAgICAgICBtZXNzYWdlcyxcbiAgICAgICAgY3dkLFxuICAgICAgICBSRUFEX0ZJTEVfU1RBVEVfQ0FDSEVfU0laRSxcbiAgICAgIClcbiAgICAgIHJlYWRGaWxlU3RhdGUuY3VycmVudCA9IG1lcmdlRmlsZVN0YXRlQ2FjaGVzKFxuICAgICAgICByZWFkRmlsZVN0YXRlLmN1cnJlbnQsXG4gICAgICAgIGV4dHJhY3RlZCxcbiAgICAgIClcbiAgICAgIGZvciAoY29uc3QgdG9vbCBvZiBleHRyYWN0QmFzaFRvb2xzRnJvbU1lc3NhZ2VzKG1lc3NhZ2VzKSkge1xuICAgICAgICBiYXNoVG9vbHMuY3VycmVudC5hZGQodG9vbClcbiAgICAgIH1cbiAgICB9LFxuICAgIFtdLFxuICApXG5cbiAgLy8gRXh0cmFjdCByZWFkIGZpbGUgc3RhdGUgZnJvbSBpbml0aWFsTWVzc2FnZXMgb24gbW91bnRcbiAgLy8gVGhpcyBoYW5kbGVzIENMSSBmbGFnIHJlc3VtZSAoLS1yZXN1bWUtc2Vzc2lvbikgYW5kIFJlc3VtZUNvbnZlcnNhdGlvbiBzY3JlZW5cbiAgLy8gd2hlcmUgbWVzc2FnZXMgYXJlIHBhc3NlZCBhcyBwcm9wcyByYXRoZXIgdGhhbiB0aHJvdWdoIHRoZSByZXN1bWUgY2FsbGJhY2tcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoaW5pdGlhbE1lc3NhZ2VzICYmIGluaXRpYWxNZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXN0b3JlUmVhZEZpbGVTdGF0ZShpbml0aWFsTWVzc2FnZXMsIGdldE9yaWdpbmFsQ3dkKCkpXG4gICAgICB2b2lkIHJlc3RvcmVSZW1vdGVBZ2VudFRhc2tzKHtcbiAgICAgICAgYWJvcnRDb250cm9sbGVyOiBuZXcgQWJvcnRDb250cm9sbGVyKCksXG4gICAgICAgIGdldEFwcFN0YXRlOiAoKSA9PiBzdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICBzZXRBcHBTdGF0ZSxcbiAgICAgIH0pXG4gICAgfVxuICAgIC8vIE9ubHkgcnVuIG9uIG1vdW50IC0gaW5pdGlhbE1lc3NhZ2VzIHNob3VsZG4ndCBjaGFuZ2UgZHVyaW5nIGNvbXBvbmVudCBsaWZldGltZVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgW10pXG5cbiAgY29uc3QgeyBzdGF0dXM6IGFwaUtleVN0YXR1cywgcmV2ZXJpZnkgfSA9IHVzZUFwaUtleVZlcmlmaWNhdGlvbigpXG5cbiAgLy8gQXV0by1ydW4gL2lzc3VlIHN0YXRlXG4gIGNvbnN0IFthdXRvUnVuSXNzdWVSZWFzb24sIHNldEF1dG9SdW5Jc3N1ZVJlYXNvbl0gPVxuICAgIHVzZVN0YXRlPEF1dG9SdW5Jc3N1ZVJlYXNvbiB8IG51bGw+KG51bGwpXG4gIC8vIFJlZiB0byB0cmFjayBpZiBhdXRvUnVuSXNzdWUgd2FzIHRyaWdnZXJlZCB0aGlzIHN1cnZleSBjeWNsZSxcbiAgLy8gc28gd2UgY2FuIHN1cHByZXNzIHRoZSBbMV0gZm9sbG93LXVwIHByb21wdCBldmVuIGFmdGVyXG4gIC8vIGF1dG9SdW5Jc3N1ZVJlYXNvbiBpcyBjbGVhcmVkLlxuICBjb25zdCBkaWRBdXRvUnVuSXNzdWVSZWYgPSB1c2VSZWYoZmFsc2UpXG5cbiAgLy8gU3RhdGUgZm9yIGV4aXQgZmVlZGJhY2sgZmxvd1xuICBjb25zdCBbZXhpdEZsb3csIHNldEV4aXRGbG93XSA9IHVzZVN0YXRlPFJlYWN0LlJlYWN0Tm9kZT4obnVsbClcbiAgY29uc3QgW2lzRXhpdGluZywgc2V0SXNFeGl0aW5nXSA9IHVzZVN0YXRlKGZhbHNlKVxuXG4gIC8vIENhbGN1bGF0ZSBpZiBjb3N0IGRpYWxvZyBzaG91bGQgYmUgc2hvd25cbiAgY29uc3Qgc2hvd2luZ0Nvc3REaWFsb2cgPSAhaXNMb2FkaW5nICYmIHNob3dDb3N0RGlhbG9nXG5cbiAgLy8gRGV0ZXJtaW5lIHdoaWNoIGRpYWxvZyBzaG91bGQgaGF2ZSBmb2N1cyAoaWYgYW55KVxuICAvLyBQZXJtaXNzaW9uIGFuZCBpbnRlcmFjdGl2ZSBkaWFsb2dzIGNhbiBzaG93IGV2ZW4gd2hlbiB0b29sSlNYIGlzIHNldCxcbiAgLy8gYXMgbG9uZyBhcyBzaG91bGRDb250aW51ZUFuaW1hdGlvbiBpcyB0cnVlLiBUaGlzIHByZXZlbnRzIGRlYWRsb2NrcyB3aGVuXG4gIC8vIGFnZW50cyBzZXQgYmFja2dyb3VuZCBoaW50cyB3aGlsZSB3YWl0aW5nIGZvciB1c2VyIGludGVyYWN0aW9uLlxuICBmdW5jdGlvbiBnZXRGb2N1c2VkSW5wdXREaWFsb2coKTpcbiAgICB8ICdtZXNzYWdlLXNlbGVjdG9yJ1xuICAgIHwgJ3NhbmRib3gtcGVybWlzc2lvbidcbiAgICB8ICd0b29sLXBlcm1pc3Npb24nXG4gICAgfCAncHJvbXB0J1xuICAgIHwgJ3dvcmtlci1zYW5kYm94LXBlcm1pc3Npb24nXG4gICAgfCAnZWxpY2l0YXRpb24nXG4gICAgfCAnY29zdCdcbiAgICB8ICdpZGxlLXJldHVybidcbiAgICB8ICdpbml0LW9uYm9hcmRpbmcnXG4gICAgfCAnaWRlLW9uYm9hcmRpbmcnXG4gICAgfCAnbW9kZWwtc3dpdGNoJ1xuICAgIHwgJ3VuZGVyY292ZXItY2FsbG91dCdcbiAgICB8ICdlZmZvcnQtY2FsbG91dCdcbiAgICB8ICdyZW1vdGUtY2FsbG91dCdcbiAgICB8ICdsc3AtcmVjb21tZW5kYXRpb24nXG4gICAgfCAncGx1Z2luLWhpbnQnXG4gICAgfCAnZGVza3RvcC11cHNlbGwnXG4gICAgfCAndWx0cmFwbGFuLWNob2ljZSdcbiAgICB8ICd1bHRyYXBsYW4tbGF1bmNoJ1xuICAgIHwgdW5kZWZpbmVkIHtcbiAgICAvLyBFeGl0IHN0YXRlcyBhbHdheXMgdGFrZSBwcmVjZWRlbmNlXG4gICAgaWYgKGlzRXhpdGluZyB8fCBleGl0RmxvdykgcmV0dXJuIHVuZGVmaW5lZFxuXG4gICAgLy8gSGlnaCBwcmlvcml0eSBkaWFsb2dzIChhbHdheXMgc2hvdyByZWdhcmRsZXNzIG9mIHR5cGluZylcbiAgICBpZiAoaXNNZXNzYWdlU2VsZWN0b3JWaXNpYmxlKSByZXR1cm4gJ21lc3NhZ2Utc2VsZWN0b3InXG5cbiAgICAvLyBTdXBwcmVzcyBpbnRlcnJ1cHQgZGlhbG9ncyB3aGlsZSB1c2VyIGlzIGFjdGl2ZWx5IHR5cGluZ1xuICAgIGlmIChpc1Byb21wdElucHV0QWN0aXZlKSByZXR1cm4gdW5kZWZpbmVkXG5cbiAgICBpZiAoc2FuZGJveFBlcm1pc3Npb25SZXF1ZXN0UXVldWVbMF0pIHJldHVybiAnc2FuZGJveC1wZXJtaXNzaW9uJ1xuXG4gICAgLy8gUGVybWlzc2lvbi9pbnRlcmFjdGl2ZSBkaWFsb2dzIChzaG93IHVubGVzcyBibG9ja2VkIGJ5IHRvb2xKU1gpXG4gICAgY29uc3QgYWxsb3dEaWFsb2dzV2l0aEFuaW1hdGlvbiA9XG4gICAgICAhdG9vbEpTWCB8fCB0b29sSlNYLnNob3VsZENvbnRpbnVlQW5pbWF0aW9uXG5cbiAgICBpZiAoYWxsb3dEaWFsb2dzV2l0aEFuaW1hdGlvbiAmJiB0b29sVXNlQ29uZmlybVF1ZXVlWzBdKVxuICAgICAgcmV0dXJuICd0b29sLXBlcm1pc3Npb24nXG4gICAgaWYgKGFsbG93RGlhbG9nc1dpdGhBbmltYXRpb24gJiYgcHJvbXB0UXVldWVbMF0pIHJldHVybiAncHJvbXB0J1xuICAgIC8vIFdvcmtlciBzYW5kYm94IHBlcm1pc3Npb24gcHJvbXB0cyAobmV0d29yayBhY2Nlc3MpIGZyb20gc3dhcm0gd29ya2Vyc1xuICAgIGlmIChhbGxvd0RpYWxvZ3NXaXRoQW5pbWF0aW9uICYmIHdvcmtlclNhbmRib3hQZXJtaXNzaW9ucy5xdWV1ZVswXSlcbiAgICAgIHJldHVybiAnd29ya2VyLXNhbmRib3gtcGVybWlzc2lvbidcbiAgICBpZiAoYWxsb3dEaWFsb2dzV2l0aEFuaW1hdGlvbiAmJiBlbGljaXRhdGlvbi5xdWV1ZVswXSkgcmV0dXJuICdlbGljaXRhdGlvbidcbiAgICBpZiAoYWxsb3dEaWFsb2dzV2l0aEFuaW1hdGlvbiAmJiBzaG93aW5nQ29zdERpYWxvZykgcmV0dXJuICdjb3N0J1xuICAgIGlmIChhbGxvd0RpYWxvZ3NXaXRoQW5pbWF0aW9uICYmIGlkbGVSZXR1cm5QZW5kaW5nKSByZXR1cm4gJ2lkbGUtcmV0dXJuJ1xuXG4gICAgaWYgKFxuICAgICAgZmVhdHVyZSgnVUxUUkFQTEFOJykgJiZcbiAgICAgIGFsbG93RGlhbG9nc1dpdGhBbmltYXRpb24gJiZcbiAgICAgICFpc0xvYWRpbmcgJiZcbiAgICAgIHVsdHJhcGxhblBlbmRpbmdDaG9pY2VcbiAgICApXG4gICAgICByZXR1cm4gJ3VsdHJhcGxhbi1jaG9pY2UnXG5cbiAgICBpZiAoXG4gICAgICBmZWF0dXJlKCdVTFRSQVBMQU4nKSAmJlxuICAgICAgYWxsb3dEaWFsb2dzV2l0aEFuaW1hdGlvbiAmJlxuICAgICAgIWlzTG9hZGluZyAmJlxuICAgICAgdWx0cmFwbGFuTGF1bmNoUGVuZGluZ1xuICAgIClcbiAgICAgIHJldHVybiAndWx0cmFwbGFuLWxhdW5jaCdcblxuICAgIC8vIE9uYm9hcmRpbmcgZGlhbG9ncyAoc3BlY2lhbCBjb25kaXRpb25zKVxuICAgIGlmIChhbGxvd0RpYWxvZ3NXaXRoQW5pbWF0aW9uICYmIHNob3dJZGVPbmJvYXJkaW5nKSByZXR1cm4gJ2lkZS1vbmJvYXJkaW5nJ1xuXG4gICAgLy8gTW9kZWwgc3dpdGNoIGNhbGxvdXQgKGFudC1vbmx5LCBlbGltaW5hdGVkIGZyb20gZXh0ZXJuYWwgYnVpbGRzKVxuICAgIGlmIChcbiAgICAgIFwiZXh0ZXJuYWxcIiA9PT0gJ2FudCcgJiZcbiAgICAgIGFsbG93RGlhbG9nc1dpdGhBbmltYXRpb24gJiZcbiAgICAgIHNob3dNb2RlbFN3aXRjaENhbGxvdXRcbiAgICApXG4gICAgICByZXR1cm4gJ21vZGVsLXN3aXRjaCdcblxuICAgIC8vIFVuZGVyY292ZXIgYXV0by1lbmFibGUgZXhwbGFpbmVyIChhbnQtb25seSwgZWxpbWluYXRlZCBmcm9tIGV4dGVybmFsIGJ1aWxkcylcbiAgICBpZiAoXG4gICAgICBcImV4dGVybmFsXCIgPT09ICdhbnQnICYmXG4gICAgICBhbGxvd0RpYWxvZ3NXaXRoQW5pbWF0aW9uICYmXG4gICAgICBzaG93VW5kZXJjb3ZlckNhbGxvdXRcbiAgICApXG4gICAgICByZXR1cm4gJ3VuZGVyY292ZXItY2FsbG91dCdcblxuICAgIC8vIEVmZm9ydCBjYWxsb3V0IChzaG93biBvbmNlIGZvciBPcHVzIDQuNiB1c2VycyB3aGVuIGVmZm9ydCBpcyBlbmFibGVkKVxuICAgIGlmIChhbGxvd0RpYWxvZ3NXaXRoQW5pbWF0aW9uICYmIHNob3dFZmZvcnRDYWxsb3V0KSByZXR1cm4gJ2VmZm9ydC1jYWxsb3V0J1xuXG4gICAgLy8gUmVtb3RlIGNhbGxvdXQgKHNob3duIG9uY2UgYmVmb3JlIGZpcnN0IGJyaWRnZSBlbmFibGUpXG4gICAgaWYgKGFsbG93RGlhbG9nc1dpdGhBbmltYXRpb24gJiYgc2hvd1JlbW90ZUNhbGxvdXQpIHJldHVybiAncmVtb3RlLWNhbGxvdXQnXG5cbiAgICAvLyBMU1AgcGx1Z2luIHJlY29tbWVuZGF0aW9uIChsb3dlc3QgcHJpb3JpdHkgLSBub24tYmxvY2tpbmcgc3VnZ2VzdGlvbilcbiAgICBpZiAoYWxsb3dEaWFsb2dzV2l0aEFuaW1hdGlvbiAmJiBsc3BSZWNvbW1lbmRhdGlvbilcbiAgICAgIHJldHVybiAnbHNwLXJlY29tbWVuZGF0aW9uJ1xuXG4gICAgLy8gUGx1Z2luIGhpbnQgZnJvbSBDTEkvU0RLIHN0ZGVyciAoc2FtZSBwcmlvcml0eSBiYW5kIGFzIExTUCByZWMpXG4gICAgaWYgKGFsbG93RGlhbG9nc1dpdGhBbmltYXRpb24gJiYgaGludFJlY29tbWVuZGF0aW9uKSByZXR1cm4gJ3BsdWdpbi1oaW50J1xuXG4gICAgLy8gRGVza3RvcCBhcHAgdXBzZWxsIChtYXggMyBsYXVuY2hlcywgbG93ZXN0IHByaW9yaXR5KVxuICAgIGlmIChhbGxvd0RpYWxvZ3NXaXRoQW5pbWF0aW9uICYmIHNob3dEZXNrdG9wVXBzZWxsU3RhcnR1cClcbiAgICAgIHJldHVybiAnZGVza3RvcC11cHNlbGwnXG5cbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICBjb25zdCBmb2N1c2VkSW5wdXREaWFsb2cgPSBnZXRGb2N1c2VkSW5wdXREaWFsb2coKVxuXG4gIC8vIFRydWUgd2hlbiBwZXJtaXNzaW9uIHByb21wdHMgZXhpc3QgYnV0IGFyZSBoaWRkZW4gYmVjYXVzZSB0aGUgdXNlciBpcyB0eXBpbmdcbiAgY29uc3QgaGFzU3VwcHJlc3NlZERpYWxvZ3MgPVxuICAgIGlzUHJvbXB0SW5wdXRBY3RpdmUgJiZcbiAgICAoc2FuZGJveFBlcm1pc3Npb25SZXF1ZXN0UXVldWVbMF0gfHxcbiAgICAgIHRvb2xVc2VDb25maXJtUXVldWVbMF0gfHxcbiAgICAgIHByb21wdFF1ZXVlWzBdIHx8XG4gICAgICB3b3JrZXJTYW5kYm94UGVybWlzc2lvbnMucXVldWVbMF0gfHxcbiAgICAgIGVsaWNpdGF0aW9uLnF1ZXVlWzBdIHx8XG4gICAgICBzaG93aW5nQ29zdERpYWxvZylcblxuICAvLyBLZWVwIHJlZiBpbiBzeW5jIHNvIHRpbWVyIGNhbGxiYWNrcyBjYW4gcmVhZCB0aGUgY3VycmVudCB2YWx1ZVxuICBmb2N1c2VkSW5wdXREaWFsb2dSZWYuY3VycmVudCA9IGZvY3VzZWRJbnB1dERpYWxvZ1xuXG4gIC8vIEltbWVkaWF0ZWx5IGNhcHR1cmUgcGF1c2UvcmVzdW1lIHdoZW4gZm9jdXNlZElucHV0RGlhbG9nIGNoYW5nZXNcbiAgLy8gVGhpcyBlbnN1cmVzIGFjY3VyYXRlIHRpbWluZyBldmVuIHVuZGVyIGhpZ2ggc3lzdGVtIGxvYWQsIHJhdGhlciB0aGFuXG4gIC8vIHJlbHlpbmcgb24gdGhlIDEwMG1zIHBvbGxpbmcgaW50ZXJ2YWwgdG8gZGV0ZWN0IHN0YXRlIGNoYW5nZXNcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWlzTG9hZGluZykgcmV0dXJuXG5cbiAgICBjb25zdCBpc1BhdXNlZCA9IGZvY3VzZWRJbnB1dERpYWxvZyA9PT0gJ3Rvb2wtcGVybWlzc2lvbidcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpXG5cbiAgICBpZiAoaXNQYXVzZWQgJiYgcGF1c2VTdGFydFRpbWVSZWYuY3VycmVudCA9PT0gbnVsbCkge1xuICAgICAgLy8gSnVzdCBlbnRlcmVkIHBhdXNlIHN0YXRlIC0gcmVjb3JkIHRoZSBleGFjdCBtb21lbnRcbiAgICAgIHBhdXNlU3RhcnRUaW1lUmVmLmN1cnJlbnQgPSBub3dcbiAgICB9IGVsc2UgaWYgKCFpc1BhdXNlZCAmJiBwYXVzZVN0YXJ0VGltZVJlZi5jdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBKdXN0IGV4aXRlZCBwYXVzZSBzdGF0ZSAtIGFjY3VtdWxhdGUgcGF1c2VkIHRpbWUgaW1tZWRpYXRlbHlcbiAgICAgIHRvdGFsUGF1c2VkTXNSZWYuY3VycmVudCArPSBub3cgLSBwYXVzZVN0YXJ0VGltZVJlZi5jdXJyZW50XG4gICAgICBwYXVzZVN0YXJ0VGltZVJlZi5jdXJyZW50ID0gbnVsbFxuICAgIH1cbiAgfSwgW2ZvY3VzZWRJbnB1dERpYWxvZywgaXNMb2FkaW5nXSlcblxuICAvLyBSZS1waW4gc2Nyb2xsIHRvIGJvdHRvbSB3aGVuZXZlciB0aGUgcGVybWlzc2lvbiBvdmVybGF5IGFwcGVhcnMgb3JcbiAgLy8gZGlzbWlzc2VzLiBPdmVybGF5IG5vdyByZW5kZXJzIGJlbG93IG1lc3NhZ2VzIGluc2lkZSB0aGUgc2FtZVxuICAvLyBTY3JvbGxCb3ggKG5vIHJlbW91bnQpLCBzbyB3ZSBuZWVkIGFuIGV4cGxpY2l0IHNjcm9sbFRvQm90dG9tIGZvcjpcbiAgLy8gIC0gYXBwZWFyOiB1c2VyIG1heSBoYXZlIGJlZW4gc2Nyb2xsZWQgdXAgKHN0aWNreSBicm9rZW4pIOKAlCB0aGVcbiAgLy8gICAgZGlhbG9nIGlzIGJsb2NraW5nIGFuZCBtdXN0IGJlIHZpc2libGVcbiAgLy8gIC0gZGlzbWlzczogdXNlciBtYXkgaGF2ZSBzY3JvbGxlZCB1cCB0byByZWFkIGNvbnRleHQgZHVyaW5nIHRoZVxuICAvLyAgICBvdmVybGF5LCBhbmQgb25TY3JvbGwgd2FzIHN1cHByZXNzZWQgc28gdGhlIHBpbGwgc3RhdGUgaXMgc3RhbGVcbiAgLy8gdXNlTGF5b3V0RWZmZWN0IHNvIHRoZSByZS1waW4gY29tbWl0cyBiZWZvcmUgdGhlIEluayBmcmFtZSByZW5kZXJzIOKAlFxuICAvLyBubyAxLWZyYW1lIGZsYXNoIG9mIHRoZSB3cm9uZyBzY3JvbGwgcG9zaXRpb24uXG4gIGNvbnN0IHByZXZEaWFsb2dSZWYgPSB1c2VSZWYoZm9jdXNlZElucHV0RGlhbG9nKVxuICB1c2VMYXlvdXRFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHdhcyA9IHByZXZEaWFsb2dSZWYuY3VycmVudCA9PT0gJ3Rvb2wtcGVybWlzc2lvbidcbiAgICBjb25zdCBub3cgPSBmb2N1c2VkSW5wdXREaWFsb2cgPT09ICd0b29sLXBlcm1pc3Npb24nXG4gICAgaWYgKHdhcyAhPT0gbm93KSByZXBpblNjcm9sbCgpXG4gICAgcHJldkRpYWxvZ1JlZi5jdXJyZW50ID0gZm9jdXNlZElucHV0RGlhbG9nXG4gIH0sIFtmb2N1c2VkSW5wdXREaWFsb2csIHJlcGluU2Nyb2xsXSlcblxuICBmdW5jdGlvbiBvbkNhbmNlbCgpIHtcbiAgICBpZiAoZm9jdXNlZElucHV0RGlhbG9nID09PSAnZWxpY2l0YXRpb24nKSB7XG4gICAgICAvLyBFbGljaXRhdGlvbiBkaWFsb2cgaGFuZGxlcyBpdHMgb3duIEVzY2FwZSwgYW5kIGNsb3NpbmcgaXQgc2hvdWxkbid0IGFmZmVjdCBhbnkgbG9hZGluZyBzdGF0ZS5cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGxvZ0ZvckRlYnVnZ2luZyhcbiAgICAgIGBbb25DYW5jZWxdIGZvY3VzZWRJbnB1dERpYWxvZz0ke2ZvY3VzZWRJbnB1dERpYWxvZ30gc3RyZWFtTW9kZT0ke3N0cmVhbU1vZGV9YCxcbiAgICApXG5cbiAgICAvLyBQYXVzZSBwcm9hY3RpdmUgbW9kZSBzbyB0aGUgdXNlciBnZXRzIGNvbnRyb2wgYmFjay5cbiAgICAvLyBJdCB3aWxsIHJlc3VtZSB3aGVuIHRoZXkgc3VibWl0IHRoZWlyIG5leHQgaW5wdXQgKHNlZSBvblN1Ym1pdCkuXG4gICAgaWYgKGZlYXR1cmUoJ1BST0FDVElWRScpIHx8IGZlYXR1cmUoJ0tBSVJPUycpKSB7XG4gICAgICBwcm9hY3RpdmVNb2R1bGU/LnBhdXNlUHJvYWN0aXZlKClcbiAgICB9XG5cbiAgICBxdWVyeUd1YXJkLmZvcmNlRW5kKClcbiAgICBza2lwSWRsZUNoZWNrUmVmLmN1cnJlbnQgPSBmYWxzZVxuXG4gICAgLy8gUHJlc2VydmUgcGFydGlhbGx5LXN0cmVhbWVkIHRleHQgc28gdGhlIHVzZXIgY2FuIHJlYWQgd2hhdCB3YXNcbiAgICAvLyBnZW5lcmF0ZWQgYmVmb3JlIHByZXNzaW5nIEVzYy4gUHVzaGVkIGJlZm9yZSByZXNldExvYWRpbmdTdGF0ZSBjbGVhcnNcbiAgICAvLyBzdHJlYW1pbmdUZXh0LCBhbmQgYmVmb3JlIHF1ZXJ5LnRzIHlpZWxkcyB0aGUgYXN5bmMgaW50ZXJydXB0IG1hcmtlcixcbiAgICAvLyBnaXZpbmcgZmluYWwgb3JkZXIgW3VzZXIsIHBhcnRpYWwtYXNzaXN0YW50LCBbUmVxdWVzdCBpbnRlcnJ1cHRlZCBieSB1c2VyXV0uXG4gICAgaWYgKHN0cmVhbWluZ1RleHQ/LnRyaW0oKSkge1xuICAgICAgc2V0TWVzc2FnZXMocHJldiA9PiBbXG4gICAgICAgIC4uLnByZXYsXG4gICAgICAgIGNyZWF0ZUFzc2lzdGFudE1lc3NhZ2UoeyBjb250ZW50OiBzdHJlYW1pbmdUZXh0IH0pLFxuICAgICAgXSlcbiAgICB9XG5cbiAgICByZXNldExvYWRpbmdTdGF0ZSgpXG5cbiAgICAvLyBDbGVhciBhbnkgYWN0aXZlIHRva2VuIGJ1ZGdldCBzbyB0aGUgYmFja3N0b3AgZG9lc24ndCBmaXJlIG9uXG4gICAgLy8gYSBzdGFsZSBidWRnZXQgaWYgdGhlIHF1ZXJ5IGdlbmVyYXRvciBoYXNuJ3QgZXhpdGVkIHlldC5cbiAgICBpZiAoZmVhdHVyZSgnVE9LRU5fQlVER0VUJykpIHtcbiAgICAgIHNuYXBzaG90T3V0cHV0VG9rZW5zRm9yVHVybihudWxsKVxuICAgIH1cblxuICAgIGlmIChmb2N1c2VkSW5wdXREaWFsb2cgPT09ICd0b29sLXBlcm1pc3Npb24nKSB7XG4gICAgICAvLyBUb29sIHVzZSBjb25maXJtIGhhbmRsZXMgdGhlIGFib3J0IHNpZ25hbCBpdHNlbGZcbiAgICAgIHRvb2xVc2VDb25maXJtUXVldWVbMF0/Lm9uQWJvcnQoKVxuICAgICAgc2V0VG9vbFVzZUNvbmZpcm1RdWV1ZShbXSlcbiAgICB9IGVsc2UgaWYgKGZvY3VzZWRJbnB1dERpYWxvZyA9PT0gJ3Byb21wdCcpIHtcbiAgICAgIC8vIFJlamVjdCBhbGwgcGVuZGluZyBwcm9tcHRzIGFuZCBjbGVhciB0aGUgcXVldWVcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBwcm9tcHRRdWV1ZSkge1xuICAgICAgICBpdGVtLnJlamVjdChuZXcgRXJyb3IoJ1Byb21wdCBjYW5jZWxsZWQgYnkgdXNlcicpKVxuICAgICAgfVxuICAgICAgc2V0UHJvbXB0UXVldWUoW10pXG4gICAgICBhYm9ydENvbnRyb2xsZXI/LmFib3J0KCd1c2VyLWNhbmNlbCcpXG4gICAgfSBlbHNlIGlmIChhY3RpdmVSZW1vdGUuaXNSZW1vdGVNb2RlKSB7XG4gICAgICAvLyBSZW1vdGUgbW9kZTogc2VuZCBpbnRlcnJ1cHQgc2lnbmFsIHRvIENDUlxuICAgICAgYWN0aXZlUmVtb3RlLmNhbmNlbFJlcXVlc3QoKVxuICAgIH0gZWxzZSB7XG4gICAgICBhYm9ydENvbnRyb2xsZXI/LmFib3J0KCd1c2VyLWNhbmNlbCcpXG4gICAgfVxuXG4gICAgLy8gQ2xlYXIgdGhlIGNvbnRyb2xsZXIgc28gc3Vic2VxdWVudCBFc2NhcGUgcHJlc3NlcyBkb24ndCBzZWUgYSBzdGFsZVxuICAgIC8vIGFib3J0ZWQgc2lnbmFsLiBXaXRob3V0IHRoaXMsIGNhbkNhbmNlbFJ1bm5pbmdUYXNrIGlzIGZhbHNlIChzaWduYWxcbiAgICAvLyBkZWZpbmVkIGJ1dCAuYWJvcnRlZCA9PT0gdHJ1ZSksIHNvIGlzQWN0aXZlIGJlY29tZXMgZmFsc2UgaWYgbm8gb3RoZXJcbiAgICAvLyBhY3RpdmF0aW5nIGNvbmRpdGlvbnMgaG9sZCDigJQgbGVhdmluZyB0aGUgRXNjYXBlIGtleWJpbmRpbmcgaW5hY3RpdmUuXG4gICAgc2V0QWJvcnRDb250cm9sbGVyKG51bGwpXG5cbiAgICAvLyBmb3JjZUVuZCgpIHNraXBzIHRoZSBmaW5hbGx5IHBhdGgg4oCUIGZpcmUgZGlyZWN0bHkgKGFib3J0ZWQ9dHJ1ZSkuXG4gICAgdm9pZCBtck9uVHVybkNvbXBsZXRlKG1lc3NhZ2VzUmVmLmN1cnJlbnQsIHRydWUpXG4gIH1cblxuICAvLyBGdW5jdGlvbiB0byBoYW5kbGUgcXVldWVkIGNvbW1hbmQgd2hlbiBjYW5jZWxpbmcgYSBwZXJtaXNzaW9uIHJlcXVlc3RcbiAgY29uc3QgaGFuZGxlUXVldWVkQ29tbWFuZE9uQ2FuY2VsID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHBvcEFsbEVkaXRhYmxlKGlucHV0VmFsdWUsIDApXG4gICAgaWYgKCFyZXN1bHQpIHJldHVyblxuICAgIHNldElucHV0VmFsdWUocmVzdWx0LnRleHQpXG4gICAgc2V0SW5wdXRNb2RlKCdwcm9tcHQnKVxuXG4gICAgLy8gUmVzdG9yZSBpbWFnZXMgZnJvbSBxdWV1ZWQgY29tbWFuZHMgdG8gcGFzdGVkQ29udGVudHNcbiAgICBpZiAocmVzdWx0LmltYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICBzZXRQYXN0ZWRDb250ZW50cyhwcmV2ID0+IHtcbiAgICAgICAgY29uc3QgbmV3Q29udGVudHMgPSB7IC4uLnByZXYgfVxuICAgICAgICBmb3IgKGNvbnN0IGltYWdlIG9mIHJlc3VsdC5pbWFnZXMpIHtcbiAgICAgICAgICBuZXdDb250ZW50c1tpbWFnZS5pZF0gPSBpbWFnZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdDb250ZW50c1xuICAgICAgfSlcbiAgICB9XG4gIH0sIFtzZXRJbnB1dFZhbHVlLCBzZXRJbnB1dE1vZGUsIGlucHV0VmFsdWUsIHNldFBhc3RlZENvbnRlbnRzXSlcblxuICAvLyBDYW5jZWxSZXF1ZXN0SGFuZGxlciBwcm9wcyAtIHJlbmRlcmVkIGluc2lkZSBLZXliaW5kaW5nU2V0dXBcbiAgY29uc3QgY2FuY2VsUmVxdWVzdFByb3BzID0ge1xuICAgIHNldFRvb2xVc2VDb25maXJtUXVldWUsXG4gICAgb25DYW5jZWwsXG4gICAgb25BZ2VudHNLaWxsZWQ6ICgpID0+XG4gICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCBjcmVhdGVBZ2VudHNLaWxsZWRNZXNzYWdlKCldKSxcbiAgICBpc01lc3NhZ2VTZWxlY3RvclZpc2libGU6IGlzTWVzc2FnZVNlbGVjdG9yVmlzaWJsZSB8fCAhIXNob3dCYXNoZXNEaWFsb2csXG4gICAgc2NyZWVuLFxuICAgIGFib3J0U2lnbmFsOiBhYm9ydENvbnRyb2xsZXI/LnNpZ25hbCxcbiAgICBwb3BDb21tYW5kRnJvbVF1ZXVlOiBoYW5kbGVRdWV1ZWRDb21tYW5kT25DYW5jZWwsXG4gICAgdmltTW9kZSxcbiAgICBpc0xvY2FsSlNYQ29tbWFuZDogdG9vbEpTWD8uaXNMb2NhbEpTWENvbW1hbmQsXG4gICAgaXNTZWFyY2hpbmdIaXN0b3J5LFxuICAgIGlzSGVscE9wZW4sXG4gICAgaW5wdXRNb2RlLFxuICAgIGlucHV0VmFsdWUsXG4gICAgc3RyZWFtTW9kZSxcbiAgfVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgdG90YWxDb3N0ID0gZ2V0VG90YWxDb3N0KClcbiAgICBpZiAodG90YWxDb3N0ID49IDUgLyogJDUgKi8gJiYgIXNob3dDb3N0RGlhbG9nICYmICFoYXZlU2hvd25Db3N0RGlhbG9nKSB7XG4gICAgICBsb2dFdmVudCgndGVuZ3VfY29zdF90aHJlc2hvbGRfcmVhY2hlZCcsIHt9KVxuICAgICAgLy8gTWFyayBhcyBzaG93biBldmVuIGlmIHRoZSBkaWFsb2cgd29uJ3QgcmVuZGVyIChubyBjb25zb2xlIGJpbGxpbmdcbiAgICAgIC8vIGFjY2VzcykuIE90aGVyd2lzZSB0aGlzIGVmZmVjdCByZS1maXJlcyBvbiBldmVyeSBtZXNzYWdlIGNoYW5nZSBmb3JcbiAgICAgIC8vIHRoZSByZXN0IG9mIHRoZSBzZXNzaW9uIOKAlCAyMDBrKyBzcHVyaW91cyBldmVudHMgb2JzZXJ2ZWQuXG4gICAgICBzZXRIYXZlU2hvd25Db3N0RGlhbG9nKHRydWUpXG4gICAgICBpZiAoaGFzQ29uc29sZUJpbGxpbmdBY2Nlc3MoKSkge1xuICAgICAgICBzZXRTaG93Q29zdERpYWxvZyh0cnVlKVxuICAgICAgfVxuICAgIH1cbiAgfSwgW21lc3NhZ2VzLCBzaG93Q29zdERpYWxvZywgaGF2ZVNob3duQ29zdERpYWxvZ10pXG5cbiAgY29uc3Qgc2FuZGJveEFza0NhbGxiYWNrOiBTYW5kYm94QXNrQ2FsbGJhY2sgPSB1c2VDYWxsYmFjayhcbiAgICBhc3luYyAoaG9zdFBhdHRlcm46IE5ldHdvcmtIb3N0UGF0dGVybikgPT4ge1xuICAgICAgLy8gSWYgcnVubmluZyBhcyBhIHN3YXJtIHdvcmtlciwgZm9yd2FyZCB0aGUgcmVxdWVzdCB0byB0aGUgbGVhZGVyIHZpYSBtYWlsYm94XG4gICAgICBpZiAoaXNBZ2VudFN3YXJtc0VuYWJsZWQoKSAmJiBpc1N3YXJtV29ya2VyKCkpIHtcbiAgICAgICAgY29uc3QgcmVxdWVzdElkID0gZ2VuZXJhdGVTYW5kYm94UmVxdWVzdElkKClcblxuICAgICAgICAvLyBTZW5kIHRoZSByZXF1ZXN0IHRvIHRoZSBsZWFkZXIgdmlhIG1haWxib3hcbiAgICAgICAgY29uc3Qgc2VudCA9IGF3YWl0IHNlbmRTYW5kYm94UGVybWlzc2lvblJlcXVlc3RWaWFNYWlsYm94KFxuICAgICAgICAgIGhvc3RQYXR0ZXJuLmhvc3QsXG4gICAgICAgICAgcmVxdWVzdElkLFxuICAgICAgICApXG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmVTaG91bGRBbGxvd0hvc3QgPT4ge1xuICAgICAgICAgIGlmICghc2VudCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgY291bGRuJ3Qgc2VuZCB2aWEgbWFpbGJveCwgZmFsbCBiYWNrIHRvIGxvY2FsIGhhbmRsaW5nXG4gICAgICAgICAgICBzZXRTYW5kYm94UGVybWlzc2lvblJlcXVlc3RRdWV1ZShwcmV2ID0+IFtcbiAgICAgICAgICAgICAgLi4ucHJldixcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGhvc3RQYXR0ZXJuLFxuICAgICAgICAgICAgICAgIHJlc29sdmVQcm9taXNlOiByZXNvbHZlU2hvdWxkQWxsb3dIb3N0LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSlcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBjYWxsYmFjayBmb3Igd2hlbiB0aGUgbGVhZGVyIHJlc3BvbmRzXG4gICAgICAgICAgcmVnaXN0ZXJTYW5kYm94UGVybWlzc2lvbkNhbGxiYWNrKHtcbiAgICAgICAgICAgIHJlcXVlc3RJZCxcbiAgICAgICAgICAgIGhvc3Q6IGhvc3RQYXR0ZXJuLmhvc3QsXG4gICAgICAgICAgICByZXNvbHZlOiByZXNvbHZlU2hvdWxkQWxsb3dIb3N0LFxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAvLyBVcGRhdGUgQXBwU3RhdGUgdG8gc2hvdyBwZW5kaW5nIGluZGljYXRvclxuICAgICAgICAgIHNldEFwcFN0YXRlKHByZXYgPT4gKHtcbiAgICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgICBwZW5kaW5nU2FuZGJveFJlcXVlc3Q6IHtcbiAgICAgICAgICAgICAgcmVxdWVzdElkLFxuICAgICAgICAgICAgICBob3N0OiBob3N0UGF0dGVybi5ob3N0LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KSlcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gTm9ybWFsIGZsb3cgZm9yIG5vbi13b3JrZXJzOiBzaG93IGxvY2FsIFVJIGFuZCBvcHRpb25hbGx5IHJhY2VcbiAgICAgIC8vIGFnYWluc3QgdGhlIFJFUEwgYnJpZGdlIChSZW1vdGUgQ29udHJvbCkgaWYgY29ubmVjdGVkLlxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmVTaG91bGRBbGxvd0hvc3QgPT4ge1xuICAgICAgICBsZXQgcmVzb2x2ZWQgPSBmYWxzZVxuICAgICAgICBmdW5jdGlvbiByZXNvbHZlT25jZShhbGxvdzogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICAgIGlmIChyZXNvbHZlZCkgcmV0dXJuXG4gICAgICAgICAgcmVzb2x2ZWQgPSB0cnVlXG4gICAgICAgICAgcmVzb2x2ZVNob3VsZEFsbG93SG9zdChhbGxvdylcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFF1ZXVlIHRoZSBsb2NhbCBzYW5kYm94IHBlcm1pc3Npb24gZGlhbG9nXG4gICAgICAgIHNldFNhbmRib3hQZXJtaXNzaW9uUmVxdWVzdFF1ZXVlKHByZXYgPT4gW1xuICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAge1xuICAgICAgICAgICAgaG9zdFBhdHRlcm4sXG4gICAgICAgICAgICByZXNvbHZlUHJvbWlzZTogcmVzb2x2ZU9uY2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSlcblxuICAgICAgICAvLyBXaGVuIHRoZSBSRVBMIGJyaWRnZSBpcyBjb25uZWN0ZWQsIGFsc28gZm9yd2FyZCB0aGUgc2FuZGJveFxuICAgICAgICAvLyBwZXJtaXNzaW9uIHJlcXVlc3QgYXMgYSBjYW5fdXNlX3Rvb2wgY29udHJvbF9yZXF1ZXN0IHNvIHRoZVxuICAgICAgICAvLyByZW1vdGUgdXNlciAoZS5nLiBvbiBjbGF1ZGUuYWkpIGNhbiBhcHByb3ZlIGl0IHRvby5cbiAgICAgICAgaWYgKGZlYXR1cmUoJ0JSSURHRV9NT0RFJykpIHtcbiAgICAgICAgICBjb25zdCBicmlkZ2VDYWxsYmFja3MgPSBzdG9yZS5nZXRTdGF0ZSgpLnJlcGxCcmlkZ2VQZXJtaXNzaW9uQ2FsbGJhY2tzXG4gICAgICAgICAgaWYgKGJyaWRnZUNhbGxiYWNrcykge1xuICAgICAgICAgICAgY29uc3QgYnJpZGdlUmVxdWVzdElkID0gcmFuZG9tVVVJRCgpXG4gICAgICAgICAgICBicmlkZ2VDYWxsYmFja3Muc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAgIGJyaWRnZVJlcXVlc3RJZCxcbiAgICAgICAgICAgICAgU0FOREJPWF9ORVRXT1JLX0FDQ0VTU19UT09MX05BTUUsXG4gICAgICAgICAgICAgIHsgaG9zdDogaG9zdFBhdHRlcm4uaG9zdCB9LFxuICAgICAgICAgICAgICByYW5kb21VVUlEKCksXG4gICAgICAgICAgICAgIGBBbGxvdyBuZXR3b3JrIGNvbm5lY3Rpb24gdG8gJHtob3N0UGF0dGVybi5ob3N0fT9gLFxuICAgICAgICAgICAgKVxuXG4gICAgICAgICAgICBjb25zdCB1bnN1YnNjcmliZSA9IGJyaWRnZUNhbGxiYWNrcy5vblJlc3BvbnNlKFxuICAgICAgICAgICAgICBicmlkZ2VSZXF1ZXN0SWQsXG4gICAgICAgICAgICAgIHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICB1bnN1YnNjcmliZSgpXG4gICAgICAgICAgICAgICAgY29uc3QgYWxsb3cgPSByZXNwb25zZS5iZWhhdmlvciA9PT0gJ2FsbG93J1xuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgQUxMIHBlbmRpbmcgcmVxdWVzdHMgZm9yIHRoZSBzYW1lIGhvc3QsIG5vdCBqdXN0XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBvbmUg4oCUIG1pcnJvcnMgdGhlIGxvY2FsIGRpYWxvZyBoYW5kbGVyIHBhdHRlcm4uXG4gICAgICAgICAgICAgICAgc2V0U2FuZGJveFBlcm1pc3Npb25SZXF1ZXN0UXVldWUocXVldWUgPT4ge1xuICAgICAgICAgICAgICAgICAgcXVldWVcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpdGVtID0+IGl0ZW0uaG9zdFBhdHRlcm4uaG9zdCA9PT0gaG9zdFBhdHRlcm4uaG9zdClcbiAgICAgICAgICAgICAgICAgICAgLmZvckVhY2goaXRlbSA9PiBpdGVtLnJlc29sdmVQcm9taXNlKGFsbG93KSlcbiAgICAgICAgICAgICAgICAgIHJldHVybiBxdWV1ZS5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPT4gaXRlbS5ob3N0UGF0dGVybi5ob3N0ICE9PSBob3N0UGF0dGVybi5ob3N0LFxuICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgYWxsIHNpYmxpbmcgYnJpZGdlIHN1YnNjcmlwdGlvbnMgZm9yIHRoaXMgaG9zdFxuICAgICAgICAgICAgICAgIC8vIChvdGhlciBjb25jdXJyZW50IHNhbWUtaG9zdCByZXF1ZXN0cykgYmVmb3JlIGRlbGV0aW5nLlxuICAgICAgICAgICAgICAgIGNvbnN0IHNpYmxpbmdDbGVhbnVwcyA9IHNhbmRib3hCcmlkZ2VDbGVhbnVwUmVmLmN1cnJlbnQuZ2V0KFxuICAgICAgICAgICAgICAgICAgaG9zdFBhdHRlcm4uaG9zdCxcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgaWYgKHNpYmxpbmdDbGVhbnVwcykge1xuICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBmbiBvZiBzaWJsaW5nQ2xlYW51cHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZm4oKVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgc2FuZGJveEJyaWRnZUNsZWFudXBSZWYuY3VycmVudC5kZWxldGUoaG9zdFBhdHRlcm4uaG9zdClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApXG5cbiAgICAgICAgICAgIC8vIFJlZ2lzdGVyIGNsZWFudXAgc28gdGhlIGxvY2FsIGRpYWxvZyBoYW5kbGVyIGNhbiBjYW5jZWxcbiAgICAgICAgICAgIC8vIHRoZSByZW1vdGUgcHJvbXB0IGFuZCB1bnN1YnNjcmliZSB3aGVuIHRoZSBsb2NhbCB1c2VyXG4gICAgICAgICAgICAvLyByZXNwb25kcyBmaXJzdC5cbiAgICAgICAgICAgIGNvbnN0IGNsZWFudXAgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIHVuc3Vic2NyaWJlKClcbiAgICAgICAgICAgICAgYnJpZGdlQ2FsbGJhY2tzLmNhbmNlbFJlcXVlc3QoYnJpZGdlUmVxdWVzdElkKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPVxuICAgICAgICAgICAgICBzYW5kYm94QnJpZGdlQ2xlYW51cFJlZi5jdXJyZW50LmdldChob3N0UGF0dGVybi5ob3N0KSA/PyBbXVxuICAgICAgICAgICAgZXhpc3RpbmcucHVzaChjbGVhbnVwKVxuICAgICAgICAgICAgc2FuZGJveEJyaWRnZUNsZWFudXBSZWYuY3VycmVudC5zZXQoaG9zdFBhdHRlcm4uaG9zdCwgZXhpc3RpbmcpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0sXG4gICAgW3NldEFwcFN0YXRlLCBzdG9yZV0sXG4gIClcblxuICAvLyAjMzQwNDQ6IGlmIHVzZXIgZXhwbGljaXRseSBzZXQgc2FuZGJveC5lbmFibGVkPXRydWUgYnV0IGRlcHMgYXJlIG1pc3NpbmcsXG4gIC8vIGlzU2FuZGJveGluZ0VuYWJsZWQoKSByZXR1cm5zIGZhbHNlIHNpbGVudGx5LiBTdXJmYWNlIHRoZSByZWFzb24gb25jZSBhdFxuICAvLyBtb3VudCBzbyB1c2VycyBrbm93IHRoZWlyIHNlY3VyaXR5IGNvbmZpZyBpc24ndCBiZWluZyBlbmZvcmNlZC4gRnVsbFxuICAvLyByZWFzb24gZ29lcyB0byBkZWJ1ZyBsb2c7IG5vdGlmaWNhdGlvbiBwb2ludHMgdG8gL3NhbmRib3ggZm9yIGRldGFpbHMuXG4gIC8vIGFkZE5vdGlmaWNhdGlvbiBpcyBzdGFibGUgKHVzZUNhbGxiYWNrKSBzbyB0aGUgZWZmZWN0IGZpcmVzIG9uY2UuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgcmVhc29uID0gU2FuZGJveE1hbmFnZXIuZ2V0U2FuZGJveFVuYXZhaWxhYmxlUmVhc29uKClcbiAgICBpZiAoIXJlYXNvbikgcmV0dXJuXG4gICAgaWYgKFNhbmRib3hNYW5hZ2VyLmlzU2FuZGJveFJlcXVpcmVkKCkpIHtcbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgXFxuRXJyb3I6IHNhbmRib3ggcmVxdWlyZWQgYnV0IHVuYXZhaWxhYmxlOiAke3JlYXNvbn1cXG5gICtcbiAgICAgICAgICBgICBzYW5kYm94LmZhaWxJZlVuYXZhaWxhYmxlIGlzIHNldCDigJQgcmVmdXNpbmcgdG8gc3RhcnQgd2l0aG91dCBhIHdvcmtpbmcgc2FuZGJveC5cXG5cXG5gLFxuICAgICAgKVxuICAgICAgZ3JhY2VmdWxTaHV0ZG93blN5bmMoMSwgJ290aGVyJylcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBsb2dGb3JEZWJ1Z2dpbmcoYHNhbmRib3ggZGlzYWJsZWQ6ICR7cmVhc29ufWAsIHsgbGV2ZWw6ICd3YXJuJyB9KVxuICAgIGFkZE5vdGlmaWNhdGlvbih7XG4gICAgICBrZXk6ICdzYW5kYm94LXVuYXZhaWxhYmxlJyxcbiAgICAgIGpzeDogKFxuICAgICAgICA8PlxuICAgICAgICAgIDxUZXh0IGNvbG9yPVwid2FybmluZ1wiPnNhbmRib3ggZGlzYWJsZWQ8L1RleHQ+XG4gICAgICAgICAgPFRleHQgZGltQ29sb3I+IMK3IC9zYW5kYm94PC9UZXh0PlxuICAgICAgICA8Lz5cbiAgICAgICksXG4gICAgICBwcmlvcml0eTogJ21lZGl1bScsXG4gICAgfSlcbiAgfSwgW2FkZE5vdGlmaWNhdGlvbl0pXG5cbiAgaWYgKFNhbmRib3hNYW5hZ2VyLmlzU2FuZGJveGluZ0VuYWJsZWQoKSkge1xuICAgIC8vIElmIHNhbmRib3hpbmcgaXMgZW5hYmxlZCAoc2V0dGluZy5zYW5kYm94IGlzIGRlZmluZWQsIGluaXRpYWxpc2UgdGhlIG1hbmFnZXIpXG4gICAgU2FuZGJveE1hbmFnZXIuaW5pdGlhbGl6ZShzYW5kYm94QXNrQ2FsbGJhY2spLmNhdGNoKGVyciA9PiB7XG4gICAgICAvLyBJbml0aWFsaXphdGlvbi92YWxpZGF0aW9uIGZhaWxlZCAtIGRpc3BsYXkgZXJyb3IgYW5kIGV4aXRcbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBcXG7inYwgU2FuZGJveCBFcnJvcjogJHtlcnJvck1lc3NhZ2UoZXJyKX1cXG5gKVxuICAgICAgZ3JhY2VmdWxTaHV0ZG93blN5bmMoMSwgJ290aGVyJylcbiAgICB9KVxuICB9XG5cbiAgY29uc3Qgc2V0VG9vbFBlcm1pc3Npb25Db250ZXh0ID0gdXNlQ2FsbGJhY2soXG4gICAgKGNvbnRleHQ6IFRvb2xQZXJtaXNzaW9uQ29udGV4dCwgb3B0aW9ucz86IHsgcHJlc2VydmVNb2RlPzogYm9vbGVhbiB9KSA9PiB7XG4gICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+ICh7XG4gICAgICAgIC4uLnByZXYsXG4gICAgICAgIHRvb2xQZXJtaXNzaW9uQ29udGV4dDoge1xuICAgICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgICAgLy8gUHJlc2VydmUgdGhlIGNvb3JkaW5hdG9yJ3MgbW9kZSBvbmx5IHdoZW4gZXhwbGljaXRseSByZXF1ZXN0ZWQuXG4gICAgICAgICAgLy8gV29ya2VycycgZ2V0QXBwU3RhdGUoKSByZXR1cm5zIGEgdHJhbnNmb3JtZWQgY29udGV4dCB3aXRoIG1vZGVcbiAgICAgICAgICAvLyAnYWNjZXB0RWRpdHMnIHRoYXQgbXVzdCBub3QgbGVhayBpbnRvIHRoZSBjb29yZGluYXRvcidzIGFjdHVhbFxuICAgICAgICAgIC8vIHN0YXRlIHZpYSBwZXJtaXNzaW9uLXJ1bGUgdXBkYXRlcyDigJQgdGhvc2UgY2FsbCBzaXRlcyBwYXNzXG4gICAgICAgICAgLy8geyBwcmVzZXJ2ZU1vZGU6IHRydWUgfS4gVXNlci1pbml0aWF0ZWQgbW9kZSBjaGFuZ2VzIChlLmcuLFxuICAgICAgICAgIC8vIHNlbGVjdGluZyBcImFsbG93IGFsbCBlZGl0c1wiKSBtdXN0IE5PVCBiZSBvdmVycmlkZGVuLlxuICAgICAgICAgIG1vZGU6IG9wdGlvbnM/LnByZXNlcnZlTW9kZVxuICAgICAgICAgICAgPyBwcmV2LnRvb2xQZXJtaXNzaW9uQ29udGV4dC5tb2RlXG4gICAgICAgICAgICA6IGNvbnRleHQubW9kZSxcbiAgICAgICAgfSxcbiAgICAgIH0pKVxuXG4gICAgICAvLyBXaGVuIHBlcm1pc3Npb24gY29udGV4dCBjaGFuZ2VzLCByZWNoZWNrIGFsbCBxdWV1ZWQgaXRlbXNcbiAgICAgIC8vIFRoaXMgaGFuZGxlcyB0aGUgY2FzZSB3aGVyZSBhcHByb3ZpbmcgaXRlbTEgd2l0aCBcImRvbid0IGFzayBhZ2FpblwiXG4gICAgICAvLyBzaG91bGQgYXV0by1hcHByb3ZlIG90aGVyIHF1ZXVlZCBpdGVtcyB0aGF0IG5vdyBtYXRjaCB0aGUgdXBkYXRlZCBydWxlc1xuICAgICAgc2V0SW1tZWRpYXRlKHNldFRvb2xVc2VDb25maXJtUXVldWUgPT4ge1xuICAgICAgICAvLyBVc2Ugc2V0VG9vbFVzZUNvbmZpcm1RdWV1ZSBjYWxsYmFjayB0byBnZXQgY3VycmVudCBxdWV1ZSBzdGF0ZVxuICAgICAgICAvLyBpbnN0ZWFkIG9mIGNhcHR1cmluZyBpdCBpbiB0aGUgY2xvc3VyZSwgdG8gYXZvaWQgc3RhbGUgY2xvc3VyZSBpc3N1ZXNcbiAgICAgICAgc2V0VG9vbFVzZUNvbmZpcm1RdWV1ZShjdXJyZW50UXVldWUgPT4ge1xuICAgICAgICAgIGN1cnJlbnRRdWV1ZS5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgdm9pZCBpdGVtLnJlY2hlY2tQZXJtaXNzaW9uKClcbiAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiBjdXJyZW50UXVldWVcbiAgICAgICAgfSlcbiAgICAgIH0sIHNldFRvb2xVc2VDb25maXJtUXVldWUpXG4gICAgfSxcbiAgICBbc2V0QXBwU3RhdGUsIHNldFRvb2xVc2VDb25maXJtUXVldWVdLFxuICApXG5cbiAgLy8gUmVnaXN0ZXIgdGhlIGxlYWRlcidzIHNldFRvb2xQZXJtaXNzaW9uQ29udGV4dCBmb3IgaW4tcHJvY2VzcyB0ZWFtbWF0ZXNcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICByZWdpc3RlckxlYWRlclNldFRvb2xQZXJtaXNzaW9uQ29udGV4dChzZXRUb29sUGVybWlzc2lvbkNvbnRleHQpXG4gICAgcmV0dXJuICgpID0+IHVucmVnaXN0ZXJMZWFkZXJTZXRUb29sUGVybWlzc2lvbkNvbnRleHQoKVxuICB9LCBbc2V0VG9vbFBlcm1pc3Npb25Db250ZXh0XSlcblxuICBjb25zdCBjYW5Vc2VUb29sID0gdXNlQ2FuVXNlVG9vbChcbiAgICBzZXRUb29sVXNlQ29uZmlybVF1ZXVlLFxuICAgIHNldFRvb2xQZXJtaXNzaW9uQ29udGV4dCxcbiAgKVxuXG4gIGNvbnN0IHJlcXVlc3RQcm9tcHQgPSB1c2VDYWxsYmFjayhcbiAgICAodGl0bGU6IHN0cmluZywgdG9vbElucHV0U3VtbWFyeT86IHN0cmluZyB8IG51bGwpID0+XG4gICAgICAocmVxdWVzdDogUHJvbXB0UmVxdWVzdCk6IFByb21pc2U8UHJvbXB0UmVzcG9uc2U+ID0+XG4gICAgICAgIG5ldyBQcm9taXNlPFByb21wdFJlc3BvbnNlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgc2V0UHJvbXB0UXVldWUocHJldiA9PiBbXG4gICAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgICAgeyByZXF1ZXN0LCB0aXRsZSwgdG9vbElucHV0U3VtbWFyeSwgcmVzb2x2ZSwgcmVqZWN0IH0sXG4gICAgICAgICAgXSlcbiAgICAgICAgfSksXG4gICAgW10sXG4gIClcblxuICBjb25zdCBnZXRUb29sVXNlQ29udGV4dCA9IHVzZUNhbGxiYWNrKFxuICAgIChcbiAgICAgIG1lc3NhZ2VzOiBNZXNzYWdlVHlwZVtdLFxuICAgICAgbmV3TWVzc2FnZXM6IE1lc3NhZ2VUeXBlW10sXG4gICAgICBhYm9ydENvbnRyb2xsZXI6IEFib3J0Q29udHJvbGxlcixcbiAgICAgIG1haW5Mb29wTW9kZWw6IHN0cmluZyxcbiAgICApOiBQcm9jZXNzVXNlcklucHV0Q29udGV4dCA9PiB7XG4gICAgICAvLyBSZWFkIG11dGFibGUgdmFsdWVzIGZyZXNoIGZyb20gdGhlIHN0b3JlIHJhdGhlciB0aGFuIGNsb3N1cmUtY2FwdHVyaW5nXG4gICAgICAvLyB1c2VBcHBTdGF0ZSgpIHNuYXBzaG90cy4gU2FtZSB2YWx1ZXMgdG9kYXkgKGNsb3N1cmUgaXMgcmVmcmVzaGVkIGJ5IHRoZVxuICAgICAgLy8gcmVuZGVyIGJldHdlZW4gdHVybnMpOyBkZWNvdXBsZXMgZnJlc2huZXNzIGZyb20gUmVhY3QncyByZW5kZXIgY3ljbGUgZm9yXG4gICAgICAvLyBhIGZ1dHVyZSBoZWFkbGVzcyBjb252ZXJzYXRpb24gbG9vcC4gU2FtZSBwYXR0ZXJuIHJlZnJlc2hUb29scygpIHVzZXMuXG4gICAgICBjb25zdCBzID0gc3RvcmUuZ2V0U3RhdGUoKVxuXG4gICAgICAvLyBDb21wdXRlIHRvb2xzIGZyZXNoIGZyb20gc3RvcmUuZ2V0U3RhdGUoKSByYXRoZXIgdGhhbiB0aGUgY2xvc3VyZS1cbiAgICAgIC8vIGNhcHR1cmVkIGB0b29sc2AuIHVzZU1hbmFnZU1DUENvbm5lY3Rpb25zIHBvcHVsYXRlcyBhcHBTdGF0ZS5tY3BcbiAgICAgIC8vIGFzeW5jIGFzIHNlcnZlcnMgY29ubmVjdCDigJQgdGhlIHN0b3JlIG1heSBoYXZlIG5ld2VyIE1DUCBzdGF0ZSB0aGFuXG4gICAgICAvLyB0aGUgY2xvc3VyZSBjYXB0dXJlZCBhdCByZW5kZXIgdGltZS4gQWxzbyBkb3VibGVzIGFzIHJlZnJlc2hUb29scygpXG4gICAgICAvLyBmb3IgbWlkLXF1ZXJ5IHRvb2wgbGlzdCB1cGRhdGVzLlxuICAgICAgY29uc3QgY29tcHV0ZVRvb2xzID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKClcbiAgICAgICAgY29uc3QgYXNzZW1ibGVkID0gYXNzZW1ibGVUb29sUG9vbChcbiAgICAgICAgICBzdGF0ZS50b29sUGVybWlzc2lvbkNvbnRleHQsXG4gICAgICAgICAgc3RhdGUubWNwLnRvb2xzLFxuICAgICAgICApXG4gICAgICAgIGNvbnN0IG1lcmdlZCA9IG1lcmdlQW5kRmlsdGVyVG9vbHMoXG4gICAgICAgICAgY29tYmluZWRJbml0aWFsVG9vbHMsXG4gICAgICAgICAgYXNzZW1ibGVkLFxuICAgICAgICAgIHN0YXRlLnRvb2xQZXJtaXNzaW9uQ29udGV4dC5tb2RlLFxuICAgICAgICApXG4gICAgICAgIGlmICghbWFpblRocmVhZEFnZW50RGVmaW5pdGlvbikgcmV0dXJuIG1lcmdlZFxuICAgICAgICByZXR1cm4gcmVzb2x2ZUFnZW50VG9vbHMobWFpblRocmVhZEFnZW50RGVmaW5pdGlvbiwgbWVyZ2VkLCBmYWxzZSwgdHJ1ZSlcbiAgICAgICAgICAucmVzb2x2ZWRUb29sc1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBhYm9ydENvbnRyb2xsZXIsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBjb21tYW5kcyxcbiAgICAgICAgICB0b29sczogY29tcHV0ZVRvb2xzKCksXG4gICAgICAgICAgZGVidWcsXG4gICAgICAgICAgdmVyYm9zZTogcy52ZXJib3NlLFxuICAgICAgICAgIG1haW5Mb29wTW9kZWwsXG4gICAgICAgICAgdGhpbmtpbmdDb25maWc6XG4gICAgICAgICAgICBzLnRoaW5raW5nRW5hYmxlZCAhPT0gZmFsc2UgPyB0aGlua2luZ0NvbmZpZyA6IHsgdHlwZTogJ2Rpc2FibGVkJyB9LFxuICAgICAgICAgIC8vIE1lcmdlIGZyZXNoIGZyb20gc3RvcmUgcmF0aGVyIHRoYW4gY2xvc2luZyBvdmVyIHVzZU1lcmdlZENsaWVudHMnXG4gICAgICAgICAgLy8gbWVtb2l6ZWQgb3V0cHV0LiBpbml0aWFsTWNwQ2xpZW50cyBpcyBhIHByb3AgKHNlc3Npb24tY29uc3RhbnQpLlxuICAgICAgICAgIG1jcENsaWVudHM6IG1lcmdlQ2xpZW50cyhpbml0aWFsTWNwQ2xpZW50cywgcy5tY3AuY2xpZW50cyksXG4gICAgICAgICAgbWNwUmVzb3VyY2VzOiBzLm1jcC5yZXNvdXJjZXMsXG4gICAgICAgICAgaWRlSW5zdGFsbGF0aW9uU3RhdHVzOiBpZGVJbnN0YWxsYXRpb25TdGF0dXMsXG4gICAgICAgICAgaXNOb25JbnRlcmFjdGl2ZVNlc3Npb246IGZhbHNlLFxuICAgICAgICAgIGR5bmFtaWNNY3BDb25maWcsXG4gICAgICAgICAgdGhlbWUsXG4gICAgICAgICAgYWdlbnREZWZpbml0aW9uczogYWxsb3dlZEFnZW50VHlwZXNcbiAgICAgICAgICAgID8geyAuLi5zLmFnZW50RGVmaW5pdGlvbnMsIGFsbG93ZWRBZ2VudFR5cGVzIH1cbiAgICAgICAgICAgIDogcy5hZ2VudERlZmluaXRpb25zLFxuICAgICAgICAgIGN1c3RvbVN5c3RlbVByb21wdCxcbiAgICAgICAgICBhcHBlbmRTeXN0ZW1Qcm9tcHQsXG4gICAgICAgICAgcmVmcmVzaFRvb2xzOiBjb21wdXRlVG9vbHMsXG4gICAgICAgIH0sXG4gICAgICAgIGdldEFwcFN0YXRlOiAoKSA9PiBzdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICBzZXRBcHBTdGF0ZSxcbiAgICAgICAgbWVzc2FnZXMsXG4gICAgICAgIHNldE1lc3NhZ2VzLFxuICAgICAgICB1cGRhdGVGaWxlSGlzdG9yeVN0YXRlKFxuICAgICAgICAgIHVwZGF0ZXI6IChwcmV2OiBGaWxlSGlzdG9yeVN0YXRlKSA9PiBGaWxlSGlzdG9yeVN0YXRlLFxuICAgICAgICApIHtcbiAgICAgICAgICAvLyBQZXJmOiBza2lwIHRoZSBzZXRTdGF0ZSB3aGVuIHRoZSB1cGRhdGVyIHJldHVybnMgdGhlIHNhbWUgcmVmZXJlbmNlXG4gICAgICAgICAgLy8gKGUuZy4gZmlsZUhpc3RvcnlUcmFja0VkaXQgcmV0dXJucyBgc3RhdGVgIHdoZW4gdGhlIGZpbGUgaXMgYWxyZWFkeVxuICAgICAgICAgIC8vIHRyYWNrZWQpLiBPdGhlcndpc2UgZXZlcnkgbm8tb3AgY2FsbCB3b3VsZCBub3RpZnkgYWxsIHN0b3JlIGxpc3RlbmVycy5cbiAgICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWQgPSB1cGRhdGVyKHByZXYuZmlsZUhpc3RvcnkpXG4gICAgICAgICAgICBpZiAodXBkYXRlZCA9PT0gcHJldi5maWxlSGlzdG9yeSkgcmV0dXJuIHByZXZcbiAgICAgICAgICAgIHJldHVybiB7IC4uLnByZXYsIGZpbGVIaXN0b3J5OiB1cGRhdGVkIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9LFxuICAgICAgICB1cGRhdGVBdHRyaWJ1dGlvblN0YXRlKFxuICAgICAgICAgIHVwZGF0ZXI6IChwcmV2OiBBdHRyaWJ1dGlvblN0YXRlKSA9PiBBdHRyaWJ1dGlvblN0YXRlLFxuICAgICAgICApIHtcbiAgICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWQgPSB1cGRhdGVyKHByZXYuYXR0cmlidXRpb24pXG4gICAgICAgICAgICBpZiAodXBkYXRlZCA9PT0gcHJldi5hdHRyaWJ1dGlvbikgcmV0dXJuIHByZXZcbiAgICAgICAgICAgIHJldHVybiB7IC4uLnByZXYsIGF0dHJpYnV0aW9uOiB1cGRhdGVkIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9LFxuICAgICAgICBvcGVuTWVzc2FnZVNlbGVjdG9yOiAoKSA9PiB7XG4gICAgICAgICAgaWYgKCFkaXNhYmxlZCkge1xuICAgICAgICAgICAgc2V0SXNNZXNzYWdlU2VsZWN0b3JWaXNpYmxlKHRydWUpXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvbkNoYW5nZUFQSUtleTogcmV2ZXJpZnksXG4gICAgICAgIHJlYWRGaWxlU3RhdGU6IHJlYWRGaWxlU3RhdGUuY3VycmVudCxcbiAgICAgICAgc2V0VG9vbEpTWCxcbiAgICAgICAgYWRkTm90aWZpY2F0aW9uLFxuICAgICAgICBhcHBlbmRTeXN0ZW1NZXNzYWdlOiBtc2cgPT4gc2V0TWVzc2FnZXMocHJldiA9PiBbLi4ucHJldiwgbXNnXSksXG4gICAgICAgIHNlbmRPU05vdGlmaWNhdGlvbjogb3B0cyA9PiB7XG4gICAgICAgICAgdm9pZCBzZW5kTm90aWZpY2F0aW9uKG9wdHMsIHRlcm1pbmFsKVxuICAgICAgICB9LFxuICAgICAgICBvbkNoYW5nZUR5bmFtaWNNY3BDb25maWcsXG4gICAgICAgIG9uSW5zdGFsbElERUV4dGVuc2lvbjogc2V0SURFVG9JbnN0YWxsRXh0ZW5zaW9uLFxuICAgICAgICBuZXN0ZWRNZW1vcnlBdHRhY2htZW50VHJpZ2dlcnM6IG5ldyBTZXQ8c3RyaW5nPigpLFxuICAgICAgICBsb2FkZWROZXN0ZWRNZW1vcnlQYXRoczogbG9hZGVkTmVzdGVkTWVtb3J5UGF0aHNSZWYuY3VycmVudCxcbiAgICAgICAgZHluYW1pY1NraWxsRGlyVHJpZ2dlcnM6IG5ldyBTZXQ8c3RyaW5nPigpLFxuICAgICAgICBkaXNjb3ZlcmVkU2tpbGxOYW1lczogZGlzY292ZXJlZFNraWxsTmFtZXNSZWYuY3VycmVudCxcbiAgICAgICAgc2V0UmVzcG9uc2VMZW5ndGgsXG4gICAgICAgIHB1c2hBcGlNZXRyaWNzRW50cnk6XG4gICAgICAgICAgXCJleHRlcm5hbFwiID09PSAnYW50J1xuICAgICAgICAgICAgPyAodHRmdE1zOiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpXG4gICAgICAgICAgICAgICAgY29uc3QgYmFzZWxpbmUgPSByZXNwb25zZUxlbmd0aFJlZi5jdXJyZW50XG4gICAgICAgICAgICAgICAgYXBpTWV0cmljc1JlZi5jdXJyZW50LnB1c2goe1xuICAgICAgICAgICAgICAgICAgdHRmdE1zLFxuICAgICAgICAgICAgICAgICAgZmlyc3RUb2tlblRpbWU6IG5vdyxcbiAgICAgICAgICAgICAgICAgIGxhc3RUb2tlblRpbWU6IG5vdyxcbiAgICAgICAgICAgICAgICAgIHJlc3BvbnNlTGVuZ3RoQmFzZWxpbmU6IGJhc2VsaW5lLFxuICAgICAgICAgICAgICAgICAgZW5kUmVzcG9uc2VMZW5ndGg6IGJhc2VsaW5lLFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBzZXRTdHJlYW1Nb2RlLFxuICAgICAgICBvbkNvbXBhY3RQcm9ncmVzczogZXZlbnQgPT4ge1xuICAgICAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnaG9va3Nfc3RhcnQnOlxuICAgICAgICAgICAgICBzZXRTcGlubmVyQ29sb3IoJ2NsYXVkZUJsdWVfRk9SX1NZU1RFTV9TUElOTkVSJylcbiAgICAgICAgICAgICAgc2V0U3Bpbm5lclNoaW1tZXJDb2xvcignY2xhdWRlQmx1ZVNoaW1tZXJfRk9SX1NZU1RFTV9TUElOTkVSJylcbiAgICAgICAgICAgICAgc2V0U3Bpbm5lck1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgZXZlbnQuaG9va1R5cGUgPT09ICdwcmVfY29tcGFjdCdcbiAgICAgICAgICAgICAgICAgID8gJ1J1bm5pbmcgUHJlQ29tcGFjdCBob29rc1xcdTIwMjYnXG4gICAgICAgICAgICAgICAgICA6IGV2ZW50Lmhvb2tUeXBlID09PSAncG9zdF9jb21wYWN0J1xuICAgICAgICAgICAgICAgICAgICA/ICdSdW5uaW5nIFBvc3RDb21wYWN0IGhvb2tzXFx1MjAyNidcbiAgICAgICAgICAgICAgICAgICAgOiAnUnVubmluZyBTZXNzaW9uU3RhcnQgaG9va3NcXHUyMDI2JyxcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSAnY29tcGFjdF9zdGFydCc6XG4gICAgICAgICAgICAgIHNldFNwaW5uZXJNZXNzYWdlKCdDb21wYWN0aW5nIGNvbnZlcnNhdGlvbicpXG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlICdjb21wYWN0X2VuZCc6XG4gICAgICAgICAgICAgIHNldFNwaW5uZXJNZXNzYWdlKG51bGwpXG4gICAgICAgICAgICAgIHNldFNwaW5uZXJDb2xvcihudWxsKVxuICAgICAgICAgICAgICBzZXRTcGlubmVyU2hpbW1lckNvbG9yKG51bGwpXG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzZXRJblByb2dyZXNzVG9vbFVzZUlEcyxcbiAgICAgICAgc2V0SGFzSW50ZXJydXB0aWJsZVRvb2xJblByb2dyZXNzOiAodjogYm9vbGVhbikgPT4ge1xuICAgICAgICAgIGhhc0ludGVycnVwdGlibGVUb29sSW5Qcm9ncmVzc1JlZi5jdXJyZW50ID0gdlxuICAgICAgICB9LFxuICAgICAgICByZXN1bWUsXG4gICAgICAgIHNldENvbnZlcnNhdGlvbklkLFxuICAgICAgICByZXF1ZXN0UHJvbXB0OiBmZWF0dXJlKCdIT09LX1BST01QVFMnKSA/IHJlcXVlc3RQcm9tcHQgOiB1bmRlZmluZWQsXG4gICAgICAgIGNvbnRlbnRSZXBsYWNlbWVudFN0YXRlOiBjb250ZW50UmVwbGFjZW1lbnRTdGF0ZVJlZi5jdXJyZW50LFxuICAgICAgfVxuICAgIH0sXG4gICAgW1xuICAgICAgY29tbWFuZHMsXG4gICAgICBjb21iaW5lZEluaXRpYWxUb29scyxcbiAgICAgIG1haW5UaHJlYWRBZ2VudERlZmluaXRpb24sXG4gICAgICBkZWJ1ZyxcbiAgICAgIGluaXRpYWxNY3BDbGllbnRzLFxuICAgICAgaWRlSW5zdGFsbGF0aW9uU3RhdHVzLFxuICAgICAgZHluYW1pY01jcENvbmZpZyxcbiAgICAgIHRoZW1lLFxuICAgICAgYWxsb3dlZEFnZW50VHlwZXMsXG4gICAgICBzdG9yZSxcbiAgICAgIHNldEFwcFN0YXRlLFxuICAgICAgcmV2ZXJpZnksXG4gICAgICBhZGROb3RpZmljYXRpb24sXG4gICAgICBzZXRNZXNzYWdlcyxcbiAgICAgIG9uQ2hhbmdlRHluYW1pY01jcENvbmZpZyxcbiAgICAgIHJlc3VtZSxcbiAgICAgIHJlcXVlc3RQcm9tcHQsXG4gICAgICBkaXNhYmxlZCxcbiAgICAgIGN1c3RvbVN5c3RlbVByb21wdCxcbiAgICAgIGFwcGVuZFN5c3RlbVByb21wdCxcbiAgICAgIHNldENvbnZlcnNhdGlvbklkLFxuICAgIF0sXG4gIClcblxuICAvLyBTZXNzaW9uIGJhY2tncm91bmRpbmcgKEN0cmwrQiB0byBiYWNrZ3JvdW5kL2ZvcmVncm91bmQpXG4gIGNvbnN0IGhhbmRsZUJhY2tncm91bmRRdWVyeSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICAvLyBTdG9wIHRoZSBmb3JlZ3JvdW5kIHF1ZXJ5IHNvIHRoZSBiYWNrZ3JvdW5kIG9uZSB0YWtlcyBvdmVyXG4gICAgYWJvcnRDb250cm9sbGVyPy5hYm9ydCgnYmFja2dyb3VuZCcpXG4gICAgLy8gQWJvcnRpbmcgc3ViYWdlbnRzIG1heSBwcm9kdWNlIHRhc2stY29tcGxldGVkIG5vdGlmaWNhdGlvbnMuXG4gICAgLy8gQ2xlYXIgdGFzayBub3RpZmljYXRpb25zIHNvIHRoZSBxdWV1ZSBwcm9jZXNzb3IgZG9lc24ndCBpbW1lZGlhdGVseVxuICAgIC8vIHN0YXJ0IGEgbmV3IGZvcmVncm91bmQgcXVlcnk7IGZvcndhcmQgdGhlbSB0byB0aGUgYmFja2dyb3VuZCBzZXNzaW9uLlxuICAgIGNvbnN0IHJlbW92ZWROb3RpZmljYXRpb25zID0gcmVtb3ZlQnlGaWx0ZXIoXG4gICAgICBjbWQgPT4gY21kLm1vZGUgPT09ICd0YXNrLW5vdGlmaWNhdGlvbicsXG4gICAgKVxuXG4gICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgdG9vbFVzZUNvbnRleHQgPSBnZXRUb29sVXNlQ29udGV4dChcbiAgICAgICAgbWVzc2FnZXNSZWYuY3VycmVudCxcbiAgICAgICAgW10sXG4gICAgICAgIG5ldyBBYm9ydENvbnRyb2xsZXIoKSxcbiAgICAgICAgbWFpbkxvb3BNb2RlbCxcbiAgICAgIClcblxuICAgICAgY29uc3QgW2RlZmF1bHRTeXN0ZW1Qcm9tcHQsIHVzZXJDb250ZXh0LCBzeXN0ZW1Db250ZXh0XSA9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICBnZXRTeXN0ZW1Qcm9tcHQoXG4gICAgICAgICAgICB0b29sVXNlQ29udGV4dC5vcHRpb25zLnRvb2xzLFxuICAgICAgICAgICAgbWFpbkxvb3BNb2RlbCxcbiAgICAgICAgICAgIEFycmF5LmZyb20oXG4gICAgICAgICAgICAgIHRvb2xQZXJtaXNzaW9uQ29udGV4dC5hZGRpdGlvbmFsV29ya2luZ0RpcmVjdG9yaWVzLmtleXMoKSxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICB0b29sVXNlQ29udGV4dC5vcHRpb25zLm1jcENsaWVudHMsXG4gICAgICAgICAgKSxcbiAgICAgICAgICBnZXRVc2VyQ29udGV4dCgpLFxuICAgICAgICAgIGdldFN5c3RlbUNvbnRleHQoKSxcbiAgICAgICAgXSlcblxuICAgICAgY29uc3Qgc3lzdGVtUHJvbXB0ID0gYnVpbGRFZmZlY3RpdmVTeXN0ZW1Qcm9tcHQoe1xuICAgICAgICBtYWluVGhyZWFkQWdlbnREZWZpbml0aW9uLFxuICAgICAgICB0b29sVXNlQ29udGV4dCxcbiAgICAgICAgY3VzdG9tU3lzdGVtUHJvbXB0LFxuICAgICAgICBkZWZhdWx0U3lzdGVtUHJvbXB0LFxuICAgICAgICBhcHBlbmRTeXN0ZW1Qcm9tcHQsXG4gICAgICB9KVxuICAgICAgdG9vbFVzZUNvbnRleHQucmVuZGVyZWRTeXN0ZW1Qcm9tcHQgPSBzeXN0ZW1Qcm9tcHRcblxuICAgICAgY29uc3Qgbm90aWZpY2F0aW9uQXR0YWNobWVudHMgPSBhd2FpdCBnZXRRdWV1ZWRDb21tYW5kQXR0YWNobWVudHMoXG4gICAgICAgIHJlbW92ZWROb3RpZmljYXRpb25zLFxuICAgICAgKS5jYXRjaCgoKSA9PiBbXSlcbiAgICAgIGNvbnN0IG5vdGlmaWNhdGlvbk1lc3NhZ2VzID0gbm90aWZpY2F0aW9uQXR0YWNobWVudHMubWFwKFxuICAgICAgICBjcmVhdGVBdHRhY2htZW50TWVzc2FnZSxcbiAgICAgIClcblxuICAgICAgLy8gRGVkdXBsaWNhdGU6IGlmIHRoZSBxdWVyeSBsb29wIGFscmVhZHkgeWllbGRlZCBhIG5vdGlmaWNhdGlvbiBpbnRvXG4gICAgICAvLyBtZXNzYWdlc1JlZiBiZWZvcmUgd2UgcmVtb3ZlZCBpdCBmcm9tIHRoZSBxdWV1ZSwgc2tpcCBkdXBsaWNhdGVzLlxuICAgICAgLy8gV2UgdXNlIHByb21wdCB0ZXh0IGZvciBkZWR1cCBiZWNhdXNlIHNvdXJjZV91dWlkIGlzIG5vdCBzZXQgb25cbiAgICAgIC8vIHRhc2stbm90aWZpY2F0aW9uIFF1ZXVlZENvbW1hbmRzIChlbnF1ZXVlUGVuZGluZ05vdGlmaWNhdGlvbiBjYWxsZXJzXG4gICAgICAvLyBkb24ndCBwYXNzIHV1aWQpLCBzbyBpdCB3b3VsZCBhbHdheXMgYmUgdW5kZWZpbmVkLlxuICAgICAgY29uc3QgZXhpc3RpbmdQcm9tcHRzID0gbmV3IFNldDxzdHJpbmc+KClcbiAgICAgIGZvciAoY29uc3QgbSBvZiBtZXNzYWdlc1JlZi5jdXJyZW50KSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBtLnR5cGUgPT09ICdhdHRhY2htZW50JyAmJlxuICAgICAgICAgIG0uYXR0YWNobWVudC50eXBlID09PSAncXVldWVkX2NvbW1hbmQnICYmXG4gICAgICAgICAgbS5hdHRhY2htZW50LmNvbW1hbmRNb2RlID09PSAndGFzay1ub3RpZmljYXRpb24nICYmXG4gICAgICAgICAgdHlwZW9mIG0uYXR0YWNobWVudC5wcm9tcHQgPT09ICdzdHJpbmcnXG4gICAgICAgICkge1xuICAgICAgICAgIGV4aXN0aW5nUHJvbXB0cy5hZGQobS5hdHRhY2htZW50LnByb21wdClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgdW5pcXVlTm90aWZpY2F0aW9ucyA9IG5vdGlmaWNhdGlvbk1lc3NhZ2VzLmZpbHRlcihcbiAgICAgICAgbSA9PlxuICAgICAgICAgIG0uYXR0YWNobWVudC50eXBlID09PSAncXVldWVkX2NvbW1hbmQnICYmXG4gICAgICAgICAgKHR5cGVvZiBtLmF0dGFjaG1lbnQucHJvbXB0ICE9PSAnc3RyaW5nJyB8fFxuICAgICAgICAgICAgIWV4aXN0aW5nUHJvbXB0cy5oYXMobS5hdHRhY2htZW50LnByb21wdCkpLFxuICAgICAgKVxuXG4gICAgICBzdGFydEJhY2tncm91bmRTZXNzaW9uKHtcbiAgICAgICAgbWVzc2FnZXM6IFsuLi5tZXNzYWdlc1JlZi5jdXJyZW50LCAuLi51bmlxdWVOb3RpZmljYXRpb25zXSxcbiAgICAgICAgcXVlcnlQYXJhbXM6IHtcbiAgICAgICAgICBzeXN0ZW1Qcm9tcHQsXG4gICAgICAgICAgdXNlckNvbnRleHQsXG4gICAgICAgICAgc3lzdGVtQ29udGV4dCxcbiAgICAgICAgICBjYW5Vc2VUb29sLFxuICAgICAgICAgIHRvb2xVc2VDb250ZXh0LFxuICAgICAgICAgIHF1ZXJ5U291cmNlOiBnZXRRdWVyeVNvdXJjZUZvclJFUEwoKSxcbiAgICAgICAgfSxcbiAgICAgICAgZGVzY3JpcHRpb246IHRlcm1pbmFsVGl0bGUsXG4gICAgICAgIHNldEFwcFN0YXRlLFxuICAgICAgICBhZ2VudERlZmluaXRpb246IG1haW5UaHJlYWRBZ2VudERlZmluaXRpb24sXG4gICAgICB9KVxuICAgIH0pKClcbiAgfSwgW1xuICAgIGFib3J0Q29udHJvbGxlcixcbiAgICBtYWluTG9vcE1vZGVsLFxuICAgIHRvb2xQZXJtaXNzaW9uQ29udGV4dCxcbiAgICBtYWluVGhyZWFkQWdlbnREZWZpbml0aW9uLFxuICAgIGdldFRvb2xVc2VDb250ZXh0LFxuICAgIGN1c3RvbVN5c3RlbVByb21wdCxcbiAgICBhcHBlbmRTeXN0ZW1Qcm9tcHQsXG4gICAgY2FuVXNlVG9vbCxcbiAgICBzZXRBcHBTdGF0ZSxcbiAgXSlcblxuICBjb25zdCB7IGhhbmRsZUJhY2tncm91bmRTZXNzaW9uIH0gPSB1c2VTZXNzaW9uQmFja2dyb3VuZGluZyh7XG4gICAgc2V0TWVzc2FnZXMsXG4gICAgc2V0SXNMb2FkaW5nOiBzZXRJc0V4dGVybmFsTG9hZGluZyxcbiAgICByZXNldExvYWRpbmdTdGF0ZSxcbiAgICBzZXRBYm9ydENvbnRyb2xsZXIsXG4gICAgb25CYWNrZ3JvdW5kUXVlcnk6IGhhbmRsZUJhY2tncm91bmRRdWVyeSxcbiAgfSlcblxuICBjb25zdCBvblF1ZXJ5RXZlbnQgPSB1c2VDYWxsYmFjayhcbiAgICAoZXZlbnQ6IFBhcmFtZXRlcnM8dHlwZW9mIGhhbmRsZU1lc3NhZ2VGcm9tU3RyZWFtPlswXSkgPT4ge1xuICAgICAgaGFuZGxlTWVzc2FnZUZyb21TdHJlYW0oXG4gICAgICAgIGV2ZW50LFxuICAgICAgICBuZXdNZXNzYWdlID0+IHtcbiAgICAgICAgICBpZiAoaXNDb21wYWN0Qm91bmRhcnlNZXNzYWdlKG5ld01lc3NhZ2UpKSB7XG4gICAgICAgICAgICAvLyBGdWxsc2NyZWVuOiBrZWVwIHByZS1jb21wYWN0IG1lc3NhZ2VzIGZvciBzY3JvbGxiYWNrLiBxdWVyeS50c1xuICAgICAgICAgICAgLy8gc2xpY2VzIGF0IHRoZSBib3VuZGFyeSBmb3IgQVBJIGNhbGxzLCBNZXNzYWdlcy50c3ggc2tpcHMgdGhlXG4gICAgICAgICAgICAvLyBib3VuZGFyeSBmaWx0ZXIgaW4gZnVsbHNjcmVlbiwgYW5kIHVzZUxvZ01lc3NhZ2VzIHRyZWF0cyB0aGlzXG4gICAgICAgICAgICAvLyBhcyBhbiBpbmNyZW1lbnRhbCBhcHBlbmQgKGZpcnN0IHV1aWQgdW5jaGFuZ2VkKS4gQ2FwIGF0IG9uZVxuICAgICAgICAgICAgLy8gY29tcGFjdC1pbnRlcnZhbCBvZiBzY3JvbGxiYWNrIOKAlCBub3JtYWxpemVNZXNzYWdlcy9hcHBseUdyb3VwaW5nXG4gICAgICAgICAgICAvLyBhcmUgTyhuKSBwZXIgcmVuZGVyLCBzbyBkcm9wIGV2ZXJ5dGhpbmcgYmVmb3JlIHRoZSBwcmV2aW91c1xuICAgICAgICAgICAgLy8gYm91bmRhcnkgdG8ga2VlcCBuIGJvdW5kZWQgYWNyb3NzIG11bHRpLWRheSBzZXNzaW9ucy5cbiAgICAgICAgICAgIGlmIChpc0Z1bGxzY3JlZW5FbnZFbmFibGVkKCkpIHtcbiAgICAgICAgICAgICAgc2V0TWVzc2FnZXMob2xkID0+IFtcbiAgICAgICAgICAgICAgICAuLi5nZXRNZXNzYWdlc0FmdGVyQ29tcGFjdEJvdW5kYXJ5KG9sZCwge1xuICAgICAgICAgICAgICAgICAgaW5jbHVkZVNuaXBwZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgbmV3TWVzc2FnZSxcbiAgICAgICAgICAgICAgXSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHNldE1lc3NhZ2VzKCgpID0+IFtuZXdNZXNzYWdlXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEJ1bXAgY29udmVyc2F0aW9uSWQgc28gTWVzc2FnZXMudHN4IHJvdyBrZXlzIGNoYW5nZSBhbmRcbiAgICAgICAgICAgIC8vIHN0YWxlIG1lbW9pemVkIHJvd3MgcmVtb3VudCB3aXRoIHBvc3QtY29tcGFjdCBjb250ZW50LlxuICAgICAgICAgICAgc2V0Q29udmVyc2F0aW9uSWQocmFuZG9tVVVJRCgpKVxuICAgICAgICAgICAgLy8gQ29tcGFjdGlvbiBzdWNjZWVkZWQg4oCUIGNsZWFyIHRoZSBjb250ZXh0LWJsb2NrZWQgZmxhZyBzbyB0aWNrcyByZXN1bWVcbiAgICAgICAgICAgIGlmIChmZWF0dXJlKCdQUk9BQ1RJVkUnKSB8fCBmZWF0dXJlKCdLQUlST1MnKSkge1xuICAgICAgICAgICAgICBwcm9hY3RpdmVNb2R1bGU/LnNldENvbnRleHRCbG9ja2VkKGZhbHNlKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICBuZXdNZXNzYWdlLnR5cGUgPT09ICdwcm9ncmVzcycgJiZcbiAgICAgICAgICAgIGlzRXBoZW1lcmFsVG9vbFByb2dyZXNzKG5ld01lc3NhZ2UuZGF0YS50eXBlKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgLy8gUmVwbGFjZSB0aGUgcHJldmlvdXMgZXBoZW1lcmFsIHByb2dyZXNzIHRpY2sgZm9yIHRoZSBzYW1lIHRvb2xcbiAgICAgICAgICAgIC8vIGNhbGwgaW5zdGVhZCBvZiBhcHBlbmRpbmcuIFNsZWVwL0Jhc2ggZW1pdCBhIHRpY2sgcGVyIHNlY29uZCBhbmRcbiAgICAgICAgICAgIC8vIG9ubHkgdGhlIGxhc3Qgb25lIGlzIHJlbmRlcmVkOyBhcHBlbmRpbmcgYmxvd3MgdXAgdGhlIG1lc3NhZ2VzXG4gICAgICAgICAgICAvLyBhcnJheSAoMTNrKyBvYnNlcnZlZCkgYW5kIHRoZSB0cmFuc2NyaXB0ICgxMjBNQiBvZiBzbGVlcF9wcm9ncmVzc1xuICAgICAgICAgICAgLy8gbGluZXMpLiB1c2VMb2dNZXNzYWdlcyB0cmFja3MgbGVuZ3RoLCBzbyBzYW1lLWxlbmd0aCByZXBsYWNlbWVudFxuICAgICAgICAgICAgLy8gYWxzbyBza2lwcyB0aGUgdHJhbnNjcmlwdCB3cml0ZS5cbiAgICAgICAgICAgIC8vIGFnZW50X3Byb2dyZXNzIC8gaG9va19wcm9ncmVzcyAvIHNraWxsX3Byb2dyZXNzIGFyZSBOT1QgZXBoZW1lcmFsXG4gICAgICAgICAgICAvLyDigJQgZWFjaCBjYXJyaWVzIGRpc3RpbmN0IHN0YXRlIHRoZSBVSSBuZWVkcyAoZS5nLiBzdWJhZ2VudCB0b29sXG4gICAgICAgICAgICAvLyBoaXN0b3J5KS4gUmVwbGFjaW5nIHRob3NlIGxlYXZlcyB0aGUgQWdlbnRUb29sIFVJIHN0dWNrIGF0XG4gICAgICAgICAgICAvLyBcIkluaXRpYWxpemluZ+KAplwiIGJlY2F1c2UgaXQgcmVuZGVycyB0aGUgZnVsbCBwcm9ncmVzcyB0cmFpbC5cbiAgICAgICAgICAgIHNldE1lc3NhZ2VzKG9sZE1lc3NhZ2VzID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IG9sZE1lc3NhZ2VzLmF0KC0xKVxuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbGFzdD8udHlwZSA9PT0gJ3Byb2dyZXNzJyAmJlxuICAgICAgICAgICAgICAgIGxhc3QucGFyZW50VG9vbFVzZUlEID09PSBuZXdNZXNzYWdlLnBhcmVudFRvb2xVc2VJRCAmJlxuICAgICAgICAgICAgICAgIGxhc3QuZGF0YS50eXBlID09PSBuZXdNZXNzYWdlLmRhdGEudHlwZVxuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb3B5ID0gb2xkTWVzc2FnZXMuc2xpY2UoKVxuICAgICAgICAgICAgICAgIGNvcHlbY29weS5sZW5ndGggLSAxXSA9IG5ld01lc3NhZ2VcbiAgICAgICAgICAgICAgICByZXR1cm4gY29weVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBbLi4ub2xkTWVzc2FnZXMsIG5ld01lc3NhZ2VdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZXRNZXNzYWdlcyhvbGRNZXNzYWdlcyA9PiBbLi4ub2xkTWVzc2FnZXMsIG5ld01lc3NhZ2VdKVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBCbG9jayB0aWNrcyBvbiBBUEkgZXJyb3JzIHRvIHByZXZlbnQgdGljayDihpIgZXJyb3Ig4oaSIHRpY2tcbiAgICAgICAgICAvLyBydW5hd2F5IGxvb3BzIChlLmcuLCBhdXRoIGZhaWx1cmUsIHJhdGUgbGltaXQsIGJsb2NraW5nIGxpbWl0KS5cbiAgICAgICAgICAvLyBDbGVhcmVkIG9uIGNvbXBhY3QgYm91bmRhcnkgKGFib3ZlKSBvciBzdWNjZXNzZnVsIHJlc3BvbnNlIChiZWxvdykuXG4gICAgICAgICAgaWYgKGZlYXR1cmUoJ1BST0FDVElWRScpIHx8IGZlYXR1cmUoJ0tBSVJPUycpKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIG5ld01lc3NhZ2UudHlwZSA9PT0gJ2Fzc2lzdGFudCcgJiZcbiAgICAgICAgICAgICAgJ2lzQXBpRXJyb3JNZXNzYWdlJyBpbiBuZXdNZXNzYWdlICYmXG4gICAgICAgICAgICAgIG5ld01lc3NhZ2UuaXNBcGlFcnJvck1lc3NhZ2VcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBwcm9hY3RpdmVNb2R1bGU/LnNldENvbnRleHRCbG9ja2VkKHRydWUpXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5ld01lc3NhZ2UudHlwZSA9PT0gJ2Fzc2lzdGFudCcpIHtcbiAgICAgICAgICAgICAgcHJvYWN0aXZlTW9kdWxlPy5zZXRDb250ZXh0QmxvY2tlZChmYWxzZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG5ld0NvbnRlbnQgPT4ge1xuICAgICAgICAgIC8vIHNldFJlc3BvbnNlTGVuZ3RoIGhhbmRsZXMgdXBkYXRpbmcgYm90aCByZXNwb25zZUxlbmd0aFJlZiAoZm9yXG4gICAgICAgICAgLy8gc3Bpbm5lciBhbmltYXRpb24pIGFuZCBhcGlNZXRyaWNzUmVmIChlbmRSZXNwb25zZUxlbmd0aC9sYXN0VG9rZW5UaW1lXG4gICAgICAgICAgLy8gZm9yIE9UUFMpLiBObyBzZXBhcmF0ZSBtZXRyaWNzIHVwZGF0ZSBuZWVkZWQgaGVyZS5cbiAgICAgICAgICBzZXRSZXNwb25zZUxlbmd0aChsZW5ndGggPT4gbGVuZ3RoICsgbmV3Q29udGVudC5sZW5ndGgpXG4gICAgICAgIH0sXG4gICAgICAgIHNldFN0cmVhbU1vZGUsXG4gICAgICAgIHNldFN0cmVhbWluZ1Rvb2xVc2VzLFxuICAgICAgICB0b21ic3RvbmVkTWVzc2FnZSA9PiB7XG4gICAgICAgICAgc2V0TWVzc2FnZXMob2xkTWVzc2FnZXMgPT5cbiAgICAgICAgICAgIG9sZE1lc3NhZ2VzLmZpbHRlcihtID0+IG0gIT09IHRvbWJzdG9uZWRNZXNzYWdlKSxcbiAgICAgICAgICApXG4gICAgICAgICAgdm9pZCByZW1vdmVUcmFuc2NyaXB0TWVzc2FnZSh0b21ic3RvbmVkTWVzc2FnZS51dWlkKVxuICAgICAgICB9LFxuICAgICAgICBzZXRTdHJlYW1pbmdUaGlua2luZyxcbiAgICAgICAgbWV0cmljcyA9PiB7XG4gICAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKVxuICAgICAgICAgIGNvbnN0IGJhc2VsaW5lID0gcmVzcG9uc2VMZW5ndGhSZWYuY3VycmVudFxuICAgICAgICAgIGFwaU1ldHJpY3NSZWYuY3VycmVudC5wdXNoKHtcbiAgICAgICAgICAgIC4uLm1ldHJpY3MsXG4gICAgICAgICAgICBmaXJzdFRva2VuVGltZTogbm93LFxuICAgICAgICAgICAgbGFzdFRva2VuVGltZTogbm93LFxuICAgICAgICAgICAgcmVzcG9uc2VMZW5ndGhCYXNlbGluZTogYmFzZWxpbmUsXG4gICAgICAgICAgICBlbmRSZXNwb25zZUxlbmd0aDogYmFzZWxpbmUsXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgb25TdHJlYW1pbmdUZXh0LFxuICAgICAgKVxuICAgIH0sXG4gICAgW1xuICAgICAgc2V0TWVzc2FnZXMsXG4gICAgICBzZXRSZXNwb25zZUxlbmd0aCxcbiAgICAgIHNldFN0cmVhbU1vZGUsXG4gICAgICBzZXRTdHJlYW1pbmdUb29sVXNlcyxcbiAgICAgIHNldFN0cmVhbWluZ1RoaW5raW5nLFxuICAgICAgb25TdHJlYW1pbmdUZXh0LFxuICAgIF0sXG4gIClcblxuICBjb25zdCBvblF1ZXJ5SW1wbCA9IHVzZUNhbGxiYWNrKFxuICAgIGFzeW5jIChcbiAgICAgIG1lc3NhZ2VzSW5jbHVkaW5nTmV3TWVzc2FnZXM6IE1lc3NhZ2VUeXBlW10sXG4gICAgICBuZXdNZXNzYWdlczogTWVzc2FnZVR5cGVbXSxcbiAgICAgIGFib3J0Q29udHJvbGxlcjogQWJvcnRDb250cm9sbGVyLFxuICAgICAgc2hvdWxkUXVlcnk6IGJvb2xlYW4sXG4gICAgICBhZGRpdGlvbmFsQWxsb3dlZFRvb2xzOiBzdHJpbmdbXSxcbiAgICAgIG1haW5Mb29wTW9kZWxQYXJhbTogc3RyaW5nLFxuICAgICAgZWZmb3J0PzogRWZmb3J0VmFsdWUsXG4gICAgKSA9PiB7XG4gICAgICAvLyBQcmVwYXJlIElERSBpbnRlZ3JhdGlvbiBmb3IgbmV3IHByb21wdC4gUmVhZCBtY3BDbGllbnRzIGZyZXNoIGZyb21cbiAgICAgIC8vIHN0b3JlIOKAlCB1c2VNYW5hZ2VNQ1BDb25uZWN0aW9ucyBtYXkgaGF2ZSBwb3B1bGF0ZWQgaXQgc2luY2UgdGhlXG4gICAgICAvLyByZW5kZXIgdGhhdCBjYXB0dXJlZCB0aGlzIGNsb3N1cmUgKHNhbWUgcGF0dGVybiBhcyBjb21wdXRlVG9vbHMpLlxuICAgICAgaWYgKHNob3VsZFF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGZyZXNoQ2xpZW50cyA9IG1lcmdlQ2xpZW50cyhcbiAgICAgICAgICBpbml0aWFsTWNwQ2xpZW50cyxcbiAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLm1jcC5jbGllbnRzLFxuICAgICAgICApXG4gICAgICAgIHZvaWQgZGlhZ25vc3RpY1RyYWNrZXIuaGFuZGxlUXVlcnlTdGFydChmcmVzaENsaWVudHMpXG4gICAgICAgIGNvbnN0IGlkZUNsaWVudCA9IGdldENvbm5lY3RlZElkZUNsaWVudChmcmVzaENsaWVudHMpXG4gICAgICAgIGlmIChpZGVDbGllbnQpIHtcbiAgICAgICAgICB2b2lkIGNsb3NlT3BlbkRpZmZzKGlkZUNsaWVudClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBNYXJrIG9uYm9hcmRpbmcgYXMgY29tcGxldGUgd2hlbiBhbnkgdXNlciBtZXNzYWdlIGlzIHNlbnQgdG8gQ2xhdWRlXG4gICAgICB2b2lkIG1heWJlTWFya1Byb2plY3RPbmJvYXJkaW5nQ29tcGxldGUoKVxuXG4gICAgICAvLyBFeHRyYWN0IGEgc2Vzc2lvbiB0aXRsZSBmcm9tIHRoZSBmaXJzdCByZWFsIHVzZXIgbWVzc2FnZS4gT25lLXNob3RcbiAgICAgIC8vIHZpYSByZWYgKHdhcyB0ZW5ndV9iaXJjaF9taXN0IGV4cGVyaW1lbnQ6IGZpcnN0LW1lc3NhZ2Utb25seSB0byBzYXZlXG4gICAgICAvLyBIYWlrdSBjYWxscykuIFRoZSByZWYgcmVwbGFjZXMgdGhlIG9sZCBgbWVzc2FnZXMubGVuZ3RoIDw9IDFgIGNoZWNrLFxuICAgICAgLy8gd2hpY2ggd2FzIGJyb2tlbiBieSBTZXNzaW9uU3RhcnQgaG9vayBtZXNzYWdlcyAocHJlcGVuZGVkIHZpYVxuICAgICAgLy8gdXNlRGVmZXJyZWRIb29rTWVzc2FnZXMpIGFuZCBhdHRhY2htZW50IG1lc3NhZ2VzIChhcHBlbmRlZCBieVxuICAgICAgLy8gcHJvY2Vzc1RleHRQcm9tcHQpIOKAlCBib3RoIHB1c2hlZCBsZW5ndGggcGFzdCAxIG9uIHR1cm4gb25lLCBzbyB0aGVcbiAgICAgIC8vIHRpdGxlIHNpbGVudGx5IGZlbGwgdGhyb3VnaCB0byB0aGUgXCJDbGF1ZGUgQ29kZVwiIGRlZmF1bHQuXG4gICAgICBpZiAoXG4gICAgICAgICF0aXRsZURpc2FibGVkICYmXG4gICAgICAgICFzZXNzaW9uVGl0bGUgJiZcbiAgICAgICAgIWFnZW50VGl0bGUgJiZcbiAgICAgICAgIWhhaWt1VGl0bGVBdHRlbXB0ZWRSZWYuY3VycmVudFxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IGZpcnN0VXNlck1lc3NhZ2UgPSBuZXdNZXNzYWdlcy5maW5kKFxuICAgICAgICAgIG0gPT4gbS50eXBlID09PSAndXNlcicgJiYgIW0uaXNNZXRhLFxuICAgICAgICApXG4gICAgICAgIGNvbnN0IHRleHQgPVxuICAgICAgICAgIGZpcnN0VXNlck1lc3NhZ2U/LnR5cGUgPT09ICd1c2VyJ1xuICAgICAgICAgICAgPyBnZXRDb250ZW50VGV4dChmaXJzdFVzZXJNZXNzYWdlLm1lc3NhZ2UuY29udGVudClcbiAgICAgICAgICAgIDogbnVsbFxuICAgICAgICAvLyBTa2lwIHN5bnRoZXRpYyBicmVhZGNydW1icyDigJQgc2xhc2gtY29tbWFuZCBvdXRwdXQsIHByb21wdC1za2lsbFxuICAgICAgICAvLyBleHBhbnNpb25zICgvY29tbWl0IOKGkiA8Y29tbWFuZC1tZXNzYWdlPiksIGxvY2FsLWNvbW1hbmQgaGVhZGVyc1xuICAgICAgICAvLyAoL2hlbHAg4oaSIDxjb21tYW5kLW5hbWU+KSwgYW5kIGJhc2gtbW9kZSAoIWNtZCDihpIgPGJhc2gtaW5wdXQ+KS5cbiAgICAgICAgLy8gTm9uZSBvZiB0aGVzZSBhcmUgdGhlIHVzZXIncyB0b3BpYzsgd2FpdCBmb3IgcmVhbCBwcm9zZS5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRleHQgJiZcbiAgICAgICAgICAhdGV4dC5zdGFydHNXaXRoKGA8JHtMT0NBTF9DT01NQU5EX1NURE9VVF9UQUd9PmApICYmXG4gICAgICAgICAgIXRleHQuc3RhcnRzV2l0aChgPCR7Q09NTUFORF9NRVNTQUdFX1RBR30+YCkgJiZcbiAgICAgICAgICAhdGV4dC5zdGFydHNXaXRoKGA8JHtDT01NQU5EX05BTUVfVEFHfT5gKSAmJlxuICAgICAgICAgICF0ZXh0LnN0YXJ0c1dpdGgoYDwke0JBU0hfSU5QVVRfVEFHfT5gKVxuICAgICAgICApIHtcbiAgICAgICAgICBoYWlrdVRpdGxlQXR0ZW1wdGVkUmVmLmN1cnJlbnQgPSB0cnVlXG4gICAgICAgICAgdm9pZCBnZW5lcmF0ZVNlc3Npb25UaXRsZSh0ZXh0LCBuZXcgQWJvcnRDb250cm9sbGVyKCkuc2lnbmFsKS50aGVuKFxuICAgICAgICAgICAgdGl0bGUgPT4ge1xuICAgICAgICAgICAgICBpZiAodGl0bGUpIHNldEhhaWt1VGl0bGUodGl0bGUpXG4gICAgICAgICAgICAgIGVsc2UgaGFpa3VUaXRsZUF0dGVtcHRlZFJlZi5jdXJyZW50ID0gZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgIGhhaWt1VGl0bGVBdHRlbXB0ZWRSZWYuY3VycmVudCA9IGZhbHNlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBBcHBseSBzbGFzaC1jb21tYW5kLXNjb3BlZCBhbGxvd2VkVG9vbHMgKGZyb20gc2tpbGwgZnJvbnRtYXR0ZXIpIHRvIHRoZVxuICAgICAgLy8gc3RvcmUgb25jZSBwZXIgdHVybi4gVGhpcyBhbHNvIGNvdmVycyB0aGUgcmVzZXQ6IHRoZSBuZXh0IG5vbi1za2lsbCB0dXJuXG4gICAgICAvLyBwYXNzZXMgW10gYW5kIGNsZWFycyBpdC4gTXVzdCBydW4gYmVmb3JlIHRoZSAhc2hvdWxkUXVlcnkgZ2F0ZTogZm9ya2VkXG4gICAgICAvLyBjb21tYW5kcyAoZXhlY3V0ZUZvcmtlZFNsYXNoQ29tbWFuZCkgcmV0dXJuIHNob3VsZFF1ZXJ5PWZhbHNlLCBhbmRcbiAgICAgIC8vIGNyZWF0ZUdldEFwcFN0YXRlV2l0aEFsbG93ZWRUb29scyBpbiBmb3JrZWRBZ2VudC50cyByZWFkcyB0aGlzIGZpZWxkLCBzb1xuICAgICAgLy8gc3RhbGUgc2tpbGwgdG9vbHMgd291bGQgb3RoZXJ3aXNlIGxlYWsgaW50byBmb3JrZWQgYWdlbnQgcGVybWlzc2lvbnMuXG4gICAgICAvLyBQcmV2aW91c2x5IHRoaXMgd3JpdGUgd2FzIGhpZGRlbiBpbnNpZGUgZ2V0VG9vbFVzZUNvbnRleHQncyBnZXRBcHBTdGF0ZVxuICAgICAgLy8gKH44NSBjYWxscy90dXJuKTsgaG9pc3RpbmcgaXQgaGVyZSBtYWtlcyBnZXRBcHBTdGF0ZSBhIHB1cmUgcmVhZCBhbmQgc3RvcHNcbiAgICAgIC8vIGVwaGVtZXJhbCBjb250ZXh0cyAocGVybWlzc2lvbiBkaWFsb2csIEJhY2tncm91bmRUYXNrc0RpYWxvZykgZnJvbVxuICAgICAgLy8gYWNjaWRlbnRhbGx5IGNsZWFyaW5nIGl0IG1pZC10dXJuLlxuICAgICAgc3RvcmUuc2V0U3RhdGUocHJldiA9PiB7XG4gICAgICAgIGNvbnN0IGN1ciA9IHByZXYudG9vbFBlcm1pc3Npb25Db250ZXh0LmFsd2F5c0FsbG93UnVsZXMuY29tbWFuZFxuICAgICAgICBpZiAoXG4gICAgICAgICAgY3VyID09PSBhZGRpdGlvbmFsQWxsb3dlZFRvb2xzIHx8XG4gICAgICAgICAgKGN1cj8ubGVuZ3RoID09PSBhZGRpdGlvbmFsQWxsb3dlZFRvb2xzLmxlbmd0aCAmJlxuICAgICAgICAgICAgY3VyLmV2ZXJ5KCh2LCBpKSA9PiB2ID09PSBhZGRpdGlvbmFsQWxsb3dlZFRvb2xzW2ldKSlcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuIHByZXZcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgdG9vbFBlcm1pc3Npb25Db250ZXh0OiB7XG4gICAgICAgICAgICAuLi5wcmV2LnRvb2xQZXJtaXNzaW9uQ29udGV4dCxcbiAgICAgICAgICAgIGFsd2F5c0FsbG93UnVsZXM6IHtcbiAgICAgICAgICAgICAgLi4ucHJldi50b29sUGVybWlzc2lvbkNvbnRleHQuYWx3YXlzQWxsb3dSdWxlcyxcbiAgICAgICAgICAgICAgY29tbWFuZDogYWRkaXRpb25hbEFsbG93ZWRUb29scyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgLy8gVGhlIGxhc3QgbWVzc2FnZSBpcyBhbiBhc3Npc3RhbnQgbWVzc2FnZSBpZiB0aGUgdXNlciBpbnB1dCB3YXMgYSBiYXNoIGNvbW1hbmQsXG4gICAgICAvLyBvciBpZiB0aGUgdXNlciBpbnB1dCB3YXMgYW4gaW52YWxpZCBzbGFzaCBjb21tYW5kLlxuICAgICAgaWYgKCFzaG91bGRRdWVyeSkge1xuICAgICAgICAvLyBNYW51YWwgL2NvbXBhY3Qgc2V0cyBtZXNzYWdlcyBkaXJlY3RseSAoc2hvdWxkUXVlcnk9ZmFsc2UpIGJ5cGFzc2luZ1xuICAgICAgICAvLyBoYW5kbGVNZXNzYWdlRnJvbVN0cmVhbS4gQ2xlYXIgY29udGV4dC1ibG9ja2VkIGlmIGEgY29tcGFjdCBib3VuZGFyeVxuICAgICAgICAvLyBpcyBwcmVzZW50IHNvIHByb2FjdGl2ZSB0aWNrcyByZXN1bWUgYWZ0ZXIgY29tcGFjdGlvbi5cbiAgICAgICAgaWYgKG5ld01lc3NhZ2VzLnNvbWUoaXNDb21wYWN0Qm91bmRhcnlNZXNzYWdlKSkge1xuICAgICAgICAgIC8vIEJ1bXAgY29udmVyc2F0aW9uSWQgc28gTWVzc2FnZXMudHN4IHJvdyBrZXlzIGNoYW5nZSBhbmRcbiAgICAgICAgICAvLyBzdGFsZSBtZW1vaXplZCByb3dzIHJlbW91bnQgd2l0aCBwb3N0LWNvbXBhY3QgY29udGVudC5cbiAgICAgICAgICBzZXRDb252ZXJzYXRpb25JZChyYW5kb21VVUlEKCkpXG4gICAgICAgICAgaWYgKGZlYXR1cmUoJ1BST0FDVElWRScpIHx8IGZlYXR1cmUoJ0tBSVJPUycpKSB7XG4gICAgICAgICAgICBwcm9hY3RpdmVNb2R1bGU/LnNldENvbnRleHRCbG9ja2VkKGZhbHNlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXNldExvYWRpbmdTdGF0ZSgpXG4gICAgICAgIHNldEFib3J0Q29udHJvbGxlcihudWxsKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgY29uc3QgdG9vbFVzZUNvbnRleHQgPSBnZXRUb29sVXNlQ29udGV4dChcbiAgICAgICAgbWVzc2FnZXNJbmNsdWRpbmdOZXdNZXNzYWdlcyxcbiAgICAgICAgbmV3TWVzc2FnZXMsXG4gICAgICAgIGFib3J0Q29udHJvbGxlcixcbiAgICAgICAgbWFpbkxvb3BNb2RlbFBhcmFtLFxuICAgICAgKVxuICAgICAgLy8gZ2V0VG9vbFVzZUNvbnRleHQgcmVhZHMgdG9vbHMvbWNwQ2xpZW50cyBmcmVzaCBmcm9tIHN0b3JlLmdldFN0YXRlKClcbiAgICAgIC8vICh2aWEgY29tcHV0ZVRvb2xzL21lcmdlQ2xpZW50cykuIFVzZSB0aG9zZSByYXRoZXIgdGhhbiB0aGUgY2xvc3VyZS1cbiAgICAgIC8vIGNhcHR1cmVkIGB0b29sc2AvYG1jcENsaWVudHNgIOKAlCB1c2VNYW5hZ2VNQ1BDb25uZWN0aW9ucyBtYXkgaGF2ZVxuICAgICAgLy8gZmx1c2hlZCBuZXcgTUNQIHN0YXRlIGJldHdlZW4gdGhlIHJlbmRlciB0aGF0IGNhcHR1cmVkIHRoaXMgY2xvc3VyZVxuICAgICAgLy8gYW5kIG5vdy4gVHVybiAxIHZpYSBwcm9jZXNzSW5pdGlhbE1lc3NhZ2UgaXMgdGhlIG1haW4gYmVuZWZpY2lhcnkuXG4gICAgICBjb25zdCB7IHRvb2xzOiBmcmVzaFRvb2xzLCBtY3BDbGllbnRzOiBmcmVzaE1jcENsaWVudHMgfSA9XG4gICAgICAgIHRvb2xVc2VDb250ZXh0Lm9wdGlvbnNcblxuICAgICAgLy8gU2NvcGUgdGhlIHNraWxsJ3MgZWZmb3J0IG92ZXJyaWRlIHRvIHRoaXMgdHVybidzIGNvbnRleHQgb25seSDigJRcbiAgICAgIC8vIHdyYXBwaW5nIGdldEFwcFN0YXRlIGtlZXBzIHRoZSBvdmVycmlkZSBvdXQgb2YgdGhlIGdsb2JhbCBzdG9yZSBzb1xuICAgICAgLy8gYmFja2dyb3VuZCBhZ2VudHMgYW5kIFVJIHN1YnNjcmliZXJzIChTcGlubmVyLCBMb2dvVjIpIG5ldmVyIHNlZSBpdC5cbiAgICAgIGlmIChlZmZvcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBwcmV2aW91c0dldEFwcFN0YXRlID0gdG9vbFVzZUNvbnRleHQuZ2V0QXBwU3RhdGVcbiAgICAgICAgdG9vbFVzZUNvbnRleHQuZ2V0QXBwU3RhdGUgPSAoKSA9PiAoe1xuICAgICAgICAgIC4uLnByZXZpb3VzR2V0QXBwU3RhdGUoKSxcbiAgICAgICAgICBlZmZvcnRWYWx1ZTogZWZmb3J0LFxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBxdWVyeUNoZWNrcG9pbnQoJ3F1ZXJ5X2NvbnRleHRfbG9hZGluZ19zdGFydCcpXG4gICAgICBjb25zdCBbLCAsIGRlZmF1bHRTeXN0ZW1Qcm9tcHQsIGJhc2VVc2VyQ29udGV4dCwgc3lzdGVtQ29udGV4dF0gPVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgLy8gSU1QT1JUQU5UOiBkbyB0aGlzIGFmdGVyIHNldE1lc3NhZ2VzKCkgYWJvdmUsIHRvIGF2b2lkIFVJIGphbmtcbiAgICAgICAgICBjaGVja0FuZERpc2FibGVCeXBhc3NQZXJtaXNzaW9uc0lmTmVlZGVkKFxuICAgICAgICAgICAgdG9vbFBlcm1pc3Npb25Db250ZXh0LFxuICAgICAgICAgICAgc2V0QXBwU3RhdGUsXG4gICAgICAgICAgKSxcbiAgICAgICAgICAvLyBHYXRlZCBvbiBUUkFOU0NSSVBUX0NMQVNTSUZJRVIgc28gR3Jvd3RoQm9vayBraWxsIHN3aXRjaCBydW5zIHdoZXJldmVyIGF1dG8gbW9kZSBpcyBidWlsdCBpblxuICAgICAgICAgIGZlYXR1cmUoJ1RSQU5TQ1JJUFRfQ0xBU1NJRklFUicpXG4gICAgICAgICAgICA/IGNoZWNrQW5kRGlzYWJsZUF1dG9Nb2RlSWZOZWVkZWQoXG4gICAgICAgICAgICAgICAgdG9vbFBlcm1pc3Npb25Db250ZXh0LFxuICAgICAgICAgICAgICAgIHNldEFwcFN0YXRlLFxuICAgICAgICAgICAgICAgIHN0b3JlLmdldFN0YXRlKCkuZmFzdE1vZGUsXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGdldFN5c3RlbVByb21wdChcbiAgICAgICAgICAgIGZyZXNoVG9vbHMsXG4gICAgICAgICAgICBtYWluTG9vcE1vZGVsUGFyYW0sXG4gICAgICAgICAgICBBcnJheS5mcm9tKFxuICAgICAgICAgICAgICB0b29sUGVybWlzc2lvbkNvbnRleHQuYWRkaXRpb25hbFdvcmtpbmdEaXJlY3Rvcmllcy5rZXlzKCksXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgZnJlc2hNY3BDbGllbnRzLFxuICAgICAgICAgICksXG4gICAgICAgICAgZ2V0VXNlckNvbnRleHQoKSxcbiAgICAgICAgICBnZXRTeXN0ZW1Db250ZXh0KCksXG4gICAgICAgIF0pXG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IHtcbiAgICAgICAgLi4uYmFzZVVzZXJDb250ZXh0LFxuICAgICAgICAuLi5nZXRDb29yZGluYXRvclVzZXJDb250ZXh0KFxuICAgICAgICAgIGZyZXNoTWNwQ2xpZW50cyxcbiAgICAgICAgICBpc1NjcmF0Y2hwYWRFbmFibGVkKCkgPyBnZXRTY3JhdGNocGFkRGlyKCkgOiB1bmRlZmluZWQsXG4gICAgICAgICksXG4gICAgICAgIC4uLigoZmVhdHVyZSgnUFJPQUNUSVZFJykgfHwgZmVhdHVyZSgnS0FJUk9TJykpICYmXG4gICAgICAgIHByb2FjdGl2ZU1vZHVsZT8uaXNQcm9hY3RpdmVBY3RpdmUoKSAmJlxuICAgICAgICAhdGVybWluYWxGb2N1c1JlZi5jdXJyZW50XG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIHRlcm1pbmFsRm9jdXM6XG4gICAgICAgICAgICAgICAgJ1RoZSB0ZXJtaW5hbCBpcyB1bmZvY3VzZWQgXFx1MjAxNCB0aGUgdXNlciBpcyBub3QgYWN0aXZlbHkgd2F0Y2hpbmcuJyxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IHt9KSxcbiAgICAgIH1cbiAgICAgIHF1ZXJ5Q2hlY2twb2ludCgncXVlcnlfY29udGV4dF9sb2FkaW5nX2VuZCcpXG5cbiAgICAgIGNvbnN0IHN5c3RlbVByb21wdCA9IGJ1aWxkRWZmZWN0aXZlU3lzdGVtUHJvbXB0KHtcbiAgICAgICAgbWFpblRocmVhZEFnZW50RGVmaW5pdGlvbixcbiAgICAgICAgdG9vbFVzZUNvbnRleHQsXG4gICAgICAgIGN1c3RvbVN5c3RlbVByb21wdCxcbiAgICAgICAgZGVmYXVsdFN5c3RlbVByb21wdCxcbiAgICAgICAgYXBwZW5kU3lzdGVtUHJvbXB0LFxuICAgICAgfSlcbiAgICAgIHRvb2xVc2VDb250ZXh0LnJlbmRlcmVkU3lzdGVtUHJvbXB0ID0gc3lzdGVtUHJvbXB0XG5cbiAgICAgIHF1ZXJ5Q2hlY2twb2ludCgncXVlcnlfcXVlcnlfc3RhcnQnKVxuICAgICAgcmVzZXRUdXJuSG9va0R1cmF0aW9uKClcbiAgICAgIHJlc2V0VHVyblRvb2xEdXJhdGlvbigpXG4gICAgICByZXNldFR1cm5DbGFzc2lmaWVyRHVyYXRpb24oKVxuXG4gICAgICBmb3IgYXdhaXQgKGNvbnN0IGV2ZW50IG9mIHF1ZXJ5KHtcbiAgICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzSW5jbHVkaW5nTmV3TWVzc2FnZXMsXG4gICAgICAgIHN5c3RlbVByb21wdCxcbiAgICAgICAgdXNlckNvbnRleHQsXG4gICAgICAgIHN5c3RlbUNvbnRleHQsXG4gICAgICAgIGNhblVzZVRvb2wsXG4gICAgICAgIHRvb2xVc2VDb250ZXh0LFxuICAgICAgICBxdWVyeVNvdXJjZTogZ2V0UXVlcnlTb3VyY2VGb3JSRVBMKCksXG4gICAgICB9KSkge1xuICAgICAgICBvblF1ZXJ5RXZlbnQoZXZlbnQpXG4gICAgICB9XG5cblxuICAgICAgaWYgKGZlYXR1cmUoJ0JVRERZJykpIHtcbiAgICAgICAgdm9pZCBmaXJlQ29tcGFuaW9uT2JzZXJ2ZXIobWVzc2FnZXNSZWYuY3VycmVudCwgcmVhY3Rpb24gPT5cbiAgICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+XG4gICAgICAgICAgICBwcmV2LmNvbXBhbmlvblJlYWN0aW9uID09PSByZWFjdGlvblxuICAgICAgICAgICAgICA/IHByZXZcbiAgICAgICAgICAgICAgOiB7IC4uLnByZXYsIGNvbXBhbmlvblJlYWN0aW9uOiByZWFjdGlvbiB9LFxuICAgICAgICAgICksXG4gICAgICAgIClcbiAgICAgIH1cblxuICAgICAgcXVlcnlDaGVja3BvaW50KCdxdWVyeV9lbmQnKVxuXG4gICAgICAvLyBDYXB0dXJlIGFudC1vbmx5IEFQSSBtZXRyaWNzIGJlZm9yZSByZXNldExvYWRpbmdTdGF0ZSBjbGVhcnMgdGhlIHJlZi5cbiAgICAgIC8vIEZvciBtdWx0aS1yZXF1ZXN0IHR1cm5zICh0b29sIHVzZSBsb29wcyksIGNvbXB1dGUgUDUwIGFjcm9zcyBhbGwgcmVxdWVzdHMuXG4gICAgICBpZiAoXCJleHRlcm5hbFwiID09PSAnYW50JyAmJiBhcGlNZXRyaWNzUmVmLmN1cnJlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBlbnRyaWVzID0gYXBpTWV0cmljc1JlZi5jdXJyZW50XG5cbiAgICAgICAgY29uc3QgdHRmdHMgPSBlbnRyaWVzLm1hcChlID0+IGUudHRmdE1zKVxuICAgICAgICAvLyBDb21wdXRlIHBlci1yZXF1ZXN0IE9UUFMgdXNpbmcgb25seSBhY3RpdmUgc3RyZWFtaW5nIHRpbWUgYW5kXG4gICAgICAgIC8vIHN0cmVhbWluZy1vbmx5IGNvbnRlbnQuIGVuZFJlc3BvbnNlTGVuZ3RoIHRyYWNrcyBjb250ZW50IGFkZGVkIGJ5XG4gICAgICAgIC8vIHN0cmVhbWluZyBkZWx0YXMgb25seSwgZXhjbHVkaW5nIHN1YmFnZW50L2NvbXBhY3Rpb24gaW5mbGF0aW9uLlxuICAgICAgICBjb25zdCBvdHBzVmFsdWVzID0gZW50cmllcy5tYXAoZSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVsdGEgPSBNYXRoLnJvdW5kKFxuICAgICAgICAgICAgKGUuZW5kUmVzcG9uc2VMZW5ndGggLSBlLnJlc3BvbnNlTGVuZ3RoQmFzZWxpbmUpIC8gNCxcbiAgICAgICAgICApXG4gICAgICAgICAgY29uc3Qgc2FtcGxpbmdNcyA9IGUubGFzdFRva2VuVGltZSAtIGUuZmlyc3RUb2tlblRpbWVcbiAgICAgICAgICByZXR1cm4gc2FtcGxpbmdNcyA+IDAgPyBNYXRoLnJvdW5kKGRlbHRhIC8gKHNhbXBsaW5nTXMgLyAxMDAwKSkgOiAwXG4gICAgICAgIH0pXG5cbiAgICAgICAgY29uc3QgaXNNdWx0aVJlcXVlc3QgPSBlbnRyaWVzLmxlbmd0aCA+IDFcbiAgICAgICAgY29uc3QgaG9va01zID0gZ2V0VHVybkhvb2tEdXJhdGlvbk1zKClcbiAgICAgICAgY29uc3QgaG9va0NvdW50ID0gZ2V0VHVybkhvb2tDb3VudCgpXG4gICAgICAgIGNvbnN0IHRvb2xNcyA9IGdldFR1cm5Ub29sRHVyYXRpb25NcygpXG4gICAgICAgIGNvbnN0IHRvb2xDb3VudCA9IGdldFR1cm5Ub29sQ291bnQoKVxuICAgICAgICBjb25zdCBjbGFzc2lmaWVyTXMgPSBnZXRUdXJuQ2xhc3NpZmllckR1cmF0aW9uTXMoKVxuICAgICAgICBjb25zdCBjbGFzc2lmaWVyQ291bnQgPSBnZXRUdXJuQ2xhc3NpZmllckNvdW50KClcbiAgICAgICAgY29uc3QgdHVybk1zID0gRGF0ZS5ub3coKSAtIGxvYWRpbmdTdGFydFRpbWVSZWYuY3VycmVudFxuICAgICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFtcbiAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgIGNyZWF0ZUFwaU1ldHJpY3NNZXNzYWdlKHtcbiAgICAgICAgICAgIHR0ZnRNczogaXNNdWx0aVJlcXVlc3QgPyBtZWRpYW4odHRmdHMpIDogdHRmdHNbMF0hLFxuICAgICAgICAgICAgb3RwczogaXNNdWx0aVJlcXVlc3QgPyBtZWRpYW4ob3Rwc1ZhbHVlcykgOiBvdHBzVmFsdWVzWzBdISxcbiAgICAgICAgICAgIGlzUDUwOiBpc011bHRpUmVxdWVzdCxcbiAgICAgICAgICAgIGhvb2tEdXJhdGlvbk1zOiBob29rTXMgPiAwID8gaG9va01zIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgaG9va0NvdW50OiBob29rQ291bnQgPiAwID8gaG9va0NvdW50IDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgdHVybkR1cmF0aW9uTXM6IHR1cm5NcyA+IDAgPyB0dXJuTXMgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICB0b29sRHVyYXRpb25NczogdG9vbE1zID4gMCA/IHRvb2xNcyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHRvb2xDb3VudDogdG9vbENvdW50ID4gMCA/IHRvb2xDb3VudCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGNsYXNzaWZpZXJEdXJhdGlvbk1zOiBjbGFzc2lmaWVyTXMgPiAwID8gY2xhc3NpZmllck1zIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgY2xhc3NpZmllckNvdW50OiBjbGFzc2lmaWVyQ291bnQgPiAwID8gY2xhc3NpZmllckNvdW50IDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgY29uZmlnV3JpdGVDb3VudDogZ2V0R2xvYmFsQ29uZmlnV3JpdGVDb3VudCgpLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdKVxuICAgICAgfVxuXG4gICAgICByZXNldExvYWRpbmdTdGF0ZSgpXG5cbiAgICAgIC8vIExvZyBxdWVyeSBwcm9maWxpbmcgcmVwb3J0IGlmIGVuYWJsZWRcbiAgICAgIGxvZ1F1ZXJ5UHJvZmlsZVJlcG9ydCgpXG5cbiAgICAgIC8vIFNpZ25hbCB0aGF0IGEgcXVlcnkgdHVybiBoYXMgY29tcGxldGVkIHN1Y2Nlc3NmdWxseVxuICAgICAgYXdhaXQgb25UdXJuQ29tcGxldGU/LihtZXNzYWdlc1JlZi5jdXJyZW50KVxuICAgIH0sXG4gICAgW1xuICAgICAgaW5pdGlhbE1jcENsaWVudHMsXG4gICAgICByZXNldExvYWRpbmdTdGF0ZSxcbiAgICAgIGdldFRvb2xVc2VDb250ZXh0LFxuICAgICAgdG9vbFBlcm1pc3Npb25Db250ZXh0LFxuICAgICAgc2V0QXBwU3RhdGUsXG4gICAgICBjdXN0b21TeXN0ZW1Qcm9tcHQsXG4gICAgICBvblR1cm5Db21wbGV0ZSxcbiAgICAgIGFwcGVuZFN5c3RlbVByb21wdCxcbiAgICAgIGNhblVzZVRvb2wsXG4gICAgICBtYWluVGhyZWFkQWdlbnREZWZpbml0aW9uLFxuICAgICAgb25RdWVyeUV2ZW50LFxuICAgICAgc2Vzc2lvblRpdGxlLFxuICAgICAgdGl0bGVEaXNhYmxlZCxcbiAgICBdLFxuICApXG5cbiAgY29uc3Qgb25RdWVyeSA9IHVzZUNhbGxiYWNrKFxuICAgIGFzeW5jIChcbiAgICAgIG5ld01lc3NhZ2VzOiBNZXNzYWdlVHlwZVtdLFxuICAgICAgYWJvcnRDb250cm9sbGVyOiBBYm9ydENvbnRyb2xsZXIsXG4gICAgICBzaG91bGRRdWVyeTogYm9vbGVhbixcbiAgICAgIGFkZGl0aW9uYWxBbGxvd2VkVG9vbHM6IHN0cmluZ1tdLFxuICAgICAgbWFpbkxvb3BNb2RlbFBhcmFtOiBzdHJpbmcsXG4gICAgICBvbkJlZm9yZVF1ZXJ5Q2FsbGJhY2s/OiAoXG4gICAgICAgIGlucHV0OiBzdHJpbmcsXG4gICAgICAgIG5ld01lc3NhZ2VzOiBNZXNzYWdlVHlwZVtdLFxuICAgICAgKSA9PiBQcm9taXNlPGJvb2xlYW4+LFxuICAgICAgaW5wdXQ/OiBzdHJpbmcsXG4gICAgICBlZmZvcnQ/OiBFZmZvcnRWYWx1ZSxcbiAgICApOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgIC8vIElmIHRoaXMgaXMgYSB0ZWFtbWF0ZSwgbWFyayB0aGVtIGFzIGFjdGl2ZSB3aGVuIHN0YXJ0aW5nIGEgdHVyblxuICAgICAgaWYgKGlzQWdlbnRTd2FybXNFbmFibGVkKCkpIHtcbiAgICAgICAgY29uc3QgdGVhbU5hbWUgPSBnZXRUZWFtTmFtZSgpXG4gICAgICAgIGNvbnN0IGFnZW50TmFtZSA9IGdldEFnZW50TmFtZSgpXG4gICAgICAgIGlmICh0ZWFtTmFtZSAmJiBhZ2VudE5hbWUpIHtcbiAgICAgICAgICAvLyBGaXJlIGFuZCBmb3JnZXQgLSB0dXJuIHN0YXJ0cyBpbW1lZGlhdGVseSwgd3JpdGUgaGFwcGVucyBpbiBiYWNrZ3JvdW5kXG4gICAgICAgICAgdm9pZCBzZXRNZW1iZXJBY3RpdmUodGVhbU5hbWUsIGFnZW50TmFtZSwgdHJ1ZSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDb25jdXJyZW50IGd1YXJkIHZpYSBzdGF0ZSBtYWNoaW5lLiB0cnlTdGFydCgpIGF0b21pY2FsbHkgY2hlY2tzXG4gICAgICAvLyBhbmQgdHJhbnNpdGlvbnMgaWRsZeKGknJ1bm5pbmcsIHJldHVybmluZyB0aGUgZ2VuZXJhdGlvbiBudW1iZXIuXG4gICAgICAvLyBSZXR1cm5zIG51bGwgaWYgYWxyZWFkeSBydW5uaW5nIOKAlCBubyBzZXBhcmF0ZSBjaGVjay10aGVuLXNldC5cbiAgICAgIGNvbnN0IHRoaXNHZW5lcmF0aW9uID0gcXVlcnlHdWFyZC50cnlTdGFydCgpXG4gICAgICBpZiAodGhpc0dlbmVyYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgbG9nRXZlbnQoJ3Rlbmd1X2NvbmN1cnJlbnRfb25xdWVyeV9kZXRlY3RlZCcsIHt9KVxuXG4gICAgICAgIC8vIEV4dHJhY3QgYW5kIGVucXVldWUgdXNlciBtZXNzYWdlIHRleHQsIHNraXBwaW5nIG1ldGEgbWVzc2FnZXNcbiAgICAgICAgLy8gKGUuZy4gZXhwYW5kZWQgc2tpbGwgY29udGVudCwgdGljayBwcm9tcHRzKSB0aGF0IHNob3VsZCBub3QgYmVcbiAgICAgICAgLy8gcmVwbGF5ZWQgYXMgdXNlci12aXNpYmxlIHRleHQuXG4gICAgICAgIG5ld01lc3NhZ2VzXG4gICAgICAgICAgLmZpbHRlcigobSk6IG0gaXMgVXNlck1lc3NhZ2UgPT4gbS50eXBlID09PSAndXNlcicgJiYgIW0uaXNNZXRhKVxuICAgICAgICAgIC5tYXAoXyA9PiBnZXRDb250ZW50VGV4dChfLm1lc3NhZ2UuY29udGVudCkpXG4gICAgICAgICAgLmZpbHRlcihfID0+IF8gIT09IG51bGwpXG4gICAgICAgICAgLmZvckVhY2goKG1zZywgaSkgPT4ge1xuICAgICAgICAgICAgZW5xdWV1ZSh7IHZhbHVlOiBtc2csIG1vZGU6ICdwcm9tcHQnIH0pXG4gICAgICAgICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgICAgICBsb2dFdmVudCgndGVuZ3VfY29uY3VycmVudF9vbnF1ZXJ5X2VucXVldWVkJywge30pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIGlzTG9hZGluZyBpcyBkZXJpdmVkIGZyb20gcXVlcnlHdWFyZCDigJQgdHJ5U3RhcnQoKSBhYm92ZSBhbHJlYWR5XG4gICAgICAgIC8vIHRyYW5zaXRpb25lZCBkaXNwYXRjaGluZ+KGknJ1bm5pbmcsIHNvIG5vIHNldHRlciBjYWxsIG5lZWRlZCBoZXJlLlxuICAgICAgICByZXNldFRpbWluZ1JlZnMoKVxuICAgICAgICBzZXRNZXNzYWdlcyhvbGRNZXNzYWdlcyA9PiBbLi4ub2xkTWVzc2FnZXMsIC4uLm5ld01lc3NhZ2VzXSlcbiAgICAgICAgcmVzcG9uc2VMZW5ndGhSZWYuY3VycmVudCA9IDBcbiAgICAgICAgaWYgKGZlYXR1cmUoJ1RPS0VOX0JVREdFVCcpKSB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkQnVkZ2V0ID0gaW5wdXQgPyBwYXJzZVRva2VuQnVkZ2V0KGlucHV0KSA6IG51bGxcbiAgICAgICAgICBzbmFwc2hvdE91dHB1dFRva2Vuc0ZvclR1cm4oXG4gICAgICAgICAgICBwYXJzZWRCdWRnZXQgPz8gZ2V0Q3VycmVudFR1cm5Ub2tlbkJ1ZGdldCgpLFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgICBhcGlNZXRyaWNzUmVmLmN1cnJlbnQgPSBbXVxuICAgICAgICBzZXRTdHJlYW1pbmdUb29sVXNlcyhbXSlcbiAgICAgICAgc2V0U3RyZWFtaW5nVGV4dChudWxsKVxuXG4gICAgICAgIC8vIG1lc3NhZ2VzUmVmIGlzIHVwZGF0ZWQgc3luY2hyb25vdXNseSBieSB0aGUgc2V0TWVzc2FnZXMgd3JhcHBlclxuICAgICAgICAvLyBhYm92ZSwgc28gaXQgYWxyZWFkeSBpbmNsdWRlcyBuZXdNZXNzYWdlcyBmcm9tIHRoZSBhcHBlbmQgYXQgdGhlXG4gICAgICAgIC8vIHRvcCBvZiB0aGlzIHRyeSBibG9jay4gIE5vIHJlY29uc3RydWN0aW9uIG5lZWRlZCwgbm8gd2FpdGluZyBmb3JcbiAgICAgICAgLy8gUmVhY3QncyBzY2hlZHVsZXIgKHByZXZpb3VzbHkgY29zdCAyMC01Nm1zIHBlciBwcm9tcHQ7IHRoZSA1Nm1zXG4gICAgICAgIC8vIGNhc2Ugd2FzIGEgR0MgcGF1c2UgY2F1Z2h0IGR1cmluZyB0aGUgYXdhaXQpLlxuICAgICAgICBjb25zdCBsYXRlc3RNZXNzYWdlcyA9IG1lc3NhZ2VzUmVmLmN1cnJlbnRcblxuICAgICAgICBpZiAoaW5wdXQpIHtcbiAgICAgICAgICBhd2FpdCBtck9uQmVmb3JlUXVlcnkoaW5wdXQsIGxhdGVzdE1lc3NhZ2VzLCBuZXdNZXNzYWdlcy5sZW5ndGgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBQYXNzIGZ1bGwgY29udmVyc2F0aW9uIGhpc3RvcnkgdG8gY2FsbGJhY2tcbiAgICAgICAgaWYgKG9uQmVmb3JlUXVlcnlDYWxsYmFjayAmJiBpbnB1dCkge1xuICAgICAgICAgIGNvbnN0IHNob3VsZFByb2NlZWQgPSBhd2FpdCBvbkJlZm9yZVF1ZXJ5Q2FsbGJhY2soXG4gICAgICAgICAgICBpbnB1dCxcbiAgICAgICAgICAgIGxhdGVzdE1lc3NhZ2VzLFxuICAgICAgICAgIClcbiAgICAgICAgICBpZiAoIXNob3VsZFByb2NlZWQpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IG9uUXVlcnlJbXBsKFxuICAgICAgICAgIGxhdGVzdE1lc3NhZ2VzLFxuICAgICAgICAgIG5ld01lc3NhZ2VzLFxuICAgICAgICAgIGFib3J0Q29udHJvbGxlcixcbiAgICAgICAgICBzaG91bGRRdWVyeSxcbiAgICAgICAgICBhZGRpdGlvbmFsQWxsb3dlZFRvb2xzLFxuICAgICAgICAgIG1haW5Mb29wTW9kZWxQYXJhbSxcbiAgICAgICAgICBlZmZvcnQsXG4gICAgICAgIClcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIC8vIHF1ZXJ5R3VhcmQuZW5kKCkgYXRvbWljYWxseSBjaGVja3MgZ2VuZXJhdGlvbiBhbmQgdHJhbnNpdGlvbnNcbiAgICAgICAgLy8gcnVubmluZ+KGkmlkbGUuIFJldHVybnMgZmFsc2UgaWYgYSBuZXdlciBxdWVyeSBvd25zIHRoZSBndWFyZFxuICAgICAgICAvLyAoY2FuY2VsK3Jlc3VibWl0IHJhY2Ugd2hlcmUgdGhlIHN0YWxlIGZpbmFsbHkgZmlyZXMgYXMgYSBtaWNyb3Rhc2spLlxuICAgICAgICBpZiAocXVlcnlHdWFyZC5lbmQodGhpc0dlbmVyYXRpb24pKSB7XG4gICAgICAgICAgc2V0TGFzdFF1ZXJ5Q29tcGxldGlvblRpbWUoRGF0ZS5ub3coKSlcbiAgICAgICAgICBza2lwSWRsZUNoZWNrUmVmLmN1cnJlbnQgPSBmYWxzZVxuICAgICAgICAgIC8vIEFsd2F5cyByZXNldCBsb2FkaW5nIHN0YXRlIGluIGZpbmFsbHkgLSB0aGlzIGVuc3VyZXMgY2xlYW51cCBldmVuXG4gICAgICAgICAgLy8gaWYgb25RdWVyeUltcGwgdGhyb3dzLiBvblR1cm5Db21wbGV0ZSBpcyBjYWxsZWQgc2VwYXJhdGVseSBpblxuICAgICAgICAgIC8vIG9uUXVlcnlJbXBsIG9ubHkgb24gc3VjY2Vzc2Z1bCBjb21wbGV0aW9uLlxuICAgICAgICAgIHJlc2V0TG9hZGluZ1N0YXRlKClcblxuICAgICAgICAgIGF3YWl0IG1yT25UdXJuQ29tcGxldGUoXG4gICAgICAgICAgICBtZXNzYWdlc1JlZi5jdXJyZW50LFxuICAgICAgICAgICAgYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkLFxuICAgICAgICAgIClcblxuICAgICAgICAgIC8vIE5vdGlmeSBicmlkZ2UgY2xpZW50cyB0aGF0IHRoZSB0dXJuIGlzIGNvbXBsZXRlIHNvIG1vYmlsZSBhcHBzXG4gICAgICAgICAgLy8gY2FuIHN0b3AgdGhlIHNwYXJrIGFuaW1hdGlvbiBhbmQgc2hvdyBwb3N0LXR1cm4gVUkuXG4gICAgICAgICAgc2VuZEJyaWRnZVJlc3VsdFJlZi5jdXJyZW50KClcblxuICAgICAgICAgIC8vIEF1dG8taGlkZSB0dW5nc3RlbiBwYW5lbCBjb250ZW50IGF0IHR1cm4gZW5kIChhbnQtb25seSksIGJ1dCBrZWVwXG4gICAgICAgICAgLy8gdHVuZ3N0ZW5BY3RpdmVTZXNzaW9uIHNldCBzbyB0aGUgcGlsbCBzdGF5cyBpbiB0aGUgZm9vdGVyIGFuZCB0aGUgdXNlclxuICAgICAgICAgIC8vIGNhbiByZW9wZW4gdGhlIHBhbmVsLiBCYWNrZ3JvdW5kIHRtdXggdGFza3MgKGUuZy4gL2h1bnRlcikgcnVuIGZvclxuICAgICAgICAgIC8vIG1pbnV0ZXMg4oCUIHdpcGluZyB0aGUgc2Vzc2lvbiBtYWRlIHRoZSBwaWxsIGRpc2FwcGVhciBlbnRpcmVseSwgZm9yY2luZ1xuICAgICAgICAgIC8vIHRoZSB1c2VyIHRvIHJlLWludm9rZSBUbXV4IGp1c3QgdG8gcGVlay4gU2tpcCBvbiBhYm9ydCBzbyB0aGUgcGFuZWxcbiAgICAgICAgICAvLyBzdGF5cyBvcGVuIGZvciBpbnNwZWN0aW9uIChtYXRjaGVzIHRoZSB0dXJuLWR1cmF0aW9uIGd1YXJkIGJlbG93KS5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBcImV4dGVybmFsXCIgPT09ICdhbnQnICYmXG4gICAgICAgICAgICAhYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+IHtcbiAgICAgICAgICAgICAgaWYgKHByZXYudHVuZ3N0ZW5BY3RpdmVTZXNzaW9uID09PSB1bmRlZmluZWQpIHJldHVybiBwcmV2XG4gICAgICAgICAgICAgIGlmIChwcmV2LnR1bmdzdGVuUGFuZWxBdXRvSGlkZGVuID09PSB0cnVlKSByZXR1cm4gcHJldlxuICAgICAgICAgICAgICByZXR1cm4geyAuLi5wcmV2LCB0dW5nc3RlblBhbmVsQXV0b0hpZGRlbjogdHJ1ZSB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENhcHR1cmUgYnVkZ2V0IGluZm8gYmVmb3JlIGNsZWFyaW5nIChhbnQtb25seSlcbiAgICAgICAgICBsZXQgYnVkZ2V0SW5mbzpcbiAgICAgICAgICAgIHwgeyB0b2tlbnM6IG51bWJlcjsgbGltaXQ6IG51bWJlcjsgbnVkZ2VzOiBudW1iZXIgfVxuICAgICAgICAgICAgfCB1bmRlZmluZWRcbiAgICAgICAgICBpZiAoZmVhdHVyZSgnVE9LRU5fQlVER0VUJykpIHtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgZ2V0Q3VycmVudFR1cm5Ub2tlbkJ1ZGdldCgpICE9PSBudWxsICYmXG4gICAgICAgICAgICAgIGdldEN1cnJlbnRUdXJuVG9rZW5CdWRnZXQoKSEgPiAwICYmXG4gICAgICAgICAgICAgICFhYm9ydENvbnRyb2xsZXIuc2lnbmFsLmFib3J0ZWRcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBidWRnZXRJbmZvID0ge1xuICAgICAgICAgICAgICAgIHRva2VuczogZ2V0VHVybk91dHB1dFRva2VucygpLFxuICAgICAgICAgICAgICAgIGxpbWl0OiBnZXRDdXJyZW50VHVyblRva2VuQnVkZ2V0KCkhLFxuICAgICAgICAgICAgICAgIG51ZGdlczogZ2V0QnVkZ2V0Q29udGludWF0aW9uQ291bnQoKSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc25hcHNob3RPdXRwdXRUb2tlbnNGb3JUdXJuKG51bGwpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQWRkIHR1cm4gZHVyYXRpb24gbWVzc2FnZSBmb3IgdHVybnMgbG9uZ2VyIHRoYW4gMzBzIG9yIHdpdGggYSBidWRnZXRcbiAgICAgICAgICAvLyBTa2lwIGlmIHVzZXIgYWJvcnRlZCBvciBpZiBpbiBsb29wIG1vZGUgKHRvbyBub2lzeSBiZXR3ZWVuIHRpY2tzKVxuICAgICAgICAgIC8vIERlZmVyIGlmIHN3YXJtIHRlYW1tYXRlcyBhcmUgc3RpbGwgcnVubmluZyAoc2hvdyB3aGVuIHRoZXkgZmluaXNoKVxuICAgICAgICAgIGNvbnN0IHR1cm5EdXJhdGlvbk1zID1cbiAgICAgICAgICAgIERhdGUubm93KCkgLSBsb2FkaW5nU3RhcnRUaW1lUmVmLmN1cnJlbnQgLSB0b3RhbFBhdXNlZE1zUmVmLmN1cnJlbnRcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAodHVybkR1cmF0aW9uTXMgPiAzMDAwMCB8fCBidWRnZXRJbmZvICE9PSB1bmRlZmluZWQpICYmXG4gICAgICAgICAgICAhYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkICYmXG4gICAgICAgICAgICAhcHJvYWN0aXZlQWN0aXZlXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNSdW5uaW5nU3dhcm1BZ2VudHMgPSBnZXRBbGxJblByb2Nlc3NUZWFtbWF0ZVRhc2tzKFxuICAgICAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLnRhc2tzLFxuICAgICAgICAgICAgKS5zb21lKHQgPT4gdC5zdGF0dXMgPT09ICdydW5uaW5nJylcbiAgICAgICAgICAgIGlmIChoYXNSdW5uaW5nU3dhcm1BZ2VudHMpIHtcbiAgICAgICAgICAgICAgLy8gT25seSByZWNvcmQgc3RhcnQgdGltZSBvbiB0aGUgZmlyc3QgZGVmZXJyZWQgdHVyblxuICAgICAgICAgICAgICBpZiAoc3dhcm1TdGFydFRpbWVSZWYuY3VycmVudCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHN3YXJtU3RhcnRUaW1lUmVmLmN1cnJlbnQgPSBsb2FkaW5nU3RhcnRUaW1lUmVmLmN1cnJlbnRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBBbHdheXMgdXBkYXRlIGJ1ZGdldCDigJQgbGF0ZXIgdHVybnMgbWF5IGNhcnJ5IHRoZSBhY3R1YWwgYnVkZ2V0XG4gICAgICAgICAgICAgIGlmIChidWRnZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgc3dhcm1CdWRnZXRJbmZvUmVmLmN1cnJlbnQgPSBidWRnZXRJbmZvXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHNldE1lc3NhZ2VzKHByZXYgPT4gW1xuICAgICAgICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgICAgICAgY3JlYXRlVHVybkR1cmF0aW9uTWVzc2FnZShcbiAgICAgICAgICAgICAgICAgIHR1cm5EdXJhdGlvbk1zLFxuICAgICAgICAgICAgICAgICAgYnVkZ2V0SW5mbyxcbiAgICAgICAgICAgICAgICAgIGNvdW50KHByZXYsIGlzTG9nZ2FibGVNZXNzYWdlKSxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBDbGVhciB0aGUgY29udHJvbGxlciBzbyBDYW5jZWxSZXF1ZXN0SGFuZGxlcidzIGNhbkNhbmNlbFJ1bm5pbmdUYXNrXG4gICAgICAgICAgLy8gcmVhZHMgZmFsc2UgYXQgdGhlIGlkbGUgcHJvbXB0LiBXaXRob3V0IHRoaXMsIHRoZSBzdGFsZSBub24tYWJvcnRlZFxuICAgICAgICAgIC8vIGNvbnRyb2xsZXIgbWFrZXMgY3RybCtjIGZpcmUgb25DYW5jZWwoKSAoYWJvcnRpbmcgbm90aGluZykgaW5zdGVhZCBvZlxuICAgICAgICAgIC8vIHByb3BhZ2F0aW5nIHRvIHRoZSBkb3VibGUtcHJlc3MgZXhpdCBmbG93LlxuICAgICAgICAgIHNldEFib3J0Q29udHJvbGxlcihudWxsKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXV0by1yZXN0b3JlOiBpZiB0aGUgdXNlciBpbnRlcnJ1cHRlZCBiZWZvcmUgYW55IG1lYW5pbmdmdWwgcmVzcG9uc2VcbiAgICAgICAgLy8gYXJyaXZlZCwgcmV3aW5kIHRoZSBjb252ZXJzYXRpb24gYW5kIHJlc3RvcmUgdGhlaXIgcHJvbXB0IOKAlCBzYW1lIGFzXG4gICAgICAgIC8vIG9wZW5pbmcgdGhlIG1lc3NhZ2Ugc2VsZWN0b3IgYW5kIHBpY2tpbmcgdGhlIGxhc3QgbWVzc2FnZS5cbiAgICAgICAgLy8gVGhpcyBydW5zIE9VVFNJREUgdGhlIHF1ZXJ5R3VhcmQuZW5kKCkgY2hlY2sgYmVjYXVzZSBvbkNhbmNlbCBjYWxsc1xuICAgICAgICAvLyBmb3JjZUVuZCgpLCB3aGljaCBidW1wcyB0aGUgZ2VuZXJhdGlvbiBzbyBlbmQoKSByZXR1cm5zIGZhbHNlIGFib3ZlLlxuICAgICAgICAvLyBHdWFyZHM6IHJlYXNvbiA9PT0gJ3VzZXItY2FuY2VsJyAob25DYW5jZWwvRXNjOyBwcm9ncmFtbWF0aWMgYWJvcnRzXG4gICAgICAgIC8vIHVzZSAnYmFja2dyb3VuZCcvJ2ludGVycnVwdCcgYW5kIG11c3Qgbm90IHJld2luZCDigJQgbm90ZSBhYm9ydCgpIHdpdGhcbiAgICAgICAgLy8gbm8gYXJncyBzZXRzIHJlYXNvbiB0byBhIERPTUV4Y2VwdGlvbiwgbm90IHVuZGVmaW5lZCksICFpc0FjdGl2ZSAobm9cbiAgICAgICAgLy8gbmV3ZXIgcXVlcnkgc3RhcnRlZCDigJQgY2FuY2VsK3Jlc3VibWl0IHJhY2UpLCBlbXB0eSBpbnB1dCAoZG9uJ3RcbiAgICAgICAgLy8gY2xvYmJlciB0ZXh0IHR5cGVkIGR1cmluZyBsb2FkaW5nKSwgbm8gcXVldWVkIGNvbW1hbmRzICh1c2VyIHF1ZXVlZFxuICAgICAgICAvLyBCIHdoaWxlIEEgd2FzIGxvYWRpbmcg4oaSIHRoZXkndmUgbW92ZWQgb24sIGRvbid0IHJlc3RvcmUgQTsgYWxzb1xuICAgICAgICAvLyBhdm9pZHMgcmVtb3ZlTGFzdEZyb21IaXN0b3J5IHJlbW92aW5nIEIncyBlbnRyeSBpbnN0ZWFkIG9mIEEncyksXG4gICAgICAgIC8vIG5vdCB2aWV3aW5nIGEgdGVhbW1hdGUgKG1lc3NhZ2VzUmVmIGlzIHRoZSBtYWluIGNvbnZlcnNhdGlvbiDigJQgdGhlXG4gICAgICAgIC8vIG9sZCBVcC1hcnJvdyBxdWljay1yZXN0b3JlIGhhZCB0aGlzIGd1YXJkLCBwcmVzZXJ2ZSBpdCkuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBhYm9ydENvbnRyb2xsZXIuc2lnbmFsLnJlYXNvbiA9PT0gJ3VzZXItY2FuY2VsJyAmJlxuICAgICAgICAgICFxdWVyeUd1YXJkLmlzQWN0aXZlICYmXG4gICAgICAgICAgaW5wdXRWYWx1ZVJlZi5jdXJyZW50ID09PSAnJyAmJlxuICAgICAgICAgIGdldENvbW1hbmRRdWV1ZUxlbmd0aCgpID09PSAwICYmXG4gICAgICAgICAgIXN0b3JlLmdldFN0YXRlKCkudmlld2luZ0FnZW50VGFza0lkXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnN0IG1zZ3MgPSBtZXNzYWdlc1JlZi5jdXJyZW50XG4gICAgICAgICAgY29uc3QgbGFzdFVzZXJNc2cgPSBtc2dzLmZpbmRMYXN0KHNlbGVjdGFibGVVc2VyTWVzc2FnZXNGaWx0ZXIpXG4gICAgICAgICAgaWYgKGxhc3RVc2VyTXNnKSB7XG4gICAgICAgICAgICBjb25zdCBpZHggPSBtc2dzLmxhc3RJbmRleE9mKGxhc3RVc2VyTXNnKVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2VzQWZ0ZXJBcmVPbmx5U3ludGhldGljKG1zZ3MsIGlkeCkpIHtcbiAgICAgICAgICAgICAgLy8gVGhlIHN1Ym1pdCBpcyBiZWluZyB1bmRvbmUg4oCUIHVuZG8gaXRzIGhpc3RvcnkgZW50cnkgdG9vLFxuICAgICAgICAgICAgICAvLyBvdGhlcndpc2UgVXAtYXJyb3cgc2hvd3MgdGhlIHJlc3RvcmVkIHRleHQgdHdpY2UuXG4gICAgICAgICAgICAgIHJlbW92ZUxhc3RGcm9tSGlzdG9yeSgpXG4gICAgICAgICAgICAgIHJlc3RvcmVNZXNzYWdlU3luY1JlZi5jdXJyZW50KGxhc3RVc2VyTXNnKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgW1xuICAgICAgb25RdWVyeUltcGwsXG4gICAgICBzZXRBcHBTdGF0ZSxcbiAgICAgIHJlc2V0TG9hZGluZ1N0YXRlLFxuICAgICAgcXVlcnlHdWFyZCxcbiAgICAgIG1yT25CZWZvcmVRdWVyeSxcbiAgICAgIG1yT25UdXJuQ29tcGxldGUsXG4gICAgXSxcbiAgKVxuXG4gIC8vIEhhbmRsZSBpbml0aWFsIG1lc3NhZ2UgKGZyb20gQ0xJIGFyZ3Mgb3IgcGxhbiBtb2RlIGV4aXQgd2l0aCBjb250ZXh0IGNsZWFyKVxuICAvLyBUaGlzIGVmZmVjdCBydW5zIHdoZW4gaXNMb2FkaW5nIGJlY29tZXMgZmFsc2UgYW5kIHRoZXJlJ3MgYSBwZW5kaW5nIG1lc3NhZ2VcbiAgY29uc3QgaW5pdGlhbE1lc3NhZ2VSZWYgPSB1c2VSZWYoZmFsc2UpXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgcGVuZGluZyA9IGluaXRpYWxNZXNzYWdlXG4gICAgaWYgKCFwZW5kaW5nIHx8IGlzTG9hZGluZyB8fCBpbml0aWFsTWVzc2FnZVJlZi5jdXJyZW50KSByZXR1cm5cblxuICAgIC8vIE1hcmsgYXMgcHJvY2Vzc2luZyB0byBwcmV2ZW50IHJlLWVudHJ5XG4gICAgaW5pdGlhbE1lc3NhZ2VSZWYuY3VycmVudCA9IHRydWVcblxuICAgIGFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NJbml0aWFsTWVzc2FnZShcbiAgICAgIGluaXRpYWxNc2c6IE5vbk51bGxhYmxlPHR5cGVvZiBwZW5kaW5nPixcbiAgICApIHtcbiAgICAgIC8vIENsZWFyIGNvbnRleHQgaWYgcmVxdWVzdGVkIChwbGFuIG1vZGUgZXhpdClcbiAgICAgIGlmIChpbml0aWFsTXNnLmNsZWFyQ29udGV4dCkge1xuICAgICAgICAvLyBQcmVzZXJ2ZSB0aGUgcGxhbiBzbHVnIGJlZm9yZSBjbGVhcmluZyBjb250ZXh0LCBzbyB0aGUgbmV3IHNlc3Npb25cbiAgICAgICAgLy8gY2FuIGFjY2VzcyB0aGUgc2FtZSBwbGFuIGZpbGUgYWZ0ZXIgcmVnZW5lcmF0ZVNlc3Npb25JZCgpXG4gICAgICAgIGNvbnN0IG9sZFBsYW5TbHVnID0gaW5pdGlhbE1zZy5tZXNzYWdlLnBsYW5Db250ZW50XG4gICAgICAgICAgPyBnZXRQbGFuU2x1ZygpXG4gICAgICAgICAgOiB1bmRlZmluZWRcblxuICAgICAgICBjb25zdCB7IGNsZWFyQ29udmVyc2F0aW9uIH0gPSBhd2FpdCBpbXBvcnQoXG4gICAgICAgICAgJy4uL2NvbW1hbmRzL2NsZWFyL2NvbnZlcnNhdGlvbi5qcydcbiAgICAgICAgKVxuICAgICAgICBhd2FpdCBjbGVhckNvbnZlcnNhdGlvbih7XG4gICAgICAgICAgc2V0TWVzc2FnZXMsXG4gICAgICAgICAgcmVhZEZpbGVTdGF0ZTogcmVhZEZpbGVTdGF0ZS5jdXJyZW50LFxuICAgICAgICAgIGRpc2NvdmVyZWRTa2lsbE5hbWVzOiBkaXNjb3ZlcmVkU2tpbGxOYW1lc1JlZi5jdXJyZW50LFxuICAgICAgICAgIGxvYWRlZE5lc3RlZE1lbW9yeVBhdGhzOiBsb2FkZWROZXN0ZWRNZW1vcnlQYXRoc1JlZi5jdXJyZW50LFxuICAgICAgICAgIGdldEFwcFN0YXRlOiAoKSA9PiBzdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICAgIHNldEFwcFN0YXRlLFxuICAgICAgICAgIHNldENvbnZlcnNhdGlvbklkLFxuICAgICAgICB9KVxuICAgICAgICBoYWlrdVRpdGxlQXR0ZW1wdGVkUmVmLmN1cnJlbnQgPSBmYWxzZVxuICAgICAgICBzZXRIYWlrdVRpdGxlKHVuZGVmaW5lZClcbiAgICAgICAgYmFzaFRvb2xzLmN1cnJlbnQuY2xlYXIoKVxuICAgICAgICBiYXNoVG9vbHNQcm9jZXNzZWRJZHguY3VycmVudCA9IDBcblxuICAgICAgICAvLyBSZXN0b3JlIHRoZSBwbGFuIHNsdWcgZm9yIHRoZSBuZXcgc2Vzc2lvbiBzbyBnZXRQbGFuKCkgZmluZHMgdGhlIGZpbGVcbiAgICAgICAgaWYgKG9sZFBsYW5TbHVnKSB7XG4gICAgICAgICAgc2V0UGxhblNsdWcoZ2V0U2Vzc2lvbklkKCksIG9sZFBsYW5TbHVnKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEF0b21pY2FsbHk6IGNsZWFyIGluaXRpYWwgbWVzc2FnZSwgc2V0IHBlcm1pc3Npb24gbW9kZSBhbmQgcnVsZXMsIGFuZCBzdG9yZSBwbGFuIGZvciB2ZXJpZmljYXRpb25cbiAgICAgIGNvbnN0IHNob3VsZFN0b3JlUGxhbkZvclZlcmlmaWNhdGlvbiA9XG4gICAgICAgIGluaXRpYWxNc2cubWVzc2FnZS5wbGFuQ29udGVudCAmJlxuICAgICAgICBcImV4dGVybmFsXCIgPT09ICdhbnQnICYmXG4gICAgICAgIGlzRW52VHJ1dGh5KHVuZGVmaW5lZClcblxuICAgICAgc2V0QXBwU3RhdGUocHJldiA9PiB7XG4gICAgICAgIC8vIEJ1aWxkIGFuZCBhcHBseSBwZXJtaXNzaW9uIHVwZGF0ZXMgKG1vZGUgKyBhbGxvd2VkUHJvbXB0cyBydWxlcylcbiAgICAgICAgbGV0IHVwZGF0ZWRUb29sUGVybWlzc2lvbkNvbnRleHQgPSBpbml0aWFsTXNnLm1vZGVcbiAgICAgICAgICA/IGFwcGx5UGVybWlzc2lvblVwZGF0ZXMoXG4gICAgICAgICAgICAgIHByZXYudG9vbFBlcm1pc3Npb25Db250ZXh0LFxuICAgICAgICAgICAgICBidWlsZFBlcm1pc3Npb25VcGRhdGVzKFxuICAgICAgICAgICAgICAgIGluaXRpYWxNc2cubW9kZSxcbiAgICAgICAgICAgICAgICBpbml0aWFsTXNnLmFsbG93ZWRQcm9tcHRzLFxuICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgKVxuICAgICAgICAgIDogcHJldi50b29sUGVybWlzc2lvbkNvbnRleHRcbiAgICAgICAgLy8gRm9yIGF1dG8sIG92ZXJyaWRlIHRoZSBtb2RlIChidWlsZFBlcm1pc3Npb25VcGRhdGVzIG1hcHNcbiAgICAgICAgLy8gaXQgdG8gJ2RlZmF1bHQnIHZpYSB0b0V4dGVybmFsUGVybWlzc2lvbk1vZGUpIGFuZCBzdHJpcCBkYW5nZXJvdXMgcnVsZXNcbiAgICAgICAgaWYgKGZlYXR1cmUoJ1RSQU5TQ1JJUFRfQ0xBU1NJRklFUicpICYmIGluaXRpYWxNc2cubW9kZSA9PT0gJ2F1dG8nKSB7XG4gICAgICAgICAgdXBkYXRlZFRvb2xQZXJtaXNzaW9uQ29udGV4dCA9IHN0cmlwRGFuZ2Vyb3VzUGVybWlzc2lvbnNGb3JBdXRvTW9kZSh7XG4gICAgICAgICAgICAuLi51cGRhdGVkVG9vbFBlcm1pc3Npb25Db250ZXh0LFxuICAgICAgICAgICAgbW9kZTogJ2F1dG8nLFxuICAgICAgICAgICAgcHJlUGxhbk1vZGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgIGluaXRpYWxNZXNzYWdlOiBudWxsLFxuICAgICAgICAgIHRvb2xQZXJtaXNzaW9uQ29udGV4dDogdXBkYXRlZFRvb2xQZXJtaXNzaW9uQ29udGV4dCxcbiAgICAgICAgICAuLi4oc2hvdWxkU3RvcmVQbGFuRm9yVmVyaWZpY2F0aW9uICYmIHtcbiAgICAgICAgICAgIHBlbmRpbmdQbGFuVmVyaWZpY2F0aW9uOiB7XG4gICAgICAgICAgICAgIHBsYW46IGluaXRpYWxNc2cubWVzc2FnZS5wbGFuQ29udGVudCEsXG4gICAgICAgICAgICAgIHZlcmlmaWNhdGlvblN0YXJ0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Db21wbGV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgLy8gQ3JlYXRlIGZpbGUgaGlzdG9yeSBzbmFwc2hvdCBmb3IgY29kZSByZXdpbmRcbiAgICAgIGlmIChmaWxlSGlzdG9yeUVuYWJsZWQoKSkge1xuICAgICAgICB2b2lkIGZpbGVIaXN0b3J5TWFrZVNuYXBzaG90KFxuICAgICAgICAgICh1cGRhdGVyOiAocHJldjogRmlsZUhpc3RvcnlTdGF0ZSkgPT4gRmlsZUhpc3RvcnlTdGF0ZSkgPT4ge1xuICAgICAgICAgICAgc2V0QXBwU3RhdGUocHJldiA9PiAoe1xuICAgICAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgICAgICBmaWxlSGlzdG9yeTogdXBkYXRlcihwcmV2LmZpbGVIaXN0b3J5KSxcbiAgICAgICAgICAgIH0pKVxuICAgICAgICAgIH0sXG4gICAgICAgICAgaW5pdGlhbE1zZy5tZXNzYWdlLnV1aWQsXG4gICAgICAgIClcbiAgICAgIH1cblxuICAgICAgLy8gRW5zdXJlIFNlc3Npb25TdGFydCBob29rIGNvbnRleHQgaXMgYXZhaWxhYmxlIGJlZm9yZSB0aGUgZmlyc3QgQVBJXG4gICAgICAvLyBjYWxsLiBvblN1Ym1pdCBjYWxscyB0aGlzIGludGVybmFsbHkgYnV0IHRoZSBvblF1ZXJ5IHBhdGggYmVsb3dcbiAgICAgIC8vIGJ5cGFzc2VzIG9uU3VibWl0IOKAlCBob2lzdCBoZXJlIHNvIGJvdGggcGF0aHMgc2VlIGhvb2sgbWVzc2FnZXMuXG4gICAgICBhd2FpdCBhd2FpdFBlbmRpbmdIb29rcygpXG5cbiAgICAgIC8vIFJvdXRlIGFsbCBpbml0aWFsIHByb21wdHMgdGhyb3VnaCBvblN1Ym1pdCB0byBlbnN1cmUgVXNlclByb21wdFN1Ym1pdCBob29rcyBmaXJlXG4gICAgICAvLyBUT0RPOiBTaW1wbGlmeSBieSBhbHdheXMgcm91dGluZyB0aHJvdWdoIG9uU3VibWl0IG9uY2UgaXQgc3VwcG9ydHNcbiAgICAgIC8vIENvbnRlbnRCbG9ja1BhcmFtIGFycmF5cyAoaW1hZ2VzKSBhcyBpbnB1dFxuICAgICAgY29uc3QgY29udGVudCA9IGluaXRpYWxNc2cubWVzc2FnZS5tZXNzYWdlLmNvbnRlbnRcblxuICAgICAgLy8gUm91dGUgYWxsIHN0cmluZyBjb250ZW50IHRocm91Z2ggb25TdWJtaXQgdG8gZW5zdXJlIGhvb2tzIGZpcmVcbiAgICAgIC8vIEZvciBjb21wbGV4IGNvbnRlbnQgKGltYWdlcywgZXRjLiksIGZhbGwgYmFjayB0byBkaXJlY3Qgb25RdWVyeVxuICAgICAgLy8gUGxhbiBtZXNzYWdlcyBieXBhc3Mgb25TdWJtaXQgdG8gcHJlc2VydmUgcGxhbkNvbnRlbnQgbWV0YWRhdGEgZm9yIHJlbmRlcmluZ1xuICAgICAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJyAmJiAhaW5pdGlhbE1zZy5tZXNzYWdlLnBsYW5Db250ZW50KSB7XG4gICAgICAgIC8vIFJvdXRlIHRocm91Z2ggb25TdWJtaXQgZm9yIHByb3BlciBwcm9jZXNzaW5nIGluY2x1ZGluZyBVc2VyUHJvbXB0U3VibWl0IGhvb2tzXG4gICAgICAgIHZvaWQgb25TdWJtaXQoY29udGVudCwge1xuICAgICAgICAgIHNldEN1cnNvck9mZnNldDogKCkgPT4ge30sXG4gICAgICAgICAgY2xlYXJCdWZmZXI6ICgpID0+IHt9LFxuICAgICAgICAgIHJlc2V0SGlzdG9yeTogKCkgPT4ge30sXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBQbGFuIG1lc3NhZ2VzIG9yIGNvbXBsZXggY29udGVudCAoaW1hZ2VzLCBldGMuKSAtIHNlbmQgZGlyZWN0bHkgdG8gbW9kZWxcbiAgICAgICAgLy8gUGxhbiBtZXNzYWdlcyB1c2Ugb25RdWVyeSB0byBwcmVzZXJ2ZSBwbGFuQ29udGVudCBtZXRhZGF0YSBmb3IgcmVuZGVyaW5nXG4gICAgICAgIC8vIFRPRE86IE9uY2Ugb25TdWJtaXQgc3VwcG9ydHMgQ29udGVudEJsb2NrUGFyYW0gYXJyYXlzLCByZW1vdmUgdGhpcyBicmFuY2hcbiAgICAgICAgY29uc3QgbmV3QWJvcnRDb250cm9sbGVyID0gY3JlYXRlQWJvcnRDb250cm9sbGVyKClcbiAgICAgICAgc2V0QWJvcnRDb250cm9sbGVyKG5ld0Fib3J0Q29udHJvbGxlcilcblxuICAgICAgICB2b2lkIG9uUXVlcnkoXG4gICAgICAgICAgW2luaXRpYWxNc2cubWVzc2FnZV0sXG4gICAgICAgICAgbmV3QWJvcnRDb250cm9sbGVyLFxuICAgICAgICAgIHRydWUsIC8vIHNob3VsZFF1ZXJ5XG4gICAgICAgICAgW10sIC8vIGFkZGl0aW9uYWxBbGxvd2VkVG9vbHNcbiAgICAgICAgICBtYWluTG9vcE1vZGVsLFxuICAgICAgICApXG4gICAgICB9XG5cbiAgICAgIC8vIFJlc2V0IHJlZiBhZnRlciBhIGRlbGF5IHRvIGFsbG93IG5ldyBpbml0aWFsIG1lc3NhZ2VzXG4gICAgICBzZXRUaW1lb3V0KFxuICAgICAgICByZWYgPT4ge1xuICAgICAgICAgIHJlZi5jdXJyZW50ID0gZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgMTAwLFxuICAgICAgICBpbml0aWFsTWVzc2FnZVJlZixcbiAgICAgIClcbiAgICB9XG5cbiAgICB2b2lkIHByb2Nlc3NJbml0aWFsTWVzc2FnZShwZW5kaW5nKVxuICB9LCBbXG4gICAgaW5pdGlhbE1lc3NhZ2UsXG4gICAgaXNMb2FkaW5nLFxuICAgIHNldE1lc3NhZ2VzLFxuICAgIHNldEFwcFN0YXRlLFxuICAgIG9uUXVlcnksXG4gICAgbWFpbkxvb3BNb2RlbCxcbiAgICB0b29scyxcbiAgXSlcblxuICBjb25zdCBvblN1Ym1pdCA9IHVzZUNhbGxiYWNrKFxuICAgIGFzeW5jIChcbiAgICAgIGlucHV0OiBzdHJpbmcsXG4gICAgICBoZWxwZXJzOiBQcm9tcHRJbnB1dEhlbHBlcnMsXG4gICAgICBzcGVjdWxhdGlvbkFjY2VwdD86IHtcbiAgICAgICAgc3RhdGU6IEFjdGl2ZVNwZWN1bGF0aW9uU3RhdGVcbiAgICAgICAgc3BlY3VsYXRpb25TZXNzaW9uVGltZVNhdmVkTXM6IG51bWJlclxuICAgICAgICBzZXRBcHBTdGF0ZTogU2V0QXBwU3RhdGVcbiAgICAgIH0sXG4gICAgICBvcHRpb25zPzogeyBmcm9tS2V5YmluZGluZz86IGJvb2xlYW4gfSxcbiAgICApID0+IHtcbiAgICAgIC8vIFJlLXBpbiBzY3JvbGwgdG8gYm90dG9tIG9uIHN1Ym1pdCBzbyB0aGUgdXNlciBhbHdheXMgc2VlcyB0aGUgbmV3XG4gICAgICAvLyBleGNoYW5nZSAobWF0Y2hlcyBPcGVuQ29kZSdzIGF1dG8tc2Nyb2xsIGJlaGF2aW9yKS5cbiAgICAgIHJlcGluU2Nyb2xsKClcblxuICAgICAgLy8gUmVzdW1lIGxvb3AgbW9kZSBpZiBwYXVzZWRcbiAgICAgIGlmIChmZWF0dXJlKCdQUk9BQ1RJVkUnKSB8fCBmZWF0dXJlKCdLQUlST1MnKSkge1xuICAgICAgICBwcm9hY3RpdmVNb2R1bGU/LnJlc3VtZVByb2FjdGl2ZSgpXG4gICAgICB9XG5cbiAgICAgIC8vIEhhbmRsZSBpbW1lZGlhdGUgY29tbWFuZHMgLSB0aGVzZSBieXBhc3MgdGhlIHF1ZXVlIGFuZCBleGVjdXRlIHJpZ2h0IGF3YXlcbiAgICAgIC8vIGV2ZW4gd2hpbGUgQ2xhdWRlIGlzIHByb2Nlc3NpbmcuIENvbW1hbmRzIG9wdC1pbiB2aWEgYGltbWVkaWF0ZTogdHJ1ZWAuXG4gICAgICAvLyBDb21tYW5kcyB0cmlnZ2VyZWQgdmlhIGtleWJpbmRpbmdzIGFyZSBhbHdheXMgdHJlYXRlZCBhcyBpbW1lZGlhdGUuXG4gICAgICBpZiAoIXNwZWN1bGF0aW9uQWNjZXB0ICYmIGlucHV0LnRyaW0oKS5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgICAgLy8gRXhwYW5kIFtQYXN0ZWQgdGV4dCAjTl0gcmVmcyBzbyBpbW1lZGlhdGUgY29tbWFuZHMgKGUuZy4gL2J0dykgcmVjZWl2ZVxuICAgICAgICAvLyB0aGUgcGFzdGVkIGNvbnRlbnQsIG5vdCB0aGUgcGxhY2Vob2xkZXIuIFRoZSBub24taW1tZWRpYXRlIHBhdGggZ2V0c1xuICAgICAgICAvLyB0aGlzIGV4cGFuc2lvbiBsYXRlciBpbiBoYW5kbGVQcm9tcHRTdWJtaXQuXG4gICAgICAgIGNvbnN0IHRyaW1tZWRJbnB1dCA9IGV4cGFuZFBhc3RlZFRleHRSZWZzKGlucHV0LCBwYXN0ZWRDb250ZW50cykudHJpbSgpXG4gICAgICAgIGNvbnN0IHNwYWNlSW5kZXggPSB0cmltbWVkSW5wdXQuaW5kZXhPZignICcpXG4gICAgICAgIGNvbnN0IGNvbW1hbmROYW1lID1cbiAgICAgICAgICBzcGFjZUluZGV4ID09PSAtMVxuICAgICAgICAgICAgPyB0cmltbWVkSW5wdXQuc2xpY2UoMSlcbiAgICAgICAgICAgIDogdHJpbW1lZElucHV0LnNsaWNlKDEsIHNwYWNlSW5kZXgpXG4gICAgICAgIGNvbnN0IGNvbW1hbmRBcmdzID1cbiAgICAgICAgICBzcGFjZUluZGV4ID09PSAtMSA/ICcnIDogdHJpbW1lZElucHV0LnNsaWNlKHNwYWNlSW5kZXggKyAxKS50cmltKClcblxuICAgICAgICAvLyBGaW5kIG1hdGNoaW5nIGNvbW1hbmQgLSB0cmVhdCBhcyBpbW1lZGlhdGUgaWY6XG4gICAgICAgIC8vIDEuIENvbW1hbmQgaGFzIGBpbW1lZGlhdGU6IHRydWVgLCBPUlxuICAgICAgICAvLyAyLiBDb21tYW5kIHdhcyB0cmlnZ2VyZWQgdmlhIGtleWJpbmRpbmcgKGZyb21LZXliaW5kaW5nIG9wdGlvbilcbiAgICAgICAgY29uc3QgbWF0Y2hpbmdDb21tYW5kID0gY29tbWFuZHMuZmluZChcbiAgICAgICAgICBjbWQgPT5cbiAgICAgICAgICAgIGlzQ29tbWFuZEVuYWJsZWQoY21kKSAmJlxuICAgICAgICAgICAgKGNtZC5uYW1lID09PSBjb21tYW5kTmFtZSB8fFxuICAgICAgICAgICAgICBjbWQuYWxpYXNlcz8uaW5jbHVkZXMoY29tbWFuZE5hbWUpIHx8XG4gICAgICAgICAgICAgIGdldENvbW1hbmROYW1lKGNtZCkgPT09IGNvbW1hbmROYW1lKSxcbiAgICAgICAgKVxuICAgICAgICBpZiAobWF0Y2hpbmdDb21tYW5kPy5uYW1lID09PSAnY2xlYXInICYmIGlkbGVIaW50U2hvd25SZWYuY3VycmVudCkge1xuICAgICAgICAgIGxvZ0V2ZW50KCd0ZW5ndV9pZGxlX3JldHVybl9hY3Rpb24nLCB7XG4gICAgICAgICAgICBhY3Rpb246XG4gICAgICAgICAgICAgICdoaW50X2NvbnZlcnRlZCcgYXMgQW5hbHl0aWNzTWV0YWRhdGFfSV9WRVJJRklFRF9USElTX0lTX05PVF9DT0RFX09SX0ZJTEVQQVRIUyxcbiAgICAgICAgICAgIHZhcmlhbnQ6XG4gICAgICAgICAgICAgIGlkbGVIaW50U2hvd25SZWYuY3VycmVudCBhcyBBbmFseXRpY3NNZXRhZGF0YV9JX1ZFUklGSUVEX1RISVNfSVNfTk9UX0NPREVfT1JfRklMRVBBVEhTLFxuICAgICAgICAgICAgaWRsZU1pbnV0ZXM6IE1hdGgucm91bmQoXG4gICAgICAgICAgICAgIChEYXRlLm5vdygpIC0gbGFzdFF1ZXJ5Q29tcGxldGlvblRpbWVSZWYuY3VycmVudCkgLyA2MF8wMDAsXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgbWVzc2FnZUNvdW50OiBtZXNzYWdlc1JlZi5jdXJyZW50Lmxlbmd0aCxcbiAgICAgICAgICAgIHRvdGFsSW5wdXRUb2tlbnM6IGdldFRvdGFsSW5wdXRUb2tlbnMoKSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIGlkbGVIaW50U2hvd25SZWYuY3VycmVudCA9IGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaG91bGRUcmVhdEFzSW1tZWRpYXRlID1cbiAgICAgICAgICBxdWVyeUd1YXJkLmlzQWN0aXZlICYmXG4gICAgICAgICAgKG1hdGNoaW5nQ29tbWFuZD8uaW1tZWRpYXRlIHx8IG9wdGlvbnM/LmZyb21LZXliaW5kaW5nKVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBtYXRjaGluZ0NvbW1hbmQgJiZcbiAgICAgICAgICBzaG91bGRUcmVhdEFzSW1tZWRpYXRlICYmXG4gICAgICAgICAgbWF0Y2hpbmdDb21tYW5kLnR5cGUgPT09ICdsb2NhbC1qc3gnXG4gICAgICAgICkge1xuICAgICAgICAgIC8vIE9ubHkgY2xlYXIgaW5wdXQgaWYgdGhlIHN1Ym1pdHRlZCB0ZXh0IG1hdGNoZXMgd2hhdCdzIGluIHRoZSBwcm9tcHQuXG4gICAgICAgICAgLy8gV2hlbiBhIGNvbW1hbmQga2V5YmluZGluZyBmaXJlcywgaW5wdXQgaXMgXCIvPGNvbW1hbmQ+XCIgYnV0IHRoZSBhY3R1YWxcbiAgICAgICAgICAvLyBpbnB1dCB2YWx1ZSBpcyB0aGUgdXNlcidzIGV4aXN0aW5nIHRleHQgLSBkb24ndCBjbGVhciBpdCBpbiB0aGF0IGNhc2UuXG4gICAgICAgICAgaWYgKGlucHV0LnRyaW0oKSA9PT0gaW5wdXRWYWx1ZVJlZi5jdXJyZW50LnRyaW0oKSkge1xuICAgICAgICAgICAgc2V0SW5wdXRWYWx1ZSgnJylcbiAgICAgICAgICAgIGhlbHBlcnMuc2V0Q3Vyc29yT2Zmc2V0KDApXG4gICAgICAgICAgICBoZWxwZXJzLmNsZWFyQnVmZmVyKClcbiAgICAgICAgICAgIHNldFBhc3RlZENvbnRlbnRzKHt9KVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IHBhc3RlZFRleHRSZWZzID0gcGFyc2VSZWZlcmVuY2VzKGlucHV0KS5maWx0ZXIoXG4gICAgICAgICAgICByID0+IHBhc3RlZENvbnRlbnRzW3IuaWRdPy50eXBlID09PSAndGV4dCcsXG4gICAgICAgICAgKVxuICAgICAgICAgIGNvbnN0IHBhc3RlZFRleHRDb3VudCA9IHBhc3RlZFRleHRSZWZzLmxlbmd0aFxuICAgICAgICAgIGNvbnN0IHBhc3RlZFRleHRCeXRlcyA9IHBhc3RlZFRleHRSZWZzLnJlZHVjZShcbiAgICAgICAgICAgIChzdW0sIHIpID0+IHN1bSArIChwYXN0ZWRDb250ZW50c1tyLmlkXT8uY29udGVudC5sZW5ndGggPz8gMCksXG4gICAgICAgICAgICAwLFxuICAgICAgICAgIClcbiAgICAgICAgICBsb2dFdmVudCgndGVuZ3VfcGFzdGVfdGV4dCcsIHsgcGFzdGVkVGV4dENvdW50LCBwYXN0ZWRUZXh0Qnl0ZXMgfSlcbiAgICAgICAgICBsb2dFdmVudCgndGVuZ3VfaW1tZWRpYXRlX2NvbW1hbmRfZXhlY3V0ZWQnLCB7XG4gICAgICAgICAgICBjb21tYW5kTmFtZTpcbiAgICAgICAgICAgICAgbWF0Y2hpbmdDb21tYW5kLm5hbWUgYXMgQW5hbHl0aWNzTWV0YWRhdGFfSV9WRVJJRklFRF9USElTX0lTX05PVF9DT0RFX09SX0ZJTEVQQVRIUyxcbiAgICAgICAgICAgIGZyb21LZXliaW5kaW5nOiBvcHRpb25zPy5mcm9tS2V5YmluZGluZyA/PyBmYWxzZSxcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY29tbWFuZCBkaXJlY3RseVxuICAgICAgICAgIGNvbnN0IGV4ZWN1dGVJbW1lZGlhdGVDb21tYW5kID0gYXN5bmMgKCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgbGV0IGRvbmVXYXNDYWxsZWQgPSBmYWxzZVxuICAgICAgICAgICAgY29uc3Qgb25Eb25lID0gKFxuICAgICAgICAgICAgICByZXN1bHQ/OiBzdHJpbmcsXG4gICAgICAgICAgICAgIGRvbmVPcHRpb25zPzoge1xuICAgICAgICAgICAgICAgIGRpc3BsYXk/OiBDb21tYW5kUmVzdWx0RGlzcGxheVxuICAgICAgICAgICAgICAgIG1ldGFNZXNzYWdlcz86IHN0cmluZ1tdXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgZG9uZVdhc0NhbGxlZCA9IHRydWVcbiAgICAgICAgICAgICAgc2V0VG9vbEpTWCh7XG4gICAgICAgICAgICAgICAganN4OiBudWxsLFxuICAgICAgICAgICAgICAgIHNob3VsZEhpZGVQcm9tcHRJbnB1dDogZmFsc2UsXG4gICAgICAgICAgICAgICAgY2xlYXJMb2NhbEpTWDogdHJ1ZSxcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgY29uc3QgbmV3TWVzc2FnZXM6IE1lc3NhZ2VUeXBlW10gPSBbXVxuICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRvbmVPcHRpb25zPy5kaXNwbGF5ICE9PSAnc2tpcCcpIHtcbiAgICAgICAgICAgICAgICBhZGROb3RpZmljYXRpb24oe1xuICAgICAgICAgICAgICAgICAga2V5OiBgaW1tZWRpYXRlLSR7bWF0Y2hpbmdDb21tYW5kLm5hbWV9YCxcbiAgICAgICAgICAgICAgICAgIHRleHQ6IHJlc3VsdCxcbiAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAnaW1tZWRpYXRlJyxcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIEluIGZ1bGxzY3JlZW4gdGhlIGNvbW1hbmQganVzdCBzaG93ZWQgYXMgYSBjZW50ZXJlZCBtb2RhbFxuICAgICAgICAgICAgICAgIC8vIHBhbmUg4oCUIHRoZSBub3RpZmljYXRpb24gYWJvdmUgaXMgZW5vdWdoIGZlZWRiYWNrLiBBZGRpbmdcbiAgICAgICAgICAgICAgICAvLyBcIuKdryAvY29uZmlnXCIgKyBcIuKOvyBkaXNtaXNzZWRcIiB0byB0aGUgdHJhbnNjcmlwdCBpcyBjbHV0dGVyXG4gICAgICAgICAgICAgICAgLy8gKHRob3NlIG1lc3NhZ2VzIGFyZSB0eXBlOnN5c3RlbSBzdWJ0eXBlOmxvY2FsX2NvbW1hbmQg4oCUXG4gICAgICAgICAgICAgICAgLy8gdXNlci12aXNpYmxlIGJ1dCBOT1Qgc2VudCB0byB0aGUgbW9kZWwsIHNvIHNraXBwaW5nIHRoZW1cbiAgICAgICAgICAgICAgICAvLyBkb2Vzbid0IGNoYW5nZSBtb2RlbCBjb250ZXh0KS4gT3V0c2lkZSBmdWxsc2NyZWVuIHRoZVxuICAgICAgICAgICAgICAgIC8vIHRyYW5zY3JpcHQgZW50cnkgc3RheXMgc28gc2Nyb2xsYmFjayBzaG93cyB3aGF0IHJhbi5cbiAgICAgICAgICAgICAgICBpZiAoIWlzRnVsbHNjcmVlbkVudkVuYWJsZWQoKSkge1xuICAgICAgICAgICAgICAgICAgbmV3TWVzc2FnZXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlQ29tbWFuZElucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgICBmb3JtYXRDb21tYW5kSW5wdXRUYWdzKFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0Q29tbWFuZE5hbWUobWF0Y2hpbmdDb21tYW5kKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRBcmdzLFxuICAgICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUNvbW1hbmRJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgYDwke0xPQ0FMX0NPTU1BTkRfU1RET1VUX1RBR30+JHtlc2NhcGVYbWwocmVzdWx0KX08LyR7TE9DQUxfQ09NTUFORF9TVERPVVRfVEFHfT5gLFxuICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBJbmplY3QgbWV0YSBtZXNzYWdlcyAobW9kZWwtdmlzaWJsZSwgdXNlci1oaWRkZW4pIGludG8gdGhlIHRyYW5zY3JpcHRcbiAgICAgICAgICAgICAgaWYgKGRvbmVPcHRpb25zPy5tZXRhTWVzc2FnZXM/Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG5ld01lc3NhZ2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAuLi5kb25lT3B0aW9ucy5tZXRhTWVzc2FnZXMubWFwKGNvbnRlbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlVXNlck1lc3NhZ2UoeyBjb250ZW50LCBpc01ldGE6IHRydWUgfSksXG4gICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobmV3TWVzc2FnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgc2V0TWVzc2FnZXMocHJldiA9PiBbLi4ucHJldiwgLi4ubmV3TWVzc2FnZXNdKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIFJlc3RvcmUgc3Rhc2hlZCBwcm9tcHQgYWZ0ZXIgbG9jYWwtanN4IGNvbW1hbmQgY29tcGxldGVzLlxuICAgICAgICAgICAgICAvLyBUaGUgbm9ybWFsIHN0YXNoIHJlc3RvcmF0aW9uIHBhdGggKGJlbG93KSBpcyBza2lwcGVkIGJlY2F1c2VcbiAgICAgICAgICAgICAgLy8gbG9jYWwtanN4IGNvbW1hbmRzIHJldHVybiBlYXJseSBmcm9tIG9uU3VibWl0LlxuICAgICAgICAgICAgICBpZiAoc3Rhc2hlZFByb21wdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgc2V0SW5wdXRWYWx1ZShzdGFzaGVkUHJvbXB0LnRleHQpXG4gICAgICAgICAgICAgICAgaGVscGVycy5zZXRDdXJzb3JPZmZzZXQoc3Rhc2hlZFByb21wdC5jdXJzb3JPZmZzZXQpXG4gICAgICAgICAgICAgICAgc2V0UGFzdGVkQ29udGVudHMoc3Rhc2hlZFByb21wdC5wYXN0ZWRDb250ZW50cylcbiAgICAgICAgICAgICAgICBzZXRTdGFzaGVkUHJvbXB0KHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCdWlsZCBjb250ZXh0IGZvciB0aGUgY29tbWFuZCAocmV1c2VzIGV4aXN0aW5nIGdldFRvb2xVc2VDb250ZXh0KS5cbiAgICAgICAgICAgIC8vIFJlYWQgbWVzc2FnZXMgdmlhIHJlZiB0byBrZWVwIG9uU3VibWl0IHN0YWJsZSBhY3Jvc3MgbWVzc2FnZVxuICAgICAgICAgICAgLy8gdXBkYXRlcyDigJQgbWF0Y2hlcyB0aGUgcGF0dGVybiBhdCBMMjM4NC9MMjQwMC9MMjY2MiBhbmQgYXZvaWRzXG4gICAgICAgICAgICAvLyBwaW5uaW5nIHN0YWxlIFJFUEwgcmVuZGVyIHNjb3BlcyBpbiBkb3duc3RyZWFtIGNsb3N1cmVzLlxuICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IGdldFRvb2xVc2VDb250ZXh0KFxuICAgICAgICAgICAgICBtZXNzYWdlc1JlZi5jdXJyZW50LFxuICAgICAgICAgICAgICBbXSxcbiAgICAgICAgICAgICAgY3JlYXRlQWJvcnRDb250cm9sbGVyKCksXG4gICAgICAgICAgICAgIG1haW5Mb29wTW9kZWwsXG4gICAgICAgICAgICApXG5cbiAgICAgICAgICAgIGNvbnN0IG1vZCA9IGF3YWl0IG1hdGNoaW5nQ29tbWFuZC5sb2FkKClcbiAgICAgICAgICAgIGNvbnN0IGpzeCA9IGF3YWl0IG1vZC5jYWxsKG9uRG9uZSwgY29udGV4dCwgY29tbWFuZEFyZ3MpXG5cbiAgICAgICAgICAgIC8vIFNraXAgaWYgb25Eb25lIGFscmVhZHkgZmlyZWQg4oCUIHByZXZlbnRzIHN0dWNrIGlzTG9jYWxKU1hDb21tYW5kXG4gICAgICAgICAgICAvLyAoc2VlIHByb2Nlc3NTbGFzaENvbW1hbmQudHN4IGxvY2FsLWpzeCBjYXNlIGZvciBmdWxsIG1lY2hhbmlzbSkuXG4gICAgICAgICAgICBpZiAoanN4ICYmICFkb25lV2FzQ2FsbGVkKSB7XG4gICAgICAgICAgICAgIC8vIHNob3VsZEhpZGVQcm9tcHRJbnB1dDogZmFsc2Uga2VlcHMgTm90aWZpY2F0aW9ucyBtb3VudGVkXG4gICAgICAgICAgICAgIC8vIHNvIHRoZSBvbkRvbmUgcmVzdWx0IGlzbid0IGxvc3RcbiAgICAgICAgICAgICAgc2V0VG9vbEpTWCh7XG4gICAgICAgICAgICAgICAganN4LFxuICAgICAgICAgICAgICAgIHNob3VsZEhpZGVQcm9tcHRJbnB1dDogZmFsc2UsXG4gICAgICAgICAgICAgICAgaXNMb2NhbEpTWENvbW1hbmQ6IHRydWUsXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZvaWQgZXhlY3V0ZUltbWVkaWF0ZUNvbW1hbmQoKVxuICAgICAgICAgIHJldHVybiAvLyBBbHdheXMgcmV0dXJuIGVhcmx5IC0gZG9uJ3QgYWRkIHRvIGhpc3Rvcnkgb3IgcXVldWVcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSZW1vdGUgbW9kZTogc2tpcCBlbXB0eSBpbnB1dCBlYXJseSBiZWZvcmUgYW55IHN0YXRlIG11dGF0aW9uc1xuICAgICAgaWYgKGFjdGl2ZVJlbW90ZS5pc1JlbW90ZU1vZGUgJiYgIWlucHV0LnRyaW0oKSkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gSWRsZS1yZXR1cm46IHByb21wdCByZXR1cm5pbmcgdXNlcnMgdG8gc3RhcnQgZnJlc2ggd2hlbiB0aGVcbiAgICAgIC8vIGNvbnZlcnNhdGlvbiBpcyBsYXJnZSBhbmQgdGhlIGNhY2hlIGlzIGNvbGQuIHRlbmd1X3dpbGxvd19tb2RlXG4gICAgICAvLyBjb250cm9scyB0cmVhdG1lbnQ6IFwiZGlhbG9nXCIgKGJsb2NraW5nKSwgXCJoaW50XCIgKG5vdGlmaWNhdGlvbiksIFwib2ZmXCIuXG4gICAgICB7XG4gICAgICAgIGNvbnN0IHdpbGxvd01vZGUgPSBnZXRGZWF0dXJlVmFsdWVfQ0FDSEVEX01BWV9CRV9TVEFMRShcbiAgICAgICAgICAndGVuZ3Vfd2lsbG93X21vZGUnLFxuICAgICAgICAgICdvZmYnLFxuICAgICAgICApXG4gICAgICAgIGNvbnN0IGlkbGVUaHJlc2hvbGRNaW4gPSBOdW1iZXIoXG4gICAgICAgICAgcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSURMRV9USFJFU0hPTERfTUlOVVRFUyA/PyA3NSxcbiAgICAgICAgKVxuICAgICAgICBjb25zdCB0b2tlblRocmVzaG9sZCA9IE51bWJlcihcbiAgICAgICAgICBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9JRExFX1RPS0VOX1RIUkVTSE9MRCA/PyAxMDBfMDAwLFxuICAgICAgICApXG4gICAgICAgIGlmIChcbiAgICAgICAgICB3aWxsb3dNb2RlICE9PSAnb2ZmJyAmJlxuICAgICAgICAgICFnZXRHbG9iYWxDb25maWcoKS5pZGxlUmV0dXJuRGlzbWlzc2VkICYmXG4gICAgICAgICAgIXNraXBJZGxlQ2hlY2tSZWYuY3VycmVudCAmJlxuICAgICAgICAgICFzcGVjdWxhdGlvbkFjY2VwdCAmJlxuICAgICAgICAgICFpbnB1dC50cmltKCkuc3RhcnRzV2l0aCgnLycpICYmXG4gICAgICAgICAgbGFzdFF1ZXJ5Q29tcGxldGlvblRpbWVSZWYuY3VycmVudCA+IDAgJiZcbiAgICAgICAgICBnZXRUb3RhbElucHV0VG9rZW5zKCkgPj0gdG9rZW5UaHJlc2hvbGRcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29uc3QgaWRsZU1zID0gRGF0ZS5ub3coKSAtIGxhc3RRdWVyeUNvbXBsZXRpb25UaW1lUmVmLmN1cnJlbnRcbiAgICAgICAgICBjb25zdCBpZGxlTWludXRlcyA9IGlkbGVNcyAvIDYwXzAwMFxuICAgICAgICAgIGlmIChpZGxlTWludXRlcyA+PSBpZGxlVGhyZXNob2xkTWluICYmIHdpbGxvd01vZGUgPT09ICdkaWFsb2cnKSB7XG4gICAgICAgICAgICBzZXRJZGxlUmV0dXJuUGVuZGluZyh7IGlucHV0LCBpZGxlTWludXRlcyB9KVxuICAgICAgICAgICAgc2V0SW5wdXRWYWx1ZSgnJylcbiAgICAgICAgICAgIGhlbHBlcnMuc2V0Q3Vyc29yT2Zmc2V0KDApXG4gICAgICAgICAgICBoZWxwZXJzLmNsZWFyQnVmZmVyKClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBBZGQgdG8gaGlzdG9yeSBmb3IgZGlyZWN0IHVzZXIgc3VibWlzc2lvbnMuXG4gICAgICAvLyBRdWV1ZWQgY29tbWFuZCBwcm9jZXNzaW5nIChleGVjdXRlUXVldWVkSW5wdXQpIGRvZXNuJ3QgY2FsbCBvblN1Ym1pdCxcbiAgICAgIC8vIHNvIG5vdGlmaWNhdGlvbnMgYW5kIGFscmVhZHktcXVldWVkIHVzZXIgaW5wdXQgd29uJ3QgYmUgYWRkZWQgdG8gaGlzdG9yeSBoZXJlLlxuICAgICAgLy8gU2tpcCBoaXN0b3J5IGZvciBrZXliaW5kaW5nLXRyaWdnZXJlZCBjb21tYW5kcyAodXNlciBkaWRuJ3QgdHlwZSB0aGUgY29tbWFuZCkuXG4gICAgICBpZiAoIW9wdGlvbnM/LmZyb21LZXliaW5kaW5nKSB7XG4gICAgICAgIGFkZFRvSGlzdG9yeSh7XG4gICAgICAgICAgZGlzcGxheTogc3BlY3VsYXRpb25BY2NlcHRcbiAgICAgICAgICAgID8gaW5wdXRcbiAgICAgICAgICAgIDogcHJlcGVuZE1vZGVDaGFyYWN0ZXJUb0lucHV0KGlucHV0LCBpbnB1dE1vZGUpLFxuICAgICAgICAgIHBhc3RlZENvbnRlbnRzOiBzcGVjdWxhdGlvbkFjY2VwdCA/IHt9IDogcGFzdGVkQ29udGVudHMsXG4gICAgICAgIH0pXG4gICAgICAgIC8vIEFkZCB0aGUganVzdC1zdWJtaXR0ZWQgY29tbWFuZCB0byB0aGUgZnJvbnQgb2YgdGhlIGdob3N0LXRleHRcbiAgICAgICAgLy8gY2FjaGUgc28gaXQncyBzdWdnZXN0ZWQgaW1tZWRpYXRlbHkgKG5vdCBhZnRlciB0aGUgNjBzIFRUTCkuXG4gICAgICAgIGlmIChpbnB1dE1vZGUgPT09ICdiYXNoJykge1xuICAgICAgICAgIHByZXBlbmRUb1NoZWxsSGlzdG9yeUNhY2hlKGlucHV0LnRyaW0oKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSZXN0b3JlIHN0YXNoIGlmIHByZXNlbnQsIGJ1dCBOT1QgZm9yIHNsYXNoIGNvbW1hbmRzIG9yIHdoZW4gbG9hZGluZy5cbiAgICAgIC8vIC0gU2xhc2ggY29tbWFuZHMgKGVzcGVjaWFsbHkgaW50ZXJhY3RpdmUgb25lcyBsaWtlIC9tb2RlbCwgL2NvbnRleHQpIGhpZGVcbiAgICAgIC8vICAgdGhlIHByb21wdCBhbmQgc2hvdyBhIHBpY2tlciBVSS4gUmVzdG9yaW5nIHRoZSBzdGFzaCBkdXJpbmcgYSBjb21tYW5kIHdvdWxkXG4gICAgICAvLyAgIHBsYWNlIHRoZSB0ZXh0IGluIGEgaGlkZGVuIGlucHV0LCBhbmQgdGhlIHVzZXIgd291bGQgbG9zZSBpdCBieSB0eXBpbmcgdGhlXG4gICAgICAvLyAgIG5leHQgY29tbWFuZC4gSW5zdGVhZCwgcHJlc2VydmUgdGhlIHN0YXNoIHNvIGl0IHN1cnZpdmVzIGFjcm9zcyBjb21tYW5kIHJ1bnMuXG4gICAgICAvLyAtIFdoZW4gbG9hZGluZywgdGhlIHN1Ym1pdHRlZCBpbnB1dCB3aWxsIGJlIHF1ZXVlZCBhbmQgaGFuZGxlUHJvbXB0U3VibWl0XG4gICAgICAvLyAgIHdpbGwgY2xlYXIgdGhlIGlucHV0IGZpZWxkIChvbklucHV0Q2hhbmdlKCcnKSksIHdoaWNoIHdvdWxkIGNsb2JiZXIgdGhlXG4gICAgICAvLyAgIHJlc3RvcmVkIHN0YXNoLiBEZWZlciByZXN0b3JhdGlvbiB0byBhZnRlciBoYW5kbGVQcm9tcHRTdWJtaXQgKGJlbG93KS5cbiAgICAgIC8vICAgUmVtb3RlIG1vZGUgaXMgZXhlbXB0OiBpdCBzZW5kcyB2aWEgV2ViU29ja2V0IGFuZCByZXR1cm5zIGVhcmx5IHdpdGhvdXRcbiAgICAgIC8vICAgY2FsbGluZyBoYW5kbGVQcm9tcHRTdWJtaXQsIHNvIHRoZXJlJ3Mgbm8gY2xvYmJlcmluZyByaXNrIOKAlCByZXN0b3JlIGVhZ2VybHkuXG4gICAgICAvLyBJbiBib3RoIGRlZmVycmVkIGNhc2VzLCB0aGUgc3Rhc2ggaXMgcmVzdG9yZWQgYWZ0ZXIgYXdhaXQgaGFuZGxlUHJvbXB0U3VibWl0LlxuICAgICAgY29uc3QgaXNTbGFzaENvbW1hbmQgPSAhc3BlY3VsYXRpb25BY2NlcHQgJiYgaW5wdXQudHJpbSgpLnN0YXJ0c1dpdGgoJy8nKVxuICAgICAgLy8gU3VibWl0IHJ1bnMgXCJub3dcIiAobm90IHF1ZXVlZCkgd2hlbiBub3QgYWxyZWFkeSBsb2FkaW5nLCBvciB3aGVuXG4gICAgICAvLyBhY2NlcHRpbmcgc3BlY3VsYXRpb24sIG9yIGluIHJlbW90ZSBtb2RlICh3aGljaCBzZW5kcyB2aWEgV1MgYW5kXG4gICAgICAvLyByZXR1cm5zIGVhcmx5IHdpdGhvdXQgY2FsbGluZyBoYW5kbGVQcm9tcHRTdWJtaXQpLlxuICAgICAgY29uc3Qgc3VibWl0c05vdyA9XG4gICAgICAgICFpc0xvYWRpbmcgfHwgc3BlY3VsYXRpb25BY2NlcHQgfHwgYWN0aXZlUmVtb3RlLmlzUmVtb3RlTW9kZVxuICAgICAgaWYgKHN0YXNoZWRQcm9tcHQgIT09IHVuZGVmaW5lZCAmJiAhaXNTbGFzaENvbW1hbmQgJiYgc3VibWl0c05vdykge1xuICAgICAgICBzZXRJbnB1dFZhbHVlKHN0YXNoZWRQcm9tcHQudGV4dClcbiAgICAgICAgaGVscGVycy5zZXRDdXJzb3JPZmZzZXQoc3Rhc2hlZFByb21wdC5jdXJzb3JPZmZzZXQpXG4gICAgICAgIHNldFBhc3RlZENvbnRlbnRzKHN0YXNoZWRQcm9tcHQucGFzdGVkQ29udGVudHMpXG4gICAgICAgIHNldFN0YXNoZWRQcm9tcHQodW5kZWZpbmVkKVxuICAgICAgfSBlbHNlIGlmIChzdWJtaXRzTm93KSB7XG4gICAgICAgIGlmICghb3B0aW9ucz8uZnJvbUtleWJpbmRpbmcpIHtcbiAgICAgICAgICAvLyBDbGVhciBpbnB1dCB3aGVuIG5vdCBsb2FkaW5nIG9yIGFjY2VwdGluZyBzcGVjdWxhdGlvbi5cbiAgICAgICAgICAvLyBQcmVzZXJ2ZSBpbnB1dCBmb3Iga2V5YmluZGluZy10cmlnZ2VyZWQgY29tbWFuZHMuXG4gICAgICAgICAgc2V0SW5wdXRWYWx1ZSgnJylcbiAgICAgICAgICBoZWxwZXJzLnNldEN1cnNvck9mZnNldCgwKVxuICAgICAgICB9XG4gICAgICAgIHNldFBhc3RlZENvbnRlbnRzKHt9KVxuICAgICAgfVxuXG4gICAgICBpZiAoc3VibWl0c05vdykge1xuICAgICAgICBzZXRJbnB1dE1vZGUoJ3Byb21wdCcpXG4gICAgICAgIHNldElERVNlbGVjdGlvbih1bmRlZmluZWQpXG4gICAgICAgIHNldFN1Ym1pdENvdW50KF8gPT4gXyArIDEpXG4gICAgICAgIGhlbHBlcnMuY2xlYXJCdWZmZXIoKVxuICAgICAgICB0aXBQaWNrZWRUaGlzVHVyblJlZi5jdXJyZW50ID0gZmFsc2VcblxuICAgICAgICAvLyBTaG93IHRoZSBwbGFjZWhvbGRlciBpbiB0aGUgc2FtZSBSZWFjdCBiYXRjaCBhcyBzZXRJbnB1dFZhbHVlKCcnKS5cbiAgICAgICAgLy8gU2tpcCBmb3Igc2xhc2gvYmFzaCAodGhleSBoYXZlIHRoZWlyIG93biBlY2hvKSwgc3BlY3VsYXRpb24gYW5kIHJlbW90ZVxuICAgICAgICAvLyBtb2RlIChib3RoIHNldE1lc3NhZ2VzIGRpcmVjdGx5IHdpdGggbm8gZ2FwIHRvIGJyaWRnZSkuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAhaXNTbGFzaENvbW1hbmQgJiZcbiAgICAgICAgICBpbnB1dE1vZGUgPT09ICdwcm9tcHQnICYmXG4gICAgICAgICAgIXNwZWN1bGF0aW9uQWNjZXB0ICYmXG4gICAgICAgICAgIWFjdGl2ZVJlbW90ZS5pc1JlbW90ZU1vZGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgc2V0VXNlcklucHV0T25Qcm9jZXNzaW5nKGlucHV0KVxuICAgICAgICAgIC8vIHNob3dTcGlubmVyIGluY2x1ZGVzIHVzZXJJbnB1dE9uUHJvY2Vzc2luZywgc28gdGhlIHNwaW5uZXIgYXBwZWFyc1xuICAgICAgICAgIC8vIG9uIHRoaXMgcmVuZGVyLiBSZXNldCB0aW1pbmcgcmVmcyBub3cgKGJlZm9yZSBxdWVyeUd1YXJkLnJlc2VydmUoKVxuICAgICAgICAgIC8vIHdvdWxkKSBzbyBlbGFwc2VkIHRpbWUgZG9lc24ndCByZWFkIGFzIERhdGUubm93KCkgLSAwLiBUaGVcbiAgICAgICAgICAvLyBpc1F1ZXJ5QWN0aXZlIHRyYW5zaXRpb24gYWJvdmUgZG9lcyB0aGUgc2FtZSByZXNldCDigJQgaWRlbXBvdGVudC5cbiAgICAgICAgICByZXNldFRpbWluZ1JlZnMoKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5jcmVtZW50IHByb21wdCBjb3VudCBmb3IgYXR0cmlidXRpb24gdHJhY2tpbmcgYW5kIHNhdmUgc25hcHNob3RcbiAgICAgICAgLy8gVGhlIHNuYXBzaG90IHBlcnNpc3RzIHByb21wdENvdW50IHNvIGl0IHN1cnZpdmVzIGNvbXBhY3Rpb25cbiAgICAgICAgaWYgKGZlYXR1cmUoJ0NPTU1JVF9BVFRSSUJVVElPTicpKSB7XG4gICAgICAgICAgc2V0QXBwU3RhdGUocHJldiA9PiAoe1xuICAgICAgICAgICAgLi4ucHJldixcbiAgICAgICAgICAgIGF0dHJpYnV0aW9uOiBpbmNyZW1lbnRQcm9tcHRDb3VudChwcmV2LmF0dHJpYnV0aW9uLCBzbmFwc2hvdCA9PiB7XG4gICAgICAgICAgICAgIHZvaWQgcmVjb3JkQXR0cmlidXRpb25TbmFwc2hvdChzbmFwc2hvdCkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGxvZ0ZvckRlYnVnZ2luZyhcbiAgICAgICAgICAgICAgICAgIGBBdHRyaWJ1dGlvbjogRmFpbGVkIHRvIHNhdmUgc25hcHNob3Q6ICR7ZXJyb3J9YCxcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICB9KSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBIYW5kbGUgc3BlY3VsYXRpb24gYWNjZXB0YW5jZVxuICAgICAgaWYgKHNwZWN1bGF0aW9uQWNjZXB0KSB7XG4gICAgICAgIGNvbnN0IHsgcXVlcnlSZXF1aXJlZCB9ID0gYXdhaXQgaGFuZGxlU3BlY3VsYXRpb25BY2NlcHQoXG4gICAgICAgICAgc3BlY3VsYXRpb25BY2NlcHQuc3RhdGUsXG4gICAgICAgICAgc3BlY3VsYXRpb25BY2NlcHQuc3BlY3VsYXRpb25TZXNzaW9uVGltZVNhdmVkTXMsXG4gICAgICAgICAgc3BlY3VsYXRpb25BY2NlcHQuc2V0QXBwU3RhdGUsXG4gICAgICAgICAgaW5wdXQsXG4gICAgICAgICAge1xuICAgICAgICAgICAgc2V0TWVzc2FnZXMsXG4gICAgICAgICAgICByZWFkRmlsZVN0YXRlLFxuICAgICAgICAgICAgY3dkOiBnZXRPcmlnaW5hbEN3ZCgpLFxuICAgICAgICAgIH0sXG4gICAgICAgIClcbiAgICAgICAgaWYgKHF1ZXJ5UmVxdWlyZWQpIHtcbiAgICAgICAgICBjb25zdCBuZXdBYm9ydENvbnRyb2xsZXIgPSBjcmVhdGVBYm9ydENvbnRyb2xsZXIoKVxuICAgICAgICAgIHNldEFib3J0Q29udHJvbGxlcihuZXdBYm9ydENvbnRyb2xsZXIpXG4gICAgICAgICAgdm9pZCBvblF1ZXJ5KFtdLCBuZXdBYm9ydENvbnRyb2xsZXIsIHRydWUsIFtdLCBtYWluTG9vcE1vZGVsKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBSZW1vdGUgbW9kZTogc2VuZCBpbnB1dCB2aWEgc3RyZWFtLWpzb24gaW5zdGVhZCBvZiBsb2NhbCBxdWVyeS5cbiAgICAgIC8vIFBlcm1pc3Npb24gcmVxdWVzdHMgZnJvbSB0aGUgcmVtb3RlIGFyZSBicmlkZ2VkIGludG8gdG9vbFVzZUNvbmZpcm1RdWV1ZVxuICAgICAgLy8gYW5kIHJlbmRlcmVkIHVzaW5nIHRoZSBzdGFuZGFyZCBQZXJtaXNzaW9uUmVxdWVzdCBjb21wb25lbnQuXG4gICAgICAvL1xuICAgICAgLy8gbG9jYWwtanN4IHNsYXNoIGNvbW1hbmRzIChlLmcuIC9hZ2VudHMsIC9jb25maWcpIHJlbmRlciBVSSBpbiBUSElTXG4gICAgICAvLyBwcm9jZXNzIOKAlCB0aGV5IGhhdmUgbm8gcmVtb3RlIGVxdWl2YWxlbnQuIExldCB0aG9zZSBmYWxsIHRocm91Z2ggdG9cbiAgICAgIC8vIGhhbmRsZVByb21wdFN1Ym1pdCBzbyB0aGV5IGV4ZWN1dGUgbG9jYWxseS4gUHJvbXB0IGNvbW1hbmRzIGFuZFxuICAgICAgLy8gcGxhaW4gdGV4dCBnbyB0byB0aGUgcmVtb3RlLlxuICAgICAgaWYgKFxuICAgICAgICBhY3RpdmVSZW1vdGUuaXNSZW1vdGVNb2RlICYmXG4gICAgICAgICEoXG4gICAgICAgICAgaXNTbGFzaENvbW1hbmQgJiZcbiAgICAgICAgICBjb21tYW5kcy5maW5kKGMgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGlucHV0LnRyaW0oKS5zbGljZSgxKS5zcGxpdCgvXFxzLylbMF1cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIGlzQ29tbWFuZEVuYWJsZWQoYykgJiZcbiAgICAgICAgICAgICAgKGMubmFtZSA9PT0gbmFtZSB8fFxuICAgICAgICAgICAgICAgIGMuYWxpYXNlcz8uaW5jbHVkZXMobmFtZSEpIHx8XG4gICAgICAgICAgICAgICAgZ2V0Q29tbWFuZE5hbWUoYykgPT09IG5hbWUpXG4gICAgICAgICAgICApXG4gICAgICAgICAgfSk/LnR5cGUgPT09ICdsb2NhbC1qc3gnXG4gICAgICAgIClcbiAgICAgICkge1xuICAgICAgICAvLyBCdWlsZCBjb250ZW50IGJsb2NrcyB3aGVuIHRoZXJlIGFyZSBwYXN0ZWQgYXR0YWNobWVudHMgKGltYWdlcylcbiAgICAgICAgY29uc3QgcGFzdGVkVmFsdWVzID0gT2JqZWN0LnZhbHVlcyhwYXN0ZWRDb250ZW50cylcbiAgICAgICAgY29uc3QgaW1hZ2VDb250ZW50cyA9IHBhc3RlZFZhbHVlcy5maWx0ZXIoYyA9PiBjLnR5cGUgPT09ICdpbWFnZScpXG4gICAgICAgIGNvbnN0IGltYWdlUGFzdGVJZHMgPVxuICAgICAgICAgIGltYWdlQ29udGVudHMubGVuZ3RoID4gMCA/IGltYWdlQ29udGVudHMubWFwKGMgPT4gYy5pZCkgOiB1bmRlZmluZWRcblxuICAgICAgICBsZXQgbWVzc2FnZUNvbnRlbnQ6IHN0cmluZyB8IENvbnRlbnRCbG9ja1BhcmFtW10gPSBpbnB1dC50cmltKClcbiAgICAgICAgbGV0IHJlbW90ZUNvbnRlbnQ6IFJlbW90ZU1lc3NhZ2VDb250ZW50ID0gaW5wdXQudHJpbSgpXG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IGNvbnRlbnRCbG9ja3M6IENvbnRlbnRCbG9ja1BhcmFtW10gPSBbXVxuICAgICAgICAgIGNvbnN0IHJlbW90ZUJsb2NrczogQXJyYXk8eyB0eXBlOiBzdHJpbmc7IFtrZXk6IHN0cmluZ106IHVua25vd24gfT4gPVxuICAgICAgICAgICAgW11cblxuICAgICAgICAgIGNvbnN0IHRyaW1tZWRJbnB1dCA9IGlucHV0LnRyaW0oKVxuICAgICAgICAgIGlmICh0cmltbWVkSW5wdXQpIHtcbiAgICAgICAgICAgIGNvbnRlbnRCbG9ja3MucHVzaCh7IHR5cGU6ICd0ZXh0JywgdGV4dDogdHJpbW1lZElucHV0IH0pXG4gICAgICAgICAgICByZW1vdGVCbG9ja3MucHVzaCh7IHR5cGU6ICd0ZXh0JywgdGV4dDogdHJpbW1lZElucHV0IH0pXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yIChjb25zdCBwYXN0ZWQgb2YgcGFzdGVkVmFsdWVzKSB7XG4gICAgICAgICAgICBpZiAocGFzdGVkLnR5cGUgPT09ICdpbWFnZScpIHtcbiAgICAgICAgICAgICAgY29uc3Qgc291cmNlID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdiYXNlNjQnIGFzIGNvbnN0LFxuICAgICAgICAgICAgICAgIG1lZGlhX3R5cGU6IChwYXN0ZWQubWVkaWFUeXBlID8/ICdpbWFnZS9wbmcnKSBhc1xuICAgICAgICAgICAgICAgICAgfCAnaW1hZ2UvanBlZydcbiAgICAgICAgICAgICAgICAgIHwgJ2ltYWdlL3BuZydcbiAgICAgICAgICAgICAgICAgIHwgJ2ltYWdlL2dpZidcbiAgICAgICAgICAgICAgICAgIHwgJ2ltYWdlL3dlYnAnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHBhc3RlZC5jb250ZW50LFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnRlbnRCbG9ja3MucHVzaCh7IHR5cGU6ICdpbWFnZScsIHNvdXJjZSB9KVxuICAgICAgICAgICAgICByZW1vdGVCbG9ja3MucHVzaCh7IHR5cGU6ICdpbWFnZScsIHNvdXJjZSB9KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGVudEJsb2Nrcy5wdXNoKHsgdHlwZTogJ3RleHQnLCB0ZXh0OiBwYXN0ZWQuY29udGVudCB9KVxuICAgICAgICAgICAgICByZW1vdGVCbG9ja3MucHVzaCh7IHR5cGU6ICd0ZXh0JywgdGV4dDogcGFzdGVkLmNvbnRlbnQgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBtZXNzYWdlQ29udGVudCA9IGNvbnRlbnRCbG9ja3NcbiAgICAgICAgICByZW1vdGVDb250ZW50ID0gcmVtb3RlQmxvY2tzXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB1c2VyIG1lc3NhZ2UgdG8gVUlcbiAgICAgICAgLy8gTm90ZTogZW1wdHkgaW5wdXQgYWxyZWFkeSBoYW5kbGVkIGJ5IGVhcmx5IHJldHVybiBhYm92ZVxuICAgICAgICBjb25zdCB1c2VyTWVzc2FnZSA9IGNyZWF0ZVVzZXJNZXNzYWdlKHtcbiAgICAgICAgICBjb250ZW50OiBtZXNzYWdlQ29udGVudCxcbiAgICAgICAgICBpbWFnZVBhc3RlSWRzLFxuICAgICAgICB9KVxuICAgICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCB1c2VyTWVzc2FnZV0pXG5cbiAgICAgICAgLy8gU2VuZCB0byByZW1vdGUgc2Vzc2lvblxuICAgICAgICBhd2FpdCBhY3RpdmVSZW1vdGUuc2VuZE1lc3NhZ2UocmVtb3RlQ29udGVudCwge1xuICAgICAgICAgIHV1aWQ6IHVzZXJNZXNzYWdlLnV1aWQsXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBFbnN1cmUgU2Vzc2lvblN0YXJ0IGhvb2sgY29udGV4dCBpcyBhdmFpbGFibGUgYmVmb3JlIHRoZSBmaXJzdCBBUEkgY2FsbC5cbiAgICAgIGF3YWl0IGF3YWl0UGVuZGluZ0hvb2tzKClcblxuICAgICAgYXdhaXQgaGFuZGxlUHJvbXB0U3VibWl0KHtcbiAgICAgICAgaW5wdXQsXG4gICAgICAgIGhlbHBlcnMsXG4gICAgICAgIHF1ZXJ5R3VhcmQsXG4gICAgICAgIGlzRXh0ZXJuYWxMb2FkaW5nLFxuICAgICAgICBtb2RlOiBpbnB1dE1vZGUsXG4gICAgICAgIGNvbW1hbmRzLFxuICAgICAgICBvbklucHV0Q2hhbmdlOiBzZXRJbnB1dFZhbHVlLFxuICAgICAgICBzZXRQYXN0ZWRDb250ZW50cyxcbiAgICAgICAgc2V0VG9vbEpTWCxcbiAgICAgICAgZ2V0VG9vbFVzZUNvbnRleHQsXG4gICAgICAgIG1lc3NhZ2VzOiBtZXNzYWdlc1JlZi5jdXJyZW50LFxuICAgICAgICBtYWluTG9vcE1vZGVsLFxuICAgICAgICBwYXN0ZWRDb250ZW50cyxcbiAgICAgICAgaWRlU2VsZWN0aW9uLFxuICAgICAgICBzZXRVc2VySW5wdXRPblByb2Nlc3NpbmcsXG4gICAgICAgIHNldEFib3J0Q29udHJvbGxlcixcbiAgICAgICAgYWJvcnRDb250cm9sbGVyLFxuICAgICAgICBvblF1ZXJ5LFxuICAgICAgICBzZXRBcHBTdGF0ZSxcbiAgICAgICAgcXVlcnlTb3VyY2U6IGdldFF1ZXJ5U291cmNlRm9yUkVQTCgpLFxuICAgICAgICBvbkJlZm9yZVF1ZXJ5LFxuICAgICAgICBjYW5Vc2VUb29sLFxuICAgICAgICBhZGROb3RpZmljYXRpb24sXG4gICAgICAgIHNldE1lc3NhZ2VzLFxuICAgICAgICAvLyBSZWFkIHZpYSByZWYgc28gc3RyZWFtTW9kZSBjYW4gYmUgZHJvcHBlZCBmcm9tIG9uU3VibWl0IGRlcHMg4oCUXG4gICAgICAgIC8vIGhhbmRsZVByb21wdFN1Ym1pdCBvbmx5IHVzZXMgaXQgZm9yIGRlYnVnIGxvZyArIHRlbGVtZXRyeSBldmVudC5cbiAgICAgICAgc3RyZWFtTW9kZTogc3RyZWFtTW9kZVJlZi5jdXJyZW50LFxuICAgICAgICBoYXNJbnRlcnJ1cHRpYmxlVG9vbEluUHJvZ3Jlc3M6XG4gICAgICAgICAgaGFzSW50ZXJydXB0aWJsZVRvb2xJblByb2dyZXNzUmVmLmN1cnJlbnQsXG4gICAgICB9KVxuXG4gICAgICAvLyBSZXN0b3JlIHN0YXNoIHRoYXQgd2FzIGRlZmVycmVkIGFib3ZlLiBUd28gY2FzZXM6XG4gICAgICAvLyAtIFNsYXNoIGNvbW1hbmQ6IGhhbmRsZVByb21wdFN1Ym1pdCBhd2FpdGVkIHRoZSBmdWxsIGNvbW1hbmQgZXhlY3V0aW9uXG4gICAgICAvLyAgIChpbmNsdWRpbmcgaW50ZXJhY3RpdmUgcGlja2VycykuIFJlc3RvcmluZyBub3cgcGxhY2VzIHRoZSBzdGFzaCBiYWNrIGluXG4gICAgICAvLyAgIHRoZSB2aXNpYmxlIGlucHV0LlxuICAgICAgLy8gLSBMb2FkaW5nIChxdWV1ZWQpOiBoYW5kbGVQcm9tcHRTdWJtaXQgZW5xdWV1ZWQgKyBjbGVhcmVkIGlucHV0LCB0aGVuXG4gICAgICAvLyAgIHJldHVybmVkIHF1aWNrbHkuIFJlc3RvcmluZyBub3cgcGxhY2VzIHRoZSBzdGFzaCBiYWNrIGFmdGVyIHRoZSBjbGVhci5cbiAgICAgIGlmICgoaXNTbGFzaENvbW1hbmQgfHwgaXNMb2FkaW5nKSAmJiBzdGFzaGVkUHJvbXB0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2V0SW5wdXRWYWx1ZShzdGFzaGVkUHJvbXB0LnRleHQpXG4gICAgICAgIGhlbHBlcnMuc2V0Q3Vyc29yT2Zmc2V0KHN0YXNoZWRQcm9tcHQuY3Vyc29yT2Zmc2V0KVxuICAgICAgICBzZXRQYXN0ZWRDb250ZW50cyhzdGFzaGVkUHJvbXB0LnBhc3RlZENvbnRlbnRzKVxuICAgICAgICBzZXRTdGFzaGVkUHJvbXB0KHVuZGVmaW5lZClcbiAgICAgIH1cbiAgICB9LFxuICAgIFtcbiAgICAgIHF1ZXJ5R3VhcmQsXG4gICAgICAvLyBpc0xvYWRpbmcgaXMgcmVhZCBhdCB0aGUgIWlzTG9hZGluZyBjaGVja3MgYWJvdmUgZm9yIGlucHV0LWNsZWFyaW5nXG4gICAgICAvLyBhbmQgc3VibWl0Q291bnQgZ2F0aW5nLiBJdCdzIGRlcml2ZWQgZnJvbSBpc1F1ZXJ5QWN0aXZlIHx8IGlzRXh0ZXJuYWxMb2FkaW5nLFxuICAgICAgLy8gc28gaW5jbHVkaW5nIGl0IGhlcmUgZW5zdXJlcyB0aGUgY2xvc3VyZSBjYXB0dXJlcyB0aGUgZnJlc2ggdmFsdWUuXG4gICAgICBpc0xvYWRpbmcsXG4gICAgICBpc0V4dGVybmFsTG9hZGluZyxcbiAgICAgIGlucHV0TW9kZSxcbiAgICAgIGNvbW1hbmRzLFxuICAgICAgc2V0SW5wdXRWYWx1ZSxcbiAgICAgIHNldElucHV0TW9kZSxcbiAgICAgIHNldFBhc3RlZENvbnRlbnRzLFxuICAgICAgc2V0U3VibWl0Q291bnQsXG4gICAgICBzZXRJREVTZWxlY3Rpb24sXG4gICAgICBzZXRUb29sSlNYLFxuICAgICAgZ2V0VG9vbFVzZUNvbnRleHQsXG4gICAgICAvLyBtZXNzYWdlcyBpcyByZWFkIHZpYSBtZXNzYWdlc1JlZi5jdXJyZW50IGluc2lkZSB0aGUgY2FsbGJhY2sgdG9cbiAgICAgIC8vIGtlZXAgb25TdWJtaXQgc3RhYmxlIGFjcm9zcyBtZXNzYWdlIHVwZGF0ZXMgKHNlZSBMMjM4NC9MMjQwMC9MMjY2MikuXG4gICAgICAvLyBXaXRob3V0IHRoaXMsIGVhY2ggc2V0TWVzc2FnZXMgY2FsbCAofjMww5cgcGVyIHR1cm4pIHJlY3JlYXRlc1xuICAgICAgLy8gb25TdWJtaXQsIHBpbm5pbmcgdGhlIFJFUEwgcmVuZGVyIHNjb3BlICgxNzc2QikgKyB0aGF0IHJlbmRlcidzXG4gICAgICAvLyBtZXNzYWdlcyBhcnJheSBpbiBkb3duc3RyZWFtIGNsb3N1cmVzIChQcm9tcHRJbnB1dCwgaGFuZGxlQXV0b1J1bklzc3VlKS5cbiAgICAgIC8vIEhlYXAgYW5hbHlzaXMgc2hvd2VkIH45IFJFUEwgc2NvcGVzIGFuZCB+MTUgbWVzc2FnZXMgYXJyYXkgdmVyc2lvbnNcbiAgICAgIC8vIGFjY3VtdWxhdGluZyBhZnRlciAjMjAxNzQvIzIwMTc1LCBhbGwgdHJhY2VkIHRvIHRoaXMgZGVwLlxuICAgICAgbWFpbkxvb3BNb2RlbCxcbiAgICAgIHBhc3RlZENvbnRlbnRzLFxuICAgICAgaWRlU2VsZWN0aW9uLFxuICAgICAgc2V0VXNlcklucHV0T25Qcm9jZXNzaW5nLFxuICAgICAgc2V0QWJvcnRDb250cm9sbGVyLFxuICAgICAgYWRkTm90aWZpY2F0aW9uLFxuICAgICAgb25RdWVyeSxcbiAgICAgIHN0YXNoZWRQcm9tcHQsXG4gICAgICBzZXRTdGFzaGVkUHJvbXB0LFxuICAgICAgc2V0QXBwU3RhdGUsXG4gICAgICBvbkJlZm9yZVF1ZXJ5LFxuICAgICAgY2FuVXNlVG9vbCxcbiAgICAgIHJlbW90ZVNlc3Npb24sXG4gICAgICBzZXRNZXNzYWdlcyxcbiAgICAgIGF3YWl0UGVuZGluZ0hvb2tzLFxuICAgICAgcmVwaW5TY3JvbGwsXG4gICAgXSxcbiAgKVxuXG4gIC8vIENhbGxiYWNrIGZvciB3aGVuIHVzZXIgc3VibWl0cyBpbnB1dCB3aGlsZSB2aWV3aW5nIGEgdGVhbW1hdGUncyB0cmFuc2NyaXB0XG4gIGNvbnN0IG9uQWdlbnRTdWJtaXQgPSB1c2VDYWxsYmFjayhcbiAgICBhc3luYyAoXG4gICAgICBpbnB1dDogc3RyaW5nLFxuICAgICAgdGFzazogSW5Qcm9jZXNzVGVhbW1hdGVUYXNrU3RhdGUgfCBMb2NhbEFnZW50VGFza1N0YXRlLFxuICAgICAgaGVscGVyczogUHJvbXB0SW5wdXRIZWxwZXJzLFxuICAgICkgPT4ge1xuICAgICAgaWYgKGlzTG9jYWxBZ2VudFRhc2sodGFzaykpIHtcbiAgICAgICAgYXBwZW5kTWVzc2FnZVRvTG9jYWxBZ2VudChcbiAgICAgICAgICB0YXNrLmlkLFxuICAgICAgICAgIGNyZWF0ZVVzZXJNZXNzYWdlKHsgY29udGVudDogaW5wdXQgfSksXG4gICAgICAgICAgc2V0QXBwU3RhdGUsXG4gICAgICAgIClcbiAgICAgICAgaWYgKHRhc2suc3RhdHVzID09PSAncnVubmluZycpIHtcbiAgICAgICAgICBxdWV1ZVBlbmRpbmdNZXNzYWdlKHRhc2suaWQsIGlucHV0LCBzZXRBcHBTdGF0ZSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2b2lkIHJlc3VtZUFnZW50QmFja2dyb3VuZCh7XG4gICAgICAgICAgICBhZ2VudElkOiB0YXNrLmlkLFxuICAgICAgICAgICAgcHJvbXB0OiBpbnB1dCxcbiAgICAgICAgICAgIHRvb2xVc2VDb250ZXh0OiBnZXRUb29sVXNlQ29udGV4dChcbiAgICAgICAgICAgICAgbWVzc2FnZXNSZWYuY3VycmVudCxcbiAgICAgICAgICAgICAgW10sXG4gICAgICAgICAgICAgIG5ldyBBYm9ydENvbnRyb2xsZXIoKSxcbiAgICAgICAgICAgICAgbWFpbkxvb3BNb2RlbCxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBjYW5Vc2VUb29sLFxuICAgICAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICBsb2dGb3JEZWJ1Z2dpbmcoXG4gICAgICAgICAgICAgIGByZXN1bWVBZ2VudEJhY2tncm91bmQgZmFpbGVkOiAke2Vycm9yTWVzc2FnZShlcnIpfWAsXG4gICAgICAgICAgICApXG4gICAgICAgICAgICBhZGROb3RpZmljYXRpb24oe1xuICAgICAgICAgICAgICBrZXk6IGByZXN1bWUtYWdlbnQtZmFpbGVkLSR7dGFzay5pZH1gLFxuICAgICAgICAgICAgICBqc3g6IChcbiAgICAgICAgICAgICAgICA8VGV4dCBjb2xvcj1cImVycm9yXCI+XG4gICAgICAgICAgICAgICAgICBGYWlsZWQgdG8gcmVzdW1lIGFnZW50OiB7ZXJyb3JNZXNzYWdlKGVycil9XG4gICAgICAgICAgICAgICAgPC9UZXh0PlxuICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICBwcmlvcml0eTogJ2xvdycsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluamVjdFVzZXJNZXNzYWdlVG9UZWFtbWF0ZSh0YXNrLmlkLCBpbnB1dCwgc2V0QXBwU3RhdGUpXG4gICAgICB9XG4gICAgICBzZXRJbnB1dFZhbHVlKCcnKVxuICAgICAgaGVscGVycy5zZXRDdXJzb3JPZmZzZXQoMClcbiAgICAgIGhlbHBlcnMuY2xlYXJCdWZmZXIoKVxuICAgIH0sXG4gICAgW1xuICAgICAgc2V0QXBwU3RhdGUsXG4gICAgICBzZXRJbnB1dFZhbHVlLFxuICAgICAgZ2V0VG9vbFVzZUNvbnRleHQsXG4gICAgICBjYW5Vc2VUb29sLFxuICAgICAgbWFpbkxvb3BNb2RlbCxcbiAgICAgIGFkZE5vdGlmaWNhdGlvbixcbiAgICBdLFxuICApXG5cbiAgLy8gSGFuZGxlcnMgZm9yIGF1dG8tcnVuIC9pc3N1ZSBvciAvZ29vZC1jbGF1ZGUgKGRlZmluZWQgYWZ0ZXIgb25TdWJtaXQpXG4gIGNvbnN0IGhhbmRsZUF1dG9SdW5Jc3N1ZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBjb25zdCBjb21tYW5kID0gYXV0b1J1bklzc3VlUmVhc29uXG4gICAgICA/IGdldEF1dG9SdW5Db21tYW5kKGF1dG9SdW5Jc3N1ZVJlYXNvbilcbiAgICAgIDogJy9pc3N1ZSdcbiAgICBzZXRBdXRvUnVuSXNzdWVSZWFzb24obnVsbCkgLy8gQ2xlYXIgdGhlIHN0YXRlXG4gICAgb25TdWJtaXQoY29tbWFuZCwge1xuICAgICAgc2V0Q3Vyc29yT2Zmc2V0OiAoKSA9PiB7fSxcbiAgICAgIGNsZWFyQnVmZmVyOiAoKSA9PiB7fSxcbiAgICAgIHJlc2V0SGlzdG9yeTogKCkgPT4ge30sXG4gICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGxvZ0ZvckRlYnVnZ2luZyhgQXV0by1ydW4gJHtjb21tYW5kfSBmYWlsZWQ6ICR7ZXJyb3JNZXNzYWdlKGVycil9YClcbiAgICB9KVxuICB9LCBbb25TdWJtaXQsIGF1dG9SdW5Jc3N1ZVJlYXNvbl0pXG5cbiAgY29uc3QgaGFuZGxlQ2FuY2VsQXV0b1J1bklzc3VlID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIHNldEF1dG9SdW5Jc3N1ZVJlYXNvbihudWxsKVxuICB9LCBbXSlcblxuICAvLyBIYW5kbGVyIGZvciB3aGVuIHVzZXIgcHJlc3NlcyAxIG9uIHN1cnZleSB0aGFua3Mgc2NyZWVuIHRvIHNoYXJlIGRldGFpbHNcbiAgY29uc3QgaGFuZGxlU3VydmV5UmVxdWVzdEZlZWRiYWNrID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBcImV4dGVybmFsXCIgPT09ICdhbnQnID8gJy9pc3N1ZScgOiAnL2ZlZWRiYWNrJ1xuICAgIG9uU3VibWl0KGNvbW1hbmQsIHtcbiAgICAgIHNldEN1cnNvck9mZnNldDogKCkgPT4ge30sXG4gICAgICBjbGVhckJ1ZmZlcjogKCkgPT4ge30sXG4gICAgICByZXNldEhpc3Rvcnk6ICgpID0+IHt9LFxuICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICBsb2dGb3JEZWJ1Z2dpbmcoXG4gICAgICAgIGBTdXJ2ZXkgZmVlZGJhY2sgcmVxdWVzdCBmYWlsZWQ6ICR7ZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpfWAsXG4gICAgICApXG4gICAgfSlcbiAgfSwgW29uU3VibWl0XSlcblxuICAvLyBvblN1Ym1pdCBpcyB1bnN0YWJsZSAoZGVwcyBpbmNsdWRlIGBtZXNzYWdlc2Agd2hpY2ggY2hhbmdlcyBldmVyeSB0dXJuKS5cbiAgLy8gYGhhbmRsZU9wZW5SYXRlTGltaXRPcHRpb25zYCBpcyBwcm9wLWRyaWxsZWQgdG8gZXZlcnkgTWVzc2FnZVJvdywgYW5kIGVhY2hcbiAgLy8gTWVzc2FnZVJvdyBmaWJlciBwaW5zIHRoZSBjbG9zdXJlIChhbmQgdHJhbnNpdGl2ZWx5IHRoZSBlbnRpcmUgUkVQTCByZW5kZXJcbiAgLy8gc2NvcGUsIH4xLjhLQikgYXQgbW91bnQgdGltZS4gVXNpbmcgYSByZWYga2VlcHMgdGhpcyBjYWxsYmFjayBzdGFibGUgc29cbiAgLy8gb2xkIFJFUEwgc2NvcGVzIGNhbiBiZSBHQydkIOKAlCBzYXZlcyB+MzVNQiBvdmVyIGEgMTAwMC10dXJuIHNlc3Npb24uXG4gIGNvbnN0IG9uU3VibWl0UmVmID0gdXNlUmVmKG9uU3VibWl0KVxuICBvblN1Ym1pdFJlZi5jdXJyZW50ID0gb25TdWJtaXRcbiAgY29uc3QgaGFuZGxlT3BlblJhdGVMaW1pdE9wdGlvbnMgPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgdm9pZCBvblN1Ym1pdFJlZi5jdXJyZW50KCcvcmF0ZS1saW1pdC1vcHRpb25zJywge1xuICAgICAgc2V0Q3Vyc29yT2Zmc2V0OiAoKSA9PiB7fSxcbiAgICAgIGNsZWFyQnVmZmVyOiAoKSA9PiB7fSxcbiAgICAgIHJlc2V0SGlzdG9yeTogKCkgPT4ge30sXG4gICAgfSlcbiAgfSwgW10pXG5cbiAgY29uc3QgaGFuZGxlRXhpdCA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcbiAgICBzZXRJc0V4aXRpbmcodHJ1ZSlcbiAgICAvLyBJbiBiZyBzZXNzaW9ucywgYWx3YXlzIGRldGFjaCBpbnN0ZWFkIG9mIGtpbGwg4oCUIGV2ZW4gd2hlbiBhIHdvcmt0cmVlIGlzXG4gICAgLy8gYWN0aXZlLiBXaXRob3V0IHRoaXMgZ3VhcmQsIHRoZSB3b3JrdHJlZSBicmFuY2ggYmVsb3cgc2hvcnQtY2lyY3VpdHMgaW50b1xuICAgIC8vIEV4aXRGbG93ICh3aGljaCBjYWxscyBncmFjZWZ1bFNodXRkb3duKSBiZWZvcmUgZXhpdC50c3ggaXMgZXZlciBsb2FkZWQuXG4gICAgaWYgKGZlYXR1cmUoJ0JHX1NFU1NJT05TJykgJiYgaXNCZ1Nlc3Npb24oKSkge1xuICAgICAgc3Bhd25TeW5jKCd0bXV4JywgWydkZXRhY2gtY2xpZW50J10sIHsgc3RkaW86ICdpZ25vcmUnIH0pXG4gICAgICBzZXRJc0V4aXRpbmcoZmFsc2UpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3Qgc2hvd1dvcmt0cmVlID0gZ2V0Q3VycmVudFdvcmt0cmVlU2Vzc2lvbigpICE9PSBudWxsXG4gICAgaWYgKHNob3dXb3JrdHJlZSkge1xuICAgICAgc2V0RXhpdEZsb3coXG4gICAgICAgIDxFeGl0Rmxvd1xuICAgICAgICAgIHNob3dXb3JrdHJlZVxuICAgICAgICAgIG9uRG9uZT17KCkgPT4ge319XG4gICAgICAgICAgb25DYW5jZWw9eygpID0+IHtcbiAgICAgICAgICAgIHNldEV4aXRGbG93KG51bGwpXG4gICAgICAgICAgICBzZXRJc0V4aXRpbmcoZmFsc2UpXG4gICAgICAgICAgfX1cbiAgICAgICAgLz4sXG4gICAgICApXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgZXhpdE1vZCA9IGF3YWl0IGV4aXQubG9hZCgpXG4gICAgY29uc3QgZXhpdEZsb3dSZXN1bHQgPSBhd2FpdCBleGl0TW9kLmNhbGwoKCkgPT4ge30pXG4gICAgc2V0RXhpdEZsb3coZXhpdEZsb3dSZXN1bHQpXG4gICAgLy8gSWYgY2FsbCgpIHJldHVybmVkIHdpdGhvdXQga2lsbGluZyB0aGUgcHJvY2VzcyAoYmcgc2Vzc2lvbiBkZXRhY2gpLFxuICAgIC8vIGNsZWFyIGlzRXhpdGluZyBzbyB0aGUgVUkgaXMgdXNhYmxlIG9uIHJlYXR0YWNoLiBOby1vcCBvbiB0aGUgbm9ybWFsXG4gICAgLy8gcGF0aCDigJQgZ3JhY2VmdWxTaHV0ZG93bidzIHByb2Nlc3MuZXhpdCgpIG1lYW5zIHdlIG5ldmVyIGdldCBoZXJlLlxuICAgIGlmIChleGl0Rmxvd1Jlc3VsdCA9PT0gbnVsbCkge1xuICAgICAgc2V0SXNFeGl0aW5nKGZhbHNlKVxuICAgIH1cbiAgfSwgW10pXG5cbiAgY29uc3QgaGFuZGxlU2hvd01lc3NhZ2VTZWxlY3RvciA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzZXRJc01lc3NhZ2VTZWxlY3RvclZpc2libGUocHJldiA9PiAhcHJldilcbiAgfSwgW10pXG5cbiAgLy8gUmV3aW5kIGNvbnZlcnNhdGlvbiBzdGF0ZSB0byBqdXN0IGJlZm9yZSBgbWVzc2FnZWA6IHNsaWNlIG1lc3NhZ2VzLFxuICAvLyByZXNldCBjb252ZXJzYXRpb24gSUQsIG1pY3JvY29tcGFjdCBzdGF0ZSwgcGVybWlzc2lvbiBtb2RlLCBwcm9tcHQgc3VnZ2VzdGlvbi5cbiAgLy8gRG9lcyBOT1QgdG91Y2ggdGhlIHByb21wdCBpbnB1dC4gSW5kZXggaXMgY29tcHV0ZWQgZnJvbSBtZXNzYWdlc1JlZiAoYWx3YXlzXG4gIC8vIGZyZXNoIHZpYSB0aGUgc2V0TWVzc2FnZXMgd3JhcHBlcikgc28gY2FsbGVycyBkb24ndCBuZWVkIHRvIHdvcnJ5IGFib3V0XG4gIC8vIHN0YWxlIGNsb3N1cmVzLlxuICBjb25zdCByZXdpbmRDb252ZXJzYXRpb25UbyA9IHVzZUNhbGxiYWNrKFxuICAgIChtZXNzYWdlOiBVc2VyTWVzc2FnZSkgPT4ge1xuICAgICAgY29uc3QgcHJldiA9IG1lc3NhZ2VzUmVmLmN1cnJlbnRcbiAgICAgIGNvbnN0IG1lc3NhZ2VJbmRleCA9IHByZXYubGFzdEluZGV4T2YobWVzc2FnZSlcbiAgICAgIGlmIChtZXNzYWdlSW5kZXggPT09IC0xKSByZXR1cm5cblxuICAgICAgbG9nRXZlbnQoJ3Rlbmd1X2NvbnZlcnNhdGlvbl9yZXdpbmQnLCB7XG4gICAgICAgIHByZVJld2luZE1lc3NhZ2VDb3VudDogcHJldi5sZW5ndGgsXG4gICAgICAgIHBvc3RSZXdpbmRNZXNzYWdlQ291bnQ6IG1lc3NhZ2VJbmRleCxcbiAgICAgICAgbWVzc2FnZXNSZW1vdmVkOiBwcmV2Lmxlbmd0aCAtIG1lc3NhZ2VJbmRleCxcbiAgICAgICAgcmV3aW5kVG9NZXNzYWdlSW5kZXg6IG1lc3NhZ2VJbmRleCxcbiAgICAgIH0pXG4gICAgICBzZXRNZXNzYWdlcyhwcmV2LnNsaWNlKDAsIG1lc3NhZ2VJbmRleCkpXG4gICAgICAvLyBDYXJlZnVsLCB0aGlzIGhhcyB0byBoYXBwZW4gYWZ0ZXIgc2V0TWVzc2FnZXNcbiAgICAgIHNldENvbnZlcnNhdGlvbklkKHJhbmRvbVVVSUQoKSlcbiAgICAgIC8vIFJlc2V0IGNhY2hlZCBtaWNyb2NvbXBhY3Qgc3RhdGUgc28gc3RhbGUgcGlubmVkIGNhY2hlIGVkaXRzXG4gICAgICAvLyBkb24ndCByZWZlcmVuY2UgdG9vbF91c2VfaWRzIGZyb20gdHJ1bmNhdGVkIG1lc3NhZ2VzXG4gICAgICByZXNldE1pY3JvY29tcGFjdFN0YXRlKClcbiAgICAgIGlmIChmZWF0dXJlKCdDT05URVhUX0NPTExBUFNFJykpIHtcbiAgICAgICAgLy8gUmV3aW5kIHRydW5jYXRlcyB0aGUgUkVQTCBhcnJheS4gQ29tbWl0cyB3aG9zZSBhcmNoaXZlZCBzcGFuXG4gICAgICAgIC8vIHdhcyBwYXN0IHRoZSByZXdpbmQgcG9pbnQgY2FuJ3QgYmUgcHJvamVjdGVkIGFueW1vcmVcbiAgICAgICAgLy8gKHByb2plY3RWaWV3IHNpbGVudGx5IHNraXBzIHRoZW0pIGJ1dCB0aGUgc3RhZ2VkIHF1ZXVlIGFuZCBJRFxuICAgICAgICAvLyBtYXBzIHJlZmVyZW5jZSBzdGFsZSB1dWlkcy4gU2ltcGxlc3Qgc2FmZSByZXNldDogZHJvcFxuICAgICAgICAvLyBldmVyeXRoaW5nLiBUaGUgY3R4LWFnZW50IHdpbGwgcmUtc3RhZ2Ugb24gdGhlIG5leHRcbiAgICAgICAgLy8gdGhyZXNob2xkIGNyb3NzaW5nLlxuICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzICovXG4gICAgICAgIDsoXG4gICAgICAgICAgcmVxdWlyZSgnLi4vc2VydmljZXMvY29udGV4dENvbGxhcHNlL2luZGV4LmpzJykgYXMgdHlwZW9mIGltcG9ydCgnLi4vc2VydmljZXMvY29udGV4dENvbGxhcHNlL2luZGV4LmpzJylcbiAgICAgICAgKS5yZXNldENvbnRleHRDb2xsYXBzZSgpXG4gICAgICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuICAgICAgfVxuXG4gICAgICAvLyBSZXN0b3JlIHN0YXRlIGZyb20gdGhlIG1lc3NhZ2Ugd2UncmUgcmV3aW5kaW5nIHRvXG4gICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+ICh7XG4gICAgICAgIC4uLnByZXYsXG4gICAgICAgIC8vIFJlc3RvcmUgcGVybWlzc2lvbiBtb2RlIGZyb20gdGhlIG1lc3NhZ2VcbiAgICAgICAgdG9vbFBlcm1pc3Npb25Db250ZXh0OlxuICAgICAgICAgIG1lc3NhZ2UucGVybWlzc2lvbk1vZGUgJiZcbiAgICAgICAgICBwcmV2LnRvb2xQZXJtaXNzaW9uQ29udGV4dC5tb2RlICE9PSBtZXNzYWdlLnBlcm1pc3Npb25Nb2RlXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICAuLi5wcmV2LnRvb2xQZXJtaXNzaW9uQ29udGV4dCxcbiAgICAgICAgICAgICAgICBtb2RlOiBtZXNzYWdlLnBlcm1pc3Npb25Nb2RlLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICA6IHByZXYudG9vbFBlcm1pc3Npb25Db250ZXh0LFxuICAgICAgICAvLyBDbGVhciBzdGFsZSBwcm9tcHQgc3VnZ2VzdGlvbiBmcm9tIHByZXZpb3VzIGNvbnZlcnNhdGlvbiBzdGF0ZVxuICAgICAgICBwcm9tcHRTdWdnZXN0aW9uOiB7XG4gICAgICAgICAgdGV4dDogbnVsbCxcbiAgICAgICAgICBwcm9tcHRJZDogbnVsbCxcbiAgICAgICAgICBzaG93bkF0OiAwLFxuICAgICAgICAgIGFjY2VwdGVkQXQ6IDAsXG4gICAgICAgICAgZ2VuZXJhdGlvblJlcXVlc3RJZDogbnVsbCxcbiAgICAgICAgfSxcbiAgICAgIH0pKVxuICAgIH0sXG4gICAgW3NldE1lc3NhZ2VzLCBzZXRBcHBTdGF0ZV0sXG4gIClcblxuICAvLyBTeW5jaHJvbm91cyByZXdpbmQgKyBpbnB1dCBwb3B1bGF0aW9uLiBVc2VkIGRpcmVjdGx5IGJ5IGF1dG8tcmVzdG9yZSBvblxuICAvLyBpbnRlcnJ1cHQgKHNvIFJlYWN0IGJhdGNoZXMgd2l0aCB0aGUgYWJvcnQncyBzZXRNZXNzYWdlcyDihpIgc2luZ2xlIHJlbmRlcixcbiAgLy8gbm8gZmxpY2tlcikuIE1lc3NhZ2VTZWxlY3RvciB3cmFwcyB0aGlzIGluIHNldEltbWVkaWF0ZSB2aWEgaGFuZGxlUmVzdG9yZU1lc3NhZ2UuXG4gIGNvbnN0IHJlc3RvcmVNZXNzYWdlU3luYyA9IHVzZUNhbGxiYWNrKFxuICAgIChtZXNzYWdlOiBVc2VyTWVzc2FnZSkgPT4ge1xuICAgICAgcmV3aW5kQ29udmVyc2F0aW9uVG8obWVzc2FnZSlcblxuICAgICAgY29uc3QgciA9IHRleHRGb3JSZXN1Ym1pdChtZXNzYWdlKVxuICAgICAgaWYgKHIpIHtcbiAgICAgICAgc2V0SW5wdXRWYWx1ZShyLnRleHQpXG4gICAgICAgIHNldElucHV0TW9kZShyLm1vZGUpXG4gICAgICB9XG5cbiAgICAgIC8vIFJlc3RvcmUgcGFzdGVkIGltYWdlc1xuICAgICAgaWYgKFxuICAgICAgICBBcnJheS5pc0FycmF5KG1lc3NhZ2UubWVzc2FnZS5jb250ZW50KSAmJlxuICAgICAgICBtZXNzYWdlLm1lc3NhZ2UuY29udGVudC5zb21lKGJsb2NrID0+IGJsb2NrLnR5cGUgPT09ICdpbWFnZScpXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgaW1hZ2VCbG9ja3M6IEFycmF5PEltYWdlQmxvY2tQYXJhbT4gPVxuICAgICAgICAgIG1lc3NhZ2UubWVzc2FnZS5jb250ZW50LmZpbHRlcihibG9jayA9PiBibG9jay50eXBlID09PSAnaW1hZ2UnKVxuICAgICAgICBpZiAoaW1hZ2VCbG9ja3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IG5ld1Bhc3RlZENvbnRlbnRzOiBSZWNvcmQ8bnVtYmVyLCBQYXN0ZWRDb250ZW50PiA9IHt9XG4gICAgICAgICAgaW1hZ2VCbG9ja3MuZm9yRWFjaCgoYmxvY2ssIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAoYmxvY2suc291cmNlLnR5cGUgPT09ICdiYXNlNjQnKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGlkID0gbWVzc2FnZS5pbWFnZVBhc3RlSWRzPy5baW5kZXhdID8/IGluZGV4ICsgMVxuICAgICAgICAgICAgICBuZXdQYXN0ZWRDb250ZW50c1tpZF0gPSB7XG4gICAgICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlJyxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBibG9jay5zb3VyY2UuZGF0YSxcbiAgICAgICAgICAgICAgICBtZWRpYVR5cGU6IGJsb2NrLnNvdXJjZS5tZWRpYV90eXBlLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgICBzZXRQYXN0ZWRDb250ZW50cyhuZXdQYXN0ZWRDb250ZW50cylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgW3Jld2luZENvbnZlcnNhdGlvblRvLCBzZXRJbnB1dFZhbHVlXSxcbiAgKVxuICByZXN0b3JlTWVzc2FnZVN5bmNSZWYuY3VycmVudCA9IHJlc3RvcmVNZXNzYWdlU3luY1xuXG4gIC8vIE1lc3NhZ2VTZWxlY3RvciBwYXRoOiBkZWZlciB2aWEgc2V0SW1tZWRpYXRlIHNvIHRoZSBcIkludGVycnVwdGVkXCIgbWVzc2FnZVxuICAvLyByZW5kZXJzIHRvIHN0YXRpYyBvdXRwdXQgYmVmb3JlIHJld2luZCDigJQgb3RoZXJ3aXNlIGl0IHJlbWFpbnMgdmVzdGlnaWFsXG4gIC8vIGF0IHRoZSB0b3Agb2YgdGhlIHNjcmVlbi5cbiAgY29uc3QgaGFuZGxlUmVzdG9yZU1lc3NhZ2UgPSB1c2VDYWxsYmFjayhcbiAgICBhc3luYyAobWVzc2FnZTogVXNlck1lc3NhZ2UpID0+IHtcbiAgICAgIHNldEltbWVkaWF0ZShcbiAgICAgICAgKHJlc3RvcmUsIG1lc3NhZ2UpID0+IHJlc3RvcmUobWVzc2FnZSksXG4gICAgICAgIHJlc3RvcmVNZXNzYWdlU3luYyxcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgIClcbiAgICB9LFxuICAgIFtyZXN0b3JlTWVzc2FnZVN5bmNdLFxuICApXG5cbiAgLy8gTm90IG1lbW9pemVkIOKAlCBob29rIHN0b3JlcyBjYXBzIHZpYSByZWYsIHJlYWRzIGxhdGVzdCBjbG9zdXJlIGF0IGRpc3BhdGNoLlxuICAvLyAyNC1jaGFyIHByZWZpeDogZGVyaXZlVVVJRCBwcmVzZXJ2ZXMgZmlyc3QgMjQsIHJlbmRlcmFibGUgdXVpZCBwcmVmaXgtbWF0Y2hlcyByYXcgc291cmNlLlxuICBjb25zdCBmaW5kUmF3SW5kZXggPSAodXVpZDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgcHJlZml4ID0gdXVpZC5zbGljZSgwLCAyNClcbiAgICByZXR1cm4gbWVzc2FnZXMuZmluZEluZGV4KG0gPT4gbS51dWlkLnNsaWNlKDAsIDI0KSA9PT0gcHJlZml4KVxuICB9XG4gIGNvbnN0IG1lc3NhZ2VBY3Rpb25DYXBzOiBNZXNzYWdlQWN0aW9uQ2FwcyA9IHtcbiAgICBjb3B5OiB0ZXh0ID0+XG4gICAgICAvLyBzZXRDbGlwYm9hcmQgUkVUVVJOUyBPU0MgNTIg4oCUIGNhbGxlciBtdXN0IHN0ZG91dC53cml0ZSAodG11eCBzaWRlLWVmZmVjdHMgbG9hZC1idWZmZXIsIGJ1dCB0aGF0J3MgdG11eC1vbmx5KS5cbiAgICAgIHZvaWQgc2V0Q2xpcGJvYXJkKHRleHQpLnRoZW4ocmF3ID0+IHtcbiAgICAgICAgaWYgKHJhdykgcHJvY2Vzcy5zdGRvdXQud3JpdGUocmF3KVxuICAgICAgICBhZGROb3RpZmljYXRpb24oe1xuICAgICAgICAgIC8vIFNhbWUga2V5IGFzIHRleHQtc2VsZWN0aW9uIGNvcHkg4oCUIHJlcGVhdGVkIGNvcGllcyByZXBsYWNlIHRvYXN0LCBkb24ndCBxdWV1ZS5cbiAgICAgICAgICBrZXk6ICdzZWxlY3Rpb24tY29waWVkJyxcbiAgICAgICAgICB0ZXh0OiAnY29waWVkJyxcbiAgICAgICAgICBjb2xvcjogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIHByaW9yaXR5OiAnaW1tZWRpYXRlJyxcbiAgICAgICAgICB0aW1lb3V0TXM6IDIwMDAsXG4gICAgICAgIH0pXG4gICAgICB9KSxcbiAgICBlZGl0OiBhc3luYyBtc2cgPT4ge1xuICAgICAgLy8gU2FtZSBza2lwLWNvbmZpcm0gY2hlY2sgYXMgL3Jld2luZDogbG9zc2xlc3Mg4oaSIGRpcmVjdCwgZWxzZSBjb25maXJtIGRpYWxvZy5cbiAgICAgIGNvbnN0IHJhd0lkeCA9IGZpbmRSYXdJbmRleChtc2cudXVpZClcbiAgICAgIGNvbnN0IHJhdyA9IHJhd0lkeCA+PSAwID8gbWVzc2FnZXNbcmF3SWR4XSA6IHVuZGVmaW5lZFxuICAgICAgaWYgKCFyYXcgfHwgIXNlbGVjdGFibGVVc2VyTWVzc2FnZXNGaWx0ZXIocmF3KSkgcmV0dXJuXG4gICAgICBjb25zdCBub0ZpbGVDaGFuZ2VzID0gIShhd2FpdCBmaWxlSGlzdG9yeUhhc0FueUNoYW5nZXMoXG4gICAgICAgIGZpbGVIaXN0b3J5LFxuICAgICAgICByYXcudXVpZCxcbiAgICAgICkpXG4gICAgICBjb25zdCBvbmx5U3ludGhldGljID0gbWVzc2FnZXNBZnRlckFyZU9ubHlTeW50aGV0aWMobWVzc2FnZXMsIHJhd0lkeClcbiAgICAgIGlmIChub0ZpbGVDaGFuZ2VzICYmIG9ubHlTeW50aGV0aWMpIHtcbiAgICAgICAgLy8gcmV3aW5kQ29udmVyc2F0aW9uVG8ncyBzZXRNZXNzYWdlcyByYWNlcyBzdHJlYW0gYXBwZW5kcyDigJQgY2FuY2VsIGZpcnN0IChpZGVtcG90ZW50KS5cbiAgICAgICAgb25DYW5jZWwoKVxuICAgICAgICAvLyBoYW5kbGVSZXN0b3JlTWVzc2FnZSBhbHNvIHJlc3RvcmVzIHBhc3RlZCBpbWFnZXMuXG4gICAgICAgIHZvaWQgaGFuZGxlUmVzdG9yZU1lc3NhZ2UocmF3KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGlhbG9nIHBhdGg6IG9uUHJlUmVzdG9yZSAoPSBvbkNhbmNlbCkgZmlyZXMgd2hlbiB1c2VyIENPTkZJUk1TLCBub3Qgb24gbmV2ZXJtaW5kLlxuICAgICAgICBzZXRNZXNzYWdlU2VsZWN0b3JQcmVzZWxlY3QocmF3KVxuICAgICAgICBzZXRJc01lc3NhZ2VTZWxlY3RvclZpc2libGUodHJ1ZSlcbiAgICAgIH1cbiAgICB9LFxuICB9XG4gIGNvbnN0IHsgZW50ZXI6IGVudGVyTWVzc2FnZUFjdGlvbnMsIGhhbmRsZXJzOiBtZXNzYWdlQWN0aW9uSGFuZGxlcnMgfSA9XG4gICAgdXNlTWVzc2FnZUFjdGlvbnMoY3Vyc29yLCBzZXRDdXJzb3IsIGN1cnNvck5hdlJlZiwgbWVzc2FnZUFjdGlvbkNhcHMpXG5cbiAgYXN5bmMgZnVuY3Rpb24gb25Jbml0KCkge1xuICAgIC8vIEFsd2F5cyB2ZXJpZnkgQVBJIGtleSBvbiBzdGFydHVwLCBzbyB3ZSBjYW4gc2hvdyB0aGUgdXNlciBhbiBlcnJvciBpbiB0aGVcbiAgICAvLyBib3R0b20gcmlnaHQgY29ybmVyIG9mIHRoZSBzY3JlZW4gaWYgdGhlIEFQSSBrZXkgaXMgaW52YWxpZC5cbiAgICB2b2lkIHJldmVyaWZ5KClcblxuICAgIC8vIFBvcHVsYXRlIHJlYWRGaWxlU3RhdGUgd2l0aCBDTEFVREUubWQgZmlsZXMgYXQgc3RhcnR1cFxuICAgIGNvbnN0IG1lbW9yeUZpbGVzID0gYXdhaXQgZ2V0TWVtb3J5RmlsZXMoKVxuICAgIGlmIChtZW1vcnlGaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBmaWxlTGlzdCA9IG1lbW9yeUZpbGVzXG4gICAgICAgIC5tYXAoXG4gICAgICAgICAgZiA9PlxuICAgICAgICAgICAgYCAgWyR7Zi50eXBlfV0gJHtmLnBhdGh9ICgke2YuY29udGVudC5sZW5ndGh9IGNoYXJzKSR7Zi5wYXJlbnQgPyBgIChpbmNsdWRlZCBieSAke2YucGFyZW50fSlgIDogJyd9YCxcbiAgICAgICAgKVxuICAgICAgICAuam9pbignXFxuJylcbiAgICAgIGxvZ0ZvckRlYnVnZ2luZyhcbiAgICAgICAgYExvYWRlZCAke21lbW9yeUZpbGVzLmxlbmd0aH0gQ0xBVURFLm1kL3J1bGVzIGZpbGVzOlxcbiR7ZmlsZUxpc3R9YCxcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nRm9yRGVidWdnaW5nKCdObyBDTEFVREUubWQvcnVsZXMgZmlsZXMgZm91bmQnKVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgbWVtb3J5RmlsZXMpIHtcbiAgICAgIC8vIFdoZW4gdGhlIGluamVjdGVkIGNvbnRlbnQgZG9lc24ndCBtYXRjaCBkaXNrIChzdHJpcHBlZCBIVE1MIGNvbW1lbnRzLFxuICAgICAgLy8gc3RyaXBwZWQgZnJvbnRtYXR0ZXIsIE1FTU9SWS5tZCB0cnVuY2F0aW9uKSwgY2FjaGUgdGhlIFJBVyBkaXNrIGJ5dGVzXG4gICAgICAvLyB3aXRoIGlzUGFydGlhbFZpZXcgc28gRWRpdC9Xcml0ZSByZXF1aXJlIGEgcmVhbCBSZWFkIGZpcnN0IHdoaWxlXG4gICAgICAvLyBnZXRDaGFuZ2VkRmlsZXMgKyBuZXN0ZWRfbWVtb3J5IGRlZHVwIHN0aWxsIHdvcmsuXG4gICAgICByZWFkRmlsZVN0YXRlLmN1cnJlbnQuc2V0KGZpbGUucGF0aCwge1xuICAgICAgICBjb250ZW50OiBmaWxlLmNvbnRlbnREaWZmZXJzRnJvbURpc2tcbiAgICAgICAgICA/IChmaWxlLnJhd0NvbnRlbnQgPz8gZmlsZS5jb250ZW50KVxuICAgICAgICAgIDogZmlsZS5jb250ZW50LFxuICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICAgIG9mZnNldDogdW5kZWZpbmVkLFxuICAgICAgICBsaW1pdDogdW5kZWZpbmVkLFxuICAgICAgICBpc1BhcnRpYWxWaWV3OiBmaWxlLmNvbnRlbnREaWZmZXJzRnJvbURpc2ssXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIEluaXRpYWwgbWVzc2FnZSBoYW5kbGluZyBpcyBkb25lIHZpYSB0aGUgaW5pdGlhbE1lc3NhZ2UgZWZmZWN0XG4gIH1cblxuICAvLyBSZWdpc3RlciBjb3N0IHN1bW1hcnkgdHJhY2tlclxuICB1c2VDb3N0U3VtbWFyeSh1c2VGcHNNZXRyaWNzKCkpXG5cbiAgLy8gUmVjb3JkIHRyYW5zY3JpcHRzIGxvY2FsbHksIGZvciBkZWJ1Z2dpbmcgYW5kIGNvbnZlcnNhdGlvbiByZWNvdmVyeVxuICAvLyBEb24ndCByZWNvcmQgY29udmVyc2F0aW9uIGlmIHdlIG9ubHkgaGF2ZSBpbml0aWFsIG1lc3NhZ2VzOyBvcHRpbWl6ZXNcbiAgLy8gdGhlIGNhc2Ugd2hlcmUgdXNlciByZXN1bWVzIGEgY29udmVyc2F0aW9uIHRoZW4gcXVpdGVzIGJlZm9yZSBkb2luZ1xuICAvLyBhbnl0aGluZyBlbHNlXG4gIHVzZUxvZ01lc3NhZ2VzKG1lc3NhZ2VzLCBtZXNzYWdlcy5sZW5ndGggPT09IGluaXRpYWxNZXNzYWdlcz8ubGVuZ3RoKVxuXG4gIC8vIFJFUEwgQnJpZGdlOiByZXBsaWNhdGUgdXNlci9hc3Npc3RhbnQgbWVzc2FnZXMgdG8gdGhlIGJyaWRnZSBzZXNzaW9uXG4gIC8vIGZvciByZW1vdGUgYWNjZXNzIHZpYSBjbGF1ZGUuYWkuIE5vLW9wIGluIGV4dGVybmFsIGJ1aWxkcyBvciB3aGVuIG5vdCBlbmFibGVkLlxuICBjb25zdCB7IHNlbmRCcmlkZ2VSZXN1bHQgfSA9IHVzZVJlcGxCcmlkZ2UoXG4gICAgbWVzc2FnZXMsXG4gICAgc2V0TWVzc2FnZXMsXG4gICAgYWJvcnRDb250cm9sbGVyUmVmLFxuICAgIGNvbW1hbmRzLFxuICAgIG1haW5Mb29wTW9kZWwsXG4gIClcbiAgc2VuZEJyaWRnZVJlc3VsdFJlZi5jdXJyZW50ID0gc2VuZEJyaWRnZVJlc3VsdFxuXG4gIHVzZUFmdGVyRmlyc3RSZW5kZXIoKVxuXG4gIC8vIFRyYWNrIHByb21wdCBxdWV1ZSB1c2FnZSBmb3IgYW5hbHl0aWNzLiBGaXJlIG9uY2UgcGVyIHRyYW5zaXRpb24gZnJvbVxuICAvLyBlbXB0eSB0byBub24tZW1wdHksIG5vdCBvbiBldmVyeSBsZW5ndGggY2hhbmdlIC0tIG90aGVyd2lzZSBhIHJlbmRlciBsb29wXG4gIC8vIChjb25jdXJyZW50IG9uUXVlcnkgdGhyYXNoaW5nLCBldGMuKSBzcGFtcyBzYXZlR2xvYmFsQ29uZmlnLCB3aGljaCBoaXRzXG4gIC8vIEVMT0NLRUQgdW5kZXIgY29uY3VycmVudCBzZXNzaW9ucyBhbmQgZmFsbHMgYmFjayB0byB1bmxvY2tlZCB3cml0ZXMuXG4gIC8vIFRoYXQgd3JpdGUgc3Rvcm0gaXMgdGhlIHByaW1hcnkgdHJpZ2dlciBmb3Igfi8uY2xhdWRlLmpzb24gY29ycnVwdGlvblxuICAvLyAoR0ggIzMxMTcpLlxuICBjb25zdCBoYXNDb3VudGVkUXVldWVVc2VSZWYgPSB1c2VSZWYoZmFsc2UpXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKHF1ZXVlZENvbW1hbmRzLmxlbmd0aCA8IDEpIHtcbiAgICAgIGhhc0NvdW50ZWRRdWV1ZVVzZVJlZi5jdXJyZW50ID0gZmFsc2VcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoaGFzQ291bnRlZFF1ZXVlVXNlUmVmLmN1cnJlbnQpIHJldHVyblxuICAgIGhhc0NvdW50ZWRRdWV1ZVVzZVJlZi5jdXJyZW50ID0gdHJ1ZVxuICAgIHNhdmVHbG9iYWxDb25maWcoY3VycmVudCA9PiAoe1xuICAgICAgLi4uY3VycmVudCxcbiAgICAgIHByb21wdFF1ZXVlVXNlQ291bnQ6IChjdXJyZW50LnByb21wdFF1ZXVlVXNlQ291bnQgPz8gMCkgKyAxLFxuICAgIH0pKVxuICB9LCBbcXVldWVkQ29tbWFuZHMubGVuZ3RoXSlcblxuICAvLyBQcm9jZXNzIHF1ZXVlZCBjb21tYW5kcyB3aGVuIHF1ZXJ5IGNvbXBsZXRlcyBhbmQgcXVldWUgaGFzIGl0ZW1zXG5cbiAgY29uc3QgZXhlY3V0ZVF1ZXVlZElucHV0ID0gdXNlQ2FsbGJhY2soXG4gICAgYXN5bmMgKHF1ZXVlZENvbW1hbmRzOiBRdWV1ZWRDb21tYW5kW10pID0+IHtcbiAgICAgIGF3YWl0IGhhbmRsZVByb21wdFN1Ym1pdCh7XG4gICAgICAgIGhlbHBlcnM6IHtcbiAgICAgICAgICBzZXRDdXJzb3JPZmZzZXQ6ICgpID0+IHt9LFxuICAgICAgICAgIGNsZWFyQnVmZmVyOiAoKSA9PiB7fSxcbiAgICAgICAgICByZXNldEhpc3Rvcnk6ICgpID0+IHt9LFxuICAgICAgICB9LFxuICAgICAgICBxdWVyeUd1YXJkLFxuICAgICAgICBjb21tYW5kcyxcbiAgICAgICAgb25JbnB1dENoYW5nZTogKCkgPT4ge30sXG4gICAgICAgIHNldFBhc3RlZENvbnRlbnRzOiAoKSA9PiB7fSxcbiAgICAgICAgc2V0VG9vbEpTWCxcbiAgICAgICAgZ2V0VG9vbFVzZUNvbnRleHQsXG4gICAgICAgIG1lc3NhZ2VzLFxuICAgICAgICBtYWluTG9vcE1vZGVsLFxuICAgICAgICBpZGVTZWxlY3Rpb24sXG4gICAgICAgIHNldFVzZXJJbnB1dE9uUHJvY2Vzc2luZyxcbiAgICAgICAgc2V0QWJvcnRDb250cm9sbGVyLFxuICAgICAgICBvblF1ZXJ5LFxuICAgICAgICBzZXRBcHBTdGF0ZSxcbiAgICAgICAgcXVlcnlTb3VyY2U6IGdldFF1ZXJ5U291cmNlRm9yUkVQTCgpLFxuICAgICAgICBvbkJlZm9yZVF1ZXJ5LFxuICAgICAgICBjYW5Vc2VUb29sLFxuICAgICAgICBhZGROb3RpZmljYXRpb24sXG4gICAgICAgIHNldE1lc3NhZ2VzLFxuICAgICAgICBxdWV1ZWRDb21tYW5kcyxcbiAgICAgIH0pXG4gICAgfSxcbiAgICBbXG4gICAgICBxdWVyeUd1YXJkLFxuICAgICAgY29tbWFuZHMsXG4gICAgICBzZXRUb29sSlNYLFxuICAgICAgZ2V0VG9vbFVzZUNvbnRleHQsXG4gICAgICBtZXNzYWdlcyxcbiAgICAgIG1haW5Mb29wTW9kZWwsXG4gICAgICBpZGVTZWxlY3Rpb24sXG4gICAgICBzZXRVc2VySW5wdXRPblByb2Nlc3NpbmcsXG4gICAgICBjYW5Vc2VUb29sLFxuICAgICAgc2V0QWJvcnRDb250cm9sbGVyLFxuICAgICAgb25RdWVyeSxcbiAgICAgIGFkZE5vdGlmaWNhdGlvbixcbiAgICAgIHNldEFwcFN0YXRlLFxuICAgICAgb25CZWZvcmVRdWVyeSxcbiAgICBdLFxuICApXG5cbiAgdXNlUXVldWVQcm9jZXNzb3Ioe1xuICAgIGV4ZWN1dGVRdWV1ZWRJbnB1dCxcbiAgICBoYXNBY3RpdmVMb2NhbEpzeFVJOiBpc1Nob3dpbmdMb2NhbEpTWENvbW1hbmQsXG4gICAgcXVlcnlHdWFyZCxcbiAgfSlcblxuICAvLyBXZSdsbCB1c2UgdGhlIGdsb2JhbCBsYXN0SW50ZXJhY3Rpb25UaW1lIGZyb20gc3RhdGUudHNcblxuICAvLyBVcGRhdGUgbGFzdCBpbnRlcmFjdGlvbiB0aW1lIHdoZW4gaW5wdXQgY2hhbmdlcy5cbiAgLy8gTXVzdCBiZSBpbW1lZGlhdGUgYmVjYXVzZSB1c2VFZmZlY3QgcnVucyBhZnRlciB0aGUgSW5rIHJlbmRlciBjeWNsZSBmbHVzaC5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBhY3Rpdml0eU1hbmFnZXIucmVjb3JkVXNlckFjdGl2aXR5KClcbiAgICB1cGRhdGVMYXN0SW50ZXJhY3Rpb25UaW1lKHRydWUpXG4gIH0sIFtpbnB1dFZhbHVlLCBzdWJtaXRDb3VudF0pXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoc3VibWl0Q291bnQgPT09IDEpIHtcbiAgICAgIHN0YXJ0QmFja2dyb3VuZEhvdXNla2VlcGluZygpXG4gICAgfVxuICB9LCBbc3VibWl0Q291bnRdKVxuXG4gIC8vIFNob3cgbm90aWZpY2F0aW9uIHdoZW4gQ2xhdWRlIGlzIGRvbmUgcmVzcG9uZGluZyBhbmQgdXNlciBpcyBpZGxlXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgLy8gRG9uJ3Qgc2V0IHVwIG5vdGlmaWNhdGlvbiBpZiBDbGF1ZGUgaXMgYnVzeVxuICAgIGlmIChpc0xvYWRpbmcpIHJldHVyblxuXG4gICAgLy8gT25seSBlbmFibGUgbm90aWZpY2F0aW9ucyBhZnRlciB0aGUgZmlyc3QgbmV3IGludGVyYWN0aW9uIGluIHRoaXMgc2Vzc2lvblxuICAgIGlmIChzdWJtaXRDb3VudCA9PT0gMCkgcmV0dXJuXG5cbiAgICAvLyBObyBxdWVyeSBoYXMgY29tcGxldGVkIHlldFxuICAgIGlmIChsYXN0UXVlcnlDb21wbGV0aW9uVGltZSA9PT0gMCkgcmV0dXJuXG5cbiAgICAvLyBTZXQgdGltZW91dCB0byBjaGVjayBpZGxlIHN0YXRlXG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KFxuICAgICAgKFxuICAgICAgICBsYXN0UXVlcnlDb21wbGV0aW9uVGltZSxcbiAgICAgICAgaXNMb2FkaW5nLFxuICAgICAgICB0b29sSlNYLFxuICAgICAgICBmb2N1c2VkSW5wdXREaWFsb2dSZWYsXG4gICAgICAgIHRlcm1pbmFsLFxuICAgICAgKSA9PiB7XG4gICAgICAgIC8vIENoZWNrIGlmIHVzZXIgaGFzIGludGVyYWN0ZWQgc2luY2UgdGhlIHJlc3BvbnNlIGVuZGVkXG4gICAgICAgIGNvbnN0IGxhc3RVc2VySW50ZXJhY3Rpb24gPSBnZXRMYXN0SW50ZXJhY3Rpb25UaW1lKClcblxuICAgICAgICBpZiAobGFzdFVzZXJJbnRlcmFjdGlvbiA+IGxhc3RRdWVyeUNvbXBsZXRpb25UaW1lKSB7XG4gICAgICAgICAgLy8gVXNlciBoYXMgaW50ZXJhY3RlZCBzaW5jZSBDbGF1ZGUgZmluaXNoZWQgLSB0aGV5J3JlIG5vdCBpZGxlLCBkb24ndCBub3RpZnlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXIgaGFzbid0IGludGVyYWN0ZWQgc2luY2UgcmVzcG9uc2UgZW5kZWQsIGNoZWNrIG90aGVyIGNvbmRpdGlvbnNcbiAgICAgICAgY29uc3QgaWRsZVRpbWVTaW5jZVJlc3BvbnNlID0gRGF0ZS5ub3coKSAtIGxhc3RRdWVyeUNvbXBsZXRpb25UaW1lXG4gICAgICAgIGlmIChcbiAgICAgICAgICAhaXNMb2FkaW5nICYmXG4gICAgICAgICAgIXRvb2xKU1ggJiZcbiAgICAgICAgICAvLyBVc2UgcmVmIHRvIGdldCBjdXJyZW50IGRpYWxvZyBzdGF0ZSwgYXZvaWRpbmcgc3RhbGUgY2xvc3VyZVxuICAgICAgICAgIGZvY3VzZWRJbnB1dERpYWxvZ1JlZi5jdXJyZW50ID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICBpZGxlVGltZVNpbmNlUmVzcG9uc2UgPj0gZ2V0R2xvYmFsQ29uZmlnKCkubWVzc2FnZUlkbGVOb3RpZlRocmVzaG9sZE1zXG4gICAgICAgICkge1xuICAgICAgICAgIHZvaWQgc2VuZE5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0NsYXVkZSBpcyB3YWl0aW5nIGZvciB5b3VyIGlucHV0JyxcbiAgICAgICAgICAgICAgbm90aWZpY2F0aW9uVHlwZTogJ2lkbGVfcHJvbXB0JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZXJtaW5hbCxcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBnZXRHbG9iYWxDb25maWcoKS5tZXNzYWdlSWRsZU5vdGlmVGhyZXNob2xkTXMsXG4gICAgICBsYXN0UXVlcnlDb21wbGV0aW9uVGltZSxcbiAgICAgIGlzTG9hZGluZyxcbiAgICAgIHRvb2xKU1gsXG4gICAgICBmb2N1c2VkSW5wdXREaWFsb2dSZWYsXG4gICAgICB0ZXJtaW5hbCxcbiAgICApXG5cbiAgICByZXR1cm4gKCkgPT4gY2xlYXJUaW1lb3V0KHRpbWVyKVxuICB9LCBbaXNMb2FkaW5nLCB0b29sSlNYLCBzdWJtaXRDb3VudCwgbGFzdFF1ZXJ5Q29tcGxldGlvblRpbWUsIHRlcm1pbmFsXSlcblxuICAvLyBJZGxlLXJldHVybiBoaW50OiBzaG93IG5vdGlmaWNhdGlvbiB3aGVuIGlkbGUgdGhyZXNob2xkIGlzIGV4Y2VlZGVkLlxuICAvLyBUaW1lciBmaXJlcyBhZnRlciB0aGUgY29uZmlndXJlZCBpZGxlIHBlcmlvZDsgbm90aWZpY2F0aW9uIHBlcnNpc3RzIHVudGlsXG4gIC8vIGRpc21pc3NlZCBvciB0aGUgdXNlciBzdWJtaXRzLlxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChsYXN0UXVlcnlDb21wbGV0aW9uVGltZSA9PT0gMCkgcmV0dXJuXG4gICAgaWYgKGlzTG9hZGluZykgcmV0dXJuXG4gICAgY29uc3Qgd2lsbG93TW9kZTogc3RyaW5nID0gZ2V0RmVhdHVyZVZhbHVlX0NBQ0hFRF9NQVlfQkVfU1RBTEUoXG4gICAgICAndGVuZ3Vfd2lsbG93X21vZGUnLFxuICAgICAgJ29mZicsXG4gICAgKVxuICAgIGlmICh3aWxsb3dNb2RlICE9PSAnaGludCcgJiYgd2lsbG93TW9kZSAhPT0gJ2hpbnRfdjInKSByZXR1cm5cbiAgICBpZiAoZ2V0R2xvYmFsQ29uZmlnKCkuaWRsZVJldHVybkRpc21pc3NlZCkgcmV0dXJuXG5cbiAgICBjb25zdCB0b2tlblRocmVzaG9sZCA9IE51bWJlcihcbiAgICAgIHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0lETEVfVE9LRU5fVEhSRVNIT0xEID8/IDEwMF8wMDAsXG4gICAgKVxuICAgIGlmIChnZXRUb3RhbElucHV0VG9rZW5zKCkgPCB0b2tlblRocmVzaG9sZCkgcmV0dXJuXG5cbiAgICBjb25zdCBpZGxlVGhyZXNob2xkTXMgPVxuICAgICAgTnVtYmVyKHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0lETEVfVEhSRVNIT0xEX01JTlVURVMgPz8gNzUpICogNjBfMDAwXG4gICAgY29uc3QgZWxhcHNlZCA9IERhdGUubm93KCkgLSBsYXN0UXVlcnlDb21wbGV0aW9uVGltZVxuICAgIGNvbnN0IHJlbWFpbmluZyA9IGlkbGVUaHJlc2hvbGRNcyAtIGVsYXBzZWRcblxuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dChcbiAgICAgIChscWN0LCBhZGROb3RpZiwgbXNnc1JlZiwgbW9kZSwgaGludFJlZikgPT4ge1xuICAgICAgICBpZiAobXNnc1JlZi5jdXJyZW50Lmxlbmd0aCA9PT0gMCkgcmV0dXJuXG4gICAgICAgIGNvbnN0IHRvdGFsVG9rZW5zID0gZ2V0VG90YWxJbnB1dFRva2VucygpXG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFRva2VucyA9IGZvcm1hdFRva2Vucyh0b3RhbFRva2VucylcbiAgICAgICAgY29uc3QgaWRsZU1pbnV0ZXMgPSAoRGF0ZS5ub3coKSAtIGxxY3QpIC8gNjBfMDAwXG4gICAgICAgIGFkZE5vdGlmKHtcbiAgICAgICAgICBrZXk6ICdpZGxlLXJldHVybi1oaW50JyxcbiAgICAgICAgICBqc3g6XG4gICAgICAgICAgICBtb2RlID09PSAnaGludF92MicgPyAoXG4gICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgPFRleHQgZGltQ29sb3I+bmV3IHRhc2s/IDwvVGV4dD5cbiAgICAgICAgICAgICAgICA8VGV4dCBjb2xvcj1cInN1Z2dlc3Rpb25cIj4vY2xlYXI8L1RleHQ+XG4gICAgICAgICAgICAgICAgPFRleHQgZGltQ29sb3I+IHRvIHNhdmUgPC9UZXh0PlxuICAgICAgICAgICAgICAgIDxUZXh0IGNvbG9yPVwic3VnZ2VzdGlvblwiPntmb3JtYXR0ZWRUb2tlbnN9IHRva2VuczwvVGV4dD5cbiAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8VGV4dCBjb2xvcj1cIndhcm5pbmdcIj5cbiAgICAgICAgICAgICAgICBuZXcgdGFzaz8gL2NsZWFyIHRvIHNhdmUge2Zvcm1hdHRlZFRva2Vuc30gdG9rZW5zXG4gICAgICAgICAgICAgIDwvVGV4dD5cbiAgICAgICAgICAgICksXG4gICAgICAgICAgcHJpb3JpdHk6ICdtZWRpdW0nLFxuICAgICAgICAgIC8vIFBlcnNpc3QgdW50aWwgc3VibWl0IOKAlCB0aGUgaGludCBmaXJlcyBhdCBUKzc1bWluIGlkbGUsIHVzZXIgbWF5XG4gICAgICAgICAgLy8gbm90IHJldHVybiBmb3IgaG91cnMuIHJlbW92ZU5vdGlmaWNhdGlvbiBpbiB1c2VFZmZlY3QgY2xlYW51cFxuICAgICAgICAgIC8vIGhhbmRsZXMgZGlzbWlzc2FsLiAweDdGRkZGRkZGID0gc2V0VGltZW91dCBtYXggKH4yNC44IGRheXMpLlxuICAgICAgICAgIHRpbWVvdXRNczogMHg3ZmZmZmZmZixcbiAgICAgICAgfSlcbiAgICAgICAgaGludFJlZi5jdXJyZW50ID0gbW9kZVxuICAgICAgICBsb2dFdmVudCgndGVuZ3VfaWRsZV9yZXR1cm5fYWN0aW9uJywge1xuICAgICAgICAgIGFjdGlvbjpcbiAgICAgICAgICAgICdoaW50X3Nob3duJyBhcyBBbmFseXRpY3NNZXRhZGF0YV9JX1ZFUklGSUVEX1RISVNfSVNfTk9UX0NPREVfT1JfRklMRVBBVEhTLFxuICAgICAgICAgIHZhcmlhbnQ6XG4gICAgICAgICAgICBtb2RlIGFzIEFuYWx5dGljc01ldGFkYXRhX0lfVkVSSUZJRURfVEhJU19JU19OT1RfQ09ERV9PUl9GSUxFUEFUSFMsXG4gICAgICAgICAgaWRsZU1pbnV0ZXM6IE1hdGgucm91bmQoaWRsZU1pbnV0ZXMpLFxuICAgICAgICAgIG1lc3NhZ2VDb3VudDogbXNnc1JlZi5jdXJyZW50Lmxlbmd0aCxcbiAgICAgICAgICB0b3RhbElucHV0VG9rZW5zOiB0b3RhbFRva2VucyxcbiAgICAgICAgfSlcbiAgICAgIH0sXG4gICAgICBNYXRoLm1heCgwLCByZW1haW5pbmcpLFxuICAgICAgbGFzdFF1ZXJ5Q29tcGxldGlvblRpbWUsXG4gICAgICBhZGROb3RpZmljYXRpb24sXG4gICAgICBtZXNzYWdlc1JlZixcbiAgICAgIHdpbGxvd01vZGUsXG4gICAgICBpZGxlSGludFNob3duUmVmLFxuICAgIClcblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpXG4gICAgICByZW1vdmVOb3RpZmljYXRpb24oJ2lkbGUtcmV0dXJuLWhpbnQnKVxuICAgICAgaWRsZUhpbnRTaG93blJlZi5jdXJyZW50ID0gZmFsc2VcbiAgICB9XG4gIH0sIFtsYXN0UXVlcnlDb21wbGV0aW9uVGltZSwgaXNMb2FkaW5nLCBhZGROb3RpZmljYXRpb24sIHJlbW92ZU5vdGlmaWNhdGlvbl0pXG5cbiAgLy8gU3VibWl0cyBpbmNvbWluZyBwcm9tcHRzIGZyb20gdGVhbW1hdGUgbWVzc2FnZXMgb3IgdGFza3MgbW9kZSBhcyBuZXcgdHVybnNcbiAgLy8gUmV0dXJucyB0cnVlIGlmIHN1Ym1pc3Npb24gc3VjY2VlZGVkLCBmYWxzZSBpZiBhIHF1ZXJ5IGlzIGFscmVhZHkgcnVubmluZ1xuICBjb25zdCBoYW5kbGVJbmNvbWluZ1Byb21wdCA9IHVzZUNhbGxiYWNrKFxuICAgIChjb250ZW50OiBzdHJpbmcsIG9wdGlvbnM/OiB7IGlzTWV0YT86IGJvb2xlYW4gfSk6IGJvb2xlYW4gPT4ge1xuICAgICAgaWYgKHF1ZXJ5R3VhcmQuaXNBY3RpdmUpIHJldHVybiBmYWxzZVxuXG4gICAgICAvLyBEZWZlciB0byB1c2VyLXF1ZXVlZCBjb21tYW5kcyDigJQgdXNlciBpbnB1dCBhbHdheXMgdGFrZXMgcHJpb3JpdHlcbiAgICAgIC8vIG92ZXIgc3lzdGVtIG1lc3NhZ2VzICh0ZWFtbWF0ZSBtZXNzYWdlcywgdGFzayBsaXN0IGl0ZW1zLCBldGMuKVxuICAgICAgLy8gUmVhZCBmcm9tIHRoZSBtb2R1bGUtbGV2ZWwgc3RvcmUgYXQgY2FsbCB0aW1lIChub3QgdGhlIHJlbmRlci10aW1lXG4gICAgICAvLyBzbmFwc2hvdCkgdG8gYXZvaWQgYSBzdGFsZSBjbG9zdXJlIOKAlCB0aGlzIGNhbGxiYWNrJ3MgZGVwcyBkb24ndFxuICAgICAgLy8gaW5jbHVkZSB0aGUgcXVldWUuXG4gICAgICBpZiAoXG4gICAgICAgIGdldENvbW1hbmRRdWV1ZSgpLnNvbWUoXG4gICAgICAgICAgY21kID0+IGNtZC5tb2RlID09PSAncHJvbXB0JyB8fCBjbWQubW9kZSA9PT0gJ2Jhc2gnLFxuICAgICAgICApXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5ld0Fib3J0Q29udHJvbGxlciA9IGNyZWF0ZUFib3J0Q29udHJvbGxlcigpXG4gICAgICBzZXRBYm9ydENvbnRyb2xsZXIobmV3QWJvcnRDb250cm9sbGVyKVxuXG4gICAgICAvLyBDcmVhdGUgYSB1c2VyIG1lc3NhZ2Ugd2l0aCB0aGUgZm9ybWF0dGVkIGNvbnRlbnQgKGluY2x1ZGVzIFhNTCB3cmFwcGVyKVxuICAgICAgY29uc3QgdXNlck1lc3NhZ2UgPSBjcmVhdGVVc2VyTWVzc2FnZSh7XG4gICAgICAgIGNvbnRlbnQsXG4gICAgICAgIGlzTWV0YTogb3B0aW9ucz8uaXNNZXRhID8gdHJ1ZSA6IHVuZGVmaW5lZCxcbiAgICAgIH0pXG5cbiAgICAgIHZvaWQgb25RdWVyeShbdXNlck1lc3NhZ2VdLCBuZXdBYm9ydENvbnRyb2xsZXIsIHRydWUsIFtdLCBtYWluTG9vcE1vZGVsKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9LFxuICAgIFtvblF1ZXJ5LCBtYWluTG9vcE1vZGVsLCBzdG9yZV0sXG4gIClcblxuICAvLyBWb2ljZSBpbnB1dCBpbnRlZ3JhdGlvbiAoVk9JQ0VfTU9ERSBidWlsZHMgb25seSlcbiAgY29uc3Qgdm9pY2UgPSBmZWF0dXJlKCdWT0lDRV9NT0RFJylcbiAgICA/IC8vIGJpb21lLWlnbm9yZSBsaW50L2NvcnJlY3RuZXNzL3VzZUhvb2tBdFRvcExldmVsOiBmZWF0dXJlKCkgaXMgYSBjb21waWxlLXRpbWUgY29uc3RhbnRcbiAgICAgIHVzZVZvaWNlSW50ZWdyYXRpb24oeyBzZXRJbnB1dFZhbHVlUmF3LCBpbnB1dFZhbHVlUmVmLCBpbnNlcnRUZXh0UmVmIH0pXG4gICAgOiB7XG4gICAgICAgIHN0cmlwVHJhaWxpbmc6ICgpID0+IDAsXG4gICAgICAgIGhhbmRsZUtleUV2ZW50OiAoKSA9PiB7fSxcbiAgICAgICAgcmVzZXRBbmNob3I6ICgpID0+IHt9LFxuICAgICAgICBpbnRlcmltUmFuZ2U6IG51bGwsXG4gICAgICB9XG5cbiAgdXNlSW5ib3hQb2xsZXIoe1xuICAgIGVuYWJsZWQ6IGlzQWdlbnRTd2FybXNFbmFibGVkKCksXG4gICAgaXNMb2FkaW5nLFxuICAgIGZvY3VzZWRJbnB1dERpYWxvZyxcbiAgICBvblN1Ym1pdE1lc3NhZ2U6IGhhbmRsZUluY29taW5nUHJvbXB0LFxuICB9KVxuXG4gIHVzZU1haWxib3hCcmlkZ2UoeyBpc0xvYWRpbmcsIG9uU3VibWl0TWVzc2FnZTogaGFuZGxlSW5jb21pbmdQcm9tcHQgfSlcblxuICAvLyBTY2hlZHVsZWQgdGFza3MgZnJvbSAuY2xhdWRlL3NjaGVkdWxlZF90YXNrcy5qc29uIChDcm9uQ3JlYXRlL0RlbGV0ZS9MaXN0KVxuICBpZiAoZmVhdHVyZSgnQUdFTlRfVFJJR0dFUlMnKSkge1xuICAgIC8vIEFzc2lzdGFudCBtb2RlIGJ5cGFzc2VzIHRoZSBpc0xvYWRpbmcgZ2F0ZSAodGhlIHByb2FjdGl2ZSB0aWNrIOKGklxuICAgIC8vIFNsZWVwIOKGkiB0aWNrIGxvb3Agd291bGQgb3RoZXJ3aXNlIHN0YXJ2ZSB0aGUgc2NoZWR1bGVyKS5cbiAgICAvLyBrYWlyb3NFbmFibGVkIGlzIHNldCBvbmNlIGluIGluaXRpYWxTdGF0ZSAobWFpbi50c3gpIGFuZCBuZXZlciBtdXRhdGVkIOKAlCBub1xuICAgIC8vIHN1YnNjcmlwdGlvbiBuZWVkZWQuIFRoZSB0ZW5ndV9rYWlyb3NfY3JvbiBydW50aW1lIGdhdGUgaXMgY2hlY2tlZCBpbnNpZGVcbiAgICAvLyB1c2VTY2hlZHVsZWRUYXNrcydzIGVmZmVjdCAobm90IGhlcmUpIHNpbmNlIHdyYXBwaW5nIGEgaG9vayBjYWxsIGluIGEgZHluYW1pY1xuICAgIC8vIGNvbmRpdGlvbiB3b3VsZCBicmVhayBydWxlcy1vZi1ob29rcy5cbiAgICBjb25zdCBhc3Npc3RhbnRNb2RlID0gc3RvcmUuZ2V0U3RhdGUoKS5rYWlyb3NFbmFibGVkXG4gICAgLy8gYmlvbWUtaWdub3JlIGxpbnQvY29ycmVjdG5lc3MvdXNlSG9va0F0VG9wTGV2ZWw6IGZlYXR1cmUoKSBpcyBhIGNvbXBpbGUtdGltZSBjb25zdGFudFxuICAgIHVzZVNjaGVkdWxlZFRhc2tzISh7IGlzTG9hZGluZywgYXNzaXN0YW50TW9kZSwgc2V0TWVzc2FnZXMgfSlcbiAgfVxuXG4gIC8vIE5vdGU6IFBlcm1pc3Npb24gcG9sbGluZyBpcyBub3cgaGFuZGxlZCBieSB1c2VJbmJveFBvbGxlclxuICAvLyAtIFdvcmtlcnMgcmVjZWl2ZSBwZXJtaXNzaW9uIHJlc3BvbnNlcyB2aWEgbWFpbGJveCBtZXNzYWdlc1xuICAvLyAtIExlYWRlcnMgcmVjZWl2ZSBwZXJtaXNzaW9uIHJlcXVlc3RzIHZpYSBtYWlsYm94IG1lc3NhZ2VzXG5cbiAgaWYgKFwiZXh0ZXJuYWxcIiA9PT0gJ2FudCcpIHtcbiAgICAvLyBUYXNrcyBtb2RlOiB3YXRjaCBmb3IgdGFza3MgYW5kIGF1dG8tcHJvY2VzcyB0aGVtXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL3J1bGVzLW9mLWhvb2tzXG4gICAgLy8gYmlvbWUtaWdub3JlIGxpbnQvY29ycmVjdG5lc3MvdXNlSG9va0F0VG9wTGV2ZWw6IGNvbmRpdGlvbmFsIGZvciBkZWFkIGNvZGUgZWxpbWluYXRpb24gaW4gZXh0ZXJuYWwgYnVpbGRzXG4gICAgdXNlVGFza0xpc3RXYXRjaGVyKHtcbiAgICAgIHRhc2tMaXN0SWQsXG4gICAgICBpc0xvYWRpbmcsXG4gICAgICBvblN1Ym1pdFRhc2s6IGhhbmRsZUluY29taW5nUHJvbXB0LFxuICAgIH0pXG5cbiAgICAvLyBMb29wIG1vZGU6IGF1dG8tdGljayB3aGVuIGVuYWJsZWQgKHZpYSAvam9iIGNvbW1hbmQpXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL3J1bGVzLW9mLWhvb2tzXG4gICAgLy8gYmlvbWUtaWdub3JlIGxpbnQvY29ycmVjdG5lc3MvdXNlSG9va0F0VG9wTGV2ZWw6IGNvbmRpdGlvbmFsIGZvciBkZWFkIGNvZGUgZWxpbWluYXRpb24gaW4gZXh0ZXJuYWwgYnVpbGRzXG4gICAgdXNlUHJvYWN0aXZlPy4oe1xuICAgICAgLy8gU3VwcHJlc3MgdGlja3Mgd2hpbGUgYW4gaW5pdGlhbCBtZXNzYWdlIGlzIHBlbmRpbmcg4oCUIHRoZSBpbml0aWFsXG4gICAgICAvLyBtZXNzYWdlIHdpbGwgYmUgcHJvY2Vzc2VkIGFzeW5jaHJvbm91c2x5IGFuZCBhIHByZW1hdHVyZSB0aWNrIHdvdWxkXG4gICAgICAvLyByYWNlIHdpdGggaXQsIGNhdXNpbmcgY29uY3VycmVudC1xdWVyeSBlbnF1ZXVlIG9mIGV4cGFuZGVkIHNraWxsIHRleHQuXG4gICAgICBpc0xvYWRpbmc6IGlzTG9hZGluZyB8fCBpbml0aWFsTWVzc2FnZSAhPT0gbnVsbCxcbiAgICAgIHF1ZXVlZENvbW1hbmRzTGVuZ3RoOiBxdWV1ZWRDb21tYW5kcy5sZW5ndGgsXG4gICAgICBoYXNBY3RpdmVMb2NhbEpzeFVJOiBpc1Nob3dpbmdMb2NhbEpTWENvbW1hbmQsXG4gICAgICBpc0luUGxhbk1vZGU6IHRvb2xQZXJtaXNzaW9uQ29udGV4dC5tb2RlID09PSAncGxhbicsXG4gICAgICBvblN1Ym1pdFRpY2s6IChwcm9tcHQ6IHN0cmluZykgPT5cbiAgICAgICAgaGFuZGxlSW5jb21pbmdQcm9tcHQocHJvbXB0LCB7IGlzTWV0YTogdHJ1ZSB9KSxcbiAgICAgIG9uUXVldWVUaWNrOiAocHJvbXB0OiBzdHJpbmcpID0+XG4gICAgICAgIGVucXVldWUoeyBtb2RlOiAncHJvbXB0JywgdmFsdWU6IHByb21wdCwgaXNNZXRhOiB0cnVlIH0pLFxuICAgIH0pXG4gIH1cblxuICAvLyBBYm9ydCB0aGUgY3VycmVudCBvcGVyYXRpb24gd2hlbiBhICdub3cnIHByaW9yaXR5IG1lc3NhZ2UgYXJyaXZlc1xuICAvLyAoZS5nLiBmcm9tIGEgY2hhdCBVSSBjbGllbnQgdmlhIFVEUykuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKHF1ZXVlZENvbW1hbmRzLnNvbWUoY21kID0+IGNtZC5wcmlvcml0eSA9PT0gJ25vdycpKSB7XG4gICAgICBhYm9ydENvbnRyb2xsZXJSZWYuY3VycmVudD8uYWJvcnQoJ2ludGVycnVwdCcpXG4gICAgfVxuICB9LCBbcXVldWVkQ29tbWFuZHNdKVxuXG4gIC8vIEluaXRpYWwgbG9hZFxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHZvaWQgb25Jbml0KClcblxuICAgIC8vIENsZWFudXAgb24gdW5tb3VudFxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB2b2lkIGRpYWdub3N0aWNUcmFja2VyLnNodXRkb3duKClcbiAgICB9XG4gICAgLy8gVE9ETzogZml4IHRoaXNcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKVxuXG4gIC8vIExpc3RlbiBmb3Igc3VzcGVuZC9yZXN1bWUgZXZlbnRzXG4gIGNvbnN0IHsgaW50ZXJuYWxfZXZlbnRFbWl0dGVyIH0gPSB1c2VTdGRpbigpXG4gIGNvbnN0IFtyZW1vdW50S2V5LCBzZXRSZW1vdW50S2V5XSA9IHVzZVN0YXRlKDApXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgaGFuZGxlU3VzcGVuZCA9ICgpID0+IHtcbiAgICAgIC8vIFByaW50IHN1c3BlbnNpb24gaW5zdHJ1Y3Rpb25zXG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShcbiAgICAgICAgYFxcbkNsYXVkZSBDb2RlIGhhcyBiZWVuIHN1c3BlbmRlZC4gUnVuIFxcYGZnXFxgIHRvIGJyaW5nIENsYXVkZSBDb2RlIGJhY2suXFxuTm90ZTogY3RybCArIHogbm93IHN1c3BlbmRzIENsYXVkZSBDb2RlLCBjdHJsICsgXyB1bmRvZXMgaW5wdXQuXFxuYCxcbiAgICAgIClcbiAgICB9XG5cbiAgICBjb25zdCBoYW5kbGVSZXN1bWUgPSAoKSA9PiB7XG4gICAgICAvLyBGb3JjZSBjb21wbGV0ZSBjb21wb25lbnQgdHJlZSByZXBsYWNlbWVudCBpbnN0ZWFkIG9mIHRlcm1pbmFsIGNsZWFyXG4gICAgICAvLyBJbmsgbm93IGhhbmRsZXMgbGluZSBjb3VudCByZXNldCBpbnRlcm5hbGx5IG9uIFNJR0NPTlRcbiAgICAgIHNldFJlbW91bnRLZXkocHJldiA9PiBwcmV2ICsgMSlcbiAgICB9XG5cbiAgICBpbnRlcm5hbF9ldmVudEVtaXR0ZXI/Lm9uKCdzdXNwZW5kJywgaGFuZGxlU3VzcGVuZClcbiAgICBpbnRlcm5hbF9ldmVudEVtaXR0ZXI/Lm9uKCdyZXN1bWUnLCBoYW5kbGVSZXN1bWUpXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGludGVybmFsX2V2ZW50RW1pdHRlcj8ub2ZmKCdzdXNwZW5kJywgaGFuZGxlU3VzcGVuZClcbiAgICAgIGludGVybmFsX2V2ZW50RW1pdHRlcj8ub2ZmKCdyZXN1bWUnLCBoYW5kbGVSZXN1bWUpXG4gICAgfVxuICB9LCBbaW50ZXJuYWxfZXZlbnRFbWl0dGVyXSlcblxuICAvLyBEZXJpdmUgc3RvcCBob29rIHNwaW5uZXIgc3VmZml4IGZyb20gbWVzc2FnZXMgc3RhdGVcbiAgY29uc3Qgc3RvcEhvb2tTcGlubmVyU3VmZml4ID0gdXNlTWVtbygoKSA9PiB7XG4gICAgaWYgKCFpc0xvYWRpbmcpIHJldHVybiBudWxsXG5cbiAgICAvLyBGaW5kIHN0b3AgaG9vayBwcm9ncmVzcyBtZXNzYWdlc1xuICAgIGNvbnN0IHByb2dyZXNzTXNncyA9IG1lc3NhZ2VzLmZpbHRlcihcbiAgICAgIChtKTogbSBpcyBQcm9ncmVzc01lc3NhZ2U8SG9va1Byb2dyZXNzPiA9PlxuICAgICAgICBtLnR5cGUgPT09ICdwcm9ncmVzcycgJiZcbiAgICAgICAgbS5kYXRhLnR5cGUgPT09ICdob29rX3Byb2dyZXNzJyAmJlxuICAgICAgICAobS5kYXRhLmhvb2tFdmVudCA9PT0gJ1N0b3AnIHx8IG0uZGF0YS5ob29rRXZlbnQgPT09ICdTdWJhZ2VudFN0b3AnKSxcbiAgICApXG4gICAgaWYgKHByb2dyZXNzTXNncy5sZW5ndGggPT09IDApIHJldHVybiBudWxsXG5cbiAgICAvLyBHZXQgdGhlIG1vc3QgcmVjZW50IHN0b3AgaG9vayBleGVjdXRpb25cbiAgICBjb25zdCBjdXJyZW50VG9vbFVzZUlEID0gcHJvZ3Jlc3NNc2dzLmF0KC0xKT8udG9vbFVzZUlEXG4gICAgaWYgKCFjdXJyZW50VG9vbFVzZUlEKSByZXR1cm4gbnVsbFxuXG4gICAgLy8gQ2hlY2sgaWYgdGhlcmUncyBhbHJlYWR5IGEgc3VtbWFyeSBtZXNzYWdlIGZvciB0aGlzIGV4ZWN1dGlvbiAoaG9va3MgY29tcGxldGVkKVxuICAgIGNvbnN0IGhhc1N1bW1hcnlGb3JDdXJyZW50RXhlY3V0aW9uID0gbWVzc2FnZXMuc29tZShcbiAgICAgIG0gPT5cbiAgICAgICAgbS50eXBlID09PSAnc3lzdGVtJyAmJlxuICAgICAgICBtLnN1YnR5cGUgPT09ICdzdG9wX2hvb2tfc3VtbWFyeScgJiZcbiAgICAgICAgbS50b29sVXNlSUQgPT09IGN1cnJlbnRUb29sVXNlSUQsXG4gICAgKVxuICAgIGlmIChoYXNTdW1tYXJ5Rm9yQ3VycmVudEV4ZWN1dGlvbikgcmV0dXJuIG51bGxcblxuICAgIGNvbnN0IGN1cnJlbnRIb29rcyA9IHByb2dyZXNzTXNncy5maWx0ZXIoXG4gICAgICBwID0+IHAudG9vbFVzZUlEID09PSBjdXJyZW50VG9vbFVzZUlELFxuICAgIClcbiAgICBjb25zdCB0b3RhbCA9IGN1cnJlbnRIb29rcy5sZW5ndGhcblxuICAgIC8vIENvdW50IGNvbXBsZXRlZCBob29rc1xuICAgIGNvbnN0IGNvbXBsZXRlZENvdW50ID0gY291bnQobWVzc2FnZXMsIG0gPT4ge1xuICAgICAgaWYgKG0udHlwZSAhPT0gJ2F0dGFjaG1lbnQnKSByZXR1cm4gZmFsc2VcbiAgICAgIGNvbnN0IGF0dGFjaG1lbnQgPSBtLmF0dGFjaG1lbnRcbiAgICAgIHJldHVybiAoXG4gICAgICAgICdob29rRXZlbnQnIGluIGF0dGFjaG1lbnQgJiZcbiAgICAgICAgKGF0dGFjaG1lbnQuaG9va0V2ZW50ID09PSAnU3RvcCcgfHxcbiAgICAgICAgICBhdHRhY2htZW50Lmhvb2tFdmVudCA9PT0gJ1N1YmFnZW50U3RvcCcpICYmXG4gICAgICAgICd0b29sVXNlSUQnIGluIGF0dGFjaG1lbnQgJiZcbiAgICAgICAgYXR0YWNobWVudC50b29sVXNlSUQgPT09IGN1cnJlbnRUb29sVXNlSURcbiAgICAgIClcbiAgICB9KVxuXG4gICAgLy8gQ2hlY2sgaWYgYW55IGhvb2sgaGFzIGEgY3VzdG9tIHN0YXR1cyBtZXNzYWdlXG4gICAgY29uc3QgY3VzdG9tTWVzc2FnZSA9IGN1cnJlbnRIb29rcy5maW5kKHAgPT4gcC5kYXRhLnN0YXR1c01lc3NhZ2UpPy5kYXRhXG4gICAgICAuc3RhdHVzTWVzc2FnZVxuXG4gICAgaWYgKGN1c3RvbU1lc3NhZ2UpIHtcbiAgICAgIC8vIFVzZSBjdXN0b20gbWVzc2FnZSB3aXRoIHByb2dyZXNzIGNvdW50ZXIgaWYgbXVsdGlwbGUgaG9va3NcbiAgICAgIHJldHVybiB0b3RhbCA9PT0gMVxuICAgICAgICA/IGAke2N1c3RvbU1lc3NhZ2V94oCmYFxuICAgICAgICA6IGAke2N1c3RvbU1lc3NhZ2V94oCmICR7Y29tcGxldGVkQ291bnR9LyR7dG90YWx9YFxuICAgIH1cblxuICAgIC8vIEZhbGwgYmFjayB0byBkZWZhdWx0IGJlaGF2aW9yXG4gICAgY29uc3QgaG9va1R5cGUgPVxuICAgICAgY3VycmVudEhvb2tzWzBdPy5kYXRhLmhvb2tFdmVudCA9PT0gJ1N1YmFnZW50U3RvcCdcbiAgICAgICAgPyAnc3ViYWdlbnQgc3RvcCdcbiAgICAgICAgOiAnc3RvcCdcblxuICAgIGlmIChcImV4dGVybmFsXCIgPT09ICdhbnQnKSB7XG4gICAgICBjb25zdCBjbWQgPSBjdXJyZW50SG9va3NbY29tcGxldGVkQ291bnRdPy5kYXRhLmNvbW1hbmRcbiAgICAgIGNvbnN0IGxhYmVsID0gY21kID8gYCAnJHt0cnVuY2F0ZVRvV2lkdGgoY21kLCA0MCl9J2AgOiAnJ1xuICAgICAgcmV0dXJuIHRvdGFsID09PSAxXG4gICAgICAgID8gYHJ1bm5pbmcgJHtob29rVHlwZX0gaG9vayR7bGFiZWx9YFxuICAgICAgICA6IGBydW5uaW5nICR7aG9va1R5cGV9IGhvb2ske2xhYmVsfVxcdTIwMjYgJHtjb21wbGV0ZWRDb3VudH0vJHt0b3RhbH1gXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvdGFsID09PSAxXG4gICAgICA/IGBydW5uaW5nICR7aG9va1R5cGV9IGhvb2tgXG4gICAgICA6IGBydW5uaW5nIHN0b3AgaG9va3PigKYgJHtjb21wbGV0ZWRDb3VudH0vJHt0b3RhbH1gXG4gIH0sIFttZXNzYWdlcywgaXNMb2FkaW5nXSlcblxuICAvLyBDYWxsYmFjayB0byBjYXB0dXJlIGZyb3plbiBzdGF0ZSB3aGVuIGVudGVyaW5nIHRyYW5zY3JpcHQgbW9kZVxuICBjb25zdCBoYW5kbGVFbnRlclRyYW5zY3JpcHQgPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgc2V0RnJvemVuVHJhbnNjcmlwdFN0YXRlKHtcbiAgICAgIG1lc3NhZ2VzTGVuZ3RoOiBtZXNzYWdlcy5sZW5ndGgsXG4gICAgICBzdHJlYW1pbmdUb29sVXNlc0xlbmd0aDogc3RyZWFtaW5nVG9vbFVzZXMubGVuZ3RoLFxuICAgIH0pXG4gIH0sIFttZXNzYWdlcy5sZW5ndGgsIHN0cmVhbWluZ1Rvb2xVc2VzLmxlbmd0aF0pXG5cbiAgLy8gQ2FsbGJhY2sgdG8gY2xlYXIgZnJvemVuIHN0YXRlIHdoZW4gZXhpdGluZyB0cmFuc2NyaXB0IG1vZGVcbiAgY29uc3QgaGFuZGxlRXhpdFRyYW5zY3JpcHQgPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgc2V0RnJvemVuVHJhbnNjcmlwdFN0YXRlKG51bGwpXG4gIH0sIFtdKVxuXG4gIC8vIFByb3BzIGZvciBHbG9iYWxLZXliaW5kaW5nSGFuZGxlcnMgY29tcG9uZW50IChyZW5kZXJlZCBpbnNpZGUgS2V5YmluZGluZ1NldHVwKVxuICBjb25zdCB2aXJ0dWFsU2Nyb2xsQWN0aXZlID0gaXNGdWxsc2NyZWVuRW52RW5hYmxlZCgpICYmICFkaXNhYmxlVmlydHVhbFNjcm9sbFxuXG4gIC8vIFRyYW5zY3JpcHQgc2VhcmNoIHN0YXRlLiBIb29rcyBtdXN0IGJlIHVuY29uZGl0aW9uYWwgc28gdGhleSBsaXZlIGhlcmVcbiAgLy8gKG5vdCBpbnNpZGUgdGhlIGBpZiAoc2NyZWVuID09PSAndHJhbnNjcmlwdCcpYCBicmFuY2ggYmVsb3cpOyBpc0FjdGl2ZVxuICAvLyBnYXRlcyB0aGUgdXNlSW5wdXQuIFF1ZXJ5IHBlcnNpc3RzIGFjcm9zcyBiYXIgb3Blbi9jbG9zZSBzbyBuL04ga2VlcFxuICAvLyB3b3JraW5nIGFmdGVyIEVudGVyIGRpc21pc3NlcyB0aGUgYmFyIChsZXNzIHNlbWFudGljcykuXG4gIGNvbnN0IGp1bXBSZWYgPSB1c2VSZWY8SnVtcEhhbmRsZSB8IG51bGw+KG51bGwpXG4gIGNvbnN0IFtzZWFyY2hPcGVuLCBzZXRTZWFyY2hPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKVxuICBjb25zdCBbc2VhcmNoUXVlcnksIHNldFNlYXJjaFF1ZXJ5XSA9IHVzZVN0YXRlKCcnKVxuICBjb25zdCBbc2VhcmNoQ291bnQsIHNldFNlYXJjaENvdW50XSA9IHVzZVN0YXRlKDApXG4gIGNvbnN0IFtzZWFyY2hDdXJyZW50LCBzZXRTZWFyY2hDdXJyZW50XSA9IHVzZVN0YXRlKDApXG4gIGNvbnN0IG9uU2VhcmNoTWF0Y2hlc0NoYW5nZSA9IHVzZUNhbGxiYWNrKFxuICAgIChjb3VudDogbnVtYmVyLCBjdXJyZW50OiBudW1iZXIpID0+IHtcbiAgICAgIHNldFNlYXJjaENvdW50KGNvdW50KVxuICAgICAgc2V0U2VhcmNoQ3VycmVudChjdXJyZW50KVxuICAgIH0sXG4gICAgW10sXG4gIClcblxuICB1c2VJbnB1dChcbiAgICAoaW5wdXQsIGtleSwgZXZlbnQpID0+IHtcbiAgICAgIGlmIChrZXkuY3RybCB8fCBrZXkubWV0YSkgcmV0dXJuXG4gICAgICAvLyBObyBFc2MgaGFuZGxpbmcgaGVyZSDigJQgbGVzcyBoYXMgbm8gbmF2aWdhdGluZyBtb2RlLiBTZWFyY2ggc3RhdGVcbiAgICAgIC8vIChoaWdobGlnaHRzLCBuL04pIGlzIGp1c3Qgc3RhdGUuIEVzYy9xL2N0cmwrYyDihpIgdHJhbnNjcmlwdDpleGl0XG4gICAgICAvLyAodW5nYXRlZCkuIEhpZ2hsaWdodHMgY2xlYXIgb24gZXhpdCB2aWEgdGhlIHNjcmVlbi1jaGFuZ2UgZWZmZWN0LlxuICAgICAgaWYgKGlucHV0ID09PSAnLycpIHtcbiAgICAgICAgLy8gQ2FwdHVyZSBzY3JvbGxUb3AgTk9XIOKAlCB0eXBpbmcgaXMgYSBwcmV2aWV3LCAwLW1hdGNoZXMgc25hcHNcbiAgICAgICAgLy8gYmFjayBoZXJlLiBTeW5jaHJvbm91cyByZWYgd3JpdGUsIGZpcmVzIGJlZm9yZSB0aGUgYmFyJ3NcbiAgICAgICAgLy8gbW91bnQtZWZmZWN0IGNhbGxzIHNldFNlYXJjaFF1ZXJ5LlxuICAgICAgICBqdW1wUmVmLmN1cnJlbnQ/LnNldEFuY2hvcigpXG4gICAgICAgIHNldFNlYXJjaE9wZW4odHJ1ZSlcbiAgICAgICAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICAvLyBIZWxkLWtleSBiYXRjaGluZzogdG9rZW5pemVyIGNvYWxlc2NlcyB0byAnbm5uJy4gU2FtZSB1bmlmb3JtLWJhdGNoXG4gICAgICAvLyBwYXR0ZXJuIGFzIG1vZGFsUGFnZXJBY3Rpb24gaW4gU2Nyb2xsS2V5YmluZGluZ0hhbmRsZXIudHN4LiBFYWNoXG4gICAgICAvLyByZXBlYXQgaXMgYSBzdGVwIChuIGlzbid0IGlkZW1wb3RlbnQgbGlrZSBnKS5cbiAgICAgIGNvbnN0IGMgPSBpbnB1dFswXVxuICAgICAgaWYgKFxuICAgICAgICAoYyA9PT0gJ24nIHx8IGMgPT09ICdOJykgJiZcbiAgICAgICAgaW5wdXQgPT09IGMucmVwZWF0KGlucHV0Lmxlbmd0aCkgJiZcbiAgICAgICAgc2VhcmNoQ291bnQgPiAwXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgZm4gPVxuICAgICAgICAgIGMgPT09ICduJyA/IGp1bXBSZWYuY3VycmVudD8ubmV4dE1hdGNoIDoganVtcFJlZi5jdXJyZW50Py5wcmV2TWF0Y2hcbiAgICAgICAgaWYgKGZuKSBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSBmbigpXG4gICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICB9XG4gICAgfSxcbiAgICAvLyBTZWFyY2ggbmVlZHMgdmlydHVhbCBzY3JvbGwgKGp1bXBSZWYgZHJpdmVzIFZpcnR1YWxNZXNzYWdlTGlzdCkuIFtcbiAgICAvLyBraWxscyBpdCwgc28gIWR1bXBNb2RlIOKAlCBhZnRlciBbIHRoZXJlJ3Mgbm90aGluZyB0byBqdW1wIGluLlxuICAgIHtcbiAgICAgIGlzQWN0aXZlOlxuICAgICAgICBzY3JlZW4gPT09ICd0cmFuc2NyaXB0JyAmJlxuICAgICAgICB2aXJ0dWFsU2Nyb2xsQWN0aXZlICYmXG4gICAgICAgICFzZWFyY2hPcGVuICYmXG4gICAgICAgICFkdW1wTW9kZSxcbiAgICB9LFxuICApXG4gIGNvbnN0IHtcbiAgICBzZXRRdWVyeTogc2V0SGlnaGxpZ2h0LFxuICAgIHNjYW5FbGVtZW50LFxuICAgIHNldFBvc2l0aW9ucyxcbiAgfSA9IHVzZVNlYXJjaEhpZ2hsaWdodCgpXG5cbiAgLy8gUmVzaXplIOKGkiBhYm9ydCBzZWFyY2guIFBvc2l0aW9ucyBhcmUgKG1zZywgcXVlcnksIFdJRFRIKS1rZXllZCDigJRcbiAgLy8gY2FjaGVkIHBvc2l0aW9ucyBhcmUgc3RhbGUgYWZ0ZXIgYSB3aWR0aCBjaGFuZ2UgKG5ldyBsYXlvdXQsIG5ld1xuICAvLyB3cmFwcGluZykuIENsZWFyaW5nIHNlYXJjaFF1ZXJ5IHRyaWdnZXJzIFZNTCdzIHNldFNlYXJjaFF1ZXJ5KCcnKVxuICAvLyB3aGljaCBjbGVhcnMgcG9zaXRpb25zQ2FjaGUgKyBzZXRQb3NpdGlvbnMobnVsbCkuIEJhciBjbG9zZXMuXG4gIC8vIFVzZXIgaGl0cyAvIGFnYWluIOKGkiBmcmVzaCBldmVyeXRoaW5nLlxuICBjb25zdCB0cmFuc2NyaXB0Q29scyA9IHVzZVRlcm1pbmFsU2l6ZSgpLmNvbHVtbnNcbiAgY29uc3QgcHJldkNvbHNSZWYgPSBSZWFjdC51c2VSZWYodHJhbnNjcmlwdENvbHMpXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKHByZXZDb2xzUmVmLmN1cnJlbnQgIT09IHRyYW5zY3JpcHRDb2xzKSB7XG4gICAgICBwcmV2Q29sc1JlZi5jdXJyZW50ID0gdHJhbnNjcmlwdENvbHNcbiAgICAgIGlmIChzZWFyY2hRdWVyeSB8fCBzZWFyY2hPcGVuKSB7XG4gICAgICAgIHNldFNlYXJjaE9wZW4oZmFsc2UpXG4gICAgICAgIHNldFNlYXJjaFF1ZXJ5KCcnKVxuICAgICAgICBzZXRTZWFyY2hDb3VudCgwKVxuICAgICAgICBzZXRTZWFyY2hDdXJyZW50KDApXG4gICAgICAgIGp1bXBSZWYuY3VycmVudD8uZGlzYXJtU2VhcmNoKClcbiAgICAgICAgc2V0SGlnaGxpZ2h0KCcnKVxuICAgICAgfVxuICAgIH1cbiAgfSwgW3RyYW5zY3JpcHRDb2xzLCBzZWFyY2hRdWVyeSwgc2VhcmNoT3Blbiwgc2V0SGlnaGxpZ2h0XSlcblxuICAvLyBUcmFuc2NyaXB0IGVzY2FwZSBoYXRjaGVzLiBCYXJlIGxldHRlcnMgaW4gbW9kYWwgY29udGV4dCAobm8gcHJvbXB0XG4gIC8vIGNvbXBldGluZyBmb3IgaW5wdXQpIOKAlCBzYW1lIGNsYXNzIGFzIGcvRy9qL2sgaW4gU2Nyb2xsS2V5YmluZGluZ0hhbmRsZXIuXG4gIHVzZUlucHV0KFxuICAgIChpbnB1dCwga2V5LCBldmVudCkgPT4ge1xuICAgICAgaWYgKGtleS5jdHJsIHx8IGtleS5tZXRhKSByZXR1cm5cbiAgICAgIGlmIChpbnB1dCA9PT0gJ3EnKSB7XG4gICAgICAgIC8vIGxlc3M6IHEgcXVpdHMgdGhlIHBhZ2VyLiBjdHJsK28gdG9nZ2xlczsgcSBpcyB0aGUgbGluZWFnZSBleGl0LlxuICAgICAgICBoYW5kbGVFeGl0VHJhbnNjcmlwdCgpXG4gICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgaWYgKGlucHV0ID09PSAnWycgJiYgIWR1bXBNb2RlKSB7XG4gICAgICAgIC8vIEZvcmNlIGR1bXAtdG8tc2Nyb2xsYmFjay4gQWxzbyBleHBhbmQgKyB1bmNhcCDigJQgbm8gcG9pbnQgZHVtcGluZ1xuICAgICAgICAvLyBhIHN1YnNldC4gVGVybWluYWwvdG11eCBjbWQtRiBjYW4gbm93IGZpbmQgYW55dGhpbmcuIEd1YXJkIGhlcmVcbiAgICAgICAgLy8gKG5vdCBpbiBpc0FjdGl2ZSkgc28gdiBzdGlsbCB3b3JrcyBwb3N0LVsg4oCUIGR1bXAtbW9kZSBmb290ZXIgYXRcbiAgICAgICAgLy8gfjQ4OTggd2lyZXMgZWRpdG9yU3RhdHVzLCBjb25maXJtaW5nIHYgaXMgbWVhbnQgdG8gc3RheSBsaXZlLlxuICAgICAgICBzZXREdW1wTW9kZSh0cnVlKVxuICAgICAgICBzZXRTaG93QWxsSW5UcmFuc2NyaXB0KHRydWUpXG4gICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICB9IGVsc2UgaWYgKGlucHV0ID09PSAndicpIHtcbiAgICAgICAgLy8gbGVzcy1zdHlsZTogdiBvcGVucyB0aGUgZmlsZSBpbiAkVklTVUFMLyRFRElUT1IuIFJlbmRlciB0aGUgZnVsbFxuICAgICAgICAvLyB0cmFuc2NyaXB0IChzYW1lIHBhdGggL2V4cG9ydCB1c2VzKSwgd3JpdGUgdG8gdG1wLCBoYW5kIG9mZi5cbiAgICAgICAgLy8gb3BlbkZpbGVJbkV4dGVybmFsRWRpdG9yIGhhbmRsZXMgYWx0LXNjcmVlbiBzdXNwZW5kL3Jlc3VtZSBmb3JcbiAgICAgICAgLy8gdGVybWluYWwgZWRpdG9yczsgR1VJIGVkaXRvcnMgc3Bhd24gZGV0YWNoZWQuXG4gICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIC8vIERyb3AgZG91YmxlLXRhcHM6IHRoZSByZW5kZXIgaXMgYXN5bmMgYW5kIGEgc2Vjb25kIHByZXNzIGJlZm9yZSBpdFxuICAgICAgICAvLyBjb21wbGV0ZXMgd291bGQgcnVuIGEgc2Vjb25kIHBhcmFsbGVsIHJlbmRlciAoZG91YmxlIG1lbW9yeSwgdHdvXG4gICAgICAgIC8vIHRlbXBmaWxlcywgdHdvIGVkaXRvciBzcGF3bnMpLiBlZGl0b3JHZW5SZWYgb25seSBndWFyZHNcbiAgICAgICAgLy8gdHJhbnNjcmlwdC1leGl0IHN0YWxlbmVzcywgbm90IHNhbWUtc2Vzc2lvbiBjb25jdXJyZW5jeS5cbiAgICAgICAgaWYgKGVkaXRvclJlbmRlcmluZ1JlZi5jdXJyZW50KSByZXR1cm5cbiAgICAgICAgZWRpdG9yUmVuZGVyaW5nUmVmLmN1cnJlbnQgPSB0cnVlXG4gICAgICAgIC8vIENhcHR1cmUgZ2VuZXJhdGlvbiArIG1ha2UgYSBzdGFsZW5lc3MtYXdhcmUgc2V0dGVyLiBFYWNoIHdyaXRlXG4gICAgICAgIC8vIGNoZWNrcyBnZW4gKHRyYW5zY3JpcHQgZXhpdCBidW1wcyBpdCDihpIgbGF0ZSB3cml0ZXMgZnJvbSB0aGVcbiAgICAgICAgLy8gYXN5bmMgcmVuZGVyIGdvIHNpbGVudCkuXG4gICAgICAgIGNvbnN0IGdlbiA9IGVkaXRvckdlblJlZi5jdXJyZW50XG4gICAgICAgIGNvbnN0IHNldFN0YXR1cyA9IChzOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICAgICAgICBpZiAoZ2VuICE9PSBlZGl0b3JHZW5SZWYuY3VycmVudCkgcmV0dXJuXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KGVkaXRvclRpbWVyUmVmLmN1cnJlbnQpXG4gICAgICAgICAgc2V0RWRpdG9yU3RhdHVzKHMpXG4gICAgICAgIH1cbiAgICAgICAgc2V0U3RhdHVzKGByZW5kZXJpbmcgJHtkZWZlcnJlZE1lc3NhZ2VzLmxlbmd0aH0gbWVzc2FnZXPigKZgKVxuICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdpZHRoID0gdGVybWluYWwgbWludXMgdmltJ3MgbGluZS1udW1iZXIgZ3V0dGVyICg0IGRpZ2l0cyArXG4gICAgICAgICAgICAvLyBzcGFjZSArIHNsYWNrKS4gRmxvb3IgYXQgODAuIFBhc3NUaHJvdWdoIGhhcyBubyAuY29sdW1ucyBzb1xuICAgICAgICAgICAgLy8gd2l0aG91dCB0aGlzIEluayBkZWZhdWx0cyB0byA4MC4gVHJhaWxpbmctc3BhY2Ugc3RyaXA6IHJpZ2h0LVxuICAgICAgICAgICAgLy8gYWxpZ25lZCB0aW1lc3RhbXBzIHN0aWxsIGxlYXZlIGEgZmxleGJveCBzcGFjZXIgcnVuIGF0IEVPTC5cbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjdXN0b20tcnVsZXMvcHJlZmVyLXVzZS10ZXJtaW5hbC1zaXplIC0tIG9uZS1zaG90IGF0IGtleXByZXNzIHRpbWUsIG5vdCBhIHJlYWN0aXZlIHJlbmRlciBkZXBcbiAgICAgICAgICAgIGNvbnN0IHcgPSBNYXRoLm1heCg4MCwgKHByb2Nlc3Muc3Rkb3V0LmNvbHVtbnMgPz8gODApIC0gNilcbiAgICAgICAgICAgIGNvbnN0IHJhdyA9IGF3YWl0IHJlbmRlck1lc3NhZ2VzVG9QbGFpblRleHQoXG4gICAgICAgICAgICAgIGRlZmVycmVkTWVzc2FnZXMsXG4gICAgICAgICAgICAgIHRvb2xzLFxuICAgICAgICAgICAgICB3LFxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgY29uc3QgdGV4dCA9IHJhdy5yZXBsYWNlKC9bIFxcdF0rJC9nbSwgJycpXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gam9pbih0bXBkaXIoKSwgYGNjLXRyYW5zY3JpcHQtJHtEYXRlLm5vdygpfS50eHRgKVxuICAgICAgICAgICAgYXdhaXQgd3JpdGVGaWxlKHBhdGgsIHRleHQpXG4gICAgICAgICAgICBjb25zdCBvcGVuZWQgPSBvcGVuRmlsZUluRXh0ZXJuYWxFZGl0b3IocGF0aClcbiAgICAgICAgICAgIHNldFN0YXR1cyhcbiAgICAgICAgICAgICAgb3BlbmVkXG4gICAgICAgICAgICAgICAgPyBgb3BlbmluZyAke3BhdGh9YFxuICAgICAgICAgICAgICAgIDogYHdyb3RlICR7cGF0aH0gwrcgbm8gJFZJU1VBTC8kRURJVE9SIHNldGAsXG4gICAgICAgICAgICApXG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgc2V0U3RhdHVzKFxuICAgICAgICAgICAgICBgcmVuZGVyIGZhaWxlZDogJHtlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSl9YCxcbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgICAgZWRpdG9yUmVuZGVyaW5nUmVmLmN1cnJlbnQgPSBmYWxzZVxuICAgICAgICAgIGlmIChnZW4gIT09IGVkaXRvckdlblJlZi5jdXJyZW50KSByZXR1cm5cbiAgICAgICAgICBlZGl0b3JUaW1lclJlZi5jdXJyZW50ID0gc2V0VGltZW91dChzID0+IHMoJycpLCA0MDAwLCBzZXRFZGl0b3JTdGF0dXMpXG4gICAgICAgIH0pKClcbiAgICAgIH1cbiAgICB9LFxuICAgIC8vICFzZWFyY2hPcGVuOiB0eXBpbmcgJ3YnIG9yICdbJyBpbiB0aGUgc2VhcmNoIGJhciBpcyBzZWFyY2ggaW5wdXQsIG5vdFxuICAgIC8vIGEgY29tbWFuZC4gTm8gIWR1bXBNb2RlIGhlcmUg4oCUIHYgc2hvdWxkIHdvcmsgYWZ0ZXIgWyAodGhlIFsgaGFuZGxlclxuICAgIC8vIGd1YXJkcyBpdHNlbGYgaW5saW5lKS5cbiAgICB7IGlzQWN0aXZlOiBzY3JlZW4gPT09ICd0cmFuc2NyaXB0JyAmJiB2aXJ0dWFsU2Nyb2xsQWN0aXZlICYmICFzZWFyY2hPcGVuIH0sXG4gIClcblxuICAvLyBGcmVzaCBgbGVzc2AgcGVyIHRyYW5zY3JpcHQgZW50cnkuIFByZXZlbnRzIHN0YWxlIGhpZ2hsaWdodHMgbWF0Y2hpbmdcbiAgLy8gdW5yZWxhdGVkIG5vcm1hbC1tb2RlIHRleHQgKG92ZXJsYXkgaXMgYWx0LXNjcmVlbi1nbG9iYWwpIGFuZCBhdm9pZHNcbiAgLy8gc3VycHJpc2Ugbi9OIG9uIHJlLWVudHJ5LiBTYW1lIGV4aXQgcmVzZXRzIFsgZHVtcCBtb2RlIOKAlCBlYWNoIGN0cmwrb1xuICAvLyBlbnRyeSBpcyBhIGZyZXNoIGluc3RhbmNlLlxuICBjb25zdCBpblRyYW5zY3JpcHQgPSBzY3JlZW4gPT09ICd0cmFuc2NyaXB0JyAmJiB2aXJ0dWFsU2Nyb2xsQWN0aXZlXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFpblRyYW5zY3JpcHQpIHtcbiAgICAgIHNldFNlYXJjaFF1ZXJ5KCcnKVxuICAgICAgc2V0U2VhcmNoQ291bnQoMClcbiAgICAgIHNldFNlYXJjaEN1cnJlbnQoMClcbiAgICAgIHNldFNlYXJjaE9wZW4oZmFsc2UpXG4gICAgICBlZGl0b3JHZW5SZWYuY3VycmVudCsrXG4gICAgICBjbGVhclRpbWVvdXQoZWRpdG9yVGltZXJSZWYuY3VycmVudClcbiAgICAgIHNldER1bXBNb2RlKGZhbHNlKVxuICAgICAgc2V0RWRpdG9yU3RhdHVzKCcnKVxuICAgIH1cbiAgfSwgW2luVHJhbnNjcmlwdF0pXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc2V0SGlnaGxpZ2h0KGluVHJhbnNjcmlwdCA/IHNlYXJjaFF1ZXJ5IDogJycpXG4gICAgLy8gQ2xlYXIgdGhlIHBvc2l0aW9uLWJhc2VkIENVUlJFTlQgKHllbGxvdykgb3ZlcmxheSB0b28uIHNldEhpZ2hsaWdodFxuICAgIC8vIG9ubHkgY2xlYXJzIHRoZSBzY2FuLWJhc2VkIGludmVyc2UuIFdpdGhvdXQgdGhpcywgdGhlIHllbGxvdyBib3hcbiAgICAvLyBwZXJzaXN0cyBhdCBpdHMgbGFzdCBzY3JlZW4gY29vcmRzIGFmdGVyIGN0cmwtYyBleGl0cyB0cmFuc2NyaXB0LlxuICAgIGlmICghaW5UcmFuc2NyaXB0KSBzZXRQb3NpdGlvbnMobnVsbClcbiAgfSwgW2luVHJhbnNjcmlwdCwgc2VhcmNoUXVlcnksIHNldEhpZ2hsaWdodCwgc2V0UG9zaXRpb25zXSlcblxuICBjb25zdCBnbG9iYWxLZXliaW5kaW5nUHJvcHMgPSB7XG4gICAgc2NyZWVuLFxuICAgIHNldFNjcmVlbixcbiAgICBzaG93QWxsSW5UcmFuc2NyaXB0LFxuICAgIHNldFNob3dBbGxJblRyYW5zY3JpcHQsXG4gICAgbWVzc2FnZUNvdW50OiBtZXNzYWdlcy5sZW5ndGgsXG4gICAgb25FbnRlclRyYW5zY3JpcHQ6IGhhbmRsZUVudGVyVHJhbnNjcmlwdCxcbiAgICBvbkV4aXRUcmFuc2NyaXB0OiBoYW5kbGVFeGl0VHJhbnNjcmlwdCxcbiAgICB2aXJ0dWFsU2Nyb2xsQWN0aXZlLFxuICAgIC8vIEJhci1vcGVuIGlzIGEgbW9kZSAob3ducyBrZXlzdHJva2VzIOKAlCBqL2sgdHlwZSwgRXNjIGNhbmNlbHMpLlxuICAgIC8vIE5hdmlnYXRpbmcgKHF1ZXJ5IHNldCwgYmFyIGNsb3NlZCkgaXMgTk9UIOKAlCBFc2MgZXhpdHMgdHJhbnNjcmlwdCxcbiAgICAvLyBzYW1lIGFzIGxlc3MgcSB3aXRoIGhpZ2hsaWdodHMgc3RpbGwgdmlzaWJsZS4gdXNlU2VhcmNoSW5wdXRcbiAgICAvLyBkb2Vzbid0IHN0b3BQcm9wYWdhdGlvbiwgc28gd2l0aG91dCB0aGlzIGdhdGUgdHJhbnNjcmlwdDpleGl0XG4gICAgLy8gd291bGQgZmlyZSBvbiB0aGUgc2FtZSBFc2MgdGhhdCBjYW5jZWxzIHRoZSBiYXIgKGNoaWxkIHJlZ2lzdGVyc1xuICAgIC8vIGZpcnN0LCBmaXJlcyBmaXJzdCwgYnViYmxlcykuXG4gICAgc2VhcmNoQmFyT3Blbjogc2VhcmNoT3BlbixcbiAgfVxuXG4gIC8vIFVzZSBmcm96ZW4gbGVuZ3RocyB0byBzbGljZSBhcnJheXMsIGF2b2lkaW5nIG1lbW9yeSBvdmVyaGVhZCBvZiBjbG9uaW5nXG4gIGNvbnN0IHRyYW5zY3JpcHRNZXNzYWdlcyA9IGZyb3plblRyYW5zY3JpcHRTdGF0ZVxuICAgID8gZGVmZXJyZWRNZXNzYWdlcy5zbGljZSgwLCBmcm96ZW5UcmFuc2NyaXB0U3RhdGUubWVzc2FnZXNMZW5ndGgpXG4gICAgOiBkZWZlcnJlZE1lc3NhZ2VzXG4gIGNvbnN0IHRyYW5zY3JpcHRTdHJlYW1pbmdUb29sVXNlcyA9IGZyb3plblRyYW5zY3JpcHRTdGF0ZVxuICAgID8gc3RyZWFtaW5nVG9vbFVzZXMuc2xpY2UoMCwgZnJvemVuVHJhbnNjcmlwdFN0YXRlLnN0cmVhbWluZ1Rvb2xVc2VzTGVuZ3RoKVxuICAgIDogc3RyZWFtaW5nVG9vbFVzZXNcblxuICAvLyBIYW5kbGUgc2hpZnQrZG93biBmb3IgdGVhbW1hdGUgbmF2aWdhdGlvbiBhbmQgYmFja2dyb3VuZCB0YXNrIG1hbmFnZW1lbnQuXG4gIC8vIEd1YXJkIG9uT3BlbkJhY2tncm91bmRUYXNrcyB3aGVuIGEgbG9jYWwtanN4IGRpYWxvZyAoZS5nLiAvbWNwKSBpcyBvcGVuIOKAlFxuICAvLyBvdGhlcndpc2UgU2hpZnQrRG93biBzdGFja3MgQmFja2dyb3VuZFRhc2tzRGlhbG9nIG9uIHRvcCBhbmQgZGVhZGxvY2tzIGlucHV0LlxuICB1c2VCYWNrZ3JvdW5kVGFza05hdmlnYXRpb24oe1xuICAgIG9uT3BlbkJhY2tncm91bmRUYXNrczogaXNTaG93aW5nTG9jYWxKU1hDb21tYW5kXG4gICAgICA/IHVuZGVmaW5lZFxuICAgICAgOiAoKSA9PiBzZXRTaG93QmFzaGVzRGlhbG9nKHRydWUpLFxuICB9KVxuICAvLyBBdXRvLWV4aXQgdmlld2luZyBtb2RlIHdoZW4gdGVhbW1hdGUgY29tcGxldGVzIG9yIGVycm9yc1xuICB1c2VUZWFtbWF0ZVZpZXdBdXRvRXhpdCgpXG5cbiAgaWYgKHNjcmVlbiA9PT0gJ3RyYW5zY3JpcHQnKSB7XG4gICAgLy8gVmlydHVhbCBzY3JvbGwgcmVwbGFjZXMgdGhlIDMwLW1lc3NhZ2UgY2FwOiBldmVyeXRoaW5nIGlzIHNjcm9sbGFibGVcbiAgICAvLyBhbmQgbWVtb3J5IGlzIGJvdW5kZWQgYnkgdGhlIHZpZXdwb3J0LiBXaXRob3V0IGl0LCB3cmFwcGluZyB0cmFuc2NyaXB0XG4gICAgLy8gaW4gYSBTY3JvbGxCb3ggd291bGQgbW91bnQgYWxsIG1lc3NhZ2VzICh+MjUwIE1CIG9uIGxvbmcgc2Vzc2lvbnMg4oCUXG4gICAgLy8gdGhlIGV4YWN0IHByb2JsZW0pLCBzbyB0aGUga2lsbCBzd2l0Y2ggYW5kIG5vbi1mdWxsc2NyZWVuIHBhdGhzIG11c3RcbiAgICAvLyBmYWxsIHRocm91Z2ggdG8gdGhlIGxlZ2FjeSByZW5kZXI6IG5vIGFsdCBzY3JlZW4sIGR1bXAgdG8gdGVybWluYWxcbiAgICAvLyBzY3JvbGxiYWNrLCAzMC1jYXAgKyBDdHJsK0UuIFJldXNpbmcgc2Nyb2xsUmVmIGlzIHNhZmUg4oCUIG5vcm1hbC1tb2RlXG4gICAgLy8gYW5kIHRyYW5zY3JpcHQtbW9kZSBhcmUgbXV0dWFsbHkgZXhjbHVzaXZlICh0aGlzIGVhcmx5IHJldHVybiksIHNvXG4gICAgLy8gb25seSBvbmUgU2Nyb2xsQm94IGlzIGV2ZXIgbW91bnRlZCBhdCBhIHRpbWUuXG4gICAgY29uc3QgdHJhbnNjcmlwdFNjcm9sbFJlZiA9XG4gICAgICBpc0Z1bGxzY3JlZW5FbnZFbmFibGVkKCkgJiYgIWRpc2FibGVWaXJ0dWFsU2Nyb2xsICYmICFkdW1wTW9kZVxuICAgICAgICA/IHNjcm9sbFJlZlxuICAgICAgICA6IHVuZGVmaW5lZFxuICAgIGNvbnN0IHRyYW5zY3JpcHRNZXNzYWdlc0VsZW1lbnQgPSAoXG4gICAgICA8TWVzc2FnZXNcbiAgICAgICAgbWVzc2FnZXM9e3RyYW5zY3JpcHRNZXNzYWdlc31cbiAgICAgICAgdG9vbHM9e3Rvb2xzfVxuICAgICAgICBjb21tYW5kcz17Y29tbWFuZHN9XG4gICAgICAgIHZlcmJvc2U9e3RydWV9XG4gICAgICAgIHRvb2xKU1g9e251bGx9XG4gICAgICAgIHRvb2xVc2VDb25maXJtUXVldWU9e1tdfVxuICAgICAgICBpblByb2dyZXNzVG9vbFVzZUlEcz17aW5Qcm9ncmVzc1Rvb2xVc2VJRHN9XG4gICAgICAgIGlzTWVzc2FnZVNlbGVjdG9yVmlzaWJsZT17ZmFsc2V9XG4gICAgICAgIGNvbnZlcnNhdGlvbklkPXtjb252ZXJzYXRpb25JZH1cbiAgICAgICAgc2NyZWVuPXtzY3JlZW59XG4gICAgICAgIGFnZW50RGVmaW5pdGlvbnM9e2FnZW50RGVmaW5pdGlvbnN9XG4gICAgICAgIHN0cmVhbWluZ1Rvb2xVc2VzPXt0cmFuc2NyaXB0U3RyZWFtaW5nVG9vbFVzZXN9XG4gICAgICAgIHNob3dBbGxJblRyYW5zY3JpcHQ9e3Nob3dBbGxJblRyYW5zY3JpcHR9XG4gICAgICAgIG9uT3BlblJhdGVMaW1pdE9wdGlvbnM9e2hhbmRsZU9wZW5SYXRlTGltaXRPcHRpb25zfVxuICAgICAgICBpc0xvYWRpbmc9e2lzTG9hZGluZ31cbiAgICAgICAgaGlkZVBhc3RUaGlua2luZz17dHJ1ZX1cbiAgICAgICAgc3RyZWFtaW5nVGhpbmtpbmc9e3N0cmVhbWluZ1RoaW5raW5nfVxuICAgICAgICBzY3JvbGxSZWY9e3RyYW5zY3JpcHRTY3JvbGxSZWZ9XG4gICAgICAgIGp1bXBSZWY9e2p1bXBSZWZ9XG4gICAgICAgIG9uU2VhcmNoTWF0Y2hlc0NoYW5nZT17b25TZWFyY2hNYXRjaGVzQ2hhbmdlfVxuICAgICAgICBzY2FuRWxlbWVudD17c2NhbkVsZW1lbnR9XG4gICAgICAgIHNldFBvc2l0aW9ucz17c2V0UG9zaXRpb25zfVxuICAgICAgICBkaXNhYmxlUmVuZGVyQ2FwPXtkdW1wTW9kZX1cbiAgICAgIC8+XG4gICAgKVxuICAgIGNvbnN0IHRyYW5zY3JpcHRUb29sSlNYID0gdG9vbEpTWCAmJiAoXG4gICAgICA8Qm94IGZsZXhEaXJlY3Rpb249XCJjb2x1bW5cIiB3aWR0aD1cIjEwMCVcIj5cbiAgICAgICAge3Rvb2xKU1guanN4fVxuICAgICAgPC9Cb3g+XG4gICAgKVxuICAgIGNvbnN0IHRyYW5zY3JpcHRSZXR1cm4gPSAoXG4gICAgICA8S2V5YmluZGluZ1NldHVwPlxuICAgICAgICA8QW5pbWF0ZWRUZXJtaW5hbFRpdGxlXG4gICAgICAgICAgaXNBbmltYXRpbmc9e3RpdGxlSXNBbmltYXRpbmd9XG4gICAgICAgICAgdGl0bGU9e3Rlcm1pbmFsVGl0bGV9XG4gICAgICAgICAgZGlzYWJsZWQ9e3RpdGxlRGlzYWJsZWR9XG4gICAgICAgICAgbm9QcmVmaXg9e3Nob3dTdGF0dXNJblRlcm1pbmFsVGFifVxuICAgICAgICAvPlxuICAgICAgICA8R2xvYmFsS2V5YmluZGluZ0hhbmRsZXJzIHsuLi5nbG9iYWxLZXliaW5kaW5nUHJvcHN9IC8+XG4gICAgICAgIHtmZWF0dXJlKCdWT0lDRV9NT0RFJykgPyAoXG4gICAgICAgICAgPFZvaWNlS2V5YmluZGluZ0hhbmRsZXJcbiAgICAgICAgICAgIHZvaWNlSGFuZGxlS2V5RXZlbnQ9e3ZvaWNlLmhhbmRsZUtleUV2ZW50fVxuICAgICAgICAgICAgc3RyaXBUcmFpbGluZz17dm9pY2Uuc3RyaXBUcmFpbGluZ31cbiAgICAgICAgICAgIHJlc2V0QW5jaG9yPXt2b2ljZS5yZXNldEFuY2hvcn1cbiAgICAgICAgICAgIGlzQWN0aXZlPXshdG9vbEpTWD8uaXNMb2NhbEpTWENvbW1hbmR9XG4gICAgICAgICAgLz5cbiAgICAgICAgKSA6IG51bGx9XG4gICAgICAgIDxDb21tYW5kS2V5YmluZGluZ0hhbmRsZXJzXG4gICAgICAgICAgb25TdWJtaXQ9e29uU3VibWl0fVxuICAgICAgICAgIGlzQWN0aXZlPXshdG9vbEpTWD8uaXNMb2NhbEpTWENvbW1hbmR9XG4gICAgICAgIC8+XG4gICAgICAgIHt0cmFuc2NyaXB0U2Nyb2xsUmVmID8gKFxuICAgICAgICAgIC8vIFNjcm9sbEtleWJpbmRpbmdIYW5kbGVyIG11c3QgbW91bnQgYmVmb3JlIENhbmNlbFJlcXVlc3RIYW5kbGVyIHNvXG4gICAgICAgICAgLy8gY3RybCtjLXdpdGgtc2VsZWN0aW9uIGNvcGllcyBpbnN0ZWFkIG9mIGNhbmNlbGxpbmcgdGhlIGFjdGl2ZSB0YXNrLlxuICAgICAgICAgIC8vIEl0cyByYXcgdXNlSW5wdXQgaGFuZGxlciBvbmx5IHN0b3BzIHByb3BhZ2F0aW9uIHdoZW4gYSBzZWxlY3Rpb25cbiAgICAgICAgICAvLyBleGlzdHMg4oCUIHdpdGhvdXQgb25lLCBjdHJsK2MgZmFsbHMgdGhyb3VnaCB0byBDYW5jZWxSZXF1ZXN0SGFuZGxlci5cbiAgICAgICAgICA8U2Nyb2xsS2V5YmluZGluZ0hhbmRsZXJcbiAgICAgICAgICAgIHNjcm9sbFJlZj17c2Nyb2xsUmVmfVxuICAgICAgICAgICAgLy8gWWllbGQgd2hlZWwvY3RybCt1L2QgdG8gVWx0cmFwbGFuQ2hvaWNlRGlhbG9nJ3Mgb3duIHNjcm9sbFxuICAgICAgICAgICAgLy8gaGFuZGxlciB3aGlsZSB0aGUgbW9kYWwgaXMgc2hvd2luZy5cbiAgICAgICAgICAgIGlzQWN0aXZlPXtmb2N1c2VkSW5wdXREaWFsb2cgIT09ICd1bHRyYXBsYW4tY2hvaWNlJ31cbiAgICAgICAgICAgIC8vIGcvRy9qL2svY3RybCt1L2N0cmwrZCB3b3VsZCBlYXQga2V5c3Ryb2tlcyB0aGUgc2VhcmNoIGJhclxuICAgICAgICAgICAgLy8gd2FudHMuIE9mZiB3aGlsZSBzZWFyY2hpbmcuXG4gICAgICAgICAgICBpc01vZGFsPXshc2VhcmNoT3Blbn1cbiAgICAgICAgICAgIC8vIE1hbnVhbCBzY3JvbGwgZXhpdHMgdGhlIHNlYXJjaCBjb250ZXh0IOKAlCBjbGVhciB0aGUgeWVsbG93XG4gICAgICAgICAgICAvLyBjdXJyZW50LW1hdGNoIG1hcmtlci4gUG9zaXRpb25zIGFyZSAobXNnLCByb3dPZmZzZXQpLWtleWVkO1xuICAgICAgICAgICAgLy8gai9rIGNoYW5nZXMgc2Nyb2xsVG9wIHNvIHJvd09mZnNldCBpcyBzdGFsZSDihpIgd3Jvbmcgcm93XG4gICAgICAgICAgICAvLyBnZXRzIHllbGxvdy4gTmV4dCBuL04gcmUtZXN0YWJsaXNoZXMgdmlhIHN0ZXAoKeKGkmp1bXAoKS5cbiAgICAgICAgICAgIG9uU2Nyb2xsPXsoKSA9PiBqdW1wUmVmLmN1cnJlbnQ/LmRpc2FybVNlYXJjaCgpfVxuICAgICAgICAgIC8+XG4gICAgICAgICkgOiBudWxsfVxuICAgICAgICA8Q2FuY2VsUmVxdWVzdEhhbmRsZXIgey4uLmNhbmNlbFJlcXVlc3RQcm9wc30gLz5cbiAgICAgICAge3RyYW5zY3JpcHRTY3JvbGxSZWYgPyAoXG4gICAgICAgICAgPEZ1bGxzY3JlZW5MYXlvdXRcbiAgICAgICAgICAgIHNjcm9sbFJlZj17c2Nyb2xsUmVmfVxuICAgICAgICAgICAgc2Nyb2xsYWJsZT17XG4gICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAge3RyYW5zY3JpcHRNZXNzYWdlc0VsZW1lbnR9XG4gICAgICAgICAgICAgICAge3RyYW5zY3JpcHRUb29sSlNYfVxuICAgICAgICAgICAgICAgIDxTYW5kYm94VmlvbGF0aW9uRXhwYW5kZWRWaWV3IC8+XG4gICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYm90dG9tPXtcbiAgICAgICAgICAgICAgc2VhcmNoT3BlbiA/IChcbiAgICAgICAgICAgICAgICA8VHJhbnNjcmlwdFNlYXJjaEJhclxuICAgICAgICAgICAgICAgICAganVtcFJlZj17anVtcFJlZn1cbiAgICAgICAgICAgICAgICAgIC8vIFNlZWQgd2FzIHRyaWVkIChjMDE1NzhjOCkg4oCUIGJyb2tlIC9oZWxsbyBtdXNjbGVcbiAgICAgICAgICAgICAgICAgIC8vIG1lbW9yeSAoY3Vyc29yIGxhbmRzIGFmdGVyICdmb28nLCAvaGVsbG8g4oaSIGZvb2hlbGxvKS5cbiAgICAgICAgICAgICAgICAgIC8vIENhbmNlbC1yZXN0b3JlIGhhbmRsZXMgdGhlICdkb24ndCBsb3NlIHByaW9yIHNlYXJjaCdcbiAgICAgICAgICAgICAgICAgIC8vIGNvbmNlcm4gZGlmZmVyZW50bHkgKG9uQ2FuY2VsIHJlLWFwcGxpZXMgc2VhcmNoUXVlcnkpLlxuICAgICAgICAgICAgICAgICAgaW5pdGlhbFF1ZXJ5PVwiXCJcbiAgICAgICAgICAgICAgICAgIGNvdW50PXtzZWFyY2hDb3VudH1cbiAgICAgICAgICAgICAgICAgIGN1cnJlbnQ9e3NlYXJjaEN1cnJlbnR9XG4gICAgICAgICAgICAgICAgICBvbkNsb3NlPXtxID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRW50ZXIg4oCUIGNvbW1pdC4gMC1tYXRjaCBndWFyZDoganVuayBxdWVyeSBzaG91bGRuJ3RcbiAgICAgICAgICAgICAgICAgICAgLy8gcGVyc2lzdCAoYmFkZ2UgaGlkZGVuLCBuL04gZGVhZCBhbnl3YXkpLlxuICAgICAgICAgICAgICAgICAgICBzZXRTZWFyY2hRdWVyeShzZWFyY2hDb3VudCA+IDAgPyBxIDogJycpXG4gICAgICAgICAgICAgICAgICAgIHNldFNlYXJjaE9wZW4oZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgIC8vIG9uQ2FuY2VsIHBhdGg6IGJhciB1bm1vdW50cyBiZWZvcmUgaXRzIHVzZUVmZmVjdChbcXVlcnldKVxuICAgICAgICAgICAgICAgICAgICAvLyBjYW4gZmlyZSB3aXRoICcnLiBXaXRob3V0IHRoaXMsIHNlYXJjaENvdW50IHN0YXlzIHN0YWxlXG4gICAgICAgICAgICAgICAgICAgIC8vIChuIGd1YXJkIGF0IDo0OTU2IHBhc3NlcykgYW5kIFZNTCdzIG1hdGNoZXNbXSB0b29cbiAgICAgICAgICAgICAgICAgICAgLy8gKG5leHRNYXRjaCB3YWxrcyB0aGUgb2xkIGFycmF5KS4gUGhhbnRvbSBuYXYsIG5vXG4gICAgICAgICAgICAgICAgICAgIC8vIGhpZ2hsaWdodC4gb25FeGl0IChFbnRlciwgcSBub24tZW1wdHkpIHN0aWxsIGNvbW1pdHMuXG4gICAgICAgICAgICAgICAgICAgIGlmICghcSkge1xuICAgICAgICAgICAgICAgICAgICAgIHNldFNlYXJjaENvdW50KDApXG4gICAgICAgICAgICAgICAgICAgICAgc2V0U2VhcmNoQ3VycmVudCgwKVxuICAgICAgICAgICAgICAgICAgICAgIGp1bXBSZWYuY3VycmVudD8uc2V0U2VhcmNoUXVlcnkoJycpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICBvbkNhbmNlbD17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBFc2MvY3RybCtjL2N0cmwrZyDigJQgdW5kby4gQmFyJ3MgZWZmZWN0IGxhc3QgZmlyZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gd2l0aCB3aGF0ZXZlciB3YXMgdHlwZWQuIHNlYXJjaFF1ZXJ5IChSRVBMIHN0YXRlKVxuICAgICAgICAgICAgICAgICAgICAvLyBpcyB1bmNoYW5nZWQgc2luY2UgLyAob25DbG9zZSA9IGNvbW1pdCwgZGlkbid0IHJ1bikuXG4gICAgICAgICAgICAgICAgICAgIC8vIFR3byBWTUwgY2FsbHM6ICcnIHJlc3RvcmVzIGFuY2hvciAoMC1tYXRjaCBlbHNlLVxuICAgICAgICAgICAgICAgICAgICAvLyBicmFuY2gpLCB0aGVuIHNlYXJjaFF1ZXJ5IHJlLXNjYW5zIGZyb20gYW5jaG9yJ3NcbiAgICAgICAgICAgICAgICAgICAgLy8gbmVhcmVzdC4gQm90aCBzeW5jaHJvbm91cyDigJQgb25lIFJlYWN0IGJhdGNoLlxuICAgICAgICAgICAgICAgICAgICAvLyBzZXRIaWdobGlnaHQgZXhwbGljaXQ6IFJFUEwncyBzeW5jLWVmZmVjdCBkZXAgaXNcbiAgICAgICAgICAgICAgICAgICAgLy8gc2VhcmNoUXVlcnkgKHVuY2hhbmdlZCksIHdvdWxkbid0IHJlLWZpcmUuXG4gICAgICAgICAgICAgICAgICAgIHNldFNlYXJjaE9wZW4oZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgIGp1bXBSZWYuY3VycmVudD8uc2V0U2VhcmNoUXVlcnkoJycpXG4gICAgICAgICAgICAgICAgICAgIGp1bXBSZWYuY3VycmVudD8uc2V0U2VhcmNoUXVlcnkoc2VhcmNoUXVlcnkpXG4gICAgICAgICAgICAgICAgICAgIHNldEhpZ2hsaWdodChzZWFyY2hRdWVyeSlcbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICBzZXRIaWdobGlnaHQ9e3NldEhpZ2hsaWdodH1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgIDxUcmFuc2NyaXB0TW9kZUZvb3RlclxuICAgICAgICAgICAgICAgICAgc2hvd0FsbEluVHJhbnNjcmlwdD17c2hvd0FsbEluVHJhbnNjcmlwdH1cbiAgICAgICAgICAgICAgICAgIHZpcnR1YWxTY3JvbGw9e3RydWV9XG4gICAgICAgICAgICAgICAgICBzdGF0dXM9e2VkaXRvclN0YXR1cyB8fCB1bmRlZmluZWR9XG4gICAgICAgICAgICAgICAgICBzZWFyY2hCYWRnZT17XG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaFF1ZXJ5ICYmIHNlYXJjaENvdW50ID4gMFxuICAgICAgICAgICAgICAgICAgICAgID8geyBjdXJyZW50OiBzZWFyY2hDdXJyZW50LCBjb3VudDogc2VhcmNoQ291bnQgfVxuICAgICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIC8+XG4gICAgICAgICkgOiAoXG4gICAgICAgICAgPD5cbiAgICAgICAgICAgIHt0cmFuc2NyaXB0TWVzc2FnZXNFbGVtZW50fVxuICAgICAgICAgICAge3RyYW5zY3JpcHRUb29sSlNYfVxuICAgICAgICAgICAgPFNhbmRib3hWaW9sYXRpb25FeHBhbmRlZFZpZXcgLz5cbiAgICAgICAgICAgIDxUcmFuc2NyaXB0TW9kZUZvb3RlclxuICAgICAgICAgICAgICBzaG93QWxsSW5UcmFuc2NyaXB0PXtzaG93QWxsSW5UcmFuc2NyaXB0fVxuICAgICAgICAgICAgICB2aXJ0dWFsU2Nyb2xsPXtmYWxzZX1cbiAgICAgICAgICAgICAgc3VwcHJlc3NTaG93QWxsPXtkdW1wTW9kZX1cbiAgICAgICAgICAgICAgc3RhdHVzPXtlZGl0b3JTdGF0dXMgfHwgdW5kZWZpbmVkfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICA8Lz5cbiAgICAgICAgKX1cbiAgICAgIDwvS2V5YmluZGluZ1NldHVwPlxuICAgIClcbiAgICAvLyBUaGUgdmlydHVhbC1zY3JvbGwgYnJhbmNoIChGdWxsc2NyZWVuTGF5b3V0IGFib3ZlKSBuZWVkc1xuICAgIC8vIDxBbHRlcm5hdGVTY3JlZW4+J3MgPEJveCBoZWlnaHQ9e3Jvd3N9PiBjb25zdHJhaW50IOKAlCB3aXRob3V0IGl0LFxuICAgIC8vIFNjcm9sbEJveCdzIGZsZXhHcm93IGhhcyBubyBjZWlsaW5nLCB2aWV3cG9ydCA9IGNvbnRlbnQgaGVpZ2h0LFxuICAgIC8vIHNjcm9sbFRvcCBwaW5zIGF0IDAsIGFuZCBJbmsncyBzY3JlZW4gYnVmZmVyIHNpemVzIHRvIHRoZSBmdWxsXG4gICAgLy8gc3BhY2VyICgyMDDDlzVrKyByb3dzIG9uIGxvbmcgc2Vzc2lvbnMpLiBTYW1lIHJvb3QgdHlwZSArIHByb3BzIGFzXG4gICAgLy8gbm9ybWFsIG1vZGUncyB3cmFwIGJlbG93IHNvIFJlYWN0IHJlY29uY2lsZXMgYW5kIHRoZSBhbHQgYnVmZmVyXG4gICAgLy8gc3RheXMgZW50ZXJlZCBhY3Jvc3MgdG9nZ2xlLiBUaGUgMzAtY2FwIGR1bXAgYnJhbmNoIHN0YXlzXG4gICAgLy8gdW53cmFwcGVkIOKAlCBpdCB3YW50cyBuYXRpdmUgdGVybWluYWwgc2Nyb2xsYmFjay5cbiAgICBpZiAodHJhbnNjcmlwdFNjcm9sbFJlZikge1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgPEFsdGVybmF0ZVNjcmVlbiBtb3VzZVRyYWNraW5nPXtpc01vdXNlVHJhY2tpbmdFbmFibGVkKCl9PlxuICAgICAgICAgIHt0cmFuc2NyaXB0UmV0dXJufVxuICAgICAgICA8L0FsdGVybmF0ZVNjcmVlbj5cbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIHRyYW5zY3JpcHRSZXR1cm5cbiAgfVxuXG4gIC8vIEdldCB2aWV3ZWQgYWdlbnQgdGFzayAoaW5saW5lZCBmcm9tIHNlbGVjdG9ycyBmb3IgZXhwbGljaXQgZGF0YSBmbG93KS5cbiAgLy8gdmlld2VkQWdlbnRUYXNrOiB0ZWFtbWF0ZSBPUiBsb2NhbF9hZ2VudCDigJQgZHJpdmVzIHRoZSBib29sZWFuIGNoZWNrc1xuICAvLyBiZWxvdy4gdmlld2VkVGVhbW1hdGVUYXNrOiB0ZWFtbWF0ZS1vbmx5IG5hcnJvd2VkLCBmb3IgdGVhbW1hdGUtc3BlY2lmaWNcbiAgLy8gZmllbGQgYWNjZXNzIChpblByb2dyZXNzVG9vbFVzZUlEcykuXG4gIGNvbnN0IHZpZXdlZFRhc2sgPSB2aWV3aW5nQWdlbnRUYXNrSWQgPyB0YXNrc1t2aWV3aW5nQWdlbnRUYXNrSWRdIDogdW5kZWZpbmVkXG4gIGNvbnN0IHZpZXdlZFRlYW1tYXRlVGFzayA9XG4gICAgdmlld2VkVGFzayAmJiBpc0luUHJvY2Vzc1RlYW1tYXRlVGFzayh2aWV3ZWRUYXNrKSA/IHZpZXdlZFRhc2sgOiB1bmRlZmluZWRcbiAgY29uc3Qgdmlld2VkQWdlbnRUYXNrID1cbiAgICB2aWV3ZWRUZWFtbWF0ZVRhc2sgPz9cbiAgICAodmlld2VkVGFzayAmJiBpc0xvY2FsQWdlbnRUYXNrKHZpZXdlZFRhc2spID8gdmlld2VkVGFzayA6IHVuZGVmaW5lZClcblxuICAvLyBCeXBhc3MgdXNlRGVmZXJyZWRWYWx1ZSB3aGVuIHN0cmVhbWluZyB0ZXh0IGlzIHNob3dpbmcgc28gTWVzc2FnZXMgcmVuZGVyc1xuICAvLyB0aGUgZmluYWwgbWVzc2FnZSBpbiB0aGUgc2FtZSBmcmFtZSBzdHJlYW1pbmcgdGV4dCBjbGVhcnMuIEFsc28gYnlwYXNzIHdoZW5cbiAgLy8gbm90IGxvYWRpbmcg4oCUIGRlZmVycmVkTWVzc2FnZXMgb25seSBtYXR0ZXJzIGR1cmluZyBzdHJlYW1pbmcgKGtlZXBzIGlucHV0XG4gIC8vIHJlc3BvbnNpdmUpOyBhZnRlciB0aGUgdHVybiBlbmRzLCBzaG93aW5nIG1lc3NhZ2VzIGltbWVkaWF0ZWx5IHByZXZlbnRzIGFcbiAgLy8gaml0dGVyIGdhcCB3aGVyZSB0aGUgc3Bpbm5lciBpcyBnb25lIGJ1dCB0aGUgYW5zd2VyIGhhc24ndCBhcHBlYXJlZCB5ZXQuXG4gIC8vIE9ubHkgcmVkdWNlZE1vdGlvbiB1c2VycyBrZWVwIHRoZSBkZWZlcnJlZCBwYXRoIGR1cmluZyBsb2FkaW5nLlxuICBjb25zdCB1c2VzU3luY01lc3NhZ2VzID0gc2hvd1N0cmVhbWluZ1RleHQgfHwgIWlzTG9hZGluZ1xuICAvLyBXaGVuIHZpZXdpbmcgYW4gYWdlbnQsIG5ldmVyIGZhbGwgdGhyb3VnaCB0byBsZWFkZXIg4oCUIGVtcHR5IHVudGlsXG4gIC8vIGJvb3RzdHJhcC9zdHJlYW0gZmlsbHMuIENsb3NlcyB0aGUgc2VlLWxlYWRlci10eXBlLWFnZW50IGZvb3RndW4uXG4gIGNvbnN0IGRpc3BsYXllZE1lc3NhZ2VzID0gdmlld2VkQWdlbnRUYXNrXG4gICAgPyAodmlld2VkQWdlbnRUYXNrLm1lc3NhZ2VzID8/IFtdKVxuICAgIDogdXNlc1N5bmNNZXNzYWdlc1xuICAgICAgPyBtZXNzYWdlc1xuICAgICAgOiBkZWZlcnJlZE1lc3NhZ2VzXG4gIC8vIFNob3cgdGhlIHBsYWNlaG9sZGVyIHVudGlsIHRoZSByZWFsIHVzZXIgbWVzc2FnZSBhcHBlYXJzIGluXG4gIC8vIGRpc3BsYXllZE1lc3NhZ2VzLiB1c2VySW5wdXRPblByb2Nlc3Npbmcgc3RheXMgc2V0IGZvciB0aGUgd2hvbGUgdHVyblxuICAvLyAoY2xlYXJlZCBpbiByZXNldExvYWRpbmdTdGF0ZSk7IHRoaXMgbGVuZ3RoIGNoZWNrIGhpZGVzIGl0IG9uY2VcbiAgLy8gZGlzcGxheWVkTWVzc2FnZXMgZ3Jvd3MgcGFzdCB0aGUgYmFzZWxpbmUgY2FwdHVyZWQgYXQgc3VibWl0IHRpbWUuXG4gIC8vIENvdmVycyBib3RoIGdhcHM6IGJlZm9yZSBzZXRNZXNzYWdlcyBpcyBjYWxsZWQgKHByb2Nlc3NVc2VySW5wdXQpLCBhbmRcbiAgLy8gd2hpbGUgZGVmZXJyZWRNZXNzYWdlcyBsYWdzIGJlaGluZCBtZXNzYWdlcy4gU3VwcHJlc3NlZCB3aGVuIHZpZXdpbmcgYW5cbiAgLy8gYWdlbnQg4oCUIGRpc3BsYXllZE1lc3NhZ2VzIGlzIGEgZGlmZmVyZW50IGFycmF5IHRoZXJlLCBhbmQgb25BZ2VudFN1Ym1pdFxuICAvLyBkb2Vzbid0IHVzZSB0aGUgcGxhY2Vob2xkZXIgYW55d2F5LlxuICBjb25zdCBwbGFjZWhvbGRlclRleHQgPVxuICAgIHVzZXJJbnB1dE9uUHJvY2Vzc2luZyAmJlxuICAgICF2aWV3ZWRBZ2VudFRhc2sgJiZcbiAgICBkaXNwbGF5ZWRNZXNzYWdlcy5sZW5ndGggPD0gdXNlcklucHV0QmFzZWxpbmVSZWYuY3VycmVudFxuICAgICAgPyB1c2VySW5wdXRPblByb2Nlc3NpbmdcbiAgICAgIDogdW5kZWZpbmVkXG5cbiAgY29uc3QgdG9vbFBlcm1pc3Npb25PdmVybGF5ID1cbiAgICBmb2N1c2VkSW5wdXREaWFsb2cgPT09ICd0b29sLXBlcm1pc3Npb24nID8gKFxuICAgICAgPFBlcm1pc3Npb25SZXF1ZXN0XG4gICAgICAgIGtleT17dG9vbFVzZUNvbmZpcm1RdWV1ZVswXT8udG9vbFVzZUlEfVxuICAgICAgICBvbkRvbmU9eygpID0+IHNldFRvb2xVc2VDb25maXJtUXVldWUoKFtfLCAuLi50YWlsXSkgPT4gdGFpbCl9XG4gICAgICAgIG9uUmVqZWN0PXtoYW5kbGVRdWV1ZWRDb21tYW5kT25DYW5jZWx9XG4gICAgICAgIHRvb2xVc2VDb25maXJtPXt0b29sVXNlQ29uZmlybVF1ZXVlWzBdIX1cbiAgICAgICAgdG9vbFVzZUNvbnRleHQ9e2dldFRvb2xVc2VDb250ZXh0KFxuICAgICAgICAgIG1lc3NhZ2VzLFxuICAgICAgICAgIG1lc3NhZ2VzLFxuICAgICAgICAgIGFib3J0Q29udHJvbGxlciA/PyBjcmVhdGVBYm9ydENvbnRyb2xsZXIoKSxcbiAgICAgICAgICBtYWluTG9vcE1vZGVsLFxuICAgICAgICApfVxuICAgICAgICB2ZXJib3NlPXt2ZXJib3NlfVxuICAgICAgICB3b3JrZXJCYWRnZT17dG9vbFVzZUNvbmZpcm1RdWV1ZVswXT8ud29ya2VyQmFkZ2V9XG4gICAgICAgIHNldFN0aWNreUZvb3Rlcj17XG4gICAgICAgICAgaXNGdWxsc2NyZWVuRW52RW5hYmxlZCgpID8gc2V0UGVybWlzc2lvblN0aWNreUZvb3RlciA6IHVuZGVmaW5lZFxuICAgICAgICB9XG4gICAgICAvPlxuICAgICkgOiBudWxsXG5cbiAgLy8gTmFycm93IHRlcm1pbmFsczogY29tcGFuaW9uIGNvbGxhcHNlcyB0byBhIG9uZS1saW5lciB0aGF0IFJFUEwgc3RhY2tzXG4gIC8vIG9uIGl0cyBvd24gcm93IChhYm92ZSBpbnB1dCBpbiBmdWxsc2NyZWVuLCBiZWxvdyBpbiBzY3JvbGxiYWNrKSBpbnN0ZWFkXG4gIC8vIG9mIHJvdy1iZXNpZGUuIFdpZGUgdGVybWluYWxzIGtlZXAgdGhlIHJvdyBsYXlvdXQgd2l0aCBzcHJpdGUgb24gdGhlIHJpZ2h0LlxuICBjb25zdCBjb21wYW5pb25OYXJyb3cgPSB0cmFuc2NyaXB0Q29scyA8IE1JTl9DT0xTX0ZPUl9GVUxMX1NQUklURVxuICAvLyBIaWRlIHRoZSBzcHJpdGUgd2hlbiBQcm9tcHRJbnB1dCBlYXJseS1yZXR1cm5zIEJhY2tncm91bmRUYXNrc0RpYWxvZy5cbiAgLy8gVGhlIHNwcml0ZSBzaXRzIGFzIGEgcm93IHNpYmxpbmcgb2YgUHJvbXB0SW5wdXQsIHNvIHRoZSBkaWFsb2cncyBQYW5lXG4gIC8vIGRpdmlkZXIgZHJhd3MgYXQgdXNlVGVybWluYWxTaXplKCkgd2lkdGggYnV0IG9ubHkgZ2V0cyB0ZXJtaW5hbFdpZHRoIC1cbiAgLy8gc3ByaXRlV2lkdGgg4oCUIGRpdmlkZXIgc3RvcHMgc2hvcnQgYW5kIGRpYWxvZyB0ZXh0IHdyYXBzIGVhcmx5LiBEb24ndFxuICAvLyBjaGVjayBmb290ZXJTZWxlY3Rpb246IHBpbGwgRk9DVVMgKGFycm93LWRvd24gdG8gdGFza3MgcGlsbCkgbXVzdCBrZWVwXG4gIC8vIHRoZSBzcHJpdGUgdmlzaWJsZSBzbyBhcnJvdy1yaWdodCBjYW4gbmF2aWdhdGUgdG8gaXQuXG4gIGNvbnN0IGNvbXBhbmlvblZpc2libGUgPVxuICAgICF0b29sSlNYPy5zaG91bGRIaWRlUHJvbXB0SW5wdXQgJiYgIWZvY3VzZWRJbnB1dERpYWxvZyAmJiAhc2hvd0Jhc2hlc0RpYWxvZ1xuXG4gIC8vIEluIGZ1bGxzY3JlZW4sIEFMTCBsb2NhbC1qc3ggc2xhc2ggY29tbWFuZHMgZmxvYXQgaW4gdGhlIG1vZGFsIHNsb3Qg4oCUXG4gIC8vIEZ1bGxzY3JlZW5MYXlvdXQgd3JhcHMgdGhlbSBpbiBhbiBhYnNvbHV0ZS1wb3NpdGlvbmVkIGJvdHRvbS1hbmNob3JlZFxuICAvLyBwYW5lICjilpQgZGl2aWRlciwgTW9kYWxDb250ZXh0KS4gUGFuZS9EaWFsb2cgaW5zaWRlIGRldGVjdCB0aGUgY29udGV4dFxuICAvLyBhbmQgc2tpcCB0aGVpciBvd24gdG9wLWxldmVsIGZyYW1lLiBOb24tZnVsbHNjcmVlbiBrZWVwcyB0aGUgaW5saW5lXG4gIC8vIHJlbmRlciBwYXRocyBiZWxvdy4gQ29tbWFuZHMgdGhhdCB1c2VkIHRvIHJvdXRlIHRocm91Z2ggYm90dG9tXG4gIC8vIChpbW1lZGlhdGU6IC9tb2RlbCwgL21jcCwgL2J0dywgLi4uKSBhbmQgc2Nyb2xsYWJsZSAobm9uLWltbWVkaWF0ZTpcbiAgLy8gL2NvbmZpZywgL3RoZW1lLCAvZGlmZiwgLi4uKSBib3RoIGdvIGhlcmUgbm93LlxuICBjb25zdCB0b29sSnN4Q2VudGVyZWQgPVxuICAgIGlzRnVsbHNjcmVlbkVudkVuYWJsZWQoKSAmJiB0b29sSlNYPy5pc0xvY2FsSlNYQ29tbWFuZCA9PT0gdHJ1ZVxuICBjb25zdCBjZW50ZXJlZE1vZGFsOiBSZWFjdC5SZWFjdE5vZGUgPSB0b29sSnN4Q2VudGVyZWQgPyB0b29sSlNYIS5qc3ggOiBudWxsXG5cbiAgLy8gPEFsdGVybmF0ZVNjcmVlbj4gYXQgdGhlIHJvb3Q6IGV2ZXJ5dGhpbmcgYmVsb3cgaXMgaW5zaWRlIGl0c1xuICAvLyA8Qm94IGhlaWdodD17cm93c30+LiBIYW5kbGVycy9jb250ZXh0cyBhcmUgemVyby1oZWlnaHQgc28gU2Nyb2xsQm94J3NcbiAgLy8gZmxleEdyb3cgaW4gRnVsbHNjcmVlbkxheW91dCByZXNvbHZlcyBhZ2FpbnN0IHRoaXMgQm94LiBUaGUgdHJhbnNjcmlwdFxuICAvLyBlYXJseSByZXR1cm4gYWJvdmUgd3JhcHMgaXRzIHZpcnR1YWwtc2Nyb2xsIGJyYW5jaCB0aGUgc2FtZSB3YXk7IG9ubHlcbiAgLy8gdGhlIDMwLWNhcCBkdW1wIGJyYW5jaCBzdGF5cyB1bndyYXBwZWQgZm9yIG5hdGl2ZSB0ZXJtaW5hbCBzY3JvbGxiYWNrLlxuICBjb25zdCBtYWluUmV0dXJuID0gKFxuICAgIDxLZXliaW5kaW5nU2V0dXA+XG4gICAgICA8QW5pbWF0ZWRUZXJtaW5hbFRpdGxlXG4gICAgICAgIGlzQW5pbWF0aW5nPXt0aXRsZUlzQW5pbWF0aW5nfVxuICAgICAgICB0aXRsZT17dGVybWluYWxUaXRsZX1cbiAgICAgICAgZGlzYWJsZWQ9e3RpdGxlRGlzYWJsZWR9XG4gICAgICAgIG5vUHJlZml4PXtzaG93U3RhdHVzSW5UZXJtaW5hbFRhYn1cbiAgICAgIC8+XG4gICAgICA8R2xvYmFsS2V5YmluZGluZ0hhbmRsZXJzIHsuLi5nbG9iYWxLZXliaW5kaW5nUHJvcHN9IC8+XG4gICAgICB7ZmVhdHVyZSgnVk9JQ0VfTU9ERScpID8gKFxuICAgICAgICA8Vm9pY2VLZXliaW5kaW5nSGFuZGxlclxuICAgICAgICAgIHZvaWNlSGFuZGxlS2V5RXZlbnQ9e3ZvaWNlLmhhbmRsZUtleUV2ZW50fVxuICAgICAgICAgIHN0cmlwVHJhaWxpbmc9e3ZvaWNlLnN0cmlwVHJhaWxpbmd9XG4gICAgICAgICAgcmVzZXRBbmNob3I9e3ZvaWNlLnJlc2V0QW5jaG9yfVxuICAgICAgICAgIGlzQWN0aXZlPXshdG9vbEpTWD8uaXNMb2NhbEpTWENvbW1hbmR9XG4gICAgICAgIC8+XG4gICAgICApIDogbnVsbH1cbiAgICAgIDxDb21tYW5kS2V5YmluZGluZ0hhbmRsZXJzXG4gICAgICAgIG9uU3VibWl0PXtvblN1Ym1pdH1cbiAgICAgICAgaXNBY3RpdmU9eyF0b29sSlNYPy5pc0xvY2FsSlNYQ29tbWFuZH1cbiAgICAgIC8+XG4gICAgICB7LyogU2Nyb2xsS2V5YmluZGluZ0hhbmRsZXIgbXVzdCBtb3VudCBiZWZvcmUgQ2FuY2VsUmVxdWVzdEhhbmRsZXIgc29cbiAgICAgICAgICBjdHJsK2Mtd2l0aC1zZWxlY3Rpb24gY29waWVzIGluc3RlYWQgb2YgY2FuY2VsbGluZyB0aGUgYWN0aXZlIHRhc2suXG4gICAgICAgICAgSXRzIHJhdyB1c2VJbnB1dCBoYW5kbGVyIG9ubHkgc3RvcHMgcHJvcGFnYXRpb24gd2hlbiBhIHNlbGVjdGlvblxuICAgICAgICAgIGV4aXN0cyDigJQgd2l0aG91dCBvbmUsIGN0cmwrYyBmYWxscyB0aHJvdWdoIHRvIENhbmNlbFJlcXVlc3RIYW5kbGVyLlxuICAgICAgICAgIFBnVXAvUGdEbi93aGVlbCBhbHdheXMgc2Nyb2xsIHRoZSB0cmFuc2NyaXB0IGJlaGluZCB0aGUgbW9kYWwg4oCUXG4gICAgICAgICAgdGhlIG1vZGFsJ3MgaW5uZXIgU2Nyb2xsQm94IGlzIG5vdCBrZXlib2FyZC1kcml2ZW4uIG9uU2Nyb2xsXG4gICAgICAgICAgc3RheXMgc3VwcHJlc3NlZCB3aGlsZSBhIG1vZGFsIGlzIHNob3dpbmcgc28gc2Nyb2xsIGRvZXNuJ3RcbiAgICAgICAgICBzdGFtcCBkaXZpZGVyL3BpbGwgc3RhdGUuICovfVxuICAgICAgPFNjcm9sbEtleWJpbmRpbmdIYW5kbGVyXG4gICAgICAgIHNjcm9sbFJlZj17c2Nyb2xsUmVmfVxuICAgICAgICBpc0FjdGl2ZT17XG4gICAgICAgICAgaXNGdWxsc2NyZWVuRW52RW5hYmxlZCgpICYmXG4gICAgICAgICAgKGNlbnRlcmVkTW9kYWwgIT0gbnVsbCB8fFxuICAgICAgICAgICAgIWZvY3VzZWRJbnB1dERpYWxvZyB8fFxuICAgICAgICAgICAgZm9jdXNlZElucHV0RGlhbG9nID09PSAndG9vbC1wZXJtaXNzaW9uJylcbiAgICAgICAgfVxuICAgICAgICBvblNjcm9sbD17XG4gICAgICAgICAgY2VudGVyZWRNb2RhbCB8fCB0b29sUGVybWlzc2lvbk92ZXJsYXkgfHwgdmlld2VkQWdlbnRUYXNrXG4gICAgICAgICAgICA/IHVuZGVmaW5lZFxuICAgICAgICAgICAgOiBjb21wb3NlZE9uU2Nyb2xsXG4gICAgICAgIH1cbiAgICAgIC8+XG4gICAgICB7ZmVhdHVyZSgnTUVTU0FHRV9BQ1RJT05TJykgJiZcbiAgICAgIGlzRnVsbHNjcmVlbkVudkVuYWJsZWQoKSAmJlxuICAgICAgIWRpc2FibGVNZXNzYWdlQWN0aW9ucyA/IChcbiAgICAgICAgPE1lc3NhZ2VBY3Rpb25zS2V5YmluZGluZ3NcbiAgICAgICAgICBoYW5kbGVycz17bWVzc2FnZUFjdGlvbkhhbmRsZXJzfVxuICAgICAgICAgIGlzQWN0aXZlPXtjdXJzb3IgIT09IG51bGx9XG4gICAgICAgIC8+XG4gICAgICApIDogbnVsbH1cbiAgICAgIDxDYW5jZWxSZXF1ZXN0SGFuZGxlciB7Li4uY2FuY2VsUmVxdWVzdFByb3BzfSAvPlxuICAgICAgPE1DUENvbm5lY3Rpb25NYW5hZ2VyXG4gICAgICAgIGtleT17cmVtb3VudEtleX1cbiAgICAgICAgZHluYW1pY01jcENvbmZpZz17ZHluYW1pY01jcENvbmZpZ31cbiAgICAgICAgaXNTdHJpY3RNY3BDb25maWc9e3N0cmljdE1jcENvbmZpZ31cbiAgICAgID5cbiAgICAgICAgPEZ1bGxzY3JlZW5MYXlvdXRcbiAgICAgICAgICBzY3JvbGxSZWY9e3Njcm9sbFJlZn1cbiAgICAgICAgICBvdmVybGF5PXt0b29sUGVybWlzc2lvbk92ZXJsYXl9XG4gICAgICAgICAgYm90dG9tRmxvYXQ9e1xuICAgICAgICAgICAgZmVhdHVyZSgnQlVERFknKSAmJiBjb21wYW5pb25WaXNpYmxlICYmICFjb21wYW5pb25OYXJyb3cgPyAoXG4gICAgICAgICAgICAgIDxDb21wYW5pb25GbG9hdGluZ0J1YmJsZSAvPlxuICAgICAgICAgICAgKSA6IHVuZGVmaW5lZFxuICAgICAgICAgIH1cbiAgICAgICAgICBtb2RhbD17Y2VudGVyZWRNb2RhbH1cbiAgICAgICAgICBtb2RhbFNjcm9sbFJlZj17bW9kYWxTY3JvbGxSZWZ9XG4gICAgICAgICAgZGl2aWRlcllSZWY9e2RpdmlkZXJZUmVmfVxuICAgICAgICAgIGhpZGVQaWxsPXshIXZpZXdlZEFnZW50VGFza31cbiAgICAgICAgICBoaWRlU3RpY2t5PXshIXZpZXdlZFRlYW1tYXRlVGFza31cbiAgICAgICAgICBuZXdNZXNzYWdlQ291bnQ9e3Vuc2VlbkRpdmlkZXI/LmNvdW50ID8/IDB9XG4gICAgICAgICAgb25QaWxsQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgIHNldEN1cnNvcihudWxsKVxuICAgICAgICAgICAganVtcFRvTmV3KHNjcm9sbFJlZi5jdXJyZW50KVxuICAgICAgICAgIH19XG4gICAgICAgICAgc2Nyb2xsYWJsZT17XG4gICAgICAgICAgICA8PlxuICAgICAgICAgICAgICA8VGVhbW1hdGVWaWV3SGVhZGVyIC8+XG4gICAgICAgICAgICAgIDxNZXNzYWdlc1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VzPXtkaXNwbGF5ZWRNZXNzYWdlc31cbiAgICAgICAgICAgICAgICB0b29scz17dG9vbHN9XG4gICAgICAgICAgICAgICAgY29tbWFuZHM9e2NvbW1hbmRzfVxuICAgICAgICAgICAgICAgIHZlcmJvc2U9e3ZlcmJvc2V9XG4gICAgICAgICAgICAgICAgdG9vbEpTWD17dG9vbEpTWH1cbiAgICAgICAgICAgICAgICB0b29sVXNlQ29uZmlybVF1ZXVlPXt0b29sVXNlQ29uZmlybVF1ZXVlfVxuICAgICAgICAgICAgICAgIGluUHJvZ3Jlc3NUb29sVXNlSURzPXtcbiAgICAgICAgICAgICAgICAgIHZpZXdlZFRlYW1tYXRlVGFza1xuICAgICAgICAgICAgICAgICAgICA/ICh2aWV3ZWRUZWFtbWF0ZVRhc2suaW5Qcm9ncmVzc1Rvb2xVc2VJRHMgPz8gbmV3IFNldCgpKVxuICAgICAgICAgICAgICAgICAgICA6IGluUHJvZ3Jlc3NUb29sVXNlSURzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlzTWVzc2FnZVNlbGVjdG9yVmlzaWJsZT17aXNNZXNzYWdlU2VsZWN0b3JWaXNpYmxlfVxuICAgICAgICAgICAgICAgIGNvbnZlcnNhdGlvbklkPXtjb252ZXJzYXRpb25JZH1cbiAgICAgICAgICAgICAgICBzY3JlZW49e3NjcmVlbn1cbiAgICAgICAgICAgICAgICBzdHJlYW1pbmdUb29sVXNlcz17c3RyZWFtaW5nVG9vbFVzZXN9XG4gICAgICAgICAgICAgICAgc2hvd0FsbEluVHJhbnNjcmlwdD17c2hvd0FsbEluVHJhbnNjcmlwdH1cbiAgICAgICAgICAgICAgICBhZ2VudERlZmluaXRpb25zPXthZ2VudERlZmluaXRpb25zfVxuICAgICAgICAgICAgICAgIG9uT3BlblJhdGVMaW1pdE9wdGlvbnM9e2hhbmRsZU9wZW5SYXRlTGltaXRPcHRpb25zfVxuICAgICAgICAgICAgICAgIGlzTG9hZGluZz17aXNMb2FkaW5nfVxuICAgICAgICAgICAgICAgIHN0cmVhbWluZ1RleHQ9e1xuICAgICAgICAgICAgICAgICAgaXNMb2FkaW5nICYmICF2aWV3ZWRBZ2VudFRhc2sgPyB2aXNpYmxlU3RyZWFtaW5nVGV4dCA6IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaXNCcmllZk9ubHk9e3ZpZXdlZEFnZW50VGFzayA/IGZhbHNlIDogaXNCcmllZk9ubHl9XG4gICAgICAgICAgICAgICAgdW5zZWVuRGl2aWRlcj17dmlld2VkQWdlbnRUYXNrID8gdW5kZWZpbmVkIDogdW5zZWVuRGl2aWRlcn1cbiAgICAgICAgICAgICAgICBzY3JvbGxSZWY9e2lzRnVsbHNjcmVlbkVudkVuYWJsZWQoKSA/IHNjcm9sbFJlZiA6IHVuZGVmaW5lZH1cbiAgICAgICAgICAgICAgICB0cmFja1N0aWNreVByb21wdD17aXNGdWxsc2NyZWVuRW52RW5hYmxlZCgpID8gdHJ1ZSA6IHVuZGVmaW5lZH1cbiAgICAgICAgICAgICAgICBjdXJzb3I9e2N1cnNvcn1cbiAgICAgICAgICAgICAgICBzZXRDdXJzb3I9e3NldEN1cnNvcn1cbiAgICAgICAgICAgICAgICBjdXJzb3JOYXZSZWY9e2N1cnNvck5hdlJlZn1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPEF3c0F1dGhTdGF0dXNCb3ggLz5cbiAgICAgICAgICAgICAgey8qIEhpZGUgdGhlIHByb2Nlc3NpbmcgcGxhY2Vob2xkZXIgd2hpbGUgYSBtb2RhbCBpcyBzaG93aW5nIOKAlFxuICAgICAgICAgICAgICAgICAgaXQgd291bGQgc2l0IGF0IHRoZSBsYXN0IHZpc2libGUgdHJhbnNjcmlwdCByb3cgcmlnaHQgYWJvdmVcbiAgICAgICAgICAgICAgICAgIHRoZSDilpQgZGl2aWRlciwgc2hvd2luZyBcIuKdryAvY29uZmlnXCIgYXMgcmVkdW5kYW50IGNsdXR0ZXJcbiAgICAgICAgICAgICAgICAgICh0aGUgbW9kYWwgSVMgdGhlIC9jb25maWcgVUkpLiBPdXRzaWRlIG1vZGFscyBpdCBzdGF5cyBzb1xuICAgICAgICAgICAgICAgICAgdGhlIHVzZXIgc2VlcyB0aGVpciBpbnB1dCBlY2hvZWQgd2hpbGUgQ2xhdWRlIHByb2Nlc3Nlcy4gKi99XG4gICAgICAgICAgICAgIHshZGlzYWJsZWQgJiYgcGxhY2Vob2xkZXJUZXh0ICYmICFjZW50ZXJlZE1vZGFsICYmIChcbiAgICAgICAgICAgICAgICA8VXNlclRleHRNZXNzYWdlXG4gICAgICAgICAgICAgICAgICBwYXJhbT17eyB0ZXh0OiBwbGFjZWhvbGRlclRleHQsIHR5cGU6ICd0ZXh0JyB9fVxuICAgICAgICAgICAgICAgICAgYWRkTWFyZ2luPXt0cnVlfVxuICAgICAgICAgICAgICAgICAgdmVyYm9zZT17dmVyYm9zZX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICB7dG9vbEpTWCAmJlxuICAgICAgICAgICAgICAgICEodG9vbEpTWC5pc0xvY2FsSlNYQ29tbWFuZCAmJiB0b29sSlNYLmlzSW1tZWRpYXRlKSAmJlxuICAgICAgICAgICAgICAgICF0b29sSnN4Q2VudGVyZWQgJiYgKFxuICAgICAgICAgICAgICAgICAgPEJveCBmbGV4RGlyZWN0aW9uPVwiY29sdW1uXCIgd2lkdGg9XCIxMDAlXCI+XG4gICAgICAgICAgICAgICAgICAgIHt0b29sSlNYLmpzeH1cbiAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIHtcImV4dGVybmFsXCIgPT09ICdhbnQnICYmIDxUdW5nc3RlbkxpdmVNb25pdG9yIC8+fVxuICAgICAgICAgICAgICB7ZmVhdHVyZSgnV0VCX0JST1dTRVJfVE9PTCcpXG4gICAgICAgICAgICAgICAgPyBXZWJCcm93c2VyUGFuZWxNb2R1bGUgJiYgKFxuICAgICAgICAgICAgICAgICAgICA8V2ViQnJvd3NlclBhbmVsTW9kdWxlLldlYkJyb3dzZXJQYW5lbCAvPlxuICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogbnVsbH1cbiAgICAgICAgICAgICAgPEJveCBmbGV4R3Jvdz17MX0gLz5cbiAgICAgICAgICAgICAge3Nob3dTcGlubmVyICYmIChcbiAgICAgICAgICAgICAgICA8U3Bpbm5lcldpdGhWZXJiXG4gICAgICAgICAgICAgICAgICBtb2RlPXtzdHJlYW1Nb2RlfVxuICAgICAgICAgICAgICAgICAgc3Bpbm5lclRpcD17c3Bpbm5lclRpcH1cbiAgICAgICAgICAgICAgICAgIHJlc3BvbnNlTGVuZ3RoUmVmPXtyZXNwb25zZUxlbmd0aFJlZn1cbiAgICAgICAgICAgICAgICAgIGFwaU1ldHJpY3NSZWY9e2FwaU1ldHJpY3NSZWZ9XG4gICAgICAgICAgICAgICAgICBvdmVycmlkZU1lc3NhZ2U9e3NwaW5uZXJNZXNzYWdlfVxuICAgICAgICAgICAgICAgICAgc3Bpbm5lclN1ZmZpeD17c3RvcEhvb2tTcGlubmVyU3VmZml4fVxuICAgICAgICAgICAgICAgICAgdmVyYm9zZT17dmVyYm9zZX1cbiAgICAgICAgICAgICAgICAgIGxvYWRpbmdTdGFydFRpbWVSZWY9e2xvYWRpbmdTdGFydFRpbWVSZWZ9XG4gICAgICAgICAgICAgICAgICB0b3RhbFBhdXNlZE1zUmVmPXt0b3RhbFBhdXNlZE1zUmVmfVxuICAgICAgICAgICAgICAgICAgcGF1c2VTdGFydFRpbWVSZWY9e3BhdXNlU3RhcnRUaW1lUmVmfVxuICAgICAgICAgICAgICAgICAgb3ZlcnJpZGVDb2xvcj17c3Bpbm5lckNvbG9yfVxuICAgICAgICAgICAgICAgICAgb3ZlcnJpZGVTaGltbWVyQ29sb3I9e3NwaW5uZXJTaGltbWVyQ29sb3J9XG4gICAgICAgICAgICAgICAgICBoYXNBY3RpdmVUb29scz17aW5Qcm9ncmVzc1Rvb2xVc2VJRHMuc2l6ZSA+IDB9XG4gICAgICAgICAgICAgICAgICBsZWFkZXJJc0lkbGU9eyFpc0xvYWRpbmd9XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgeyFzaG93U3Bpbm5lciAmJlxuICAgICAgICAgICAgICAgICFpc0xvYWRpbmcgJiZcbiAgICAgICAgICAgICAgICAhdXNlcklucHV0T25Qcm9jZXNzaW5nICYmXG4gICAgICAgICAgICAgICAgIWhhc1J1bm5pbmdUZWFtbWF0ZXMgJiZcbiAgICAgICAgICAgICAgICBpc0JyaWVmT25seSAmJlxuICAgICAgICAgICAgICAgICF2aWV3ZWRBZ2VudFRhc2sgJiYgPEJyaWVmSWRsZVN0YXR1cyAvPn1cbiAgICAgICAgICAgICAge2lzRnVsbHNjcmVlbkVudkVuYWJsZWQoKSAmJiA8UHJvbXB0SW5wdXRRdWV1ZWRDb21tYW5kcyAvPn1cbiAgICAgICAgICAgIDwvPlxuICAgICAgICAgIH1cbiAgICAgICAgICBib3R0b209e1xuICAgICAgICAgICAgPEJveFxuICAgICAgICAgICAgICBmbGV4RGlyZWN0aW9uPXtcbiAgICAgICAgICAgICAgICBmZWF0dXJlKCdCVUREWScpICYmIGNvbXBhbmlvbk5hcnJvdyA/ICdjb2x1bW4nIDogJ3JvdydcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB3aWR0aD1cIjEwMCVcIlxuICAgICAgICAgICAgICBhbGlnbkl0ZW1zPXtcbiAgICAgICAgICAgICAgICBmZWF0dXJlKCdCVUREWScpICYmIGNvbXBhbmlvbk5hcnJvdyA/IHVuZGVmaW5lZCA6ICdmbGV4LWVuZCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7ZmVhdHVyZSgnQlVERFknKSAmJlxuICAgICAgICAgICAgICBjb21wYW5pb25OYXJyb3cgJiZcbiAgICAgICAgICAgICAgaXNGdWxsc2NyZWVuRW52RW5hYmxlZCgpICYmXG4gICAgICAgICAgICAgIGNvbXBhbmlvblZpc2libGUgPyAoXG4gICAgICAgICAgICAgICAgPENvbXBhbmlvblNwcml0ZSAvPlxuICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgPEJveCBmbGV4RGlyZWN0aW9uPVwiY29sdW1uXCIgZmxleEdyb3c9ezF9PlxuICAgICAgICAgICAgICAgIHtwZXJtaXNzaW9uU3RpY2t5Rm9vdGVyfVxuICAgICAgICAgICAgICAgIHsvKiBJbW1lZGlhdGUgbG9jYWwtanN4IGNvbW1hbmRzICgvYnR3LCAvc2FuZGJveCwgL2Fzc2lzdGFudCxcbiAgICAgICAgICAgICAgICAgIC9pc3N1ZSkgcmVuZGVyIGhlcmUsIE5PVCBpbnNpZGUgc2Nyb2xsYWJsZS4gVGhleSBzdGF5IG1vdW50ZWRcbiAgICAgICAgICAgICAgICAgIHdoaWxlIHRoZSBtYWluIGNvbnZlcnNhdGlvbiBzdHJlYW1zIGJlaGluZCB0aGVtLCBzbyBTY3JvbGxCb3hcbiAgICAgICAgICAgICAgICAgIHJlbGF5b3V0cyBvbiBlYWNoIG5ldyBtZXNzYWdlIHdvdWxkIGRyYWcgdGhlbSBhcm91bmQuIGJvdHRvbVxuICAgICAgICAgICAgICAgICAgaXMgZmxleFNocmluaz17MH0gb3V0c2lkZSB0aGUgU2Nyb2xsQm94IOKAlCBpdCBuZXZlciBtb3Zlcy5cbiAgICAgICAgICAgICAgICAgIE5vbi1pbW1lZGlhdGUgbG9jYWwtanN4ICgvZGlmZiwgL3N0YXR1cywgL3RoZW1lLCB+NDAgb3RoZXJzKVxuICAgICAgICAgICAgICAgICAgc3RheXMgaW4gc2Nyb2xsYWJsZTogdGhlIG1haW4gbG9vcCBpcyBwYXVzZWQgc28gbm8gamlnZ2xlLFxuICAgICAgICAgICAgICAgICAgYW5kIHRoZWlyIHRhbGwgY29udGVudCAoRGlmZkRldGFpbFZpZXcgcmVuZGVycyB1cCB0byA0MDBcbiAgICAgICAgICAgICAgICAgIGxpbmVzIHdpdGggbm8gaW50ZXJuYWwgc2Nyb2xsKSBuZWVkcyB0aGUgb3V0ZXIgU2Nyb2xsQm94LiAqL31cbiAgICAgICAgICAgICAgICB7dG9vbEpTWD8uaXNMb2NhbEpTWENvbW1hbmQgJiZcbiAgICAgICAgICAgICAgICAgIHRvb2xKU1guaXNJbW1lZGlhdGUgJiZcbiAgICAgICAgICAgICAgICAgICF0b29sSnN4Q2VudGVyZWQgJiYgKFxuICAgICAgICAgICAgICAgICAgICA8Qm94IGZsZXhEaXJlY3Rpb249XCJjb2x1bW5cIiB3aWR0aD1cIjEwMCVcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7dG9vbEpTWC5qc3h9XG4gICAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICB7IXNob3dTcGlubmVyICYmXG4gICAgICAgICAgICAgICAgICAhdG9vbEpTWD8uaXNMb2NhbEpTWENvbW1hbmQgJiZcbiAgICAgICAgICAgICAgICAgIHNob3dFeHBhbmRlZFRvZG9zICYmXG4gICAgICAgICAgICAgICAgICB0YXNrc1YyICYmXG4gICAgICAgICAgICAgICAgICB0YXNrc1YyLmxlbmd0aCA+IDAgJiYgKFxuICAgICAgICAgICAgICAgICAgICA8Qm94IHdpZHRoPVwiMTAwJVwiIGZsZXhEaXJlY3Rpb249XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICA8VGFza0xpc3RWMiB0YXNrcz17dGFza3NWMn0gaXNTdGFuZGFsb25lPXt0cnVlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAge2ZvY3VzZWRJbnB1dERpYWxvZyA9PT0gJ3NhbmRib3gtcGVybWlzc2lvbicgJiYgKFxuICAgICAgICAgICAgICAgICAgPFNhbmRib3hQZXJtaXNzaW9uUmVxdWVzdFxuICAgICAgICAgICAgICAgICAgICBrZXk9e3NhbmRib3hQZXJtaXNzaW9uUmVxdWVzdFF1ZXVlWzBdIS5ob3N0UGF0dGVybi5ob3N0fVxuICAgICAgICAgICAgICAgICAgICBob3N0UGF0dGVybj17c2FuZGJveFBlcm1pc3Npb25SZXF1ZXN0UXVldWVbMF0hLmhvc3RQYXR0ZXJufVxuICAgICAgICAgICAgICAgICAgICBvblVzZXJSZXNwb25zZT17KHJlc3BvbnNlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgYWxsb3c6IGJvb2xlYW5cbiAgICAgICAgICAgICAgICAgICAgICBwZXJzaXN0VG9TZXR0aW5nczogYm9vbGVhblxuICAgICAgICAgICAgICAgICAgICB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBhbGxvdywgcGVyc2lzdFRvU2V0dGluZ3MgfSA9IHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFJlcXVlc3QgPSBzYW5kYm94UGVybWlzc2lvblJlcXVlc3RRdWV1ZVswXVxuICAgICAgICAgICAgICAgICAgICAgIGlmICghY3VycmVudFJlcXVlc3QpIHJldHVyblxuXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXBwcm92ZWRIb3N0ID0gY3VycmVudFJlcXVlc3QuaG9zdFBhdHRlcm4uaG9zdFxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHBlcnNpc3RUb1NldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhZGRSdWxlcycgYXMgY29uc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbE5hbWU6IFdFQl9GRVRDSF9UT09MX05BTUUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBydWxlQ29udGVudDogYGRvbWFpbjoke2FwcHJvdmVkSG9zdH1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGJlaGF2aW9yOiAoYWxsb3cgPyAnYWxsb3cnIDogJ2RlbnknKSBhc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgJ2FsbG93J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgJ2RlbnknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbjogJ2xvY2FsU2V0dGluZ3MnIGFzIGNvbnN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xQZXJtaXNzaW9uQ29udGV4dDogYXBwbHlQZXJtaXNzaW9uVXBkYXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXYudG9vbFBlcm1pc3Npb25Db250ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJzaXN0UGVybWlzc2lvblVwZGF0ZSh1cGRhdGUpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEltbWVkaWF0ZWx5IHVwZGF0ZSBzYW5kYm94IGluLW1lbW9yeSBjb25maWcgdG8gcHJldmVudCByYWNlIGNvbmRpdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoZXJlIHBlbmRpbmcgcmVxdWVzdHMgc2xpcCB0aHJvdWdoIGJlZm9yZSBzZXR0aW5ncyBjaGFuZ2UgaXMgZGV0ZWN0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIFNhbmRib3hNYW5hZ2VyLnJlZnJlc2hDb25maWcoKVxuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgQUxMIHBlbmRpbmcgcmVxdWVzdHMgZm9yIHRoZSBzYW1lIGhvc3QgKG5vdCBqdXN0IHRoZSBmaXJzdCBvbmUpXG4gICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBoYW5kbGVzIHRoZSBjYXNlIHdoZXJlIG11bHRpcGxlIHBhcmFsbGVsIHJlcXVlc3RzIGNhbWUgaW4gZm9yIHRoZSBzYW1lIGRvbWFpblxuICAgICAgICAgICAgICAgICAgICAgIHNldFNhbmRib3hQZXJtaXNzaW9uUmVxdWVzdFF1ZXVlKHF1ZXVlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9PiBpdGVtLmhvc3RQYXR0ZXJuLmhvc3QgPT09IGFwcHJvdmVkSG9zdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAuZm9yRWFjaChpdGVtID0+IGl0ZW0ucmVzb2x2ZVByb21pc2UoYWxsb3cpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHF1ZXVlLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9PiBpdGVtLmhvc3RQYXR0ZXJuLmhvc3QgIT09IGFwcHJvdmVkSG9zdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgYnJpZGdlIHN1YnNjcmlwdGlvbnMgYW5kIGNhbmNlbCByZW1vdGUgcHJvbXB0c1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGZvciB0aGlzIGhvc3Qgc2luY2UgdGhlIGxvY2FsIHVzZXIgYWxyZWFkeSByZXNwb25kZWQuXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW51cHMgPVxuICAgICAgICAgICAgICAgICAgICAgICAgc2FuZGJveEJyaWRnZUNsZWFudXBSZWYuY3VycmVudC5nZXQoYXBwcm92ZWRIb3N0KVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGVhbnVwcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBmbiBvZiBjbGVhbnVwcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBmbigpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzYW5kYm94QnJpZGdlQ2xlYW51cFJlZi5jdXJyZW50LmRlbGV0ZShhcHByb3ZlZEhvc3QpXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIHtmb2N1c2VkSW5wdXREaWFsb2cgPT09ICdwcm9tcHQnICYmIChcbiAgICAgICAgICAgICAgICAgIDxQcm9tcHREaWFsb2dcbiAgICAgICAgICAgICAgICAgICAga2V5PXtwcm9tcHRRdWV1ZVswXSEucmVxdWVzdC5wcm9tcHR9XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPXtwcm9tcHRRdWV1ZVswXSEudGl0bGV9XG4gICAgICAgICAgICAgICAgICAgIHRvb2xJbnB1dFN1bW1hcnk9e3Byb21wdFF1ZXVlWzBdIS50b29sSW5wdXRTdW1tYXJ5fVxuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0PXtwcm9tcHRRdWV1ZVswXSEucmVxdWVzdH1cbiAgICAgICAgICAgICAgICAgICAgb25SZXNwb25kPXtzZWxlY3RlZEtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHByb21wdFF1ZXVlWzBdXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtKSByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0X3Jlc3BvbnNlOiBpdGVtLnJlcXVlc3QucHJvbXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IHNlbGVjdGVkS2V5LFxuICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgc2V0UHJvbXB0UXVldWUoKFssIC4uLnRhaWxdKSA9PiB0YWlsKVxuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICBvbkFib3J0PXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHByb21wdFF1ZXVlWzBdXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtKSByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgICBpdGVtLnJlamVjdChuZXcgRXJyb3IoJ1Byb21wdCBjYW5jZWxsZWQgYnkgdXNlcicpKVxuICAgICAgICAgICAgICAgICAgICAgIHNldFByb21wdFF1ZXVlKChbLCAuLi50YWlsXSkgPT4gdGFpbClcbiAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICB7LyogU2hvdyBwZW5kaW5nIGluZGljYXRvciBvbiB3b3JrZXIgd2hpbGUgd2FpdGluZyBmb3IgbGVhZGVyIGFwcHJvdmFsICovfVxuICAgICAgICAgICAgICAgIHtwZW5kaW5nV29ya2VyUmVxdWVzdCAmJiAoXG4gICAgICAgICAgICAgICAgICA8V29ya2VyUGVuZGluZ1Blcm1pc3Npb25cbiAgICAgICAgICAgICAgICAgICAgdG9vbE5hbWU9e3BlbmRpbmdXb3JrZXJSZXF1ZXN0LnRvb2xOYW1lfVxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbj17cGVuZGluZ1dvcmtlclJlcXVlc3QuZGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgey8qIFNob3cgcGVuZGluZyBpbmRpY2F0b3IgZm9yIHNhbmRib3ggcGVybWlzc2lvbiBvbiB3b3JrZXIgc2lkZSAqL31cbiAgICAgICAgICAgICAgICB7cGVuZGluZ1NhbmRib3hSZXF1ZXN0ICYmIChcbiAgICAgICAgICAgICAgICAgIDxXb3JrZXJQZW5kaW5nUGVybWlzc2lvblxuICAgICAgICAgICAgICAgICAgICB0b29sTmFtZT1cIk5ldHdvcmsgQWNjZXNzXCJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb249e2BXYWl0aW5nIGZvciBsZWFkZXIgdG8gYXBwcm92ZSBuZXR3b3JrIGFjY2VzcyB0byAke3BlbmRpbmdTYW5kYm94UmVxdWVzdC5ob3N0fWB9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgey8qIFdvcmtlciBzYW5kYm94IHBlcm1pc3Npb24gcmVxdWVzdHMgZnJvbSBzd2FybSB3b3JrZXJzICovfVxuICAgICAgICAgICAgICAgIHtmb2N1c2VkSW5wdXREaWFsb2cgPT09ICd3b3JrZXItc2FuZGJveC1wZXJtaXNzaW9uJyAmJiAoXG4gICAgICAgICAgICAgICAgICA8U2FuZGJveFBlcm1pc3Npb25SZXF1ZXN0XG4gICAgICAgICAgICAgICAgICAgIGtleT17d29ya2VyU2FuZGJveFBlcm1pc3Npb25zLnF1ZXVlWzBdIS5yZXF1ZXN0SWR9XG4gICAgICAgICAgICAgICAgICAgIGhvc3RQYXR0ZXJuPXtcbiAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0OiB3b3JrZXJTYW5kYm94UGVybWlzc2lvbnMucXVldWVbMF0hLmhvc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgfSBhcyBOZXR3b3JrSG9zdFBhdHRlcm5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvblVzZXJSZXNwb25zZT17KHJlc3BvbnNlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgYWxsb3c6IGJvb2xlYW5cbiAgICAgICAgICAgICAgICAgICAgICBwZXJzaXN0VG9TZXR0aW5nczogYm9vbGVhblxuICAgICAgICAgICAgICAgICAgICB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBhbGxvdywgcGVyc2lzdFRvU2V0dGluZ3MgfSA9IHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFJlcXVlc3QgPSB3b3JrZXJTYW5kYm94UGVybWlzc2lvbnMucXVldWVbMF1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRSZXF1ZXN0KSByZXR1cm5cblxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFwcHJvdmVkSG9zdCA9IGN1cnJlbnRSZXF1ZXN0Lmhvc3RcblxuICAgICAgICAgICAgICAgICAgICAgIC8vIFNlbmQgcmVzcG9uc2UgdmlhIG1haWxib3ggdG8gdGhlIHdvcmtlclxuICAgICAgICAgICAgICAgICAgICAgIHZvaWQgc2VuZFNhbmRib3hQZXJtaXNzaW9uUmVzcG9uc2VWaWFNYWlsYm94KFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFJlcXVlc3Qud29ya2VyTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRSZXF1ZXN0LnJlcXVlc3RJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcHJvdmVkSG9zdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGVhbUNvbnRleHQ/LnRlYW1OYW1lLFxuICAgICAgICAgICAgICAgICAgICAgIClcblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChwZXJzaXN0VG9TZXR0aW5ncyAmJiBhbGxvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXBkYXRlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWRkUnVsZXMnIGFzIGNvbnN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xOYW1lOiBXRUJfRkVUQ0hfVE9PTF9OQU1FLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcnVsZUNvbnRlbnQ6IGBkb21haW46JHthcHByb3ZlZEhvc3R9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBiZWhhdmlvcjogJ2FsbG93JyBhcyBjb25zdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb246ICdsb2NhbFNldHRpbmdzJyBhcyBjb25zdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0QXBwU3RhdGUocHJldiA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sUGVybWlzc2lvbkNvbnRleHQ6IGFwcGx5UGVybWlzc2lvblVwZGF0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2LnRvb2xQZXJtaXNzaW9uQ29udGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgcGVyc2lzdFBlcm1pc3Npb25VcGRhdGUodXBkYXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgU2FuZGJveE1hbmFnZXIucmVmcmVzaENvbmZpZygpXG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGZyb20gcXVldWVcbiAgICAgICAgICAgICAgICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgd29ya2VyU2FuZGJveFBlcm1pc3Npb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnByZXYud29ya2VyU2FuZGJveFBlcm1pc3Npb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZTogcHJldi53b3JrZXJTYW5kYm94UGVybWlzc2lvbnMucXVldWUuc2xpY2UoMSksXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIHtmb2N1c2VkSW5wdXREaWFsb2cgPT09ICdlbGljaXRhdGlvbicgJiYgKFxuICAgICAgICAgICAgICAgICAgPEVsaWNpdGF0aW9uRGlhbG9nXG4gICAgICAgICAgICAgICAgICAgIGtleT17XG4gICAgICAgICAgICAgICAgICAgICAgZWxpY2l0YXRpb24ucXVldWVbMF0hLnNlcnZlck5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAgICc6JyArXG4gICAgICAgICAgICAgICAgICAgICAgU3RyaW5nKGVsaWNpdGF0aW9uLnF1ZXVlWzBdIS5yZXF1ZXN0SWQpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZXZlbnQ9e2VsaWNpdGF0aW9uLnF1ZXVlWzBdIX1cbiAgICAgICAgICAgICAgICAgICAgb25SZXNwb25zZT17KGFjdGlvbiwgY29udGVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRSZXF1ZXN0ID0gZWxpY2l0YXRpb24ucXVldWVbMF1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRSZXF1ZXN0KSByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIHJlc3BvbmQgY2FsbGJhY2sgdG8gcmVzb2x2ZSBQcm9taXNlXG4gICAgICAgICAgICAgICAgICAgICAgY3VycmVudFJlcXVlc3QucmVzcG9uZCh7IGFjdGlvbiwgY29udGVudCB9KVxuICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBVUkwgYWNjZXB0LCBrZWVwIGluIHF1ZXVlIGZvciBwaGFzZSAyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNVcmxBY2NlcHQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFJlcXVlc3QucGFyYW1zLm1vZGUgPT09ICd1cmwnICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPT09ICdhY2NlcHQnXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc1VybEFjY2VwdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0QXBwU3RhdGUocHJldiA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBlbGljaXRhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlOiBwcmV2LmVsaWNpdGF0aW9uLnF1ZXVlLnNsaWNlKDEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICBvbldhaXRpbmdEaXNtaXNzPXthY3Rpb24gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRSZXF1ZXN0ID0gZWxpY2l0YXRpb24ucXVldWVbMF1cbiAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSBxdWV1ZVxuICAgICAgICAgICAgICAgICAgICAgIHNldEFwcFN0YXRlKHByZXYgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGljaXRhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZTogcHJldi5lbGljaXRhdGlvbi5xdWV1ZS5zbGljZSgxKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgICAgICAgY3VycmVudFJlcXVlc3Q/Lm9uV2FpdGluZ0Rpc21pc3M/LihhY3Rpb24pXG4gICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAge2ZvY3VzZWRJbnB1dERpYWxvZyA9PT0gJ2Nvc3QnICYmIChcbiAgICAgICAgICAgICAgICAgIDxDb3N0VGhyZXNob2xkRGlhbG9nXG4gICAgICAgICAgICAgICAgICAgIG9uRG9uZT17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIHNldFNob3dDb3N0RGlhbG9nKGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgIHNldEhhdmVTaG93bkNvc3REaWFsb2codHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICBzYXZlR2xvYmFsQ29uZmlnKGN1cnJlbnQgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNBY2tub3dsZWRnZWRDb3N0VGhyZXNob2xkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgICAgICAgIGxvZ0V2ZW50KCd0ZW5ndV9jb3N0X3RocmVzaG9sZF9hY2tub3dsZWRnZWQnLCB7fSlcbiAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICB7Zm9jdXNlZElucHV0RGlhbG9nID09PSAnaWRsZS1yZXR1cm4nICYmIGlkbGVSZXR1cm5QZW5kaW5nICYmIChcbiAgICAgICAgICAgICAgICAgIDxJZGxlUmV0dXJuRGlhbG9nXG4gICAgICAgICAgICAgICAgICAgIGlkbGVNaW51dGVzPXtpZGxlUmV0dXJuUGVuZGluZy5pZGxlTWludXRlc31cbiAgICAgICAgICAgICAgICAgICAgdG90YWxJbnB1dFRva2Vucz17Z2V0VG90YWxJbnB1dFRva2VucygpfVxuICAgICAgICAgICAgICAgICAgICBvbkRvbmU9e2FzeW5jIGFjdGlvbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGVuZGluZyA9IGlkbGVSZXR1cm5QZW5kaW5nXG4gICAgICAgICAgICAgICAgICAgICAgc2V0SWRsZVJldHVyblBlbmRpbmcobnVsbClcbiAgICAgICAgICAgICAgICAgICAgICBsb2dFdmVudCgndGVuZ3VfaWRsZV9yZXR1cm5fYWN0aW9uJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gYXMgQW5hbHl0aWNzTWV0YWRhdGFfSV9WRVJJRklFRF9USElTX0lTX05PVF9DT0RFX09SX0ZJTEVQQVRIUyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkbGVNaW51dGVzOiBNYXRoLnJvdW5kKHBlbmRpbmcuaWRsZU1pbnV0ZXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUNvdW50OiBtZXNzYWdlc1JlZi5jdXJyZW50Lmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsSW5wdXRUb2tlbnM6IGdldFRvdGFsSW5wdXRUb2tlbnMoKSxcbiAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdkaXNtaXNzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0SW5wdXRWYWx1ZShwZW5kaW5nLmlucHV0KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICduZXZlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVHbG9iYWxDb25maWcoY3VycmVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50LmlkbGVSZXR1cm5EaXNtaXNzZWQpIHJldHVybiBjdXJyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IC4uLmN1cnJlbnQsIGlkbGVSZXR1cm5EaXNtaXNzZWQ6IHRydWUgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2NsZWFyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBjbGVhckNvbnZlcnNhdGlvbiB9ID0gYXdhaXQgaW1wb3J0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAnLi4vY29tbWFuZHMvY2xlYXIvY29udmVyc2F0aW9uLmpzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgY2xlYXJDb252ZXJzYXRpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRNZXNzYWdlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZEZpbGVTdGF0ZTogcmVhZEZpbGVTdGF0ZS5jdXJyZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNjb3ZlcmVkU2tpbGxOYW1lczogZGlzY292ZXJlZFNraWxsTmFtZXNSZWYuY3VycmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVkTmVzdGVkTWVtb3J5UGF0aHM6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVkTmVzdGVkTWVtb3J5UGF0aHNSZWYuY3VycmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0QXBwU3RhdGU6ICgpID0+IHN0b3JlLmdldFN0YXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNldEFwcFN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRDb252ZXJzYXRpb25JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICBoYWlrdVRpdGxlQXR0ZW1wdGVkUmVmLmN1cnJlbnQgPSBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0SGFpa3VUaXRsZSh1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNoVG9vbHMuY3VycmVudC5jbGVhcigpXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNoVG9vbHNQcm9jZXNzZWRJZHguY3VycmVudCA9IDBcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgc2tpcElkbGVDaGVja1JlZi5jdXJyZW50ID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgIHZvaWQgb25TdWJtaXRSZWYuY3VycmVudChwZW5kaW5nLmlucHV0LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDdXJzb3JPZmZzZXQ6ICgpID0+IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJCdWZmZXI6ICgpID0+IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXRIaXN0b3J5OiAoKSA9PiB7fSxcbiAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIHtmb2N1c2VkSW5wdXREaWFsb2cgPT09ICdpZGUtb25ib2FyZGluZycgJiYgKFxuICAgICAgICAgICAgICAgICAgPElkZU9uYm9hcmRpbmdEaWFsb2dcbiAgICAgICAgICAgICAgICAgICAgb25Eb25lPXsoKSA9PiBzZXRTaG93SWRlT25ib2FyZGluZyhmYWxzZSl9XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvblN0YXR1cz17aWRlSW5zdGFsbGF0aW9uU3RhdHVzfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIHtcImV4dGVybmFsXCIgPT09ICdhbnQnICYmXG4gICAgICAgICAgICAgICAgICBmb2N1c2VkSW5wdXREaWFsb2cgPT09ICdtb2RlbC1zd2l0Y2gnICYmXG4gICAgICAgICAgICAgICAgICBBbnRNb2RlbFN3aXRjaENhbGxvdXQgJiYgKFxuICAgICAgICAgICAgICAgICAgICA8QW50TW9kZWxTd2l0Y2hDYWxsb3V0XG4gICAgICAgICAgICAgICAgICAgICAgb25Eb25lPXsoc2VsZWN0aW9uOiBzdHJpbmcsIG1vZGVsQWxpYXM/OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFNob3dNb2RlbFN3aXRjaENhbGxvdXQoZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0aW9uID09PSAnc3dpdGNoJyAmJiBtb2RlbEFsaWFzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNldEFwcFN0YXRlKHByZXYgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5Mb29wTW9kZWw6IG1vZGVsQWxpYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFpbkxvb3BNb2RlbEZvclNlc3Npb246IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIHtcImV4dGVybmFsXCIgPT09ICdhbnQnICYmXG4gICAgICAgICAgICAgICAgICBmb2N1c2VkSW5wdXREaWFsb2cgPT09ICd1bmRlcmNvdmVyLWNhbGxvdXQnICYmXG4gICAgICAgICAgICAgICAgICBVbmRlcmNvdmVyQXV0b0NhbGxvdXQgJiYgKFxuICAgICAgICAgICAgICAgICAgICA8VW5kZXJjb3ZlckF1dG9DYWxsb3V0XG4gICAgICAgICAgICAgICAgICAgICAgb25Eb25lPXsoKSA9PiBzZXRTaG93VW5kZXJjb3ZlckNhbGxvdXQoZmFsc2UpfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICB7Zm9jdXNlZElucHV0RGlhbG9nID09PSAnZWZmb3J0LWNhbGxvdXQnICYmIChcbiAgICAgICAgICAgICAgICAgIDxFZmZvcnRDYWxsb3V0XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsPXttYWluTG9vcE1vZGVsfVxuICAgICAgICAgICAgICAgICAgICBvbkRvbmU9e3NlbGVjdGlvbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgc2V0U2hvd0VmZm9ydENhbGxvdXQoZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdGlvbiAhPT0gJ2Rpc21pc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVmZm9ydFZhbHVlOiBzZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAge2ZvY3VzZWRJbnB1dERpYWxvZyA9PT0gJ3JlbW90ZS1jYWxsb3V0JyAmJiAoXG4gICAgICAgICAgICAgICAgICA8UmVtb3RlQ2FsbG91dFxuICAgICAgICAgICAgICAgICAgICBvbkRvbmU9e3NlbGVjdGlvbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgc2V0QXBwU3RhdGUocHJldiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXByZXYuc2hvd1JlbW90ZUNhbGxvdXQpIHJldHVybiBwcmV2XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93UmVtb3RlQ2FsbG91dDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC4uLihzZWxlY3Rpb24gPT09ICdlbmFibGUnICYmIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsQnJpZGdlRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsQnJpZGdlRXhwbGljaXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwbEJyaWRnZU91dGJvdW5kT25seTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgICAgICB7ZXhpdEZsb3d9XG5cbiAgICAgICAgICAgICAgICB7Zm9jdXNlZElucHV0RGlhbG9nID09PSAncGx1Z2luLWhpbnQnICYmIGhpbnRSZWNvbW1lbmRhdGlvbiAmJiAoXG4gICAgICAgICAgICAgICAgICA8UGx1Z2luSGludE1lbnVcbiAgICAgICAgICAgICAgICAgICAgcGx1Z2luTmFtZT17aGludFJlY29tbWVuZGF0aW9uLnBsdWdpbk5hbWV9XG4gICAgICAgICAgICAgICAgICAgIHBsdWdpbkRlc2NyaXB0aW9uPXtoaW50UmVjb21tZW5kYXRpb24ucGx1Z2luRGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlTmFtZT17aGludFJlY29tbWVuZGF0aW9uLm1hcmtldHBsYWNlTmFtZX1cbiAgICAgICAgICAgICAgICAgICAgc291cmNlQ29tbWFuZD17aGludFJlY29tbWVuZGF0aW9uLnNvdXJjZUNvbW1hbmR9XG4gICAgICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U9e2hhbmRsZUhpbnRSZXNwb25zZX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgICAgIHtmb2N1c2VkSW5wdXREaWFsb2cgPT09ICdsc3AtcmVjb21tZW5kYXRpb24nICYmXG4gICAgICAgICAgICAgICAgICBsc3BSZWNvbW1lbmRhdGlvbiAmJiAoXG4gICAgICAgICAgICAgICAgICAgIDxMc3BSZWNvbW1lbmRhdGlvbk1lbnVcbiAgICAgICAgICAgICAgICAgICAgICBwbHVnaW5OYW1lPXtsc3BSZWNvbW1lbmRhdGlvbi5wbHVnaW5OYW1lfVxuICAgICAgICAgICAgICAgICAgICAgIHBsdWdpbkRlc2NyaXB0aW9uPXtsc3BSZWNvbW1lbmRhdGlvbi5wbHVnaW5EZXNjcmlwdGlvbn1cbiAgICAgICAgICAgICAgICAgICAgICBmaWxlRXh0ZW5zaW9uPXtsc3BSZWNvbW1lbmRhdGlvbi5maWxlRXh0ZW5zaW9ufVxuICAgICAgICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U9e2hhbmRsZUxzcFJlc3BvbnNlfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgICAgIHtmb2N1c2VkSW5wdXREaWFsb2cgPT09ICdkZXNrdG9wLXVwc2VsbCcgJiYgKFxuICAgICAgICAgICAgICAgICAgPERlc2t0b3BVcHNlbGxTdGFydHVwXG4gICAgICAgICAgICAgICAgICAgIG9uRG9uZT17KCkgPT4gc2V0U2hvd0Rlc2t0b3BVcHNlbGxTdGFydHVwKGZhbHNlKX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgICAgIHtmZWF0dXJlKCdVTFRSQVBMQU4nKVxuICAgICAgICAgICAgICAgICAgPyBmb2N1c2VkSW5wdXREaWFsb2cgPT09ICd1bHRyYXBsYW4tY2hvaWNlJyAmJlxuICAgICAgICAgICAgICAgICAgICB1bHRyYXBsYW5QZW5kaW5nQ2hvaWNlICYmIChcbiAgICAgICAgICAgICAgICAgICAgICA8VWx0cmFwbGFuQ2hvaWNlRGlhbG9nXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFuPXt1bHRyYXBsYW5QZW5kaW5nQ2hvaWNlLnBsYW59XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uSWQ9e3VsdHJhcGxhblBlbmRpbmdDaG9pY2Uuc2Vzc2lvbklkfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGFza0lkPXt1bHRyYXBsYW5QZW5kaW5nQ2hvaWNlLnRhc2tJZH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNldE1lc3NhZ2VzPXtzZXRNZXNzYWdlc31cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRGaWxlU3RhdGU9e3JlYWRGaWxlU3RhdGUuY3VycmVudH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGdldEFwcFN0YXRlPXsoKSA9PiBzdG9yZS5nZXRTdGF0ZSgpfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0Q29udmVyc2F0aW9uSWQ9e3NldENvbnZlcnNhdGlvbklkfVxuICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgIDogbnVsbH1cblxuICAgICAgICAgICAgICAgIHtmZWF0dXJlKCdVTFRSQVBMQU4nKVxuICAgICAgICAgICAgICAgICAgPyBmb2N1c2VkSW5wdXREaWFsb2cgPT09ICd1bHRyYXBsYW4tbGF1bmNoJyAmJlxuICAgICAgICAgICAgICAgICAgICB1bHRyYXBsYW5MYXVuY2hQZW5kaW5nICYmIChcbiAgICAgICAgICAgICAgICAgICAgICA8VWx0cmFwbGFuTGF1bmNoRGlhbG9nXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNob2ljZT17KGNob2ljZSwgb3B0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBibHVyYiA9IHVsdHJhcGxhbkxhdW5jaFBlbmRpbmcuYmx1cmJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0QXBwU3RhdGUocHJldiA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXYudWx0cmFwbGFuTGF1bmNoUGVuZGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPyB7IC4uLnByZXYsIHVsdHJhcGxhbkxhdW5jaFBlbmRpbmc6IHVuZGVmaW5lZCB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHByZXYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNob2ljZSA9PT0gJ2NhbmNlbCcpIHJldHVyblxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb21tYW5kJ3Mgb25Eb25lIHVzZWQgZGlzcGxheTonc2tpcCcsIHNvIGFkZCB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWNobyBoZXJlIOKAlCBnaXZlcyBpbW1lZGlhdGUgZmVlZGJhY2sgYmVmb3JlIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB+NXMgdGVsZXBvcnRUb1JlbW90ZSByZXNvbHZlcy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0TWVzc2FnZXMocHJldiA9PiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4ucHJldixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVDb21tYW5kSW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0Q29tbWFuZElucHV0VGFncygndWx0cmFwbGFuJywgYmx1cmIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFwcGVuZFN0ZG91dCA9IChtc2c6IHN0cmluZykgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVDb21tYW5kSW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgPCR7TE9DQUxfQ09NTUFORF9TVERPVVRfVEFHfT4ke2VzY2FwZVhtbChtc2cpfTwvJHtMT0NBTF9DT01NQU5EX1NURE9VVF9UQUd9PmAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERlZmVyIHRoZSBzZWNvbmQgbWVzc2FnZSBpZiBhIHF1ZXJ5IGlzIG1pZC10dXJuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNvIGl0IGxhbmRzIGFmdGVyIHRoZSBhc3Npc3RhbnQgcmVwbHksIG5vdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBiZXR3ZWVuIHRoZSB1c2VyJ3MgcHJvbXB0IGFuZCB0aGUgcmVwbHkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFwcGVuZFdoZW5JZGxlID0gKG1zZzogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFxdWVyeUd1YXJkLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBlbmRTdGRvdXQobXNnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVuc3ViID0gcXVlcnlHdWFyZC5zdWJzY3JpYmUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5R3VhcmQuaXNBY3RpdmUpIHJldHVyblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5zdWIoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBpZiB0aGUgdXNlciBzdG9wcGVkIHVsdHJhcGxhbiB3aGlsZSB3ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2VyZSB3YWl0aW5nIOKAlCBhdm9pZHMgYSBzdGFsZSBcIk1vbml0b3JpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDx1cmw+XCIgbWVzc2FnZSBmb3IgYSBzZXNzaW9uIHRoYXQncyBnb25lLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzdG9yZS5nZXRTdGF0ZSgpLnVsdHJhcGxhblNlc3Npb25VcmwpIHJldHVyblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwZW5kU3Rkb3V0KG1zZylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgbGF1bmNoVWx0cmFwbGFuKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibHVyYixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRBcHBTdGF0ZTogKCkgPT4gc3RvcmUuZ2V0U3RhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRBcHBTdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaWduYWw6IGNyZWF0ZUFib3J0Q29udHJvbGxlcigpLnNpZ25hbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNjb25uZWN0ZWRCcmlkZ2U6IG9wdHM/LmRpc2Nvbm5lY3RlZEJyaWRnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvblNlc3Npb25SZWFkeTogYXBwZW5kV2hlbklkbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oYXBwZW5kU3Rkb3V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaChsb2dFcnJvcilcbiAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgOiBudWxsfVxuXG4gICAgICAgICAgICAgICAge21yUmVuZGVyKCl9XG5cbiAgICAgICAgICAgICAgICB7IXRvb2xKU1g/LnNob3VsZEhpZGVQcm9tcHRJbnB1dCAmJlxuICAgICAgICAgICAgICAgICAgIWZvY3VzZWRJbnB1dERpYWxvZyAmJlxuICAgICAgICAgICAgICAgICAgIWlzRXhpdGluZyAmJlxuICAgICAgICAgICAgICAgICAgIWRpc2FibGVkICYmXG4gICAgICAgICAgICAgICAgICAhY3Vyc29yICYmIChcbiAgICAgICAgICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgICAgICAgICB7YXV0b1J1bklzc3VlUmVhc29uICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxBdXRvUnVuSXNzdWVOb3RpZmljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25SdW49e2hhbmRsZUF1dG9SdW5Jc3N1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DYW5jZWw9e2hhbmRsZUNhbmNlbEF1dG9SdW5Jc3N1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhc29uPXtnZXRBdXRvUnVuSXNzdWVSZWFzb25UZXh0KGF1dG9SdW5Jc3N1ZVJlYXNvbil9XG4gICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAge3Bvc3RDb21wYWN0U3VydmV5LnN0YXRlICE9PSAnY2xvc2VkJyA/IChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxGZWVkYmFja1N1cnZleVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZT17cG9zdENvbXBhY3RTdXJ2ZXkuc3RhdGV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RSZXNwb25zZT17cG9zdENvbXBhY3RTdXJ2ZXkubGFzdFJlc3BvbnNlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVTZWxlY3Q9e3Bvc3RDb21wYWN0U3VydmV5LmhhbmRsZVNlbGVjdH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRWYWx1ZT17aW5wdXRWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0SW5wdXRWYWx1ZT17c2V0SW5wdXRWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25SZXF1ZXN0RmVlZGJhY2s9e2hhbmRsZVN1cnZleVJlcXVlc3RGZWVkYmFja31cbiAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgKSA6IG1lbW9yeVN1cnZleS5zdGF0ZSAhPT0gJ2Nsb3NlZCcgPyAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8RmVlZGJhY2tTdXJ2ZXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGU9e21lbW9yeVN1cnZleS5zdGF0ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdFJlc3BvbnNlPXttZW1vcnlTdXJ2ZXkubGFzdFJlc3BvbnNlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVTZWxlY3Q9e21lbW9yeVN1cnZleS5oYW5kbGVTZWxlY3R9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZVRyYW5zY3JpcHRTZWxlY3Q9e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lbW9yeVN1cnZleS5oYW5kbGVUcmFuc2NyaXB0U2VsZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRWYWx1ZT17aW5wdXRWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0SW5wdXRWYWx1ZT17c2V0SW5wdXRWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25SZXF1ZXN0RmVlZGJhY2s9e2hhbmRsZVN1cnZleVJlcXVlc3RGZWVkYmFja31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZT1cIkhvdyB3ZWxsIGRpZCBDbGF1ZGUgdXNlIGl0cyBtZW1vcnk/IChvcHRpb25hbClcIlxuICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgICAgICAgPEZlZWRiYWNrU3VydmV5XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlPXtmZWVkYmFja1N1cnZleS5zdGF0ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdFJlc3BvbnNlPXtmZWVkYmFja1N1cnZleS5sYXN0UmVzcG9uc2V9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZVNlbGVjdD17ZmVlZGJhY2tTdXJ2ZXkuaGFuZGxlU2VsZWN0fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVUcmFuc2NyaXB0U2VsZWN0PXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZWVkYmFja1N1cnZleS5oYW5kbGVUcmFuc2NyaXB0U2VsZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRWYWx1ZT17aW5wdXRWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0SW5wdXRWYWx1ZT17c2V0SW5wdXRWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25SZXF1ZXN0RmVlZGJhY2s9e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZEF1dG9SdW5Jc3N1ZVJlZi5jdXJyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBoYW5kbGVTdXJ2ZXlSZXF1ZXN0RmVlZGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgICAgIHsvKiBGcnVzdHJhdGlvbi10cmlnZ2VyZWQgdHJhbnNjcmlwdCBzaGFyaW5nIHByb21wdCAqL31cbiAgICAgICAgICAgICAgICAgICAgICB7ZnJ1c3RyYXRpb25EZXRlY3Rpb24uc3RhdGUgIT09ICdjbG9zZWQnICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxGZWVkYmFja1N1cnZleVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZT17ZnJ1c3RyYXRpb25EZXRlY3Rpb24uc3RhdGV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RSZXNwb25zZT17bnVsbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2VsZWN0PXsoKSA9PiB7fX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlVHJhbnNjcmlwdFNlbGVjdD17XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJ1c3RyYXRpb25EZXRlY3Rpb24uaGFuZGxlVHJhbnNjcmlwdFNlbGVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0VmFsdWU9e2lucHV0VmFsdWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNldElucHV0VmFsdWU9e3NldElucHV0VmFsdWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAgey8qIFNraWxsIGltcHJvdmVtZW50IHN1cnZleSAtIGFwcGVhcnMgd2hlbiBpbXByb3ZlbWVudHMgZGV0ZWN0ZWQgKGFudC1vbmx5KSAqL31cbiAgICAgICAgICAgICAgICAgICAgICB7XCJleHRlcm5hbFwiID09PSAnYW50JyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgc2tpbGxJbXByb3ZlbWVudFN1cnZleS5zdWdnZXN0aW9uICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPFNraWxsSW1wcm92ZW1lbnRTdXJ2ZXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc09wZW49e3NraWxsSW1wcm92ZW1lbnRTdXJ2ZXkuaXNPcGVufVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraWxsTmFtZT17XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBza2lsbEltcHJvdmVtZW50U3VydmV5LnN1Z2dlc3Rpb24uc2tpbGxOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZXM9e3NraWxsSW1wcm92ZW1lbnRTdXJ2ZXkuc3VnZ2VzdGlvbi51cGRhdGVzfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZVNlbGVjdD17c2tpbGxJbXByb3ZlbWVudFN1cnZleS5oYW5kbGVTZWxlY3R9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRWYWx1ZT17aW5wdXRWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRJbnB1dFZhbHVlPXtzZXRJbnB1dFZhbHVlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICB7c2hvd0lzc3VlRmxhZ0Jhbm5lciAmJiA8SXNzdWVGbGFnQmFubmVyIC8+fVxuICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgPFByb21wdElucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Zz17ZGVidWd9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVTZWxlY3Rpb249e2lkZVNlbGVjdGlvbn1cbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc1N1cHByZXNzZWREaWFsb2dzPXshIWhhc1N1cHByZXNzZWREaWFsb2dzfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXNMb2NhbEpTWENvbW1hbmRBY3RpdmU9e2lzU2hvd2luZ0xvY2FsSlNYQ29tbWFuZH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGdldFRvb2xVc2VDb250ZXh0PXtnZXRUb29sVXNlQ29udGV4dH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xQZXJtaXNzaW9uQ29udGV4dD17dG9vbFBlcm1pc3Npb25Db250ZXh0fVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VG9vbFBlcm1pc3Npb25Db250ZXh0PXtzZXRUb29sUGVybWlzc2lvbkNvbnRleHR9XG4gICAgICAgICAgICAgICAgICAgICAgICBhcGlLZXlTdGF0dXM9e2FwaUtleVN0YXR1c31cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzPXtjb21tYW5kc31cbiAgICAgICAgICAgICAgICAgICAgICAgIGFnZW50cz17YWdlbnREZWZpbml0aW9ucy5hY3RpdmVBZ2VudHN9XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0xvYWRpbmc9e2lzTG9hZGluZ31cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uRXhpdD17aGFuZGxlRXhpdH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJvc2U9e3ZlcmJvc2V9XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlcz17bWVzc2FnZXN9XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkF1dG9VcGRhdGVyUmVzdWx0PXtzZXRBdXRvVXBkYXRlclJlc3VsdH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9VcGRhdGVyUmVzdWx0PXthdXRvVXBkYXRlclJlc3VsdH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0PXtpbnB1dFZhbHVlfVxuICAgICAgICAgICAgICAgICAgICAgICAgb25JbnB1dENoYW5nZT17c2V0SW5wdXRWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGU9e2lucHV0TW9kZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uTW9kZUNoYW5nZT17c2V0SW5wdXRNb2RlfVxuICAgICAgICAgICAgICAgICAgICAgICAgc3Rhc2hlZFByb21wdD17c3Rhc2hlZFByb21wdH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFN0YXNoZWRQcm9tcHQ9e3NldFN0YXNoZWRQcm9tcHR9XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXRDb3VudD17c3VibWl0Q291bnR9XG4gICAgICAgICAgICAgICAgICAgICAgICBvblNob3dNZXNzYWdlU2VsZWN0b3I9e2hhbmRsZVNob3dNZXNzYWdlU2VsZWN0b3J9XG4gICAgICAgICAgICAgICAgICAgICAgICBvbk1lc3NhZ2VBY3Rpb25zRW50ZXI9e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXb3JrcyBkdXJpbmcgaXNMb2FkaW5nIOKAlCBlZGl0IGNhbmNlbHMgZmlyc3Q7IHV1aWQgc2VsZWN0aW9uIHN1cnZpdmVzIGFwcGVuZHMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmUoJ01FU1NBR0VfQUNUSU9OUycpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlzRnVsbHNjcmVlbkVudkVuYWJsZWQoKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAhZGlzYWJsZU1lc3NhZ2VBY3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBlbnRlck1lc3NhZ2VBY3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG1jcENsaWVudHM9e21jcENsaWVudHN9XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXN0ZWRDb250ZW50cz17cGFzdGVkQ29udGVudHN9XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRQYXN0ZWRDb250ZW50cz17c2V0UGFzdGVkQ29udGVudHN9XG4gICAgICAgICAgICAgICAgICAgICAgICB2aW1Nb2RlPXt2aW1Nb2RlfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VmltTW9kZT17c2V0VmltTW9kZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3dCYXNoZXNEaWFsb2c9e3Nob3dCYXNoZXNEaWFsb2d9XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRTaG93QmFzaGVzRGlhbG9nPXtzZXRTaG93QmFzaGVzRGlhbG9nfVxuICAgICAgICAgICAgICAgICAgICAgICAgb25TdWJtaXQ9e29uU3VibWl0fVxuICAgICAgICAgICAgICAgICAgICAgICAgb25BZ2VudFN1Ym1pdD17b25BZ2VudFN1Ym1pdH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlzU2VhcmNoaW5nSGlzdG9yeT17aXNTZWFyY2hpbmdIaXN0b3J5fVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0SXNTZWFyY2hpbmdIaXN0b3J5PXtzZXRJc1NlYXJjaGluZ0hpc3Rvcnl9XG4gICAgICAgICAgICAgICAgICAgICAgICBoZWxwT3Blbj17aXNIZWxwT3Blbn1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNldEhlbHBPcGVuPXtzZXRJc0hlbHBPcGVufVxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0VGV4dFJlZj17XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmUoJ1ZPSUNFX01PREUnKSA/IGluc2VydFRleHRSZWYgOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZvaWNlSW50ZXJpbVJhbmdlPXt2b2ljZS5pbnRlcmltUmFuZ2V9XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8U2Vzc2lvbkJhY2tncm91bmRIaW50XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkJhY2tncm91bmRTZXNzaW9uPXtoYW5kbGVCYWNrZ3JvdW5kU2Vzc2lvbn1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlzTG9hZGluZz17aXNMb2FkaW5nfVxuICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICB7Y3Vyc29yICYmIChcbiAgICAgICAgICAgICAgICAgIC8vIGlucHV0VmFsdWUgaXMgUkVQTCBzdGF0ZTsgdHlwZWQgdGV4dCBzdXJ2aXZlcyB0aGUgcm91bmQtdHJpcC5cbiAgICAgICAgICAgICAgICAgIDxNZXNzYWdlQWN0aW9uc0JhciBjdXJzb3I9e2N1cnNvcn0gLz5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIHtmb2N1c2VkSW5wdXREaWFsb2cgPT09ICdtZXNzYWdlLXNlbGVjdG9yJyAmJiAoXG4gICAgICAgICAgICAgICAgICA8TWVzc2FnZVNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzPXttZXNzYWdlc31cbiAgICAgICAgICAgICAgICAgICAgcHJlc2VsZWN0ZWRNZXNzYWdlPXttZXNzYWdlU2VsZWN0b3JQcmVzZWxlY3R9XG4gICAgICAgICAgICAgICAgICAgIG9uUHJlUmVzdG9yZT17b25DYW5jZWx9XG4gICAgICAgICAgICAgICAgICAgIG9uUmVzdG9yZUNvZGU9e2FzeW5jIChtZXNzYWdlOiBVc2VyTWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGZpbGVIaXN0b3J5UmV3aW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVyOiAocHJldjogRmlsZUhpc3RvcnlTdGF0ZSkgPT4gRmlsZUhpc3RvcnlTdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRBcHBTdGF0ZShwcmV2ID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4ucHJldixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlSGlzdG9yeTogdXBkYXRlcihwcmV2LmZpbGVIaXN0b3J5KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgb25TdW1tYXJpemU9e2FzeW5jIChcbiAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBVc2VyTWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICBmZWVkYmFjaz86IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFBhcnRpYWxDb21wYWN0RGlyZWN0aW9uID0gJ2Zyb20nLFxuICAgICAgICAgICAgICAgICAgICApID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBQcm9qZWN0IHNuaXBwZWQgbWVzc2FnZXMgc28gdGhlIGNvbXBhY3QgbW9kZWxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBkb2Vzbid0IHN1bW1hcml6ZSBjb250ZW50IHRoYXQgd2FzIGludGVudGlvbmFsbHkgcmVtb3ZlZC5cbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wYWN0TWVzc2FnZXMgPVxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0TWVzc2FnZXNBZnRlckNvbXBhY3RCb3VuZGFyeShtZXNzYWdlcylcblxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VJbmRleCA9IGNvbXBhY3RNZXNzYWdlcy5pbmRleE9mKG1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2VJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlbGVjdGVkIGEgc25pcHBlZCBvciBwcmUtY29tcGFjdCBtZXNzYWdlIHRoYXQgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZWxlY3RvciBzdGlsbCBzaG93cyAoUkVQTCBrZWVwcyBmdWxsIGhpc3RvcnkgZm9yXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzY3JvbGxiYWNrKS4gU3VyZmFjZSB3aHkgbm90aGluZyBoYXBwZW5lZCBpbnN0ZWFkXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvZiBzaWxlbnRseSBuby1vcGluZy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNldE1lc3NhZ2VzKHByZXYgPT4gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5wcmV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVTeXN0ZW1NZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdUaGF0IG1lc3NhZ2UgaXMgbm8gbG9uZ2VyIGluIHRoZSBhY3RpdmUgY29udGV4dCAoc25pcHBlZCBvciBwcmUtY29tcGFjdCkuIENob29zZSBhIG1vcmUgcmVjZW50IG1lc3NhZ2UuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnd2FybmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3QWJvcnRDb250cm9sbGVyID0gY3JlYXRlQWJvcnRDb250cm9sbGVyKClcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gZ2V0VG9vbFVzZUNvbnRleHQoXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wYWN0TWVzc2FnZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0Fib3J0Q29udHJvbGxlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haW5Mb29wTW9kZWwsXG4gICAgICAgICAgICAgICAgICAgICAgKVxuXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXBwU3RhdGUgPSBjb250ZXh0LmdldEFwcFN0YXRlKClcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWZhdWx0U3lzUHJvbXB0ID0gYXdhaXQgZ2V0U3lzdGVtUHJvbXB0KFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5vcHRpb25zLnRvb2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5vcHRpb25zLm1haW5Mb29wTW9kZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5mcm9tKFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBTdGF0ZS50b29sUGVybWlzc2lvbkNvbnRleHQuYWRkaXRpb25hbFdvcmtpbmdEaXJlY3Rvcmllcy5rZXlzKCksXG4gICAgICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5vcHRpb25zLm1jcENsaWVudHMsXG4gICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN5c3RlbVByb21wdCA9IGJ1aWxkRWZmZWN0aXZlU3lzdGVtUHJvbXB0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haW5UaHJlYWRBZ2VudERlZmluaXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xVc2VDb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tU3lzdGVtUHJvbXB0OiBjb250ZXh0Lm9wdGlvbnMuY3VzdG9tU3lzdGVtUHJvbXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFN5c3RlbVByb21wdDogZGVmYXVsdFN5c1Byb21wdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGVuZFN5c3RlbVByb21wdDogY29udGV4dC5vcHRpb25zLmFwcGVuZFN5c3RlbVByb21wdCxcbiAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IFt1c2VyQ29udGV4dCwgc3lzdGVtQ29udGV4dF0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRVc2VyQ29udGV4dCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0U3lzdGVtQ29udGV4dCgpLFxuICAgICAgICAgICAgICAgICAgICAgIF0pXG5cbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwYXJ0aWFsQ29tcGFjdENvbnZlcnNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBhY3RNZXNzYWdlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN5c3RlbVByb21wdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlckNvbnRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN5c3RlbUNvbnRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xVc2VDb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JrQ29udGV4dE1lc3NhZ2VzOiBjb21wYWN0TWVzc2FnZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZmVlZGJhY2ssXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgKVxuXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2VwdCA9IHJlc3VsdC5tZXNzYWdlc1RvS2VlcCA/PyBbXVxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyZWQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID09PSAndXBfdG8nXG4gICAgICAgICAgICAgICAgICAgICAgICAgID8gWy4uLnJlc3VsdC5zdW1tYXJ5TWVzc2FnZXMsIC4uLmtlcHRdXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDogWy4uLmtlcHQsIC4uLnJlc3VsdC5zdW1tYXJ5TWVzc2FnZXNdXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zdENvbXBhY3QgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuYm91bmRhcnlNYXJrZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5vcmRlcmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgLi4ucmVzdWx0LmF0dGFjaG1lbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgLi4ucmVzdWx0Lmhvb2tSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsc2NyZWVuICdmcm9tJyBrZWVwcyBzY3JvbGxiYWNrOyAndXBfdG8nIG11c3Qgbm90XG4gICAgICAgICAgICAgICAgICAgICAgLy8gKG9sZFswXSB1bmNoYW5nZWQgKyBncm93biBhcnJheSBtZWFucyBpbmNyZW1lbnRhbFxuICAgICAgICAgICAgICAgICAgICAgIC8vIHVzZUxvZ01lc3NhZ2VzIHBhdGgsIHNvIGJvdW5kYXJ5IG5ldmVyIHBlcnNpc3RlZCkuXG4gICAgICAgICAgICAgICAgICAgICAgLy8gRmluZCBieSB1dWlkIHNpbmNlIG9sZCBpcyByYXcgUkVQTCBoaXN0b3J5IGFuZCBzbmlwcGVkXG4gICAgICAgICAgICAgICAgICAgICAgLy8gZW50cmllcyBjYW4gc2hpZnQgdGhlIHByb2plY3RlZCBtZXNzYWdlSW5kZXguXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGlzRnVsbHNjcmVlbkVudkVuYWJsZWQoKSAmJiBkaXJlY3Rpb24gPT09ICdmcm9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0TWVzc2FnZXMob2xkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmF3SWR4ID0gb2xkLmZpbmRJbmRleChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtID0+IG0udXVpZCA9PT0gbWVzc2FnZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4ub2xkLnNsaWNlKDAsIHJhd0lkeCA9PT0gLTEgPyAwIDogcmF3SWR4KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5wb3N0Q29tcGFjdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0TWVzc2FnZXMocG9zdENvbXBhY3QpXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIC8vIFBhcnRpYWwgY29tcGFjdCBieXBhc3NlcyBoYW5kbGVNZXNzYWdlRnJvbVN0cmVhbSDigJQgY2xlYXJcbiAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgY29udGV4dC1ibG9ja2VkIGZsYWcgc28gcHJvYWN0aXZlIHRpY2tzIHJlc3VtZS5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZSgnUFJPQUNUSVZFJykgfHwgZmVhdHVyZSgnS0FJUk9TJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2FjdGl2ZU1vZHVsZT8uc2V0Q29udGV4dEJsb2NrZWQoZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIHNldENvbnZlcnNhdGlvbklkKHJhbmRvbVVVSUQoKSlcbiAgICAgICAgICAgICAgICAgICAgICBydW5Qb3N0Q29tcGFjdENsZWFudXAoY29udGV4dC5vcHRpb25zLnF1ZXJ5U291cmNlKVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2Zyb20nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByID0gdGV4dEZvclJlc3VibWl0KG1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRJbnB1dFZhbHVlKHIudGV4dClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0SW5wdXRNb2RlKHIubW9kZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG5vdGlmaWNhdGlvbiB3aXRoIGN0cmwrbyBoaW50XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGlzdG9yeVNob3J0Y3V0ID0gZ2V0U2hvcnRjdXREaXNwbGF5KFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2FwcDp0b2dnbGVUcmFuc2NyaXB0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdHbG9iYWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2N0cmwrbycsXG4gICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgIGFkZE5vdGlmaWNhdGlvbih7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6ICdzdW1tYXJpemUtY3RybC1vLWhpbnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogYENvbnZlcnNhdGlvbiBzdW1tYXJpemVkICgke2hpc3RvcnlTaG9ydGN1dH0gZm9yIGhpc3RvcnkpYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAnbWVkaXVtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXRNczogODAwMCxcbiAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICBvblJlc3RvcmVNZXNzYWdlPXtoYW5kbGVSZXN0b3JlTWVzc2FnZX1cbiAgICAgICAgICAgICAgICAgICAgb25DbG9zZT17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIHNldElzTWVzc2FnZVNlbGVjdG9yVmlzaWJsZShmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICBzZXRNZXNzYWdlU2VsZWN0b3JQcmVzZWxlY3QodW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIHtcImV4dGVybmFsXCIgPT09ICdhbnQnICYmIDxEZXZCYXIgLz59XG4gICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICB7ZmVhdHVyZSgnQlVERFknKSAmJlxuICAgICAgICAgICAgICAhKGNvbXBhbmlvbk5hcnJvdyAmJiBpc0Z1bGxzY3JlZW5FbnZFbmFibGVkKCkpICYmXG4gICAgICAgICAgICAgIGNvbXBhbmlvblZpc2libGUgPyAoXG4gICAgICAgICAgICAgICAgPENvbXBhbmlvblNwcml0ZSAvPlxuICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgIH1cbiAgICAgICAgLz5cbiAgICAgIDwvTUNQQ29ubmVjdGlvbk1hbmFnZXI+XG4gICAgPC9LZXliaW5kaW5nU2V0dXA+XG4gIClcbiAgaWYgKGlzRnVsbHNjcmVlbkVudkVuYWJsZWQoKSkge1xuICAgIHJldHVybiAoXG4gICAgICA8QWx0ZXJuYXRlU2NyZWVuIG1vdXNlVHJhY2tpbmc9e2lzTW91c2VUcmFja2luZ0VuYWJsZWQoKX0+XG4gICAgICAgIHttYWluUmV0dXJufVxuICAgICAgPC9BbHRlcm5hdGVTY3JlZW4+XG4gICAgKVxuICB9XG4gIHJldHVybiBtYWluUmV0dXJuXG59XG4iXSwiaWdub3JlTGlzdCI6W119
