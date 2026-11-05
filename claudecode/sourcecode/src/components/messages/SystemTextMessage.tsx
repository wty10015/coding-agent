import { c as _c } from "react/compiler-runtime";
// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { Box, Text, type TextProps } from '../../ink.js';
import { feature } from 'bun:bundle';
import * as React from 'react';
import { useState } from 'react';
import sample from 'lodash-es/sample.js';
import { BLACK_CIRCLE, REFERENCE_MARK, TEARDROP_ASTERISK } from '../../constants/figures.js';
import figures from 'figures';
import { basename } from 'path';
import { MessageResponse } from '../MessageResponse.js';
import { FilePathLink } from '../FilePathLink.js';
import { openPath } from '../../utils/browser.js';
/* eslint-disable @typescript-eslint/no-require-imports */
const teamMemSaved = feature('TEAMMEM') ? require('./teamMemSaved.js') as typeof import('./teamMemSaved.js') : null;
/* eslint-enable @typescript-eslint/no-require-imports */
import { TURN_COMPLETION_VERBS } from '../../constants/turnCompletionVerbs.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import type { SystemMessage, SystemThinkingMessage } from '../../types/message.js';
import type { SystemStopHookSummaryMessage } from '../../types/systemStopHookSummaryMessage.js';
import type { SystemBridgeStatusMessage } from '../../types/systemBridgeStatusMessage.js';
import type { SystemTurnDurationMessage } from '../../types/systemTurnDurationMessage.js';
import type { SystemMemorySavedMessage } from '../../types/systemMemorySavedMessage.js';
import { SystemAPIErrorMessage } from './SystemAPIErrorMessage.js';
import { formatDuration, formatNumber, formatSecondsShort } from '../../utils/format.js';
import { getGlobalConfig } from '../../utils/config.js';
import Link from '../../ink/components/Link.js';
import ThemedText from '../design-system/ThemedText.js';
import { CtrlOToExpand } from '../CtrlOToExpand.js';
import { useAppStateStore } from '../../state/AppState.js';
import { isBackgroundTask, type TaskState } from '../../tasks/types.js';
import { getPillLabel } from '../../tasks/pillLabel.js';
import { useSelectedMessageBg } from '../messageActions.js';
type Props = {
  message: SystemMessage;
  addMargin: boolean;
  verbose: boolean;
  isTranscriptMode?: boolean;
};
export function SystemTextMessage(t0) {
  const $ = _c(51);
  const {
    message,
    addMargin,
    verbose,
    isTranscriptMode
  } = t0;
  const bg = useSelectedMessageBg();
  if (message.subtype === "turn_duration") {
    let t1;
    if ($[0] !== addMargin || $[1] !== message) {
      t1 = <TurnDurationMessage message={message} addMargin={addMargin} />;
      $[0] = addMargin;
      $[1] = message;
      $[2] = t1;
    } else {
      t1 = $[2];
    }
    return t1;
  }
  if (message.subtype === "memory_saved") {
    let t1;
    if ($[3] !== addMargin || $[4] !== message) {
      t1 = <MemorySavedMessage message={message} addMargin={addMargin} />;
      $[3] = addMargin;
      $[4] = message;
      $[5] = t1;
    } else {
      t1 = $[5];
    }
    return t1;
  }
  if (message.subtype === "away_summary") {
    const t1 = addMargin ? 1 : 0;
    let t2;
    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
      t2 = <Box minWidth={2}><Text dimColor={true}>{REFERENCE_MARK}</Text></Box>;
      $[6] = t2;
    } else {
      t2 = $[6];
    }
    let t3;
    if ($[7] !== message.content) {
      t3 = <Text dimColor={true}>{message.content}</Text>;
      $[7] = message.content;
      $[8] = t3;
    } else {
      t3 = $[8];
    }
    let t4;
    if ($[9] !== bg || $[10] !== t1 || $[11] !== t3) {
      t4 = <Box flexDirection="row" marginTop={t1} backgroundColor={bg} width="100%">{t2}{t3}</Box>;
      $[9] = bg;
      $[10] = t1;
      $[11] = t3;
      $[12] = t4;
    } else {
      t4 = $[12];
    }
    return t4;
  }
  if (message.subtype === "agents_killed") {
    const t1 = addMargin ? 1 : 0;
    let t2;
    let t3;
    if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
      t2 = <Box minWidth={2}><Text color="error">{BLACK_CIRCLE}</Text></Box>;
      t3 = <Text dimColor={true}>All background agents stopped</Text>;
      $[13] = t2;
      $[14] = t3;
    } else {
      t2 = $[13];
      t3 = $[14];
    }
    let t4;
    if ($[15] !== bg || $[16] !== t1) {
      t4 = <Box flexDirection="row" marginTop={t1} backgroundColor={bg} width="100%">{t2}{t3}</Box>;
      $[15] = bg;
      $[16] = t1;
      $[17] = t4;
    } else {
      t4 = $[17];
    }
    return t4;
  }
  if (message.subtype === "thinking") {
    return null;
  }
  if (message.subtype === "bridge_status") {
    let t1;
    if ($[18] !== addMargin || $[19] !== message) {
      t1 = <BridgeStatusMessage message={message} addMargin={addMargin} />;
      $[18] = addMargin;
      $[19] = message;
      $[20] = t1;
    } else {
      t1 = $[20];
    }
    return t1;
  }
  if (message.subtype === "scheduled_task_fire") {
    const t1 = addMargin ? 1 : 0;
    let t2;
    if ($[21] !== message.content) {
      t2 = <Text dimColor={true}>{TEARDROP_ASTERISK} {message.content}</Text>;
      $[21] = message.content;
      $[22] = t2;
    } else {
      t2 = $[22];
    }
    let t3;
    if ($[23] !== bg || $[24] !== t1 || $[25] !== t2) {
      t3 = <Box marginTop={t1} backgroundColor={bg} width="100%">{t2}</Box>;
      $[23] = bg;
      $[24] = t1;
      $[25] = t2;
      $[26] = t3;
    } else {
      t3 = $[26];
    }
    return t3;
  }
  if (message.subtype === "permission_retry") {
    const t1 = addMargin ? 1 : 0;
    let t2;
    let t3;
    if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
      t2 = <Text dimColor={true}>{TEARDROP_ASTERISK} </Text>;
      t3 = <Text>Allowed </Text>;
      $[27] = t2;
      $[28] = t3;
    } else {
      t2 = $[27];
      t3 = $[28];
    }
    let t4;
    if ($[29] !== message.commands) {
      t4 = message.commands.join(", ");
      $[29] = message.commands;
      $[30] = t4;
    } else {
      t4 = $[30];
    }
    let t5;
    if ($[31] !== t4) {
      t5 = <Text bold={true}>{t4}</Text>;
      $[31] = t4;
      $[32] = t5;
    } else {
      t5 = $[32];
    }
    let t6;
    if ($[33] !== bg || $[34] !== t1 || $[35] !== t5) {
      t6 = <Box marginTop={t1} backgroundColor={bg} width="100%">{t2}{t3}{t5}</Box>;
      $[33] = bg;
      $[34] = t1;
      $[35] = t5;
      $[36] = t6;
    } else {
      t6 = $[36];
    }
    return t6;
  }
  const isStopHookSummary = message.subtype === "stop_hook_summary";
  if (!isStopHookSummary && !verbose && message.level === "info") {
    return null;
  }
  if (message.subtype === "api_error") {
    let t1;
    if ($[37] !== message || $[38] !== verbose) {
      t1 = <SystemAPIErrorMessage message={message} verbose={verbose} />;
      $[37] = message;
      $[38] = verbose;
      $[39] = t1;
    } else {
      t1 = $[39];
    }
    return t1;
  }
  if (message.subtype === "stop_hook_summary") {
    let t1;
    if ($[40] !== addMargin || $[41] !== isTranscriptMode || $[42] !== message || $[43] !== verbose) {
      t1 = <StopHookSummaryMessage message={message} addMargin={addMargin} verbose={verbose} isTranscriptMode={isTranscriptMode} />;
      $[40] = addMargin;
      $[41] = isTranscriptMode;
      $[42] = message;
      $[43] = verbose;
      $[44] = t1;
    } else {
      t1 = $[44];
    }
    return t1;
  }
  const content = message.content;
  if (typeof content !== "string") {
    return null;
  }
  const t1 = message.level !== "info";
  const t2 = message.level === "warning" ? "warning" : undefined;
  const t3 = message.level === "info";
  let t4;
  if ($[45] !== addMargin || $[46] !== content || $[47] !== t1 || $[48] !== t2 || $[49] !== t3) {
    t4 = <Box flexDirection="row" width="100%"><SystemTextMessageInner content={content} addMargin={addMargin} dot={t1} color={t2} dimColor={t3} /></Box>;
    $[45] = addMargin;
    $[46] = content;
    $[47] = t1;
    $[48] = t2;
    $[49] = t3;
    $[50] = t4;
  } else {
    t4 = $[50];
  }
  return t4;
}
function StopHookSummaryMessage(t0) {
  const $ = _c(47);
  const {
    message,
    addMargin,
    verbose,
    isTranscriptMode
  } = t0;
  const bg = useSelectedMessageBg();
  const {
    hookCount,
    hookInfos,
    hookErrors,
    preventedContinuation,
    stopReason
  } = message;
  const {
    columns
  } = useTerminalSize();
  let t1;
  if ($[0] !== hookInfos || $[1] !== message.totalDurationMs) {
    t1 = message.totalDurationMs ?? hookInfos.reduce(_temp, 0);
    $[0] = hookInfos;
    $[1] = message.totalDurationMs;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const totalDurationMs = t1;
  if (hookErrors.length === 0 && !preventedContinuation && !message.hookLabel) {
    if (true || totalDurationMs < HOOK_TIMING_DISPLAY_THRESHOLD_MS) {
      return null;
    }
  }
  let t2;
  if ($[3] !== totalDurationMs) {
    t2 = false && totalDurationMs > 0 ? ` (${formatSecondsShort(totalDurationMs)})` : "";
    $[3] = totalDurationMs;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  const totalStr = t2;
  if (message.hookLabel) {
    const t3 = hookCount === 1 ? "hook" : "hooks";
    let t4;
    if ($[5] !== hookCount || $[6] !== message.hookLabel || $[7] !== t3 || $[8] !== totalStr) {
      t4 = <Text dimColor={true}>{"  \u23BF  "}Ran {hookCount} {message.hookLabel}{" "}{t3}{totalStr}</Text>;
      $[5] = hookCount;
      $[6] = message.hookLabel;
      $[7] = t3;
      $[8] = totalStr;
      $[9] = t4;
    } else {
      t4 = $[9];
    }
    let t5;
    if ($[10] !== hookInfos || $[11] !== isTranscriptMode) {
      t5 = isTranscriptMode && hookInfos.map(_temp2);
      $[10] = hookInfos;
      $[11] = isTranscriptMode;
      $[12] = t5;
    } else {
      t5 = $[12];
    }
    let t6;
    if ($[13] !== t4 || $[14] !== t5) {
      t6 = <Box flexDirection="column" width="100%">{t4}{t5}</Box>;
      $[13] = t4;
      $[14] = t5;
      $[15] = t6;
    } else {
      t6 = $[15];
    }
    return t6;
  }
  const t3 = addMargin ? 1 : 0;
  let t4;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <Box minWidth={2}><Text>{BLACK_CIRCLE}</Text></Box>;
    $[16] = t4;
  } else {
    t4 = $[16];
  }
  const t5 = columns - 10;
  let t6;
  if ($[17] !== hookCount) {
    t6 = <Text bold={true}>{hookCount}</Text>;
    $[17] = hookCount;
    $[18] = t6;
  } else {
    t6 = $[18];
  }
  const t7 = message.hookLabel ?? "stop";
  const t8 = hookCount === 1 ? "hook" : "hooks";
  let t9;
  if ($[19] !== hookInfos || $[20] !== verbose) {
    t9 = !verbose && hookInfos.length > 0 && <>{" "}<CtrlOToExpand /></>;
    $[19] = hookInfos;
    $[20] = verbose;
    $[21] = t9;
  } else {
    t9 = $[21];
  }
  let t10;
  if ($[22] !== t6 || $[23] !== t7 || $[24] !== t8 || $[25] !== t9 || $[26] !== totalStr) {
    t10 = <Text>Ran {t6} {t7}{" "}{t8}{totalStr}{t9}</Text>;
    $[22] = t6;
    $[23] = t7;
    $[24] = t8;
    $[25] = t9;
    $[26] = totalStr;
    $[27] = t10;
  } else {
    t10 = $[27];
  }
  let t11;
  if ($[28] !== hookInfos || $[29] !== verbose) {
    t11 = verbose && hookInfos.length > 0 && hookInfos.map(_temp3);
    $[28] = hookInfos;
    $[29] = verbose;
    $[30] = t11;
  } else {
    t11 = $[30];
  }
  let t12;
  if ($[31] !== preventedContinuation || $[32] !== stopReason) {
    t12 = preventedContinuation && stopReason && <Text><Text dimColor={true}>⎿  </Text>{stopReason}</Text>;
    $[31] = preventedContinuation;
    $[32] = stopReason;
    $[33] = t12;
  } else {
    t12 = $[33];
  }
  let t13;
  if ($[34] !== hookErrors || $[35] !== message.hookLabel) {
    t13 = hookErrors.length > 0 && hookErrors.map((err, idx_1) => <Text key={idx_1}><Text dimColor={true}>⎿  </Text>{message.hookLabel ?? "Stop"} hook error: {err}</Text>);
    $[34] = hookErrors;
    $[35] = message.hookLabel;
    $[36] = t13;
  } else {
    t13 = $[36];
  }
  let t14;
  if ($[37] !== t10 || $[38] !== t11 || $[39] !== t12 || $[40] !== t13 || $[41] !== t5) {
    t14 = <Box flexDirection="column" width={t5}>{t10}{t11}{t12}{t13}</Box>;
    $[37] = t10;
    $[38] = t11;
    $[39] = t12;
    $[40] = t13;
    $[41] = t5;
    $[42] = t14;
  } else {
    t14 = $[42];
  }
  let t15;
  if ($[43] !== bg || $[44] !== t14 || $[45] !== t3) {
    t15 = <Box flexDirection="row" marginTop={t3} backgroundColor={bg} width="100%">{t4}{t14}</Box>;
    $[43] = bg;
    $[44] = t14;
    $[45] = t3;
    $[46] = t15;
  } else {
    t15 = $[46];
  }
  return t15;
}
function _temp3(info_0, idx_0) {
  const durationStr_0 = false && info_0.durationMs !== undefined ? ` (${formatSecondsShort(info_0.durationMs)})` : "";
  return <Text key={`cmd-${idx_0}`} dimColor={true}>⎿  {info_0.command === "prompt" ? `prompt: ${info_0.promptText || ""}` : info_0.command}{durationStr_0}</Text>;
}
function _temp2(info, idx) {
  const durationStr = false && info.durationMs !== undefined ? ` (${formatSecondsShort(info.durationMs)})` : "";
  return <Text key={`cmd-${idx}`} dimColor={true}>{"     \u23BF "}{info.command === "prompt" ? `prompt: ${info.promptText || ""}` : info.command}{durationStr}</Text>;
}
function _temp(sum, h) {
  return sum + (h.durationMs ?? 0);
}
function SystemTextMessageInner(t0) {
  const $ = _c(18);
  const {
    content,
    addMargin,
    dot,
    color,
    dimColor
  } = t0;
  const {
    columns
  } = useTerminalSize();
  const bg = useSelectedMessageBg();
  const t1 = addMargin ? 1 : 0;
  let t2;
  if ($[0] !== color || $[1] !== dimColor || $[2] !== dot) {
    t2 = dot && <Box minWidth={2}><Text color={color} dimColor={dimColor}>{BLACK_CIRCLE}</Text></Box>;
    $[0] = color;
    $[1] = dimColor;
    $[2] = dot;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const t3 = columns - 10;
  let t4;
  if ($[4] !== content) {
    t4 = content.trim();
    $[4] = content;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  let t5;
  if ($[6] !== color || $[7] !== dimColor || $[8] !== t4) {
    t5 = <Text color={color} dimColor={dimColor} wrap="wrap">{t4}</Text>;
    $[6] = color;
    $[7] = dimColor;
    $[8] = t4;
    $[9] = t5;
  } else {
    t5 = $[9];
  }
  let t6;
  if ($[10] !== t3 || $[11] !== t5) {
    t6 = <Box flexDirection="column" width={t3}>{t5}</Box>;
    $[10] = t3;
    $[11] = t5;
    $[12] = t6;
  } else {
    t6 = $[12];
  }
  let t7;
  if ($[13] !== bg || $[14] !== t1 || $[15] !== t2 || $[16] !== t6) {
    t7 = <Box flexDirection="row" marginTop={t1} backgroundColor={bg} width="100%">{t2}{t6}</Box>;
    $[13] = bg;
    $[14] = t1;
    $[15] = t2;
    $[16] = t6;
    $[17] = t7;
  } else {
    t7 = $[17];
  }
  return t7;
}
function TurnDurationMessage(t0) {
  const $ = _c(17);
  const {
    message,
    addMargin
  } = t0;
  const bg = useSelectedMessageBg();
  const [verb] = useState(_temp4);
  const store = useAppStateStore();
  let t1;
  if ($[0] !== store) {
    t1 = () => {
      const tasks = store.getState().tasks;
      const running = (Object.values(tasks ?? {}) as TaskState[]).filter(isBackgroundTask);
      return running.length > 0 ? getPillLabel(running) : null;
    };
    $[0] = store;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const [backgroundTaskSummary] = useState(t1);
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = getGlobalConfig().showTurnDuration ?? true;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const showTurnDuration = t2;
  let t3;
  if ($[3] !== message.durationMs) {
    t3 = formatDuration(message.durationMs);
    $[3] = message.durationMs;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  const duration = t3;
  const hasBudget = message.budgetLimit !== undefined;
  let t4;
  bb0: {
    if (!hasBudget) {
      t4 = "";
      break bb0;
    }
    const tokens = message.budgetTokens;
    const limit = message.budgetLimit;
    let t5;
    if ($[5] !== limit || $[6] !== tokens) {
      t5 = tokens >= limit ? `${formatNumber(tokens)} used (${formatNumber(limit)} min ${figures.tick})` : `${formatNumber(tokens)} / ${formatNumber(limit)} (${Math.round(tokens / limit * 100)}%)`;
      $[5] = limit;
      $[6] = tokens;
      $[7] = t5;
    } else {
      t5 = $[7];
    }
    const usage = t5;
    const nudges = message.budgetNudges > 0 ? ` \u00B7 ${message.budgetNudges} ${message.budgetNudges === 1 ? "nudge" : "nudges"}` : "";
    t4 = `${showTurnDuration ? " \xB7 " : ""}${usage}${nudges}`;
  }
  const budgetSuffix = t4;
  if (!showTurnDuration && !hasBudget) {
    return null;
  }
  const t5 = addMargin ? 1 : 0;
  let t6;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = <Box minWidth={2}><Text dimColor={true}>{TEARDROP_ASTERISK}</Text></Box>;
    $[8] = t6;
  } else {
    t6 = $[8];
  }
  const t7 = showTurnDuration && `${verb} for ${duration}`;
  const t8 = backgroundTaskSummary && ` \u00B7 ${backgroundTaskSummary} still running`;
  let t9;
  if ($[9] !== budgetSuffix || $[10] !== t7 || $[11] !== t8) {
    t9 = <Text dimColor={true}>{t7}{budgetSuffix}{t8}</Text>;
    $[9] = budgetSuffix;
    $[10] = t7;
    $[11] = t8;
    $[12] = t9;
  } else {
    t9 = $[12];
  }
  let t10;
  if ($[13] !== bg || $[14] !== t5 || $[15] !== t9) {
    t10 = <Box flexDirection="row" marginTop={t5} backgroundColor={bg} width="100%">{t6}{t9}</Box>;
    $[13] = bg;
    $[14] = t5;
    $[15] = t9;
    $[16] = t10;
  } else {
    t10 = $[16];
  }
  return t10;
}
function _temp4() {
  return sample(TURN_COMPLETION_VERBS) ?? "Worked";
}
function MemorySavedMessage(t0) {
  const $ = _c(16);
  const {
    message,
    addMargin
  } = t0;
  const bg = useSelectedMessageBg();
  const {
    writtenPaths
  } = message;
  let t1;
  if ($[0] !== message) {
    t1 = feature("TEAMMEM") ? teamMemSaved.teamMemSavedPart(message) : null;
    $[0] = message;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const team = t1;
  const privateCount = writtenPaths.length - (team?.count ?? 0);
  const t2 = privateCount > 0 ? `${privateCount} ${privateCount === 1 ? "memory" : "memories"}` : null;
  const t3 = team?.segment;
  let t4;
  if ($[2] !== t2 || $[3] !== t3) {
    t4 = [t2, t3].filter(Boolean);
    $[2] = t2;
    $[3] = t3;
    $[4] = t4;
  } else {
    t4 = $[4];
  }
  const parts = t4;
  const t5 = addMargin ? 1 : 0;
  let t6;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = <Box minWidth={2}><Text dimColor={true}>{BLACK_CIRCLE}</Text></Box>;
    $[5] = t6;
  } else {
    t6 = $[5];
  }
  const t7 = message.verb ?? "Saved";
  const t8 = parts.join(" \xB7 ");
  let t9;
  if ($[6] !== t7 || $[7] !== t8) {
    t9 = <Box flexDirection="row">{t6}<Text>{t7} {t8}</Text></Box>;
    $[6] = t7;
    $[7] = t8;
    $[8] = t9;
  } else {
    t9 = $[8];
  }
  let t10;
  if ($[9] !== writtenPaths) {
    t10 = writtenPaths.map(_temp5);
    $[9] = writtenPaths;
    $[10] = t10;
  } else {
    t10 = $[10];
  }
  let t11;
  if ($[11] !== bg || $[12] !== t10 || $[13] !== t5 || $[14] !== t9) {
    t11 = <Box flexDirection="column" marginTop={t5} backgroundColor={bg}>{t9}{t10}</Box>;
    $[11] = bg;
    $[12] = t10;
    $[13] = t5;
    $[14] = t9;
    $[15] = t11;
  } else {
    t11 = $[15];
  }
  return t11;
}
function _temp5(p) {
  return <MemoryFileRow key={p} path={p} />;
}
function MemoryFileRow(t0) {
  const $ = _c(16);
  const {
    path
  } = t0;
  const [hover, setHover] = useState(false);
  let t1;
  if ($[0] !== path) {
    t1 = () => void openPath(path);
    $[0] = path;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  let t3;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => setHover(true);
    t3 = () => setHover(false);
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  const t4 = !hover;
  let t5;
  if ($[4] !== path) {
    t5 = basename(path);
    $[4] = path;
    $[5] = t5;
  } else {
    t5 = $[5];
  }
  let t6;
  if ($[6] !== path || $[7] !== t5) {
    t6 = <FilePathLink filePath={path}>{t5}</FilePathLink>;
    $[6] = path;
    $[7] = t5;
    $[8] = t6;
  } else {
    t6 = $[8];
  }
  let t7;
  if ($[9] !== hover || $[10] !== t4 || $[11] !== t6) {
    t7 = <Text dimColor={t4} underline={hover}>{t6}</Text>;
    $[9] = hover;
    $[10] = t4;
    $[11] = t6;
    $[12] = t7;
  } else {
    t7 = $[12];
  }
  let t8;
  if ($[13] !== t1 || $[14] !== t7) {
    t8 = <MessageResponse><Box onClick={t1} onMouseEnter={t2} onMouseLeave={t3}>{t7}</Box></MessageResponse>;
    $[13] = t1;
    $[14] = t7;
    $[15] = t8;
  } else {
    t8 = $[15];
  }
  return t8;
}
function ThinkingMessage(t0) {
  const $ = _c(7);
  const {
    message,
    addMargin
  } = t0;
  const bg = useSelectedMessageBg();
  const t1 = addMargin ? 1 : 0;
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <Box minWidth={2}><Text dimColor={true}>{TEARDROP_ASTERISK}</Text></Box>;
    $[0] = t2;
  } else {
    t2 = $[0];
  }
  let t3;
  if ($[1] !== message.content) {
    t3 = <Text dimColor={true}>{message.content}</Text>;
    $[1] = message.content;
    $[2] = t3;
  } else {
    t3 = $[2];
  }
  let t4;
  if ($[3] !== bg || $[4] !== t1 || $[5] !== t3) {
    t4 = <Box flexDirection="row" marginTop={t1} backgroundColor={bg} width="100%">{t2}{t3}</Box>;
    $[3] = bg;
    $[4] = t1;
    $[5] = t3;
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  return t4;
}
function BridgeStatusMessage(t0) {
  const $ = _c(13);
  const {
    message,
    addMargin
  } = t0;
  const bg = useSelectedMessageBg();
  const t1 = addMargin ? 1 : 0;
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <Box minWidth={2} />;
    $[0] = t2;
  } else {
    t2 = $[0];
  }
  let t3;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <Text><ThemedText color="suggestion">/remote-control</ThemedText> is active. Code in CLI or at</Text>;
    $[1] = t3;
  } else {
    t3 = $[1];
  }
  let t4;
  if ($[2] !== message.url) {
    t4 = <Link url={message.url}>{message.url}</Link>;
    $[2] = message.url;
    $[3] = t4;
  } else {
    t4 = $[3];
  }
  let t5;
  if ($[4] !== message.upgradeNudge) {
    t5 = message.upgradeNudge && <Text dimColor={true}>⎿ {message.upgradeNudge}</Text>;
    $[4] = message.upgradeNudge;
    $[5] = t5;
  } else {
    t5 = $[5];
  }
  let t6;
  if ($[6] !== t4 || $[7] !== t5) {
    t6 = <Box flexDirection="column">{t3}{t4}{t5}</Box>;
    $[6] = t4;
    $[7] = t5;
    $[8] = t6;
  } else {
    t6 = $[8];
  }
  let t7;
  if ($[9] !== bg || $[10] !== t1 || $[11] !== t6) {
    t7 = <Box flexDirection="row" marginTop={t1} backgroundColor={bg} width={999}>{t2}{t6}</Box>;
    $[9] = bg;
    $[10] = t1;
    $[11] = t6;
    $[12] = t7;
  } else {
    t7 = $[12];
  }
  return t7;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJCb3giLCJUZXh0IiwiVGV4dFByb3BzIiwiZmVhdHVyZSIsIlJlYWN0IiwidXNlU3RhdGUiLCJzYW1wbGUiLCJCTEFDS19DSVJDTEUiLCJSRUZFUkVOQ0VfTUFSSyIsIlRFQVJEUk9QX0FTVEVSSVNLIiwiZmlndXJlcyIsImJhc2VuYW1lIiwiTWVzc2FnZVJlc3BvbnNlIiwiRmlsZVBhdGhMaW5rIiwib3BlblBhdGgiLCJ0ZWFtTWVtU2F2ZWQiLCJyZXF1aXJlIiwiVFVSTl9DT01QTEVUSU9OX1ZFUkJTIiwidXNlVGVybWluYWxTaXplIiwiU3lzdGVtTWVzc2FnZSIsIlN5c3RlbVN0b3BIb29rU3VtbWFyeU1lc3NhZ2UiLCJTeXN0ZW1CcmlkZ2VTdGF0dXNNZXNzYWdlIiwiU3lzdGVtVHVybkR1cmF0aW9uTWVzc2FnZSIsIlN5c3RlbVRoaW5raW5nTWVzc2FnZSIsIlN5c3RlbU1lbW9yeVNhdmVkTWVzc2FnZSIsIlN5c3RlbUFQSUVycm9yTWVzc2FnZSIsImZvcm1hdER1cmF0aW9uIiwiZm9ybWF0TnVtYmVyIiwiZm9ybWF0U2Vjb25kc1Nob3J0IiwiZ2V0R2xvYmFsQ29uZmlnIiwiTGluayIsIlRoZW1lZFRleHQiLCJDdHJsT1RvRXhwYW5kIiwidXNlQXBwU3RhdGVTdG9yZSIsImlzQmFja2dyb3VuZFRhc2siLCJUYXNrU3RhdGUiLCJnZXRQaWxsTGFiZWwiLCJ1c2VTZWxlY3RlZE1lc3NhZ2VCZyIsIlByb3BzIiwibWVzc2FnZSIsImFkZE1hcmdpbiIsInZlcmJvc2UiLCJpc1RyYW5zY3JpcHRNb2RlIiwiU3lzdGVtVGV4dE1lc3NhZ2UiLCJ0MCIsIiQiLCJfYyIsImJnIiwic3VidHlwZSIsInQxIiwidDIiLCJTeW1ib2wiLCJmb3IiLCJ0MyIsImNvbnRlbnQiLCJ0NCIsImNvbW1hbmRzIiwiam9pbiIsInQ1IiwidDYiLCJpc1N0b3BIb29rU3VtbWFyeSIsImxldmVsIiwidW5kZWZpbmVkIiwiU3RvcEhvb2tTdW1tYXJ5TWVzc2FnZSIsImhvb2tDb3VudCIsImhvb2tJbmZvcyIsImhvb2tFcnJvcnMiLCJwcmV2ZW50ZWRDb250aW51YXRpb24iLCJzdG9wUmVhc29uIiwiY29sdW1ucyIsInRvdGFsRHVyYXRpb25NcyIsInJlZHVjZSIsIl90ZW1wIiwibGVuZ3RoIiwiaG9va0xhYmVsIiwiSE9PS19USU1JTkdfRElTUExBWV9USFJFU0hPTERfTVMiLCJ0b3RhbFN0ciIsIm1hcCIsIl90ZW1wMiIsInQ3IiwidDgiLCJ0OSIsInQxMCIsInQxMSIsIl90ZW1wMyIsInQxMiIsInQxMyIsImVyciIsImlkeF8xIiwiaWR4IiwidDE0IiwidDE1IiwiaW5mb18wIiwiaWR4XzAiLCJkdXJhdGlvblN0cl8wIiwiaW5mbyIsImR1cmF0aW9uTXMiLCJjb21tYW5kIiwicHJvbXB0VGV4dCIsImR1cmF0aW9uU3RyIiwic3VtIiwiaCIsIlN5c3RlbVRleHRNZXNzYWdlSW5uZXIiLCJkb3QiLCJjb2xvciIsImRpbUNvbG9yIiwidHJpbSIsIlR1cm5EdXJhdGlvbk1lc3NhZ2UiLCJ2ZXJiIiwiX3RlbXA0Iiwic3RvcmUiLCJ0YXNrcyIsImdldFN0YXRlIiwicnVubmluZyIsIk9iamVjdCIsInZhbHVlcyIsImZpbHRlciIsImJhY2tncm91bmRUYXNrU3VtbWFyeSIsInNob3dUdXJuRHVyYXRpb24iLCJkdXJhdGlvbiIsImhhc0J1ZGdldCIsImJ1ZGdldExpbWl0IiwiYmIwIiwidG9rZW5zIiwiYnVkZ2V0VG9rZW5zIiwibGltaXQiLCJ0aWNrIiwiTWF0aCIsInJvdW5kIiwidXNhZ2UiLCJudWRnZXMiLCJidWRnZXROdWRnZXMiLCJidWRnZXRTdWZmaXgiLCJNZW1vcnlTYXZlZE1lc3NhZ2UiLCJ3cml0dGVuUGF0aHMiLCJ0ZWFtTWVtU2F2ZWRQYXJ0IiwidGVhbSIsInByaXZhdGVDb3VudCIsImNvdW50Iiwic2VnbWVudCIsIkJvb2xlYW4iLCJwYXJ0cyIsIl90ZW1wNSIsInAiLCJNZW1vcnlGaWxlUm93IiwicGF0aCIsImhvdmVyIiwic2V0SG92ZXIiLCJUaGlua2luZ01lc3NhZ2UiLCJCcmlkZ2VTdGF0dXNNZXNzYWdlIiwidXJsIiwidXBncmFkZU51ZGdlIl0sInNvdXJjZXMiOlsiU3lzdGVtVGV4dE1lc3NhZ2UudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGMgYXMgX2MgfSBmcm9tIFwicmVhY3QvY29tcGlsZXItcnVudGltZVwiO1xuLy8gYmlvbWUtaWdub3JlLWFsbCBhc3Npc3Qvc291cmNlL29yZ2FuaXplSW1wb3J0czogQU5ULU9OTFkgaW1wb3J0IG1hcmtlcnMgbXVzdCBub3QgYmUgcmVvcmRlcmVkXG5pbXBvcnQgeyBCb3gsIFRleHQsIHR5cGUgVGV4dFByb3BzIH0gZnJvbSAnLi4vLi4vaW5rLmpzJztcbmltcG9ydCB7IGZlYXR1cmUgfSBmcm9tICdidW46YnVuZGxlJztcbmltcG9ydCAqIGFzIFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHNhbXBsZSBmcm9tICdsb2Rhc2gtZXMvc2FtcGxlLmpzJztcbmltcG9ydCB7IEJMQUNLX0NJUkNMRSwgUkVGRVJFTkNFX01BUkssIFRFQVJEUk9QX0FTVEVSSVNLIH0gZnJvbSAnLi4vLi4vY29uc3RhbnRzL2ZpZ3VyZXMuanMnO1xuaW1wb3J0IGZpZ3VyZXMgZnJvbSAnZmlndXJlcyc7XG5pbXBvcnQgeyBiYXNlbmFtZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgTWVzc2FnZVJlc3BvbnNlIH0gZnJvbSAnLi4vTWVzc2FnZVJlc3BvbnNlLmpzJztcbmltcG9ydCB7IEZpbGVQYXRoTGluayB9IGZyb20gJy4uL0ZpbGVQYXRoTGluay5qcyc7XG5pbXBvcnQgeyBvcGVuUGF0aCB9IGZyb20gJy4uLy4uL3V0aWxzL2Jyb3dzZXIuanMnO1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuY29uc3QgdGVhbU1lbVNhdmVkID0gZmVhdHVyZSgnVEVBTU1FTScpID8gcmVxdWlyZSgnLi90ZWFtTWVtU2F2ZWQuanMnKSBhcyB0eXBlb2YgaW1wb3J0KCcuL3RlYW1NZW1TYXZlZC5qcycpIDogbnVsbDtcbi8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuaW1wb3J0IHsgVFVSTl9DT01QTEVUSU9OX1ZFUkJTIH0gZnJvbSAnLi4vLi4vY29uc3RhbnRzL3R1cm5Db21wbGV0aW9uVmVyYnMuanMnO1xuaW1wb3J0IHsgdXNlVGVybWluYWxTaXplIH0gZnJvbSAnLi4vLi4vaG9va3MvdXNlVGVybWluYWxTaXplLmpzJztcbmltcG9ydCB0eXBlIHsgU3lzdGVtTWVzc2FnZSwgU3lzdGVtVGhpbmtpbmdNZXNzYWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvbWVzc2FnZS5qcyc7XG5pbXBvcnQgdHlwZSB7IFN5c3RlbVN0b3BIb29rU3VtbWFyeU1lc3NhZ2UgfSBmcm9tICcuLi8uLi90eXBlcy9zeXN0ZW1TdG9wSG9va1N1bW1hcnlNZXNzYWdlLmpzJztcbmltcG9ydCB0eXBlIHsgU3lzdGVtQnJpZGdlU3RhdHVzTWVzc2FnZSB9IGZyb20gJy4uLy4uL3R5cGVzL3N5c3RlbUJyaWRnZVN0YXR1c01lc3NhZ2UuanMnO1xuaW1wb3J0IHR5cGUgeyBTeXN0ZW1UdXJuRHVyYXRpb25NZXNzYWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvc3lzdGVtVHVybkR1cmF0aW9uTWVzc2FnZS5qcyc7XG5pbXBvcnQgdHlwZSB7IFN5c3RlbU1lbW9yeVNhdmVkTWVzc2FnZSB9IGZyb20gJy4uLy4uL3R5cGVzL3N5c3RlbU1lbW9yeVNhdmVkTWVzc2FnZS5qcyc7XG5pbXBvcnQgeyBTeXN0ZW1BUElFcnJvck1lc3NhZ2UgfSBmcm9tICcuL1N5c3RlbUFQSUVycm9yTWVzc2FnZS5qcyc7XG5pbXBvcnQgeyBmb3JtYXREdXJhdGlvbiwgZm9ybWF0TnVtYmVyLCBmb3JtYXRTZWNvbmRzU2hvcnQgfSBmcm9tICcuLi8uLi91dGlscy9mb3JtYXQuanMnO1xuaW1wb3J0IHsgZ2V0R2xvYmFsQ29uZmlnIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29uZmlnLmpzJztcbmltcG9ydCBMaW5rIGZyb20gJy4uLy4uL2luay9jb21wb25lbnRzL0xpbmsuanMnO1xuaW1wb3J0IFRoZW1lZFRleHQgZnJvbSAnLi4vZGVzaWduLXN5c3RlbS9UaGVtZWRUZXh0LmpzJztcbmltcG9ydCB7IEN0cmxPVG9FeHBhbmQgfSBmcm9tICcuLi9DdHJsT1RvRXhwYW5kLmpzJztcbmltcG9ydCB7IHVzZUFwcFN0YXRlU3RvcmUgfSBmcm9tICcuLi8uLi9zdGF0ZS9BcHBTdGF0ZS5qcyc7XG5pbXBvcnQgeyBpc0JhY2tncm91bmRUYXNrLCB0eXBlIFRhc2tTdGF0ZSB9IGZyb20gJy4uLy4uL3Rhc2tzL3R5cGVzLmpzJztcbmltcG9ydCB7IGdldFBpbGxMYWJlbCB9IGZyb20gJy4uLy4uL3Rhc2tzL3BpbGxMYWJlbC5qcyc7XG5pbXBvcnQgeyB1c2VTZWxlY3RlZE1lc3NhZ2VCZyB9IGZyb20gJy4uL21lc3NhZ2VBY3Rpb25zLmpzJztcbnR5cGUgUHJvcHMgPSB7XG4gIG1lc3NhZ2U6IFN5c3RlbU1lc3NhZ2U7XG4gIGFkZE1hcmdpbjogYm9vbGVhbjtcbiAgdmVyYm9zZTogYm9vbGVhbjtcbiAgaXNUcmFuc2NyaXB0TW9kZT86IGJvb2xlYW47XG59O1xuZXhwb3J0IGZ1bmN0aW9uIFN5c3RlbVRleHRNZXNzYWdlKHQwKSB7XG4gIGNvbnN0ICQgPSBfYyg1MSk7XG4gIGNvbnN0IHtcbiAgICBtZXNzYWdlLFxuICAgIGFkZE1hcmdpbixcbiAgICB2ZXJib3NlLFxuICAgIGlzVHJhbnNjcmlwdE1vZGVcbiAgfSA9IHQwO1xuICBjb25zdCBiZyA9IHVzZVNlbGVjdGVkTWVzc2FnZUJnKCk7XG4gIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09IFwidHVybl9kdXJhdGlvblwiKSB7XG4gICAgbGV0IHQxO1xuICAgIGlmICgkWzBdICE9PSBhZGRNYXJnaW4gfHwgJFsxXSAhPT0gbWVzc2FnZSkge1xuICAgICAgdDEgPSA8VHVybkR1cmF0aW9uTWVzc2FnZSBtZXNzYWdlPXttZXNzYWdlfSBhZGRNYXJnaW49e2FkZE1hcmdpbn0gLz47XG4gICAgICAkWzBdID0gYWRkTWFyZ2luO1xuICAgICAgJFsxXSA9IG1lc3NhZ2U7XG4gICAgICAkWzJdID0gdDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQxID0gJFsyXTtcbiAgICB9XG4gICAgcmV0dXJuIHQxO1xuICB9XG4gIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09IFwibWVtb3J5X3NhdmVkXCIpIHtcbiAgICBsZXQgdDE7XG4gICAgaWYgKCRbM10gIT09IGFkZE1hcmdpbiB8fCAkWzRdICE9PSBtZXNzYWdlKSB7XG4gICAgICB0MSA9IDxNZW1vcnlTYXZlZE1lc3NhZ2UgbWVzc2FnZT17bWVzc2FnZX0gYWRkTWFyZ2luPXthZGRNYXJnaW59IC8+O1xuICAgICAgJFszXSA9IGFkZE1hcmdpbjtcbiAgICAgICRbNF0gPSBtZXNzYWdlO1xuICAgICAgJFs1XSA9IHQxO1xuICAgIH0gZWxzZSB7XG4gICAgICB0MSA9ICRbNV07XG4gICAgfVxuICAgIHJldHVybiB0MTtcbiAgfVxuICBpZiAobWVzc2FnZS5zdWJ0eXBlID09PSBcImF3YXlfc3VtbWFyeVwiKSB7XG4gICAgY29uc3QgdDEgPSBhZGRNYXJnaW4gPyAxIDogMDtcbiAgICBsZXQgdDI7XG4gICAgaWYgKCRbNl0gPT09IFN5bWJvbC5mb3IoXCJyZWFjdC5tZW1vX2NhY2hlX3NlbnRpbmVsXCIpKSB7XG4gICAgICB0MiA9IDxCb3ggbWluV2lkdGg9ezJ9PjxUZXh0IGRpbUNvbG9yPXt0cnVlfT57UkVGRVJFTkNFX01BUkt9PC9UZXh0PjwvQm94PjtcbiAgICAgICRbNl0gPSB0MjtcbiAgICB9IGVsc2Uge1xuICAgICAgdDIgPSAkWzZdO1xuICAgIH1cbiAgICBsZXQgdDM7XG4gICAgaWYgKCRbN10gIT09IG1lc3NhZ2UuY29udGVudCkge1xuICAgICAgdDMgPSA8VGV4dCBkaW1Db2xvcj17dHJ1ZX0+e21lc3NhZ2UuY29udGVudH08L1RleHQ+O1xuICAgICAgJFs3XSA9IG1lc3NhZ2UuY29udGVudDtcbiAgICAgICRbOF0gPSB0MztcbiAgICB9IGVsc2Uge1xuICAgICAgdDMgPSAkWzhdO1xuICAgIH1cbiAgICBsZXQgdDQ7XG4gICAgaWYgKCRbOV0gIT09IGJnIHx8ICRbMTBdICE9PSB0MSB8fCAkWzExXSAhPT0gdDMpIHtcbiAgICAgIHQ0ID0gPEJveCBmbGV4RGlyZWN0aW9uPVwicm93XCIgbWFyZ2luVG9wPXt0MX0gYmFja2dyb3VuZENvbG9yPXtiZ30gd2lkdGg9XCIxMDAlXCI+e3QyfXt0M308L0JveD47XG4gICAgICAkWzldID0gYmc7XG4gICAgICAkWzEwXSA9IHQxO1xuICAgICAgJFsxMV0gPSB0MztcbiAgICAgICRbMTJdID0gdDQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQ0ID0gJFsxMl07XG4gICAgfVxuICAgIHJldHVybiB0NDtcbiAgfVxuICBpZiAobWVzc2FnZS5zdWJ0eXBlID09PSBcImFnZW50c19raWxsZWRcIikge1xuICAgIGNvbnN0IHQxID0gYWRkTWFyZ2luID8gMSA6IDA7XG4gICAgbGV0IHQyO1xuICAgIGxldCB0MztcbiAgICBpZiAoJFsxM10gPT09IFN5bWJvbC5mb3IoXCJyZWFjdC5tZW1vX2NhY2hlX3NlbnRpbmVsXCIpKSB7XG4gICAgICB0MiA9IDxCb3ggbWluV2lkdGg9ezJ9PjxUZXh0IGNvbG9yPVwiZXJyb3JcIj57QkxBQ0tfQ0lSQ0xFfTwvVGV4dD48L0JveD47XG4gICAgICB0MyA9IDxUZXh0IGRpbUNvbG9yPXt0cnVlfT5BbGwgYmFja2dyb3VuZCBhZ2VudHMgc3RvcHBlZDwvVGV4dD47XG4gICAgICAkWzEzXSA9IHQyO1xuICAgICAgJFsxNF0gPSB0MztcbiAgICB9IGVsc2Uge1xuICAgICAgdDIgPSAkWzEzXTtcbiAgICAgIHQzID0gJFsxNF07XG4gICAgfVxuICAgIGxldCB0NDtcbiAgICBpZiAoJFsxNV0gIT09IGJnIHx8ICRbMTZdICE9PSB0MSkge1xuICAgICAgdDQgPSA8Qm94IGZsZXhEaXJlY3Rpb249XCJyb3dcIiBtYXJnaW5Ub3A9e3QxfSBiYWNrZ3JvdW5kQ29sb3I9e2JnfSB3aWR0aD1cIjEwMCVcIj57dDJ9e3QzfTwvQm94PjtcbiAgICAgICRbMTVdID0gYmc7XG4gICAgICAkWzE2XSA9IHQxO1xuICAgICAgJFsxN10gPSB0NDtcbiAgICB9IGVsc2Uge1xuICAgICAgdDQgPSAkWzE3XTtcbiAgICB9XG4gICAgcmV0dXJuIHQ0O1xuICB9XG4gIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09IFwidGhpbmtpbmdcIikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09IFwiYnJpZGdlX3N0YXR1c1wiKSB7XG4gICAgbGV0IHQxO1xuICAgIGlmICgkWzE4XSAhPT0gYWRkTWFyZ2luIHx8ICRbMTldICE9PSBtZXNzYWdlKSB7XG4gICAgICB0MSA9IDxCcmlkZ2VTdGF0dXNNZXNzYWdlIG1lc3NhZ2U9e21lc3NhZ2V9IGFkZE1hcmdpbj17YWRkTWFyZ2lufSAvPjtcbiAgICAgICRbMThdID0gYWRkTWFyZ2luO1xuICAgICAgJFsxOV0gPSBtZXNzYWdlO1xuICAgICAgJFsyMF0gPSB0MTtcbiAgICB9IGVsc2Uge1xuICAgICAgdDEgPSAkWzIwXTtcbiAgICB9XG4gICAgcmV0dXJuIHQxO1xuICB9XG4gIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09IFwic2NoZWR1bGVkX3Rhc2tfZmlyZVwiKSB7XG4gICAgY29uc3QgdDEgPSBhZGRNYXJnaW4gPyAxIDogMDtcbiAgICBsZXQgdDI7XG4gICAgaWYgKCRbMjFdICE9PSBtZXNzYWdlLmNvbnRlbnQpIHtcbiAgICAgIHQyID0gPFRleHQgZGltQ29sb3I9e3RydWV9PntURUFSRFJPUF9BU1RFUklTS30ge21lc3NhZ2UuY29udGVudH08L1RleHQ+O1xuICAgICAgJFsyMV0gPSBtZXNzYWdlLmNvbnRlbnQ7XG4gICAgICAkWzIyXSA9IHQyO1xuICAgIH0gZWxzZSB7XG4gICAgICB0MiA9ICRbMjJdO1xuICAgIH1cbiAgICBsZXQgdDM7XG4gICAgaWYgKCRbMjNdICE9PSBiZyB8fCAkWzI0XSAhPT0gdDEgfHwgJFsyNV0gIT09IHQyKSB7XG4gICAgICB0MyA9IDxCb3ggbWFyZ2luVG9wPXt0MX0gYmFja2dyb3VuZENvbG9yPXtiZ30gd2lkdGg9XCIxMDAlXCI+e3QyfTwvQm94PjtcbiAgICAgICRbMjNdID0gYmc7XG4gICAgICAkWzI0XSA9IHQxO1xuICAgICAgJFsyNV0gPSB0MjtcbiAgICAgICRbMjZdID0gdDM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQzID0gJFsyNl07XG4gICAgfVxuICAgIHJldHVybiB0MztcbiAgfVxuICBpZiAobWVzc2FnZS5zdWJ0eXBlID09PSBcInBlcm1pc3Npb25fcmV0cnlcIikge1xuICAgIGNvbnN0IHQxID0gYWRkTWFyZ2luID8gMSA6IDA7XG4gICAgbGV0IHQyO1xuICAgIGxldCB0MztcbiAgICBpZiAoJFsyN10gPT09IFN5bWJvbC5mb3IoXCJyZWFjdC5tZW1vX2NhY2hlX3NlbnRpbmVsXCIpKSB7XG4gICAgICB0MiA9IDxUZXh0IGRpbUNvbG9yPXt0cnVlfT57VEVBUkRST1BfQVNURVJJU0t9IDwvVGV4dD47XG4gICAgICB0MyA9IDxUZXh0PkFsbG93ZWQgPC9UZXh0PjtcbiAgICAgICRbMjddID0gdDI7XG4gICAgICAkWzI4XSA9IHQzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0MiA9ICRbMjddO1xuICAgICAgdDMgPSAkWzI4XTtcbiAgICB9XG4gICAgbGV0IHQ0O1xuICAgIGlmICgkWzI5XSAhPT0gbWVzc2FnZS5jb21tYW5kcykge1xuICAgICAgdDQgPSBtZXNzYWdlLmNvbW1hbmRzLmpvaW4oXCIsIFwiKTtcbiAgICAgICRbMjldID0gbWVzc2FnZS5jb21tYW5kcztcbiAgICAgICRbMzBdID0gdDQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQ0ID0gJFszMF07XG4gICAgfVxuICAgIGxldCB0NTtcbiAgICBpZiAoJFszMV0gIT09IHQ0KSB7XG4gICAgICB0NSA9IDxUZXh0IGJvbGQ9e3RydWV9Pnt0NH08L1RleHQ+O1xuICAgICAgJFszMV0gPSB0NDtcbiAgICAgICRbMzJdID0gdDU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQ1ID0gJFszMl07XG4gICAgfVxuICAgIGxldCB0NjtcbiAgICBpZiAoJFszM10gIT09IGJnIHx8ICRbMzRdICE9PSB0MSB8fCAkWzM1XSAhPT0gdDUpIHtcbiAgICAgIHQ2ID0gPEJveCBtYXJnaW5Ub3A9e3QxfSBiYWNrZ3JvdW5kQ29sb3I9e2JnfSB3aWR0aD1cIjEwMCVcIj57dDJ9e3QzfXt0NX08L0JveD47XG4gICAgICAkWzMzXSA9IGJnO1xuICAgICAgJFszNF0gPSB0MTtcbiAgICAgICRbMzVdID0gdDU7XG4gICAgICAkWzM2XSA9IHQ2O1xuICAgIH0gZWxzZSB7XG4gICAgICB0NiA9ICRbMzZdO1xuICAgIH1cbiAgICByZXR1cm4gdDY7XG4gIH1cbiAgY29uc3QgaXNTdG9wSG9va1N1bW1hcnkgPSBtZXNzYWdlLnN1YnR5cGUgPT09IFwic3RvcF9ob29rX3N1bW1hcnlcIjtcbiAgaWYgKCFpc1N0b3BIb29rU3VtbWFyeSAmJiAhdmVyYm9zZSAmJiBtZXNzYWdlLmxldmVsID09PSBcImluZm9cIikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChtZXNzYWdlLnN1YnR5cGUgPT09IFwiYXBpX2Vycm9yXCIpIHtcbiAgICBsZXQgdDE7XG4gICAgaWYgKCRbMzddICE9PSBtZXNzYWdlIHx8ICRbMzhdICE9PSB2ZXJib3NlKSB7XG4gICAgICB0MSA9IDxTeXN0ZW1BUElFcnJvck1lc3NhZ2UgbWVzc2FnZT17bWVzc2FnZX0gdmVyYm9zZT17dmVyYm9zZX0gLz47XG4gICAgICAkWzM3XSA9IG1lc3NhZ2U7XG4gICAgICAkWzM4XSA9IHZlcmJvc2U7XG4gICAgICAkWzM5XSA9IHQxO1xuICAgIH0gZWxzZSB7XG4gICAgICB0MSA9ICRbMzldO1xuICAgIH1cbiAgICByZXR1cm4gdDE7XG4gIH1cbiAgaWYgKG1lc3NhZ2Uuc3VidHlwZSA9PT0gXCJzdG9wX2hvb2tfc3VtbWFyeVwiKSB7XG4gICAgbGV0IHQxO1xuICAgIGlmICgkWzQwXSAhPT0gYWRkTWFyZ2luIHx8ICRbNDFdICE9PSBpc1RyYW5zY3JpcHRNb2RlIHx8ICRbNDJdICE9PSBtZXNzYWdlIHx8ICRbNDNdICE9PSB2ZXJib3NlKSB7XG4gICAgICB0MSA9IDxTdG9wSG9va1N1bW1hcnlNZXNzYWdlIG1lc3NhZ2U9e21lc3NhZ2V9IGFkZE1hcmdpbj17YWRkTWFyZ2lufSB2ZXJib3NlPXt2ZXJib3NlfSBpc1RyYW5zY3JpcHRNb2RlPXtpc1RyYW5zY3JpcHRNb2RlfSAvPjtcbiAgICAgICRbNDBdID0gYWRkTWFyZ2luO1xuICAgICAgJFs0MV0gPSBpc1RyYW5zY3JpcHRNb2RlO1xuICAgICAgJFs0Ml0gPSBtZXNzYWdlO1xuICAgICAgJFs0M10gPSB2ZXJib3NlO1xuICAgICAgJFs0NF0gPSB0MTtcbiAgICB9IGVsc2Uge1xuICAgICAgdDEgPSAkWzQ0XTtcbiAgICB9XG4gICAgcmV0dXJuIHQxO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSBtZXNzYWdlLmNvbnRlbnQ7XG4gIGlmICh0eXBlb2YgY29udGVudCAhPT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHQxID0gbWVzc2FnZS5sZXZlbCAhPT0gXCJpbmZvXCI7XG4gIGNvbnN0IHQyID0gbWVzc2FnZS5sZXZlbCA9PT0gXCJ3YXJuaW5nXCIgPyBcIndhcm5pbmdcIiA6IHVuZGVmaW5lZDtcbiAgY29uc3QgdDMgPSBtZXNzYWdlLmxldmVsID09PSBcImluZm9cIjtcbiAgbGV0IHQ0O1xuICBpZiAoJFs0NV0gIT09IGFkZE1hcmdpbiB8fCAkWzQ2XSAhPT0gY29udGVudCB8fCAkWzQ3XSAhPT0gdDEgfHwgJFs0OF0gIT09IHQyIHx8ICRbNDldICE9PSB0Mykge1xuICAgIHQ0ID0gPEJveCBmbGV4RGlyZWN0aW9uPVwicm93XCIgd2lkdGg9XCIxMDAlXCI+PFN5c3RlbVRleHRNZXNzYWdlSW5uZXIgY29udGVudD17Y29udGVudH0gYWRkTWFyZ2luPXthZGRNYXJnaW59IGRvdD17dDF9IGNvbG9yPXt0Mn0gZGltQ29sb3I9e3QzfSAvPjwvQm94PjtcbiAgICAkWzQ1XSA9IGFkZE1hcmdpbjtcbiAgICAkWzQ2XSA9IGNvbnRlbnQ7XG4gICAgJFs0N10gPSB0MTtcbiAgICAkWzQ4XSA9IHQyO1xuICAgICRbNDldID0gdDM7XG4gICAgJFs1MF0gPSB0NDtcbiAgfSBlbHNlIHtcbiAgICB0NCA9ICRbNTBdO1xuICB9XG4gIHJldHVybiB0NDtcbn1cbmZ1bmN0aW9uIFN0b3BIb29rU3VtbWFyeU1lc3NhZ2UodDApIHtcbiAgY29uc3QgJCA9IF9jKDQ3KTtcbiAgY29uc3Qge1xuICAgIG1lc3NhZ2UsXG4gICAgYWRkTWFyZ2luLFxuICAgIHZlcmJvc2UsXG4gICAgaXNUcmFuc2NyaXB0TW9kZVxuICB9ID0gdDA7XG4gIGNvbnN0IGJnID0gdXNlU2VsZWN0ZWRNZXNzYWdlQmcoKTtcbiAgY29uc3Qge1xuICAgIGhvb2tDb3VudCxcbiAgICBob29rSW5mb3MsXG4gICAgaG9va0Vycm9ycyxcbiAgICBwcmV2ZW50ZWRDb250aW51YXRpb24sXG4gICAgc3RvcFJlYXNvblxuICB9ID0gbWVzc2FnZTtcbiAgY29uc3Qge1xuICAgIGNvbHVtbnNcbiAgfSA9IHVzZVRlcm1pbmFsU2l6ZSgpO1xuICBsZXQgdDE7XG4gIGlmICgkWzBdICE9PSBob29rSW5mb3MgfHwgJFsxXSAhPT0gbWVzc2FnZS50b3RhbER1cmF0aW9uTXMpIHtcbiAgICB0MSA9IG1lc3NhZ2UudG90YWxEdXJhdGlvbk1zID8/IGhvb2tJbmZvcy5yZWR1Y2UoX3RlbXAsIDApO1xuICAgICRbMF0gPSBob29rSW5mb3M7XG4gICAgJFsxXSA9IG1lc3NhZ2UudG90YWxEdXJhdGlvbk1zO1xuICAgICRbMl0gPSB0MTtcbiAgfSBlbHNlIHtcbiAgICB0MSA9ICRbMl07XG4gIH1cbiAgY29uc3QgdG90YWxEdXJhdGlvbk1zID0gdDE7XG4gIGlmIChob29rRXJyb3JzLmxlbmd0aCA9PT0gMCAmJiAhcHJldmVudGVkQ29udGludWF0aW9uICYmICFtZXNzYWdlLmhvb2tMYWJlbCkge1xuICAgIGlmICh0cnVlIHx8IHRvdGFsRHVyYXRpb25NcyA8IEhPT0tfVElNSU5HX0RJU1BMQVlfVEhSRVNIT0xEX01TKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbiAgbGV0IHQyO1xuICBpZiAoJFszXSAhPT0gdG90YWxEdXJhdGlvbk1zKSB7XG4gICAgdDIgPSBmYWxzZSAmJiB0b3RhbER1cmF0aW9uTXMgPiAwID8gYCAoJHtmb3JtYXRTZWNvbmRzU2hvcnQodG90YWxEdXJhdGlvbk1zKX0pYCA6IFwiXCI7XG4gICAgJFszXSA9IHRvdGFsRHVyYXRpb25NcztcbiAgICAkWzRdID0gdDI7XG4gIH0gZWxzZSB7XG4gICAgdDIgPSAkWzRdO1xuICB9XG4gIGNvbnN0IHRvdGFsU3RyID0gdDI7XG4gIGlmIChtZXNzYWdlLmhvb2tMYWJlbCkge1xuICAgIGNvbnN0IHQzID0gaG9va0NvdW50ID09PSAxID8gXCJob29rXCIgOiBcImhvb2tzXCI7XG4gICAgbGV0IHQ0O1xuICAgIGlmICgkWzVdICE9PSBob29rQ291bnQgfHwgJFs2XSAhPT0gbWVzc2FnZS5ob29rTGFiZWwgfHwgJFs3XSAhPT0gdDMgfHwgJFs4XSAhPT0gdG90YWxTdHIpIHtcbiAgICAgIHQ0ID0gPFRleHQgZGltQ29sb3I9e3RydWV9PntcIiAgXFx1MjNCRiAgXCJ9UmFuIHtob29rQ291bnR9IHttZXNzYWdlLmhvb2tMYWJlbH17XCIgXCJ9e3QzfXt0b3RhbFN0cn08L1RleHQ+O1xuICAgICAgJFs1XSA9IGhvb2tDb3VudDtcbiAgICAgICRbNl0gPSBtZXNzYWdlLmhvb2tMYWJlbDtcbiAgICAgICRbN10gPSB0MztcbiAgICAgICRbOF0gPSB0b3RhbFN0cjtcbiAgICAgICRbOV0gPSB0NDtcbiAgICB9IGVsc2Uge1xuICAgICAgdDQgPSAkWzldO1xuICAgIH1cbiAgICBsZXQgdDU7XG4gICAgaWYgKCRbMTBdICE9PSBob29rSW5mb3MgfHwgJFsxMV0gIT09IGlzVHJhbnNjcmlwdE1vZGUpIHtcbiAgICAgIHQ1ID0gaXNUcmFuc2NyaXB0TW9kZSAmJiBob29rSW5mb3MubWFwKF90ZW1wMik7XG4gICAgICAkWzEwXSA9IGhvb2tJbmZvcztcbiAgICAgICRbMTFdID0gaXNUcmFuc2NyaXB0TW9kZTtcbiAgICAgICRbMTJdID0gdDU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQ1ID0gJFsxMl07XG4gICAgfVxuICAgIGxldCB0NjtcbiAgICBpZiAoJFsxM10gIT09IHQ0IHx8ICRbMTRdICE9PSB0NSkge1xuICAgICAgdDYgPSA8Qm94IGZsZXhEaXJlY3Rpb249XCJjb2x1bW5cIiB3aWR0aD1cIjEwMCVcIj57dDR9e3Q1fTwvQm94PjtcbiAgICAgICRbMTNdID0gdDQ7XG4gICAgICAkWzE0XSA9IHQ1O1xuICAgICAgJFsxNV0gPSB0NjtcbiAgICB9IGVsc2Uge1xuICAgICAgdDYgPSAkWzE1XTtcbiAgICB9XG4gICAgcmV0dXJuIHQ2O1xuICB9XG4gIGNvbnN0IHQzID0gYWRkTWFyZ2luID8gMSA6IDA7XG4gIGxldCB0NDtcbiAgaWYgKCRbMTZdID09PSBTeW1ib2wuZm9yKFwicmVhY3QubWVtb19jYWNoZV9zZW50aW5lbFwiKSkge1xuICAgIHQ0ID0gPEJveCBtaW5XaWR0aD17Mn0+PFRleHQ+e0JMQUNLX0NJUkNMRX08L1RleHQ+PC9Cb3g+O1xuICAgICRbMTZdID0gdDQ7XG4gIH0gZWxzZSB7XG4gICAgdDQgPSAkWzE2XTtcbiAgfVxuICBjb25zdCB0NSA9IGNvbHVtbnMgLSAxMDtcbiAgbGV0IHQ2O1xuICBpZiAoJFsxN10gIT09IGhvb2tDb3VudCkge1xuICAgIHQ2ID0gPFRleHQgYm9sZD17dHJ1ZX0+e2hvb2tDb3VudH08L1RleHQ+O1xuICAgICRbMTddID0gaG9va0NvdW50O1xuICAgICRbMThdID0gdDY7XG4gIH0gZWxzZSB7XG4gICAgdDYgPSAkWzE4XTtcbiAgfVxuICBjb25zdCB0NyA9IG1lc3NhZ2UuaG9va0xhYmVsID8/IFwic3RvcFwiO1xuICBjb25zdCB0OCA9IGhvb2tDb3VudCA9PT0gMSA/IFwiaG9va1wiIDogXCJob29rc1wiO1xuICBsZXQgdDk7XG4gIGlmICgkWzE5XSAhPT0gaG9va0luZm9zIHx8ICRbMjBdICE9PSB2ZXJib3NlKSB7XG4gICAgdDkgPSAhdmVyYm9zZSAmJiBob29rSW5mb3MubGVuZ3RoID4gMCAmJiA8PntcIiBcIn08Q3RybE9Ub0V4cGFuZCAvPjwvPjtcbiAgICAkWzE5XSA9IGhvb2tJbmZvcztcbiAgICAkWzIwXSA9IHZlcmJvc2U7XG4gICAgJFsyMV0gPSB0OTtcbiAgfSBlbHNlIHtcbiAgICB0OSA9ICRbMjFdO1xuICB9XG4gIGxldCB0MTA7XG4gIGlmICgkWzIyXSAhPT0gdDYgfHwgJFsyM10gIT09IHQ3IHx8ICRbMjRdICE9PSB0OCB8fCAkWzI1XSAhPT0gdDkgfHwgJFsyNl0gIT09IHRvdGFsU3RyKSB7XG4gICAgdDEwID0gPFRleHQ+UmFuIHt0Nn0ge3Q3fXtcIiBcIn17dDh9e3RvdGFsU3RyfXt0OX08L1RleHQ+O1xuICAgICRbMjJdID0gdDY7XG4gICAgJFsyM10gPSB0NztcbiAgICAkWzI0XSA9IHQ4O1xuICAgICRbMjVdID0gdDk7XG4gICAgJFsyNl0gPSB0b3RhbFN0cjtcbiAgICAkWzI3XSA9IHQxMDtcbiAgfSBlbHNlIHtcbiAgICB0MTAgPSAkWzI3XTtcbiAgfVxuICBsZXQgdDExO1xuICBpZiAoJFsyOF0gIT09IGhvb2tJbmZvcyB8fCAkWzI5XSAhPT0gdmVyYm9zZSkge1xuICAgIHQxMSA9IHZlcmJvc2UgJiYgaG9va0luZm9zLmxlbmd0aCA+IDAgJiYgaG9va0luZm9zLm1hcChfdGVtcDMpO1xuICAgICRbMjhdID0gaG9va0luZm9zO1xuICAgICRbMjldID0gdmVyYm9zZTtcbiAgICAkWzMwXSA9IHQxMTtcbiAgfSBlbHNlIHtcbiAgICB0MTEgPSAkWzMwXTtcbiAgfVxuICBsZXQgdDEyO1xuICBpZiAoJFszMV0gIT09IHByZXZlbnRlZENvbnRpbnVhdGlvbiB8fCAkWzMyXSAhPT0gc3RvcFJlYXNvbikge1xuICAgIHQxMiA9IHByZXZlbnRlZENvbnRpbnVhdGlvbiAmJiBzdG9wUmVhc29uICYmIDxUZXh0PjxUZXh0IGRpbUNvbG9yPXt0cnVlfT7ijr8gwqA8L1RleHQ+e3N0b3BSZWFzb259PC9UZXh0PjtcbiAgICAkWzMxXSA9IHByZXZlbnRlZENvbnRpbnVhdGlvbjtcbiAgICAkWzMyXSA9IHN0b3BSZWFzb247XG4gICAgJFszM10gPSB0MTI7XG4gIH0gZWxzZSB7XG4gICAgdDEyID0gJFszM107XG4gIH1cbiAgbGV0IHQxMztcbiAgaWYgKCRbMzRdICE9PSBob29rRXJyb3JzIHx8ICRbMzVdICE9PSBtZXNzYWdlLmhvb2tMYWJlbCkge1xuICAgIHQxMyA9IGhvb2tFcnJvcnMubGVuZ3RoID4gMCAmJiBob29rRXJyb3JzLm1hcCgoZXJyLCBpZHhfMSkgPT4gPFRleHQga2V5PXtpZHhfMX0+PFRleHQgZGltQ29sb3I9e3RydWV9PuKOvyDCoDwvVGV4dD57bWVzc2FnZS5ob29rTGFiZWwgPz8gXCJTdG9wXCJ9IGhvb2sgZXJyb3I6IHtlcnJ9PC9UZXh0Pik7XG4gICAgJFszNF0gPSBob29rRXJyb3JzO1xuICAgICRbMzVdID0gbWVzc2FnZS5ob29rTGFiZWw7XG4gICAgJFszNl0gPSB0MTM7XG4gIH0gZWxzZSB7XG4gICAgdDEzID0gJFszNl07XG4gIH1cbiAgbGV0IHQxNDtcbiAgaWYgKCRbMzddICE9PSB0MTAgfHwgJFszOF0gIT09IHQxMSB8fCAkWzM5XSAhPT0gdDEyIHx8ICRbNDBdICE9PSB0MTMgfHwgJFs0MV0gIT09IHQ1KSB7XG4gICAgdDE0ID0gPEJveCBmbGV4RGlyZWN0aW9uPVwiY29sdW1uXCIgd2lkdGg9e3Q1fT57dDEwfXt0MTF9e3QxMn17dDEzfTwvQm94PjtcbiAgICAkWzM3XSA9IHQxMDtcbiAgICAkWzM4XSA9IHQxMTtcbiAgICAkWzM5XSA9IHQxMjtcbiAgICAkWzQwXSA9IHQxMztcbiAgICAkWzQxXSA9IHQ1O1xuICAgICRbNDJdID0gdDE0O1xuICB9IGVsc2Uge1xuICAgIHQxNCA9ICRbNDJdO1xuICB9XG4gIGxldCB0MTU7XG4gIGlmICgkWzQzXSAhPT0gYmcgfHwgJFs0NF0gIT09IHQxNCB8fCAkWzQ1XSAhPT0gdDMpIHtcbiAgICB0MTUgPSA8Qm94IGZsZXhEaXJlY3Rpb249XCJyb3dcIiBtYXJnaW5Ub3A9e3QzfSBiYWNrZ3JvdW5kQ29sb3I9e2JnfSB3aWR0aD1cIjEwMCVcIj57dDR9e3QxNH08L0JveD47XG4gICAgJFs0M10gPSBiZztcbiAgICAkWzQ0XSA9IHQxNDtcbiAgICAkWzQ1XSA9IHQzO1xuICAgICRbNDZdID0gdDE1O1xuICB9IGVsc2Uge1xuICAgIHQxNSA9ICRbNDZdO1xuICB9XG4gIHJldHVybiB0MTU7XG59XG5mdW5jdGlvbiBfdGVtcDMoaW5mb18wLCBpZHhfMCkge1xuICBjb25zdCBkdXJhdGlvblN0cl8wID0gZmFsc2UgJiYgaW5mb18wLmR1cmF0aW9uTXMgIT09IHVuZGVmaW5lZCA/IGAgKCR7Zm9ybWF0U2Vjb25kc1Nob3J0KGluZm9fMC5kdXJhdGlvbk1zKX0pYCA6IFwiXCI7XG4gIHJldHVybiA8VGV4dCBrZXk9e2BjbWQtJHtpZHhfMH1gfSBkaW1Db2xvcj17dHJ1ZX0+4o6/IMKge2luZm9fMC5jb21tYW5kID09PSBcInByb21wdFwiID8gYHByb21wdDogJHtpbmZvXzAucHJvbXB0VGV4dCB8fCBcIlwifWAgOiBpbmZvXzAuY29tbWFuZH17ZHVyYXRpb25TdHJfMH08L1RleHQ+O1xufVxuZnVuY3Rpb24gX3RlbXAyKGluZm8sIGlkeCkge1xuICBjb25zdCBkdXJhdGlvblN0ciA9IGZhbHNlICYmIGluZm8uZHVyYXRpb25NcyAhPT0gdW5kZWZpbmVkID8gYCAoJHtmb3JtYXRTZWNvbmRzU2hvcnQoaW5mby5kdXJhdGlvbk1zKX0pYCA6IFwiXCI7XG4gIHJldHVybiA8VGV4dCBrZXk9e2BjbWQtJHtpZHh9YH0gZGltQ29sb3I9e3RydWV9PntcIiAgICAgXFx1MjNCRiBcIn17aW5mby5jb21tYW5kID09PSBcInByb21wdFwiID8gYHByb21wdDogJHtpbmZvLnByb21wdFRleHQgfHwgXCJcIn1gIDogaW5mby5jb21tYW5kfXtkdXJhdGlvblN0cn08L1RleHQ+O1xufVxuZnVuY3Rpb24gX3RlbXAoc3VtLCBoKSB7XG4gIHJldHVybiBzdW0gKyAoaC5kdXJhdGlvbk1zID8/IDApO1xufVxuZnVuY3Rpb24gU3lzdGVtVGV4dE1lc3NhZ2VJbm5lcih0MCkge1xuICBjb25zdCAkID0gX2MoMTgpO1xuICBjb25zdCB7XG4gICAgY29udGVudCxcbiAgICBhZGRNYXJnaW4sXG4gICAgZG90LFxuICAgIGNvbG9yLFxuICAgIGRpbUNvbG9yXG4gIH0gPSB0MDtcbiAgY29uc3Qge1xuICAgIGNvbHVtbnNcbiAgfSA9IHVzZVRlcm1pbmFsU2l6ZSgpO1xuICBjb25zdCBiZyA9IHVzZVNlbGVjdGVkTWVzc2FnZUJnKCk7XG4gIGNvbnN0IHQxID0gYWRkTWFyZ2luID8gMSA6IDA7XG4gIGxldCB0MjtcbiAgaWYgKCRbMF0gIT09IGNvbG9yIHx8ICRbMV0gIT09IGRpbUNvbG9yIHx8ICRbMl0gIT09IGRvdCkge1xuICAgIHQyID0gZG90ICYmIDxCb3ggbWluV2lkdGg9ezJ9PjxUZXh0IGNvbG9yPXtjb2xvcn0gZGltQ29sb3I9e2RpbUNvbG9yfT57QkxBQ0tfQ0lSQ0xFfTwvVGV4dD48L0JveD47XG4gICAgJFswXSA9IGNvbG9yO1xuICAgICRbMV0gPSBkaW1Db2xvcjtcbiAgICAkWzJdID0gZG90O1xuICAgICRbM10gPSB0MjtcbiAgfSBlbHNlIHtcbiAgICB0MiA9ICRbM107XG4gIH1cbiAgY29uc3QgdDMgPSBjb2x1bW5zIC0gMTA7XG4gIGxldCB0NDtcbiAgaWYgKCRbNF0gIT09IGNvbnRlbnQpIHtcbiAgICB0NCA9IGNvbnRlbnQudHJpbSgpO1xuICAgICRbNF0gPSBjb250ZW50O1xuICAgICRbNV0gPSB0NDtcbiAgfSBlbHNlIHtcbiAgICB0NCA9ICRbNV07XG4gIH1cbiAgbGV0IHQ1O1xuICBpZiAoJFs2XSAhPT0gY29sb3IgfHwgJFs3XSAhPT0gZGltQ29sb3IgfHwgJFs4XSAhPT0gdDQpIHtcbiAgICB0NSA9IDxUZXh0IGNvbG9yPXtjb2xvcn0gZGltQ29sb3I9e2RpbUNvbG9yfSB3cmFwPVwid3JhcFwiPnt0NH08L1RleHQ+O1xuICAgICRbNl0gPSBjb2xvcjtcbiAgICAkWzddID0gZGltQ29sb3I7XG4gICAgJFs4XSA9IHQ0O1xuICAgICRbOV0gPSB0NTtcbiAgfSBlbHNlIHtcbiAgICB0NSA9ICRbOV07XG4gIH1cbiAgbGV0IHQ2O1xuICBpZiAoJFsxMF0gIT09IHQzIHx8ICRbMTFdICE9PSB0NSkge1xuICAgIHQ2ID0gPEJveCBmbGV4RGlyZWN0aW9uPVwiY29sdW1uXCIgd2lkdGg9e3QzfT57dDV9PC9Cb3g+O1xuICAgICRbMTBdID0gdDM7XG4gICAgJFsxMV0gPSB0NTtcbiAgICAkWzEyXSA9IHQ2O1xuICB9IGVsc2Uge1xuICAgIHQ2ID0gJFsxMl07XG4gIH1cbiAgbGV0IHQ3O1xuICBpZiAoJFsxM10gIT09IGJnIHx8ICRbMTRdICE9PSB0MSB8fCAkWzE1XSAhPT0gdDIgfHwgJFsxNl0gIT09IHQ2KSB7XG4gICAgdDcgPSA8Qm94IGZsZXhEaXJlY3Rpb249XCJyb3dcIiBtYXJnaW5Ub3A9e3QxfSBiYWNrZ3JvdW5kQ29sb3I9e2JnfSB3aWR0aD1cIjEwMCVcIj57dDJ9e3Q2fTwvQm94PjtcbiAgICAkWzEzXSA9IGJnO1xuICAgICRbMTRdID0gdDE7XG4gICAgJFsxNV0gPSB0MjtcbiAgICAkWzE2XSA9IHQ2O1xuICAgICRbMTddID0gdDc7XG4gIH0gZWxzZSB7XG4gICAgdDcgPSAkWzE3XTtcbiAgfVxuICByZXR1cm4gdDc7XG59XG5mdW5jdGlvbiBUdXJuRHVyYXRpb25NZXNzYWdlKHQwKSB7XG4gIGNvbnN0ICQgPSBfYygxNyk7XG4gIGNvbnN0IHtcbiAgICBtZXNzYWdlLFxuICAgIGFkZE1hcmdpblxuICB9ID0gdDA7XG4gIGNvbnN0IGJnID0gdXNlU2VsZWN0ZWRNZXNzYWdlQmcoKTtcbiAgY29uc3QgW3ZlcmJdID0gdXNlU3RhdGUoX3RlbXA0KTtcbiAgY29uc3Qgc3RvcmUgPSB1c2VBcHBTdGF0ZVN0b3JlKCk7XG4gIGxldCB0MTtcbiAgaWYgKCRbMF0gIT09IHN0b3JlKSB7XG4gICAgdDEgPSAoKSA9PiB7XG4gICAgICBjb25zdCB0YXNrcyA9IHN0b3JlLmdldFN0YXRlKCkudGFza3M7XG4gICAgICBjb25zdCBydW5uaW5nID0gKE9iamVjdC52YWx1ZXModGFza3MgPz8ge30pIGFzIFRhc2tTdGF0ZVtdKS5maWx0ZXIoaXNCYWNrZ3JvdW5kVGFzayk7XG4gICAgICByZXR1cm4gcnVubmluZy5sZW5ndGggPiAwID8gZ2V0UGlsbExhYmVsKHJ1bm5pbmcpIDogbnVsbDtcbiAgICB9O1xuICAgICRbMF0gPSBzdG9yZTtcbiAgICAkWzFdID0gdDE7XG4gIH0gZWxzZSB7XG4gICAgdDEgPSAkWzFdO1xuICB9XG4gIGNvbnN0IFtiYWNrZ3JvdW5kVGFza1N1bW1hcnldID0gdXNlU3RhdGUodDEpO1xuICBsZXQgdDI7XG4gIGlmICgkWzJdID09PSBTeW1ib2wuZm9yKFwicmVhY3QubWVtb19jYWNoZV9zZW50aW5lbFwiKSkge1xuICAgIHQyID0gZ2V0R2xvYmFsQ29uZmlnKCkuc2hvd1R1cm5EdXJhdGlvbiA/PyB0cnVlO1xuICAgICRbMl0gPSB0MjtcbiAgfSBlbHNlIHtcbiAgICB0MiA9ICRbMl07XG4gIH1cbiAgY29uc3Qgc2hvd1R1cm5EdXJhdGlvbiA9IHQyO1xuICBsZXQgdDM7XG4gIGlmICgkWzNdICE9PSBtZXNzYWdlLmR1cmF0aW9uTXMpIHtcbiAgICB0MyA9IGZvcm1hdER1cmF0aW9uKG1lc3NhZ2UuZHVyYXRpb25Ncyk7XG4gICAgJFszXSA9IG1lc3NhZ2UuZHVyYXRpb25NcztcbiAgICAkWzRdID0gdDM7XG4gIH0gZWxzZSB7XG4gICAgdDMgPSAkWzRdO1xuICB9XG4gIGNvbnN0IGR1cmF0aW9uID0gdDM7XG4gIGNvbnN0IGhhc0J1ZGdldCA9IG1lc3NhZ2UuYnVkZ2V0TGltaXQgIT09IHVuZGVmaW5lZDtcbiAgbGV0IHQ0O1xuICBiYjA6IHtcbiAgICBpZiAoIWhhc0J1ZGdldCkge1xuICAgICAgdDQgPSBcIlwiO1xuICAgICAgYnJlYWsgYmIwO1xuICAgIH1cbiAgICBjb25zdCB0b2tlbnMgPSBtZXNzYWdlLmJ1ZGdldFRva2VucztcbiAgICBjb25zdCBsaW1pdCA9IG1lc3NhZ2UuYnVkZ2V0TGltaXQ7XG4gICAgbGV0IHQ1O1xuICAgIGlmICgkWzVdICE9PSBsaW1pdCB8fCAkWzZdICE9PSB0b2tlbnMpIHtcbiAgICAgIHQ1ID0gdG9rZW5zID49IGxpbWl0ID8gYCR7Zm9ybWF0TnVtYmVyKHRva2Vucyl9IHVzZWQgKCR7Zm9ybWF0TnVtYmVyKGxpbWl0KX0gbWluICR7ZmlndXJlcy50aWNrfSlgIDogYCR7Zm9ybWF0TnVtYmVyKHRva2Vucyl9IC8gJHtmb3JtYXROdW1iZXIobGltaXQpfSAoJHtNYXRoLnJvdW5kKHRva2VucyAvIGxpbWl0ICogMTAwKX0lKWA7XG4gICAgICAkWzVdID0gbGltaXQ7XG4gICAgICAkWzZdID0gdG9rZW5zO1xuICAgICAgJFs3XSA9IHQ1O1xuICAgIH0gZWxzZSB7XG4gICAgICB0NSA9ICRbN107XG4gICAgfVxuICAgIGNvbnN0IHVzYWdlID0gdDU7XG4gICAgY29uc3QgbnVkZ2VzID0gbWVzc2FnZS5idWRnZXROdWRnZXMgPiAwID8gYCBcXHUwMEI3ICR7bWVzc2FnZS5idWRnZXROdWRnZXN9ICR7bWVzc2FnZS5idWRnZXROdWRnZXMgPT09IDEgPyBcIm51ZGdlXCIgOiBcIm51ZGdlc1wifWAgOiBcIlwiO1xuICAgIHQ0ID0gYCR7c2hvd1R1cm5EdXJhdGlvbiA/IFwiIFxceEI3IFwiIDogXCJcIn0ke3VzYWdlfSR7bnVkZ2VzfWA7XG4gIH1cbiAgY29uc3QgYnVkZ2V0U3VmZml4ID0gdDQ7XG4gIGlmICghc2hvd1R1cm5EdXJhdGlvbiAmJiAhaGFzQnVkZ2V0KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgdDUgPSBhZGRNYXJnaW4gPyAxIDogMDtcbiAgbGV0IHQ2O1xuICBpZiAoJFs4XSA9PT0gU3ltYm9sLmZvcihcInJlYWN0Lm1lbW9fY2FjaGVfc2VudGluZWxcIikpIHtcbiAgICB0NiA9IDxCb3ggbWluV2lkdGg9ezJ9PjxUZXh0IGRpbUNvbG9yPXt0cnVlfT57VEVBUkRST1BfQVNURVJJU0t9PC9UZXh0PjwvQm94PjtcbiAgICAkWzhdID0gdDY7XG4gIH0gZWxzZSB7XG4gICAgdDYgPSAkWzhdO1xuICB9XG4gIGNvbnN0IHQ3ID0gc2hvd1R1cm5EdXJhdGlvbiAmJiBgJHt2ZXJifSBmb3IgJHtkdXJhdGlvbn1gO1xuICBjb25zdCB0OCA9IGJhY2tncm91bmRUYXNrU3VtbWFyeSAmJiBgIFxcdTAwQjcgJHtiYWNrZ3JvdW5kVGFza1N1bW1hcnl9IHN0aWxsIHJ1bm5pbmdgO1xuICBsZXQgdDk7XG4gIGlmICgkWzldICE9PSBidWRnZXRTdWZmaXggfHwgJFsxMF0gIT09IHQ3IHx8ICRbMTFdICE9PSB0OCkge1xuICAgIHQ5ID0gPFRleHQgZGltQ29sb3I9e3RydWV9Pnt0N317YnVkZ2V0U3VmZml4fXt0OH08L1RleHQ+O1xuICAgICRbOV0gPSBidWRnZXRTdWZmaXg7XG4gICAgJFsxMF0gPSB0NztcbiAgICAkWzExXSA9IHQ4O1xuICAgICRbMTJdID0gdDk7XG4gIH0gZWxzZSB7XG4gICAgdDkgPSAkWzEyXTtcbiAgfVxuICBsZXQgdDEwO1xuICBpZiAoJFsxM10gIT09IGJnIHx8ICRbMTRdICE9PSB0NSB8fCAkWzE1XSAhPT0gdDkpIHtcbiAgICB0MTAgPSA8Qm94IGZsZXhEaXJlY3Rpb249XCJyb3dcIiBtYXJnaW5Ub3A9e3Q1fSBiYWNrZ3JvdW5kQ29sb3I9e2JnfSB3aWR0aD1cIjEwMCVcIj57dDZ9e3Q5fTwvQm94PjtcbiAgICAkWzEzXSA9IGJnO1xuICAgICRbMTRdID0gdDU7XG4gICAgJFsxNV0gPSB0OTtcbiAgICAkWzE2XSA9IHQxMDtcbiAgfSBlbHNlIHtcbiAgICB0MTAgPSAkWzE2XTtcbiAgfVxuICByZXR1cm4gdDEwO1xufVxuZnVuY3Rpb24gX3RlbXA0KCkge1xuICByZXR1cm4gc2FtcGxlKFRVUk5fQ09NUExFVElPTl9WRVJCUykgPz8gXCJXb3JrZWRcIjtcbn1cbmZ1bmN0aW9uIE1lbW9yeVNhdmVkTWVzc2FnZSh0MCkge1xuICBjb25zdCAkID0gX2MoMTYpO1xuICBjb25zdCB7XG4gICAgbWVzc2FnZSxcbiAgICBhZGRNYXJnaW5cbiAgfSA9IHQwO1xuICBjb25zdCBiZyA9IHVzZVNlbGVjdGVkTWVzc2FnZUJnKCk7XG4gIGNvbnN0IHtcbiAgICB3cml0dGVuUGF0aHNcbiAgfSA9IG1lc3NhZ2U7XG4gIGxldCB0MTtcbiAgaWYgKCRbMF0gIT09IG1lc3NhZ2UpIHtcbiAgICB0MSA9IGZlYXR1cmUoXCJURUFNTUVNXCIpID8gdGVhbU1lbVNhdmVkLnRlYW1NZW1TYXZlZFBhcnQobWVzc2FnZSkgOiBudWxsO1xuICAgICRbMF0gPSBtZXNzYWdlO1xuICAgICRbMV0gPSB0MTtcbiAgfSBlbHNlIHtcbiAgICB0MSA9ICRbMV07XG4gIH1cbiAgY29uc3QgdGVhbSA9IHQxO1xuICBjb25zdCBwcml2YXRlQ291bnQgPSB3cml0dGVuUGF0aHMubGVuZ3RoIC0gKHRlYW0/LmNvdW50ID8/IDApO1xuICBjb25zdCB0MiA9IHByaXZhdGVDb3VudCA+IDAgPyBgJHtwcml2YXRlQ291bnR9ICR7cHJpdmF0ZUNvdW50ID09PSAxID8gXCJtZW1vcnlcIiA6IFwibWVtb3JpZXNcIn1gIDogbnVsbDtcbiAgY29uc3QgdDMgPSB0ZWFtPy5zZWdtZW50O1xuICBsZXQgdDQ7XG4gIGlmICgkWzJdICE9PSB0MiB8fCAkWzNdICE9PSB0Mykge1xuICAgIHQ0ID0gW3QyLCB0M10uZmlsdGVyKEJvb2xlYW4pO1xuICAgICRbMl0gPSB0MjtcbiAgICAkWzNdID0gdDM7XG4gICAgJFs0XSA9IHQ0O1xuICB9IGVsc2Uge1xuICAgIHQ0ID0gJFs0XTtcbiAgfVxuICBjb25zdCBwYXJ0cyA9IHQ0O1xuICBjb25zdCB0NSA9IGFkZE1hcmdpbiA/IDEgOiAwO1xuICBsZXQgdDY7XG4gIGlmICgkWzVdID09PSBTeW1ib2wuZm9yKFwicmVhY3QubWVtb19jYWNoZV9zZW50aW5lbFwiKSkge1xuICAgIHQ2ID0gPEJveCBtaW5XaWR0aD17Mn0+PFRleHQgZGltQ29sb3I9e3RydWV9PntCTEFDS19DSVJDTEV9PC9UZXh0PjwvQm94PjtcbiAgICAkWzVdID0gdDY7XG4gIH0gZWxzZSB7XG4gICAgdDYgPSAkWzVdO1xuICB9XG4gIGNvbnN0IHQ3ID0gbWVzc2FnZS52ZXJiID8/IFwiU2F2ZWRcIjtcbiAgY29uc3QgdDggPSBwYXJ0cy5qb2luKFwiIFxceEI3IFwiKTtcbiAgbGV0IHQ5O1xuICBpZiAoJFs2XSAhPT0gdDcgfHwgJFs3XSAhPT0gdDgpIHtcbiAgICB0OSA9IDxCb3ggZmxleERpcmVjdGlvbj1cInJvd1wiPnt0Nn08VGV4dD57dDd9IHt0OH08L1RleHQ+PC9Cb3g+O1xuICAgICRbNl0gPSB0NztcbiAgICAkWzddID0gdDg7XG4gICAgJFs4XSA9IHQ5O1xuICB9IGVsc2Uge1xuICAgIHQ5ID0gJFs4XTtcbiAgfVxuICBsZXQgdDEwO1xuICBpZiAoJFs5XSAhPT0gd3JpdHRlblBhdGhzKSB7XG4gICAgdDEwID0gd3JpdHRlblBhdGhzLm1hcChfdGVtcDUpO1xuICAgICRbOV0gPSB3cml0dGVuUGF0aHM7XG4gICAgJFsxMF0gPSB0MTA7XG4gIH0gZWxzZSB7XG4gICAgdDEwID0gJFsxMF07XG4gIH1cbiAgbGV0IHQxMTtcbiAgaWYgKCRbMTFdICE9PSBiZyB8fCAkWzEyXSAhPT0gdDEwIHx8ICRbMTNdICE9PSB0NSB8fCAkWzE0XSAhPT0gdDkpIHtcbiAgICB0MTEgPSA8Qm94IGZsZXhEaXJlY3Rpb249XCJjb2x1bW5cIiBtYXJnaW5Ub3A9e3Q1fSBiYWNrZ3JvdW5kQ29sb3I9e2JnfT57dDl9e3QxMH08L0JveD47XG4gICAgJFsxMV0gPSBiZztcbiAgICAkWzEyXSA9IHQxMDtcbiAgICAkWzEzXSA9IHQ1O1xuICAgICRbMTRdID0gdDk7XG4gICAgJFsxNV0gPSB0MTE7XG4gIH0gZWxzZSB7XG4gICAgdDExID0gJFsxNV07XG4gIH1cbiAgcmV0dXJuIHQxMTtcbn1cbmZ1bmN0aW9uIF90ZW1wNShwKSB7XG4gIHJldHVybiA8TWVtb3J5RmlsZVJvdyBrZXk9e3B9IHBhdGg9e3B9IC8+O1xufVxuZnVuY3Rpb24gTWVtb3J5RmlsZVJvdyh0MCkge1xuICBjb25zdCAkID0gX2MoMTYpO1xuICBjb25zdCB7XG4gICAgcGF0aFxuICB9ID0gdDA7XG4gIGNvbnN0IFtob3Zlciwgc2V0SG92ZXJdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBsZXQgdDE7XG4gIGlmICgkWzBdICE9PSBwYXRoKSB7XG4gICAgdDEgPSAoKSA9PiB2b2lkIG9wZW5QYXRoKHBhdGgpO1xuICAgICRbMF0gPSBwYXRoO1xuICAgICRbMV0gPSB0MTtcbiAgfSBlbHNlIHtcbiAgICB0MSA9ICRbMV07XG4gIH1cbiAgbGV0IHQyO1xuICBsZXQgdDM7XG4gIGlmICgkWzJdID09PSBTeW1ib2wuZm9yKFwicmVhY3QubWVtb19jYWNoZV9zZW50aW5lbFwiKSkge1xuICAgIHQyID0gKCkgPT4gc2V0SG92ZXIodHJ1ZSk7XG4gICAgdDMgPSAoKSA9PiBzZXRIb3ZlcihmYWxzZSk7XG4gICAgJFsyXSA9IHQyO1xuICAgICRbM10gPSB0MztcbiAgfSBlbHNlIHtcbiAgICB0MiA9ICRbMl07XG4gICAgdDMgPSAkWzNdO1xuICB9XG4gIGNvbnN0IHQ0ID0gIWhvdmVyO1xuICBsZXQgdDU7XG4gIGlmICgkWzRdICE9PSBwYXRoKSB7XG4gICAgdDUgPSBiYXNlbmFtZShwYXRoKTtcbiAgICAkWzRdID0gcGF0aDtcbiAgICAkWzVdID0gdDU7XG4gIH0gZWxzZSB7XG4gICAgdDUgPSAkWzVdO1xuICB9XG4gIGxldCB0NjtcbiAgaWYgKCRbNl0gIT09IHBhdGggfHwgJFs3XSAhPT0gdDUpIHtcbiAgICB0NiA9IDxGaWxlUGF0aExpbmsgZmlsZVBhdGg9e3BhdGh9Pnt0NX08L0ZpbGVQYXRoTGluaz47XG4gICAgJFs2XSA9IHBhdGg7XG4gICAgJFs3XSA9IHQ1O1xuICAgICRbOF0gPSB0NjtcbiAgfSBlbHNlIHtcbiAgICB0NiA9ICRbOF07XG4gIH1cbiAgbGV0IHQ3O1xuICBpZiAoJFs5XSAhPT0gaG92ZXIgfHwgJFsxMF0gIT09IHQ0IHx8ICRbMTFdICE9PSB0Nikge1xuICAgIHQ3ID0gPFRleHQgZGltQ29sb3I9e3Q0fSB1bmRlcmxpbmU9e2hvdmVyfT57dDZ9PC9UZXh0PjtcbiAgICAkWzldID0gaG92ZXI7XG4gICAgJFsxMF0gPSB0NDtcbiAgICAkWzExXSA9IHQ2O1xuICAgICRbMTJdID0gdDc7XG4gIH0gZWxzZSB7XG4gICAgdDcgPSAkWzEyXTtcbiAgfVxuICBsZXQgdDg7XG4gIGlmICgkWzEzXSAhPT0gdDEgfHwgJFsxNF0gIT09IHQ3KSB7XG4gICAgdDggPSA8TWVzc2FnZVJlc3BvbnNlPjxCb3ggb25DbGljaz17dDF9IG9uTW91c2VFbnRlcj17dDJ9IG9uTW91c2VMZWF2ZT17dDN9Pnt0N308L0JveD48L01lc3NhZ2VSZXNwb25zZT47XG4gICAgJFsxM10gPSB0MTtcbiAgICAkWzE0XSA9IHQ3O1xuICAgICRbMTVdID0gdDg7XG4gIH0gZWxzZSB7XG4gICAgdDggPSAkWzE1XTtcbiAgfVxuICByZXR1cm4gdDg7XG59XG5mdW5jdGlvbiBUaGlua2luZ01lc3NhZ2UodDApIHtcbiAgY29uc3QgJCA9IF9jKDcpO1xuICBjb25zdCB7XG4gICAgbWVzc2FnZSxcbiAgICBhZGRNYXJnaW5cbiAgfSA9IHQwO1xuICBjb25zdCBiZyA9IHVzZVNlbGVjdGVkTWVzc2FnZUJnKCk7XG4gIGNvbnN0IHQxID0gYWRkTWFyZ2luID8gMSA6IDA7XG4gIGxldCB0MjtcbiAgaWYgKCRbMF0gPT09IFN5bWJvbC5mb3IoXCJyZWFjdC5tZW1vX2NhY2hlX3NlbnRpbmVsXCIpKSB7XG4gICAgdDIgPSA8Qm94IG1pbldpZHRoPXsyfT48VGV4dCBkaW1Db2xvcj17dHJ1ZX0+e1RFQVJEUk9QX0FTVEVSSVNLfTwvVGV4dD48L0JveD47XG4gICAgJFswXSA9IHQyO1xuICB9IGVsc2Uge1xuICAgIHQyID0gJFswXTtcbiAgfVxuICBsZXQgdDM7XG4gIGlmICgkWzFdICE9PSBtZXNzYWdlLmNvbnRlbnQpIHtcbiAgICB0MyA9IDxUZXh0IGRpbUNvbG9yPXt0cnVlfT57bWVzc2FnZS5jb250ZW50fTwvVGV4dD47XG4gICAgJFsxXSA9IG1lc3NhZ2UuY29udGVudDtcbiAgICAkWzJdID0gdDM7XG4gIH0gZWxzZSB7XG4gICAgdDMgPSAkWzJdO1xuICB9XG4gIGxldCB0NDtcbiAgaWYgKCRbM10gIT09IGJnIHx8ICRbNF0gIT09IHQxIHx8ICRbNV0gIT09IHQzKSB7XG4gICAgdDQgPSA8Qm94IGZsZXhEaXJlY3Rpb249XCJyb3dcIiBtYXJnaW5Ub3A9e3QxfSBiYWNrZ3JvdW5kQ29sb3I9e2JnfSB3aWR0aD1cIjEwMCVcIj57dDJ9e3QzfTwvQm94PjtcbiAgICAkWzNdID0gYmc7XG4gICAgJFs0XSA9IHQxO1xuICAgICRbNV0gPSB0MztcbiAgICAkWzZdID0gdDQ7XG4gIH0gZWxzZSB7XG4gICAgdDQgPSAkWzZdO1xuICB9XG4gIHJldHVybiB0NDtcbn1cbmZ1bmN0aW9uIEJyaWRnZVN0YXR1c01lc3NhZ2UodDApIHtcbiAgY29uc3QgJCA9IF9jKDEzKTtcbiAgY29uc3Qge1xuICAgIG1lc3NhZ2UsXG4gICAgYWRkTWFyZ2luXG4gIH0gPSB0MDtcbiAgY29uc3QgYmcgPSB1c2VTZWxlY3RlZE1lc3NhZ2VCZygpO1xuICBjb25zdCB0MSA9IGFkZE1hcmdpbiA/IDEgOiAwO1xuICBsZXQgdDI7XG4gIGlmICgkWzBdID09PSBTeW1ib2wuZm9yKFwicmVhY3QubWVtb19jYWNoZV9zZW50aW5lbFwiKSkge1xuICAgIHQyID0gPEJveCBtaW5XaWR0aD17Mn0gLz47XG4gICAgJFswXSA9IHQyO1xuICB9IGVsc2Uge1xuICAgIHQyID0gJFswXTtcbiAgfVxuICBsZXQgdDM7XG4gIGlmICgkWzFdID09PSBTeW1ib2wuZm9yKFwicmVhY3QubWVtb19jYWNoZV9zZW50aW5lbFwiKSkge1xuICAgIHQzID0gPFRleHQ+PFRoZW1lZFRleHQgY29sb3I9XCJzdWdnZXN0aW9uXCI+L3JlbW90ZS1jb250cm9sPC9UaGVtZWRUZXh0PiBpcyBhY3RpdmUuIENvZGUgaW4gQ0xJIG9yIGF0PC9UZXh0PjtcbiAgICAkWzFdID0gdDM7XG4gIH0gZWxzZSB7XG4gICAgdDMgPSAkWzFdO1xuICB9XG4gIGxldCB0NDtcbiAgaWYgKCRbMl0gIT09IG1lc3NhZ2UudXJsKSB7XG4gICAgdDQgPSA8TGluayB1cmw9e21lc3NhZ2UudXJsfT57bWVzc2FnZS51cmx9PC9MaW5rPjtcbiAgICAkWzJdID0gbWVzc2FnZS51cmw7XG4gICAgJFszXSA9IHQ0O1xuICB9IGVsc2Uge1xuICAgIHQ0ID0gJFszXTtcbiAgfVxuICBsZXQgdDU7XG4gIGlmICgkWzRdICE9PSBtZXNzYWdlLnVwZ3JhZGVOdWRnZSkge1xuICAgIHQ1ID0gbWVzc2FnZS51cGdyYWRlTnVkZ2UgJiYgPFRleHQgZGltQ29sb3I9e3RydWV9PuKOvyB7bWVzc2FnZS51cGdyYWRlTnVkZ2V9PC9UZXh0PjtcbiAgICAkWzRdID0gbWVzc2FnZS51cGdyYWRlTnVkZ2U7XG4gICAgJFs1XSA9IHQ1O1xuICB9IGVsc2Uge1xuICAgIHQ1ID0gJFs1XTtcbiAgfVxuICBsZXQgdDY7XG4gIGlmICgkWzZdICE9PSB0NCB8fCAkWzddICE9PSB0NSkge1xuICAgIHQ2ID0gPEJveCBmbGV4RGlyZWN0aW9uPVwiY29sdW1uXCI+e3QzfXt0NH17dDV9PC9Cb3g+O1xuICAgICRbNl0gPSB0NDtcbiAgICAkWzddID0gdDU7XG4gICAgJFs4XSA9IHQ2O1xuICB9IGVsc2Uge1xuICAgIHQ2ID0gJFs4XTtcbiAgfVxuICBsZXQgdDc7XG4gIGlmICgkWzldICE9PSBiZyB8fCAkWzEwXSAhPT0gdDEgfHwgJFsxMV0gIT09IHQ2KSB7XG4gICAgdDcgPSA8Qm94IGZsZXhEaXJlY3Rpb249XCJyb3dcIiBtYXJnaW5Ub3A9e3QxfSBiYWNrZ3JvdW5kQ29sb3I9e2JnfSB3aWR0aD17OTk5fT57dDJ9e3Q2fTwvQm94PjtcbiAgICAkWzldID0gYmc7XG4gICAgJFsxMF0gPSB0MTtcbiAgICAkWzExXSA9IHQ2O1xuICAgICRbMTJdID0gdDc7XG4gIH0gZWxzZSB7XG4gICAgdDcgPSAkWzEyXTtcbiAgfVxuICByZXR1cm4gdDc7XG59XG4iXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBLFNBQVNBLEdBQUcsRUFBRUMsSUFBSSxFQUFFLEtBQUtDLFNBQVMsUUFBUSxjQUFjO0FBQ3hELFNBQVNDLE9BQU8sUUFBUSxZQUFZO0FBQ3BDLE9BQU8sS0FBS0MsS0FBSyxNQUFNLE9BQU87QUFDOUIsU0FBU0MsUUFBUSxRQUFRLE9BQU87QUFDaEMsT0FBT0MsTUFBTSxNQUFNLHFCQUFxQjtBQUN4QyxTQUNFQyxZQUFZLEVBQ1pDLGNBQWMsRUFDZEMsaUJBQWlCLFFBQ1osNEJBQTRCO0FBQ25DLE9BQU9DLE9BQU8sTUFBTSxTQUFTO0FBQzdCLFNBQVNDLFFBQVEsUUFBUSxNQUFNO0FBQy9CLFNBQVNDLGVBQWUsUUFBUSx1QkFBdUI7QUFDdkQsU0FBU0MsWUFBWSxRQUFRLG9CQUFvQjtBQUNqRCxTQUFTQyxRQUFRLFFBQVEsd0JBQXdCO0FBQ2pEO0FBQ0EsTUFBTUMsWUFBWSxHQUFHWixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQ2xDYSxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxPQUFPLE9BQU8sbUJBQW1CLENBQUMsR0FDbkUsSUFBSTtBQUNSO0FBQ0EsU0FBU0MscUJBQXFCLFFBQVEsd0NBQXdDO0FBQzlFLFNBQVNDLGVBQWUsUUFBUSxnQ0FBZ0M7QUFDaEUsY0FDRUMsYUFBYSxFQUNiQyw0QkFBNEIsRUFDNUJDLHlCQUF5QixFQUN6QkMseUJBQXlCLEVBQ3pCQyxxQkFBcUIsRUFDckJDLHdCQUF3QixRQUNuQix3QkFBd0I7QUFDL0IsU0FBU0MscUJBQXFCLFFBQVEsNEJBQTRCO0FBQ2xFLFNBQ0VDLGNBQWMsRUFDZEMsWUFBWSxF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