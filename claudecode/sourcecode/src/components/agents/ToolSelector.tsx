import { c as _c } from "react/compiler-runtime";
import figures from 'figures';
import React, { useCallback, useMemo, useState } from 'react';
import { mcpInfoFromString } from 'src/services/mcp/mcpStringUtils.js';
import { isMcpTool } from 'src/services/mcp/utils.js';
import type { Tool, Tools } from 'src/Tool.js';
import { filterToolsForAgent } from 'src/tools/AgentTool/agentToolUtils.js';
import { AGENT_TOOL_NAME } from 'src/tools/AgentTool/constants.js';
import { BashTool } from 'src/tools/BashTool/BashTool.js';
import { ExitPlanModeV2Tool } from 'src/tools/ExitPlanModeTool/ExitPlanModeV2Tool.js';
import { FileEditTool } from 'src/tools/FileEditTool/FileEditTool.js';
import { FileReadTool } from 'src/tools/FileReadTool/FileReadTool.js';
import { FileWriteTool } from 'src/tools/FileWriteTool/FileWriteTool.js';
import { GlobTool } from 'src/tools/GlobTool/GlobTool.js';
import { GrepTool } from 'src/tools/GrepTool/GrepTool.js';
import { ListMcpResourcesTool } from 'src/tools/ListMcpResourcesTool/ListMcpResourcesTool.js';
import { NotebookEditTool } from 'src/tools/NotebookEditTool/NotebookEditTool.js';
import { ReadMcpResourceTool } from 'src/tools/ReadMcpResourceTool/ReadMcpResourceTool.js';
import { TaskOutputTool } from 'src/tools/TaskOutputTool/TaskOutputTool.js';
import { TaskStopTool } from 'src/tools/TaskStopTool/TaskStopTool.js';
import { TodoWriteTool } from 'src/tools/TodoWriteTool/TodoWriteTool.js';
// Match the literal condition already used by the execution tool bucket.
/* eslint-disable @typescript-eslint/no-require-imports */
const TungstenTool =
  "external" === 'ant'
    ? require('src/tools/TungstenTool/TungstenTool.js').TungstenTool
    : null;
/* eslint-enable @typescript-eslint/no-require-imports */
import { WebFetchTool } from 'src/tools/WebFetchTool/WebFetchTool.js';
import { WebSearchTool } from 'src/tools/WebSearchTool/WebSearchTool.js';
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js';
import { Box, Text } from '../../ink.js';
import { useKeybinding } from '../../keybindings/useKeybinding.js';
import { count } from '../../utils/array.js';
import { plural } from '../../utils/stringUtils.js';
import { Divider } from '../design-system/Divider.js';
type Props = {
  tools: Tools;
  initialTools: string[] | undefined;
  onComplete: (selectedTools: string[] | undefined) => void;
  onCancel?: () => void;
};
type ToolBucket = {
  name: string;
  toolNames: Set<string>;
  isMcp?: boolean;
};
type ToolBuckets = {
  READ_ONLY: ToolBucket;
  EDIT: ToolBucket;
  EXECUTION: ToolBucket;
  MCP: ToolBucket;
  OTHER: ToolBucket;
};
function getToolBuckets(): ToolBuckets {
  return {
    READ_ONLY: {
      name: 'Read-only tools',
      toolNames: new Set([GlobTool.name, GrepTool.name, ExitPlanModeV2Tool.name, FileReadTool.name, WebFetchTool.name, TodoWriteTool.name, WebSearchTool.name, TaskStopTool.name, TaskOutputTool.name, ListMcpResourcesTool.name, ReadMcpResourceTool.name])
    },
    EDIT: {
      name: 'Edit tools',
      toolNames: new Set([FileEditTool.name, FileWriteTool.name, NotebookEditTool.name])
    },
    EXECUTION: {
      name: 'Execution tools',
      toolNames: new Set([BashTool.name, "external" === 'ant' ? TungstenTool.name : undefined].filter(n => n !== undefined))
    },
    MCP: {
      name: 'MCP tools',
      toolNames: new Set(),
      // Dynamic - no static list
      isMcp: true
    },
    OTHER: {
      name: 'Other tools',
      toolNames: new Set() // Dynamic - catch-all for uncategorized tools
    }
  };
}

// Helper to get MCP server buckets dynamically
function getMcpServerBuckets(tools: Tools): Array<{
  serverName: string;
  tools: Tools;
}> {
  const serverMap = new Map<string, Tool[]>();
  tools.forEach(tool => {
    if (isMcpTool(tool)) {
      const mcpInfo = mcpInfoFromString(tool.name);
      if (mcpInfo?.serverName) {
        const existing = serverMap.get(mcpInfo.serverName) || [];
        existing.push(tool);
        serverMap.set(mcpInfo.serverName, existing);
      }
    }
  });
  return Array.from(serverMap.entries()).map(([serverName, tools]) => ({
    serverName,
    tools
  })).sort((a, b) => a.serverName.localeCompare(b.serverName));
}
export function ToolSelector(t0) {
  const $ = _c(69);
  const {
    tools,
    initialTools,
    onComplete,
    onCancel
  } = t0;
  let t1;
  if ($[0] !== tools) {
    t1 = filterToolsForAgent({
      tools,
      isBuiltIn: false,
      isAsync: false
    });
    $[0] = tools;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const customAgentTools = t1;
  let t2;
  if ($[2] !== customAgentTools || $[3] !== initialTools) {
    t2 = !initialTools || initialTools.includes("*") ? customAgentTools.map(_temp) : initialTools;
    $[2] = customAgentTools;
    $[3] = initialTools;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  const expandedInitialTools = t2;
  const [selectedTools, setSelectedTools] = useState(expandedInitialTools);
  const [focusIndex, setFocusIndex] = useState(0);
  const [showIndividualTools, setShowIndividualTools] = useState(false);
  let t3;
  if ($[5] !== customAgentTools) {
    t3 = new Set(customAgentTools.map(_temp2));
    $[5] = customAgentTools;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  const toolNames = t3;
  let t4;
  if ($[7] !== selectedTools || $[8] !== toolNames) {
    let t5;
    if ($[10] !== toolNames) {
      t5 = name => toolNames.has(name);
      $[10] = toolNames;
      $[11] = t5;
    } else {
      t5 = $[11];
    }
    t4 = selectedTools.filter(t5);
    $[7] = selectedTools;
    $[8] = toolNames;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  const validSelectedTools = t4;
  let t5;
  if ($[12] !== validSelectedTools) {
    t5 = new Set(validSelectedTools);
    $[12] = validSelectedTools;
    $[13] = t5;
  } else {
    t5 = $[13];
  }
  const selectedSet = t5;
  const isAllSelected = validSelectedTools.length === customAgentTools.length && customAgentTools.length > 0;
  let t6;
  if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = toolName => {
      if (!toolName) {
        return;
      }
      setSelectedTools(current => current.includes(toolName) ? current.filter(t_1 => t_1 !== toolName) : [...current, toolName]);
    };
    $[14] = t6;
  } else {
    t6 = $[14];
  }
  const handleToggleTool = t6;
  let t7;
  if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = (toolNames_0, select) => {
      setSelectedTools(current_0 => {
        if (select) {
          const toolsToAdd = toolNames_0.filter(t_2 => !current_0.includes(t_2));
          return [...current_0, ...toolsToAdd];
        } else {
          return current_0.filter(t_3 => !toolNames_0.includes(t_3));
        }
      });
    };
    $[15] = t7;
  } else {
    t7 = $[15];
  }
  const handleToggleTools = t7;
  let t8;
  if ($[16] !== customAgentTools || $[17] !== onComplete || $[18] !== validSelectedTools) {
    t8 = () => {
      const allToolNames = customAgentTools.map(_temp3);
      const areAllToolsSelected = validSelectedTools.length === allToolNames.length && allToolNames.every(name_0 => validSelectedTools.includes(name_0));
      const finalTools = areAllToolsSelected ? undefined : validSelectedTools;
      onComplete(finalTools);
    };
    $[16] = customAgentTools;
    $[17] = onComplete;
    $[18] = validSelectedTools;
    $[19] = t8;
  } else {
    t8 = $[19];
  }
  const handleConfirm = t8;
  let buckets;
  if ($[20] !== customAgentTools) {
    const toolBuckets = getToolBuckets();
    buckets = {
      readOnly: [] as Tool[],
      edit: [] as Tool[],
      execution: [] as Tool[],
      mcp: [] as Tool[],
      other: [] as Tool[]
    };
    customAgentTools.forEach(tool => {
      if (isMcpTool(tool)) {
        buckets.mcp.push(tool);
      } else {
        if (toolBuckets.READ_ONLY.toolNames.has(tool.name)) {
          buckets.readOnly.push(tool);
        } else {
          if (toolBuckets.EDIT.toolNames.has(tool.name)) {
            buckets.edit.push(tool);
          } else {
            if (toolBuckets.EXECUTION.toolNames.has(tool.name)) {
              buckets.execution.push(tool);
            } else {
              if (tool.name !== AGENT_TOOL_NAME) {
                buckets.other.push(tool);
              }
            }
          }
        }
      }
    });
    $[20] = customAgentTools;
    $[21] = buckets;
  } else {
    buckets = $[21];
  }
  const toolsByBucket = buckets;
  let t9;
  if ($[22] !== selectedSet) {
    t9 = bucketTools => {
      const selected = count(bucketTools, t_5 => selectedSet.has(t_5.name));
      const needsSelection = selected < bucketTools.length;
      return () => {
        const toolNames_1 = bucketTools.map(_temp4);
        handleToggleTools(toolNames_1, needsSelection);
      };
    };
    $[22] = selectedSet;
    $[23] = t9;
  } else {
    t9 = $[23];
  }
  const createBucketToggleAction = t9;
  let navigableItems;
  if ($[24] !== createBucketToggleAction || $[25] !== customAgentTools || $[26] !== focusIndex || $[27] !== handleConfirm || $[28] !== isAllSelected || $[29] !== selectedSet || $[30] !== showIndividualTools || $[31] !== toolsByBucket.edit || $[32] !== toolsByBucket.execution || $[33] !== toolsByBucket.mcp || $[34] !== toolsByBucket.other || $[35] !== toolsByBucket.readOnly) {
    navigableItems = [];
    navigableItems.push({
      id: "continue",
      label: "Continue",
      action: handleConfirm,
      isContinue: true
    });
    let t10;
    if ($[37] !== customAgentTools || $[38] !== isAllSelected) {
      t10 = () => {
        const allToolNames_0 = customAgentTools.map(_temp5);
        handleToggleTools(allToolNames_0, !isAllSelected);
      };
      $[37] = customAgentTools;
      $[38] = isAllSelected;
      $[39] = t10;
    } else {
      t10 = $[39];
    }
    navigableItems.push({
      id: "bucket-all",
      label: `${isAllSelected ? figures.checkboxOn : figures.checkboxOff} All tools`,
      action: t10
    });
    const toolBuckets_0 = getToolBuckets();
    const bucketConfigs = [{
      id: "bucket-readonly",
      name: toolBuckets_0.READ_ONLY.name,
      tools: toolsByBucket.readOnly
    }, {
      id: "bucket-edit",
      name: toolBuckets_0.EDIT.name,
      tools: toolsByBucket.edit
    }, {
      id: "bucket-execution",
      name: toolBuckets_0.EXECUTION.name,
      tools: toolsByBucket.execution
    }, {
      id: "bucket-mcp",
      name: toolBuckets_0.MCP.name,
      tools: toolsByBucket.mcp
    }, {
      id: "bucket-other",
      name: toolBuckets_0.OTHER.name,
      tools: toolsByBucket.other
    }];
    bucketConfigs.forEach(t11 => {
      const {
        id,
        name: name_1,
        tools: bucketTools_0
      } = t11;
      if (bucketTools_0.length === 0) {
        return;
      }
      const selected_0 = count(bucketTools_0, t_8 => selectedSet.has(t_8.name));
      const isFullySelected = selected_0 === bucketTools_0.length;
      navigableItems.push({
        id,
        label: `${isFullySelected ? figures.checkboxOn : figures.checkboxOff} ${name_1}`,
        action: createBucketToggleAction(bucketTools_0)
      });
    });
    const toggleButtonIndex = navigableItems.length;
    let t12;
    if ($[40] !== focusIndex || $[41] !== showIndividualTools || $[42] !== toggleButtonIndex) {
      t12 = () => {
        setShowIndividualTools(!showIndividualTools);
        if (showIndividualTools && focusIndex > toggleButtonIndex) {
          setFocusIndex(toggleButtonIndex);
        }
      };
      $[40] = focusIndex;
      $[41] = showIndividualTools;
      $[42] = toggleButtonIndex;
      $[43] = t12;
    } else {
      t12 = $[43];
    }
    navigableItems.push({
      id: "toggle-individual",
      label: showIndividualTools ? "Hide advanced options" : "Show advanced options",
      action: t12,
      isToggle: true
    });
    const mcpServerBuckets = getMcpServerBuckets(customAgentTools);
    if (showIndividualTools) {
      if (mcpServerBuckets.length > 0) {
        navigableItems.push({
          id: "mcp-servers-header",
          label: "MCP Servers:",
          action: _temp6,
          isHeader: true
        });
        mcpServerBuckets.forEach(t13 => {
          const {
            serverName,
            tools: serverTools
          } = t13;
          const selected_1 = count(serverTools, t_9 => selectedSet.has(t_9.name));
          const isFullySelected_0 = selected_1 === serverTools.length;
          navigableItems.push({
            id: `mcp-server-${serverName}`,
            label: `${isFullySelected_0 ? figures.checkboxOn : figures.checkboxOff} ${serverName} (${serverTools.length} ${plural(serverTools.length, "tool")})`,
            action: () => {
              const toolNames_2 = serverTools.map(_temp7);
              handleToggleTools(toolNames_2, !isFullySelected_0);
            }
          });
        });
        navigableItems.push({
          id: "tools-header",
          label: "Individual Tools:",
          action: _temp8,
          isHeader: true
        });
      }
      customAgentTools.forEach(tool_0 => {
        let displayName = tool_0.name;
        if (tool_0.name.startsWith("mcp__")) {
          const mcpInfo = mcpInfoFromString(tool_0.name);
          displayName = mcpInfo ? `${mcpInfo.toolName} (${mcpInfo.serverName})` : tool_0.name;
        }
        navigableItems.push({
          id: `tool-${tool_0.name}`,
          label: `${selectedSet.has(tool_0.name) ? figures.checkboxOn : figures.checkboxOff} ${displayName}`,
          action: () => handleToggleTool(tool_0.name)
        });
      });
    }
    $[24] = createBucketToggleAction;
    $[25] = customAgentTools;
    $[26] = focusIndex;
    $[27] = handleConfirm;
    $[28] = isAllSelected;
    $[29] = selectedSet;
    $[30] = showIndividualTools;
    $[31] = toolsByBucket.edit;
    $[32] = toolsByBucket.execution;
    $[33] = toolsByBucket.mcp;
    $[34] = toolsByBucket.other;
    $[35] = toolsByBucket.readOnly;
    $[36] = navigableItems;
  } else {
    navigableItems = $[36];
  }
  let t10;
  if ($[44] !== initialTools || $[45] !== onCancel || $[46] !== onComplete) {
    t10 = () => {
      if (onCancel) {
        onCancel();
      } else {
        onComplete(initialTools);
      }
    };
    $[44] = initialTools;
    $[45] = onCancel;
    $[46] = onComplete;
    $[47] = t10;
  } else {
    t10 = $[47];
  }
  const handleCancel = t10;
  let t11;
  if ($[48] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = {
      context: "Confirmation"
    };
    $[48] = t11;
  } else {
    t11 = $[48];
  }
  useKeybinding("confirm:no", handleCancel, t11);
  let t12;
  if ($[49] !== focusIndex || $[50] !== navigableItems) {
    t12 = e => {
      if (e.key === "return") {
        e.preventDefault();
        const item = navigableItems[focusIndex];
        if (item && !item.isHeader) {
          item.action();
        }
      } else {
        if (e.key === "up") {
          e.preventDefault();
          let newIndex = focusIndex - 1;
          while (newIndex > 0 && navigableItems[newIndex]?.isHeader) {
            newIndex--;
          }
          setFocusIndex(Math.max(0, newIndex));
        } else {
          if (e.key === "down") {
            e.preventDefault();
            let newIndex_0 = focusIndex + 1;
            while (newIndex_0 < navigableItems.length - 1 && navigableItems[newIndex_0]?.isHeader) {
              newIndex_0++;
            }
            setFocusIndex(Math.min(navigableItems.length - 1, newIndex_0));
          }
        }
      }
    };
    $[49] = focusIndex;
    $[50] = navigableItems;
    $[51] = t12;
  } else {
    t12 = $[51];
  }
  const handleKeyDown = t12;
  const t13 = focusIndex === 0 ? "suggestion" : undefined;
  const t14 = focusIndex === 0;
  const t15 = focusIndex === 0 ? `${figures.pointer} ` : "  ";
  let t16;
  if ($[52] !== t13 || $[53] !== t14 || $[54] !== t15) {
    t16 = <Text color={t13} bold={t14}>{t15}[ Continue ]</Text>;
    $[52] = t13;
    $[53] = t14;
    $[54] = t15;
    $[55] = t16;
  } else {
    t16 = $[55];
  }
  let t17;
  if ($[56] === Symbol.for("react.memo_cache_sentinel")) {
    t17 = <Divider width={40} />;
    $[56] = t17;
  } else {
    t17 = $[56];
  }
  let t18;
  if ($[57] !== navigableItems) {
    t18 = navigableItems.slice(1);
    $[57] = navigableItems;
    $[58] = t18;
  } else {
    t18 = $[58];
  }
  let t19;
  if ($[59] !== focusIndex || $[60] !== t18) {
    t19 = t18.map((item_0, index) => {
      const isCurrentlyFocused = index + 1 === focusIndex;
      const isToggleButton = item_0.isToggle;
      const isHeader = item_0.isHeader;
      return <React.Fragment key={item_0.id}>{isToggleButton && <Divider width={40} />}{isHeader && index > 0 && <Box marginTop={1} />}<Text color={isHeader ? undefined : isCurrentlyFocused ? "suggestion" : undefined} dimColor={isHeader} bold={isToggleButton && isCurrentlyFocused}>{isHeader ? "" : isCurrentlyFocused ? `${figures.pointer} ` : "  "}{isToggleButton ? `[ ${item_0.label} ]` : item_0.label}</Text></React.Fragment>;
    });
    $[59] = focusIndex;
    $[60] = t18;
    $[61] = t19;
  } else {
    t19 = $[61];
  }
  const t20 = isAllSelected ? "All tools selected" : `${selectedSet.size} of ${customAgentTools.length} tools selected`;
  let t21;
  if ($[62] !== t20) {
    t21 = <Box marginTop={1} flexDirection="column"><Text dimColor={true}>{t20}</Text></Box>;
    $[62] = t20;
    $[63] = t21;
  } else {
    t21 = $[63];
  }
  let t22;
  if ($[64] !== handleKeyDown || $[65] !== t16 || $[66] !== t19 || $[67] !== t21) {
    t22 = <Box flexDirection="column" marginTop={1} tabIndex={0} autoFocus={true} onKeyDown={handleKeyDown}>{t16}{t17}{t19}{t21}</Box>;
    $[64] = handleKeyDown;
    $[65] = t16;
    $[66] = t19;
    $[67] = t21;
    $[68] = t22;
  } else {
    t22 = $[68];
  }
  return t22;
}
function _temp8() {}
function _temp7(t_10) {
  return t_10.name;
}
function _temp6() {}
function _temp5(t_7) {
  return t_7.name;
}
function _temp4(t_6) {
  return t_6.name;
}
function _temp3(t_4) {
  return t_4.name;
}
function _temp2(t_0) {
  return t_0.name;
}
function _temp(t) {
  return t.name;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlRvb2xTZWxlY3Rvci50c3giXSwibmFtZXMiOlsiZmlndXJlcyIsIlJlYWN0IiwidXNlQ2FsbGJhY2siLCJ1c2VNZW1vIiwidXNlU3RhdGUiLCJtY3BJbmZvRnJvbVN0cmluZyIsImlzTWNwVG9vbCIsIlRvb2wiLCJUb29scyIsImZpbHRlclRvb2xzRm9yQWdlbnQiLCJBR0VOVF9UT09MX05BTUUiLCJCYXNoVG9vbCIsIkV4aXRQbGFuTW9kZVYyVG9vbCIsIkZpbGVFZGl0VG9vbCIsIkZpbGVSZWFkVG9vbCIsIkZpbGVXcml0ZVRvb2wiLCJHbG9iVG9vbCIsIkdyZXBUb29sIiwiTGlzdE1jcFJlc291cmNlc1Rvb2wiLCJOb3RlYm9va0VkaXRUb29sIiwiUmVhZE1jcFJlc291cmNlVG9vbCIsIlRhc2tPdXRwdXRUb29sIiwiVGFza1N0b3BUb29sIiwiVG9kb1dyaXRlVG9vbCIsIldlYkZldGNoVG9vbCIsIldlYlNlYXJjaFRvb2wiLCJLZXlib2FyZEV2ZW50IiwiQm94IiwiVGV4dCIsInVzZUtleWJpbmRpbmciLCJjb3VudCIsInBsdXJhbCIsIkRpdmlkZXIiLCJQcm9wcyIsInRvb2xzIiwiaW5pdGlhbFRvb2xzIiwib25Db21wbGV0ZSIsInNlbGVjdGVkVG9vbHMiLCJvbkNhbmNlbCIsIlRvb2xCdWNrZXQiLCJuYW1lIiwidG9vbE5hbWVzIiwiU2V0IiwiaXNNY3AiLCJUb29sQnVja2V0cyIsIlJFQURfT05MWSIsIkVESVQiLCJFWEVDVVRJT04iLCJNQ1AiLCJPVEhFUiIsImdldFRvb2xCdWNrZXRzIiwiVHVuZ3N0ZW5Ub29sIiwidW5kZWZpbmVkIiwiZmlsdGVyIiwibiIsImdldE1jcFNlcnZlckJ1Y2tldHMiLCJBcnJheSIsInNlcnZlck5hbWUiLCJzZXJ2ZXJNYXAiLCJNYXAiLCJmb3JFYWNoIiwidG9vbCIsIm1jcEluZm8iLCJleGlzdGluZyIsImdldCIsInB1c2giLCJzZXQiLCJmcm9tIiwiZW50cmllcyIsIm1hcCIsInNvcnQiLCJhIiwiYiIsImxvY2FsZUNvbXBhcmUiLCJUb29sU2VsZWN0b3IiLCJ0MCIsIiQiLCJfYyIsInQxIiwiaXNCdWlsdEluIiwiaXNBc3luYyIsImN1c3RvbUFnZW50VG9vbHMiLCJ0MiIsImluY2x1ZGVzIiwiX3RlbXAiLCJleHBhbmRlZEluaXRpYWxUb29scyIsInNldFNlbGVjdGVkVG9vbHMiLCJmb2N1c0luZGV4Iiwic2V0Rm9jdXNJbmRleCIsInNob3dJbmRpdmlkdWFsVG9vbHMiLCJzZXRTaG93SW5kaXZpZHVhbFRvb2xzIiwidDMiLCJfdGVtcDIiLCJ0NCIsInQ1IiwiaGFzIiwidmFsaWRTZWxlY3RlZFRvb2xzIiwic2VsZWN0ZWRTZXQiLCJpc0FsbFNlbGVjdGVkIiwibGVuZ3RoIiwidDYiLCJTeW1ib2wiLCJmb3IiLCJ0b29sTmFtZSIsImN1cnJlbnQiLCJ0XzEiLCJ0IiwiaGFuZGxlVG9nZ2xlVG9vbCIsInQ3IiwidG9vbE5hbWVzXzAiLCJzZWxlY3QiLCJjdXJyZW50XzAiLCJ0b29sc1RvQWRkIiwidF8yIiwidF8zIiwiaGFuZGxlVG9nZ2xlVG9vbHMiLCJ0OCIsImFsbFRvb2xOYW1lcyIsIl90ZW1wMyIsImFyZUFsbFRvb2xzU2VsZWN0ZWQiLCJldmVyeSIsIm5hbWVfMCIsImZpbmFsVG9vbHMiLCJoYW5kbGVDb25maXJtIiwiYnVja2V0cyIsInRvb2xCdWNrZXRzIiwicmVhZE9ubHkiLCJlZGl0IiwiZXhlY3V0aW9uIiwibWNwIiwib3RoZXIiLCJ0b29sc0J5QnVja2V0IiwidDkiLCJidWNrZXRUb29scyIsInNlbGVjdGVkIiwidF81IiwibmVlZHNTZWxlY3Rpb24iLCJ0b29sTmFtZXNfMSIsIl90ZW1wNCIsImNyZWF0ZUJ1Y2tldFRvZ2dsZUFjdGlvbiIsIm5hdmlnYWJsZUl0ZW1zIiwiaWQiLCJsYWJlbCIsImFjdGlvbiIsImlzQ29udGludWUiLCJ0MTAiLCJhbGxUb29sTmFtZXNfMCIsIl90ZW1wNSIsImNoZWNrYm94T24iLCJjaGVja2JveE9mZiIsInRvb2xCdWNrZXRzXzAiLCJidWNrZXRDb25maWdzIiwidDExIiwibmFtZV8xIiwiYnVja2V0VG9vbHNfMCIsInNlbGVjdGVkXzAiLCJ0XzgiLCJpc0Z1bGx5U2VsZWN0ZWQiLCJ0b2dnbGVCdXR0b25JbmRleCIsInQxMiIsImlzVG9nZ2xlIiwibWNwU2VydmVyQnVja2V0cyIsIl90ZW1wNiIsImlzSGVhZGVyIiwidDEzIiwic2VydmVyVG9vbHMiLCJzZWxlY3RlZF8xIiwidF85IiwiaXNGdWxseVNlbGVjdGVkXzAiLCJ0b29sTmFtZXNfMiIsIl90ZW1wNyIsIl90ZW1wOCIsInRvb2xfMCIsImRpc3BsYXlOYW1lIiwic3RhcnRzV2l0aCIsImhhbmRsZUNhbmNlbCIsImNvbnRleHQiLCJlIiwia2V5IiwicHJldmVudERlZmF1bHQiLCJpdGVtIiwibmV3SW5kZXgiLCJNYXRoIiwibWF4IiwibmV3SW5kZXhfMCIsIm1pbiIsImhhbmRsZUtleURvd24iLCJ0MTQiLCJ0MTUiLCJwb2ludGVyIiwidDE2IiwidDE3IiwidDE4Iiwic2xpY2UiLCJ0MTkiLCJpdGVtXzAiLCJpbmRleCIsImlzQ3VycmVudGx5Rm9jdXNlZCIsImlzVG9nZ2xlQnV0dG9uIiwidDIwIiwic2l6ZSIsInQyMSIsInQyMiIsInRfMTAiLCJ0XzciLCJ0XzYiLCJ0XzQiLCJ0XzAiXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPQSxPQUFPLE1BQU0sU0FBUztBQUM3QixPQUFPQyxLQUFLLElBQUlDLFdBQVcsRUFBRUMsT0FBTyxFQUFFQyxRQUFRLFFBQVEsT0FBTztBQUM3RCxTQUFTQyxpQkFBaUIsUUFBUSxvQ0FBb0M7QUFDdEUsU0FBU0MsU0FBUyxRQUFRLDJCQUEyQjtBQUNyRCxjQUFjQyxJQUFJLEVBQUVDLEtBQUssUUFBUSxhQUFhO0FBQzlDLFNBQVNDLG1CQUFtQixRQUFRLHVDQUF1QztBQUMzRSxTQUFTQyxlQUFlLFFBQVEsa0NBQWtDO0FBQ2xFLFNBQVNDLFFBQVEsUUFBUSxnQ0FBZ0M7QUFDekQsU0FBU0Msa0JBQWtCLFFBQVEsa0RBQWtEO0FBQ3JGLFNBQVNDLFlBQVksUUFBUSx3Q0FB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SThDbEcsR0FBQyxDQUFBbEUsSUFBSztBQUFBO0FBbElwRCxTQUFBa0csT0FBQW1FLEdBQUE7RUFBQSxPQXNHc0NuRyxHQUFDLENBQUFsRSxJQUFLO0FBQUE7QUF0RzVDLFNBQUE4RSxPQUFBd0YsR0FBQTtFQUFBLE9BMEQ0Q3BHLEdBQUMsQ0FBQWxFLElBQUs7QUFBQTtBQTFEbEQsU0FBQW9ELE9BQUFtSCxHQUFBO0VBQUEsT0EwQmlEckcsR0FBQyxDQUFBbEUsSUFBSztBQUFBO0FBMUJ2RCxTQUFBNEMsTUFBQXNCLENBQUE7RUFBQSxPQWUyQkEsQ0FBQyxDQUFBbEUsSUFBSztBQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZpZ3VyZXMgZnJvbSAnZmlndXJlcydcbmltcG9ydCBSZWFjdCwgeyB1c2VDYWxsYmFjaywgdXNlTWVtbywgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCdcbmltcG9ydCB7IG1jcEluZm9Gcm9tU3RyaW5nIH0gZnJvbSAnc3JjL3NlcnZpY2VzL21jcC9tY3BTdHJpbmdVdGlscy5qcydcbmltcG9ydCB7IGlzTWNwVG9vbCB9IGZyb20gJ3NyYy9zZXJ2aWNlcy9tY3AvdXRpbHMuanMnXG5pbXBvcnQgdHlwZSB7IFRvb2wsIFRvb2xzIH0gZnJvbSAnc3JjL1Rvb2wuanMnXG5pbXBvcnQgeyBmaWx0ZXJUb29sc0ZvckFnZW50IH0gZnJvbSAnc3JjL3Rvb2xzL0FnZW50VG9vbC9hZ2VudFRvb2xVdGlscy5qcydcbmltcG9ydCB7IEFHRU5UX1RPT0xfTkFNRSB9IGZyb20gJ3NyYy90b29scy9BZ2VudFRvb2wvY29uc3RhbnRzLmpzJ1xuaW1wb3J0IHsgQmFzaFRvb2wgfSBmcm9tICdzcmMvdG9vbHMvQmFzaFRvb2wvQmFzaFRvb2wuanMnXG5pbXBvcnQgeyBFeGl0UGxhbk1vZGVWMlRvb2wgfSBmcm9tICdzcmMvdG9vbHMvRXhpdFBsYW5Nb2RlVG9vbC9FeGl0UGxhbk1vZGVWMlRvb2wuanMnXG5pbXBvcnQgeyBGaWxlRWRpdFRvb2wgfSBmcm9tICdzcmMvdG9vbHMvRmlsZUVkaXRUb29sL0ZpbGVFZGl0VG9vbC5qcydcbmltcG9ydCB7IEZpbGVSZWFkVG9vbCB9IGZyb20gJ3NyYy90b29scy9GaWxlUmVhZFRvb2wvRmlsZVJlYWRUb29sLmpzJ1xuaW1wb3J0IHsgRmlsZVdyaXRlVG9vbCB9IGZyb20gJ3NyYy90b29scy9GaWxlV3JpdGVUb29sL0ZpbGVXcml0ZVRvb2wuanMnXG5pbXBvcnQgeyBHbG9iVG9vbCB9IGZyb20gJ3NyYy90b29scy9HbG9iVG9vbC9HbG9iVG9vbC5qcydcbmltcG9ydCB7IEdyZXBUb29sIH0gZnJvbSAnc3JjL3Rvb2xzL0dyZXBUb29sL0dyZXBUb29sLmpzJ1xuaW1wb3J0IHsgTGlzdE1jcFJlc291cmNlc1Rvb2wgfSBmcm9tICdzcmMvdG9vbHMvTGlzdE1jcFJlc291cmNlc1Rvb2wvTGlzdE1jcFJlc291cmNlc1Rvb2wuanMnXG5pbXBvcnQgeyBOb3RlYm9va0VkaXRUb29sIH0gZnJvbSAnc3JjL3Rvb2xzL05vdGVib29rRWRpdFRvb2wvTm90ZWJvb2tFZGl0VG9vbC5qcydcbmltcG9ydCB7IFJlYWRNY3BSZXNvdXJjZVRvb2wgfSBmcm9tICdzcmMvdG9vbHMvUmVhZE1jcFJlc291cmNlVG9vbC9SZWFkTWNwUmVzb3VyY2VUb29sLmpzJ1xuaW1wb3J0IHsgVGFza091dHB1dFRvb2wgfSBmcm9tICdzcmMvdG9vbHMvVGFza091dHB1dFRvb2wvVGFza091dHB1dFRvb2wuanMnXG5pbXBvcnQgeyBUYXNrU3RvcFRvb2wgfSBmcm9tICdzcmMvdG9vbHMvVGFza1N0b3BUb29sL1Rhc2tTdG9wVG9vbC5qcydcbmltcG9ydCB7IFRvZG9Xcml0ZVRvb2wgfSBmcm9tICdzcmMvdG9vbHMvVG9kb1dyaXRlVG9vbC9Ub2RvV3JpdGVUb29sLmpzJ1xuLy8gTWF0Y2ggdGhlIGxpdGVyYWwgY29uZGl0aW9uIGFscmVhZHkgdXNlZCBieSB0aGUgZXhlY3V0aW9uIHRvb2wgYnVja2V0LlxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuY29uc3QgVHVuZ3N0ZW5Ub29sID1cbiAgXCJleHRlcm5hbFwiID09PSAnYW50J1xuICAgID8gcmVxdWlyZSgnc3JjL3Rvb2xzL1R1bmdzdGVuVG9vbC9UdW5nc3RlblRvb2wuanMnKS5UdW5nc3RlblRvb2xcbiAgICA6IG51bGxcbi8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cyAqL1xuaW1wb3J0IHsgV2ViRmV0Y2hUb29sIH0gZnJvbSAnc3JjL3Rvb2xzL1dlYkZldGNoVG9vbC9XZWJGZXRjaFRvb2wuanMnXG5pbXBvcnQgeyBXZWJTZWFyY2hUb29sIH0gZnJvbSAnc3JjL3Rvb2xzL1dlYlNlYXJjaFRvb2wvV2ViU2VhcmNoVG9vbC5qcydcbmltcG9ydCB0eXBlIHsgS2V5Ym9hcmRFdmVudCB9IGZyb20gJy4uLy4uL2luay9ldmVudHMva2V5Ym9hcmQtZXZlbnQuanMnXG5pbXBvcnQgeyBCb3gsIFRleHQgfSBmcm9tICcuLi8uLi9pbmsuanMnXG5pbXBvcnQgeyB1c2VLZXliaW5kaW5nIH0gZnJvbSAnLi4vLi4va2V5YmluZGluZ3MvdXNlS2V5YmluZGluZy5qcydcbmltcG9ydCB7IGNvdW50IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXJyYXkuanMnXG5pbXBvcnQgeyBwbHVyYWwgfSBmcm9tICcuLi8uLi91dGlscy9zdHJpbmdVdGlscy5qcydcbmltcG9ydCB7IERpdmlkZXIgfSBmcm9tICcuLi9kZXNpZ24tc3lzdGVtL0RpdmlkZXIuanMnXG5cbnR5cGUgUHJvcHMgPSB7XG4gIHRvb2xzOiBUb29sc1xuICBpbml0aWFsVG9vbHM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkXG4gIG9uQ29tcGxldGU6IChzZWxlY3RlZFRvb2xzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkgPT4gdm9pZFxuICBvbkNhbmNlbD86ICgpID0+IHZvaWRcbn1cblxudHlwZSBUb29sQnVja2V0ID0ge1xuICBuYW1lOiBzdHJpbmdcbiAgdG9vbE5hbWVzOiBTZXQ8c3RyaW5nPlxuICBpc01jcD86IGJvb2xlYW5cbn1cblxudHlwZSBUb29sQnVja2V0cyA9IHtcbiAgUkVBRF9PTkxZOiBUb29sQnVja2V0XG4gIEVESVQ6IFRvb2xCdWNrZXRcbiAgRVhFQ1VUSU9OOiBUb29sQnVja2V0XG4gIE1DUDogVG9vbEJ1Y2tldFxuICBPVEhFUjogVG9vbEJ1Y2tldFxufVxuXG5mdW5jdGlvbiBnZXRUb29sQnVja2V0cygpOiBUb29sQnVja2V0cyB7XG4gIHJldHVybiB7XG4gICAgUkVBRF9PTkxZOiB7XG4gICAgICBuYW1lOiAnUmVhZC1vbmx5IHRvb2xzJyxcbiAgICAgIHRvb2xOYW1lczogbmV3IFNldChbXG4gICAgICAgIEdsb2JUb29sLm5hbWUsXG4gICAgICAgIEdyZXBUb29sLm5hbWUsXG4gICAgICAgIEV4aXRQbGFuTW9kZVYyVG9vbC5uYW1lLFxuICAgICAgICBGaWxlUmVhZFRvb2wubmFtZSxcbiAgICAgICAgV2ViRmV0Y2hUb29sLm5hbWUsXG4gICAgICAgIFRvZG9Xcml0ZVRvb2wubmFtZSxcbiAgICAgICAgV2ViU2VhcmNoVG9vbC5uYW1lLFxuICAgICAgICBUYXNrU3RvcFRvb2wubmFtZSxcbiAgICAgICAgVGFza091dHB1dFRvb2wubmFtZSxcbiAgICAgICAgTGlzdE1jcFJlc291cmNlc1Rvb2wubmFtZSxcbiAgICAgICAgUmVhZE1jcFJlc291cmNlVG9vbC5uYW1lLFxuICAgICAgXSksXG4gICAgfSxcbiAgICBFRElUOiB7XG4gICAgICBuYW1lOiAnRWRpdCB0b29scycsXG4gICAgICB0b29sTmFtZXM6IG5ldyBTZXQoW1xuICAgICAgICBGaWxlRWRpdFRvb2wubmFtZSxcbiAgICAgICAgRmlsZVdyaXRlVG9vbC5uYW1lLFxuICAgICAgICBOb3RlYm9va0VkaXRUb29sLm5hbWUsXG4gICAgICBdKSxcbiAgICB9LFxuICAgIEVYRUNVVElPTjoge1xuICAgICAgbmFtZTogJ0V4ZWN1dGlvbiB0b29scycsXG4gICAgICB0b29sTmFtZXM6IG5ldyBTZXQoXG4gICAgICAgIFtcbiAgICAgICAgICBCYXNoVG9vbC5uYW1lLFxuICAgICAgICAgIFwiZXh0ZXJuYWxcIiA9PT0gJ2FudCcgPyBUdW5nc3RlblRvb2wubmFtZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgXS5maWx0ZXIobiA9PiBuICE9PSB1bmRlZmluZWQpLFxuICAgICAgKSxcbiAgICB9LFxuICAgIE1DUDoge1xuICAgICAgbmFtZTogJ01DUCB0b29scycsXG4gICAgICB0b29sTmFtZXM6IG5ldyBTZXQoKSwgLy8gRHluYW1pYyAtIG5vIHN0YXRpYyBsaXN0XG4gICAgICBpc01jcDogdHJ1ZSxcbiAgICB9LFxuICAgIE9USEVSOiB7XG4gICAgICBuYW1lOiAnT3RoZXIgdG9vbHMnLFxuICAgICAgdG9vbE5hbWVzOiBuZXcgU2V0KCksIC8vIER5bmFtaWMgLSBjYXRjaC1hbGwgZm9yIHVuY2F0ZWdvcml6ZWQgdG9vbHNcbiAgICB9LFxuICB9XG59XG5cbi8vIEhlbHBlciB0byBnZXQgTUNQIHNlcnZlciBidWNrZXRzIGR5bmFtaWNhbGx5XG5mdW5jdGlvbiBnZXRNY3BTZXJ2ZXJCdWNrZXRzKHRvb2xzOiBUb29scyk6IEFycmF5PHtcbiAgc2VydmVyTmFtZTogc3RyaW5nXG4gIHRvb2xzOiBUb29sc1xufT4ge1xuICBjb25zdCBzZXJ2ZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgVG9vbFtdPigpXG5cbiAgdG9vbHMuZm9yRWFjaCh0b29sID0+IHtcbiAgICBpZiAoaXNNY3BUb29sKHRvb2wpKSB7XG4gICAgICBjb25zdCBtY3BJbmZvID0gbWNwSW5mb0Zyb21TdHJpbmcodG9vbC5uYW1lKVxuICAgICAgaWYgKG1jcEluZm8/LnNlcnZlck5hbWUpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBzZXJ2ZXJNYXAuZ2V0KG1jcEluZm8uc2VydmVyTmFtZSkgfHwgW11cbiAgICAgICAgZXhpc3RpbmcucHVzaCh0b29sKVxuICAgICAgICBzZXJ2ZXJNYXAuc2V0KG1jcEluZm8uc2VydmVyTmFtZSwgZXhpc3RpbmcpXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBBcnJheS5mcm9tKHNlcnZlck1hcC5lbnRyaWVzKCkpXG4gICAgLm1hcCgoW3NlcnZlck5hbWUsIHRvb2xzXSkgPT4gKHsgc2VydmVyTmFtZSwgdG9vbHMgfSkpXG4gICAgLnNvcnQoKGEsIGIpID0+IGEuc2VydmVyTmFtZS5sb2NhbGVDb21wYXJlKGIuc2VydmVyTmFtZSkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBUb29sU2VsZWN0b3Ioe1xuICB0b29scyxcbiAgaW5pdGlhbFRvb2xzLFxuICBvbkNvbXBsZXRlLFxuICBvbkNhbmNlbCxcbn06IFByb3BzKTogUmVhY3QuUmVhY3ROb2RlIHtcbiAgLy8gRmlsdGVyIHRvb2xzIGZvciBjdXN0b20gYWdlbnRzXG4gIGNvbnN0IGN1c3RvbUFnZW50VG9vbHMgPSB1c2VNZW1vKFxuICAgICgpID0+IGZpbHRlclRvb2xzRm9yQWdlbnQoeyB0b29scywgaXNCdWlsdEluOiBmYWxzZSwgaXNBc3luYzogZmFsc2UgfSksXG4gICAgW3Rvb2xzXSxcbiAgKVxuXG4gIC8vIEV4cGFuZCB3aWxkY2FyZCBvciB1bmRlZmluZWQgdG8gZXhwbGljaXQgdG9vbCBsaXN0IGZvciBpbnRlcm5hbCBzdGF0ZVxuICBjb25zdCBleHBhbmRlZEluaXRpYWxUb29scyA9XG4gICAgIWluaXRpYWxUb29scyB8fCBpbml0aWFsVG9vbHMuaW5jbHVkZXMoJyonKVxuICAgICAgPyBjdXN0b21BZ2VudFRvb2xzLm1hcCh0ID0+IHQubmFtZSlcbiAgICAgIDogaW5pdGlhbFRvb2xzXG5cbiAgY29uc3QgW3NlbGVjdGVkVG9vbHMsIHNldFNlbGVjdGVkVG9vbHNdID1cbiAgICB1c2VTdGF0ZTxzdHJpbmdbXT4oZXhwYW5kZWRJbml0aWFsVG9vbHMpXG4gIGNvbnN0IFtmb2N1c0luZGV4LCBzZXRGb2N1c0luZGV4XSA9IHVzZVN0YXRlKDApXG4gIGNvbnN0IFtzaG93SW5kaXZpZHVhbFRvb2xzLCBzZXRTaG93SW5kaXZpZHVhbFRvb2xzXSA9IHVzZVN0YXRlKGZhbHNlKVxuXG4gIC8vIEZpbHRlciBzZWxlY3RlZFRvb2xzIHRvIG9ubHkgaW5jbHVkZSB0b29scyB0aGF0IGN1cnJlbnRseSBleGlzdFxuICAvLyBUaGlzIGhhbmRsZXMgTUNQIHRvb2xzIHRoYXQgZGlzY29ubmVjdCB3aGlsZSBzZWxlY3RlZFxuICBjb25zdCB2YWxpZFNlbGVjdGVkVG9vbHMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBjb25zdCB0b29sTmFtZXMgPSBuZXcgU2V0KGN1c3RvbUFnZW50VG9vbHMubWFwKHQgPT4gdC5uYW1lKSlcbiAgICByZXR1cm4gc2VsZWN0ZWRUb29scy5maWx0ZXIobmFtZSA9PiB0b29sTmFtZXMuaGFzKG5hbWUpKVxuICB9LCBbc2VsZWN0ZWRUb29scywgY3VzdG9tQWdlbnRUb29sc10pXG5cbiAgY29uc3Qgc2VsZWN0ZWRTZXQgPSBuZXcgU2V0KHZhbGlkU2VsZWN0ZWRUb29scylcbiAgY29uc3QgaXNBbGxTZWxlY3RlZCA9XG4gICAgdmFsaWRTZWxlY3RlZFRvb2xzLmxlbmd0aCA9PT0gY3VzdG9tQWdlbnRUb29scy5sZW5ndGggJiZcbiAgICBjdXN0b21BZ2VudFRvb2xzLmxlbmd0aCA+IDBcblxuICBjb25zdCBoYW5kbGVUb2dnbGVUb29sID0gKHRvb2xOYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpZiAoIXRvb2xOYW1lKSByZXR1cm5cblxuICAgIHNldFNlbGVjdGVkVG9vbHMoY3VycmVudCA9PlxuICAgICAgY3VycmVudC5pbmNsdWRlcyh0b29sTmFtZSlcbiAgICAgICAgPyBjdXJyZW50LmZpbHRlcih0ID0+IHQgIT09IHRvb2xOYW1lKVxuICAgICAgICA6IFsuLi5jdXJyZW50LCB0b29sTmFtZV0sXG4gICAgKVxuICB9XG5cbiAgY29uc3QgaGFuZGxlVG9nZ2xlVG9vbHMgPSAodG9vbE5hbWVzOiBzdHJpbmdbXSwgc2VsZWN0OiBib29sZWFuKSA9PiB7XG4gICAgc2V0U2VsZWN0ZWRUb29scyhjdXJyZW50ID0+IHtcbiAgICAgIGlmIChzZWxlY3QpIHtcbiAgICAgICAgY29uc3QgdG9vbHNUb0FkZCA9IHRvb2xOYW1lcy5maWx0ZXIodCA9PiAhY3VycmVudC5pbmNsdWRlcyh0KSlcbiAgICAgICAgcmV0dXJuIFsuLi5jdXJyZW50LCAuLi50b29sc1RvQWRkXVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnQuZmlsdGVyKHQgPT4gIXRvb2xOYW1lcy5pbmNsdWRlcyh0KSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgY29uc3QgaGFuZGxlQ29uZmlybSA9ICgpID0+IHtcbiAgICAvLyBDb252ZXJ0IHRvIHVuZGVmaW5lZCBpZiBhbGwgdG9vbHMgYXJlIHNlbGVjdGVkIChmb3IgY2xlYW5lciBmaWxlIGZvcm1hdClcbiAgICBjb25zdCBhbGxUb29sTmFtZXMgPSBjdXN0b21BZ2VudFRvb2xzLm1hcCh0ID0+IHQubmFtZSlcbiAgICBjb25zdCBhcmVBbGxUb29sc1NlbGVjdGVkID1cbiAgICAgIHZhbGlkU2VsZWN0ZWRUb29scy5sZW5ndGggPT09IGFsbFRvb2xOYW1lcy5sZW5ndGggJiZcbiAgICAgIGFsbFRvb2xOYW1lcy5ldmVyeShuYW1lID0+IHZhbGlkU2VsZWN0ZWRUb29scy5pbmNsdWRlcyhuYW1lKSlcbiAgICBjb25zdCBmaW5hbFRvb2xzID0gYXJlQWxsVG9vbHNTZWxlY3RlZCA/IHVuZGVmaW5lZCA6IHZhbGlkU2VsZWN0ZWRUb29sc1xuXG4gICAgb25Db21wbGV0ZShmaW5hbFRvb2xzKVxuICB9XG5cbiAgLy8gR3JvdXAgdG9vbHMgYnkgYnVja2V0XG4gIGNvbnN0IHRvb2xzQnlCdWNrZXQgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBjb25zdCB0b29sQnVja2V0cyA9IGdldFRvb2xCdWNrZXRzKClcbiAgICBjb25zdCBidWNrZXRzID0ge1xuICAgICAgcmVhZE9ubHk6IFtdIGFzIFRvb2xbXSxcbiAgICAgIGVkaXQ6IFtdIGFzIFRvb2xbXSxcbiAgICAgIGV4ZWN1dGlvbjogW10gYXMgVG9vbFtdLFxuICAgICAgbWNwOiBbXSBhcyBUb29sW10sXG4gICAgICBvdGhlcjogW10gYXMgVG9vbFtdLFxuICAgIH1cblxuICAgIGN1c3RvbUFnZW50VG9vbHMuZm9yRWFjaCh0b29sID0+IHtcbiAgICAgIC8vIENoZWNrIGlmIGl0J3MgYW4gTUNQIHRvb2wgZmlyc3RcbiAgICAgIGlmIChpc01jcFRvb2wodG9vbCkpIHtcbiAgICAgICAgYnVja2V0cy5tY3AucHVzaCh0b29sKVxuICAgICAgfSBlbHNlIGlmICh0b29sQnVja2V0cy5SRUFEX09OTFkudG9vbE5hbWVzLmhhcyh0b29sLm5hbWUpKSB7XG4gICAgICAgIGJ1Y2tldHMucmVhZE9ubHkucHVzaCh0b29sKVxuICAgICAgfSBlbHNlIGlmICh0b29sQnVja2V0cy5FRElULnRvb2xOYW1lcy5oYXModG9vbC5uYW1lKSkge1xuICAgICAgICBidWNrZXRzLmVkaXQucHVzaCh0b29sKVxuICAgICAgfSBlbHNlIGlmICh0b29sQnVja2V0cy5FWEVDVVRJT04udG9vbE5hbWVzLmhhcyh0b29sLm5hbWUpKSB7XG4gICAgICAgIGJ1Y2tldHMuZXhlY3V0aW9uLnB1c2godG9vbClcbiAgICAgIH0gZWxzZSBpZiAodG9vbC5uYW1lICE9PSBBR0VOVF9UT09MX05BTUUpIHtcbiAgICAgICAgLy8gQ2F0Y2gtYWxsIGZvciB1bmNhdGVnb3JpemVkIHRvb2xzIChleGNlcHQgVGFzaylcbiAgICAgICAgYnVja2V0cy5vdGhlci5wdXNoKHRvb2wpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiBidWNrZXRzXG4gIH0sIFtjdXN0b21BZ2VudFRvb2xzXSlcblxuICBjb25zdCBjcmVhdGVCdWNrZXRUb2dnbGVBY3Rpb24gPSAoYnVja2V0VG9vbHM6IFRvb2xbXSkgPT4ge1xuICAgIGNvbnN0IHNlbGVjdGVkID0gY291bnQoYnVja2V0VG9vbHMsIHQgPT4gc2VsZWN0ZWRTZXQuaGFzKHQubmFtZSkpXG4gICAgY29uc3QgbmVlZHNTZWxlY3Rpb24gPSBzZWxlY3RlZCA8IGJ1Y2tldFRvb2xzLmxlbmd0aFxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNvbnN0IHRvb2xOYW1lcyA9IGJ1Y2tldFRvb2xzLm1hcCh0ID0+IHQubmFtZSlcbiAgICAgIGhhbmRsZVRvZ2dsZVRvb2xzKHRvb2xOYW1lcywgbmVlZHNTZWxlY3Rpb24pXG4gICAgfVxuICB9XG5cbiAgLy8gQnVpbGQgbmF2aWdhYmxlIGl0ZW1zIChubyBzZXBhcmF0b3JzKVxuICBjb25zdCBuYXZpZ2FibGVJdGVtczogQXJyYXk8e1xuICAgIGlkOiBzdHJpbmdcbiAgICBsYWJlbDogc3RyaW5nXG4gICAgYWN0aW9uOiAoKSA9PiB2b2lkXG4gICAgaXNDb250aW51ZT86IGJvb2xlYW5cbiAgICBpc1RvZ2dsZT86IGJvb2xlYW5cbiAgICBpc0hlYWRlcj86IGJvb2xlYW5cbiAgfT4gPSBbXVxuXG4gIC8vIENvbnRpbnVlIGJ1dHRvblxuICBuYXZpZ2FibGVJdGVtcy5wdXNoKHtcbiAgICBpZDogJ2NvbnRpbnVlJyxcbiAgICBsYWJlbDogJ0NvbnRpbnVlJyxcbiAgICBhY3Rpb246IGhhbmRsZUNvbmZpcm0sXG4gICAgaXNDb250aW51ZTogdHJ1ZSxcbiAgfSlcblxuICAvLyBBbGwgdG9vbHNcbiAgbmF2aWdhYmxlSXRlbXMucHVzaCh7XG4gICAgaWQ6ICdidWNrZXQtYWxsJyxcbiAgICBsYWJlbDogYCR7aXNBbGxTZWxlY3RlZCA/IGZpZ3VyZXMuY2hlY2tib3hPbiA6IGZpZ3VyZXMuY2hlY2tib3hPZmZ9IEFsbCB0b29sc2AsXG4gICAgYWN0aW9uOiAoKSA9PiB7XG4gICAgICBjb25zdCBhbGxUb29sTmFtZXMgPSBjdXN0b21BZ2VudFRvb2xzLm1hcCh0ID0+IHQubmFtZSlcbiAgICAgIGhhbmRsZVRvZ2dsZVRvb2xzKGFsbFRvb2xOYW1lcywgIWlzQWxsU2VsZWN0ZWQpXG4gICAgfSxcbiAgfSlcblxuICAvLyBDcmVhdGUgYnVja2V0IG1lbnUgaXRlbXNcbiAgY29uc3QgdG9vbEJ1Y2tldHMgPSBnZXRUb29sQnVja2V0cygpXG4gIGNvbnN0IGJ1Y2tldENvbmZpZ3MgPSBbXG4gICAge1xuICAgICAgaWQ6ICdidWNrZXQtcmVhZG9ubHknLFxuICAgICAgbmFtZTogdG9vbEJ1Y2tldHMuUkVBRF9PTkxZLm5hbWUsXG4gICAgICB0b29sczogdG9vbHNCeUJ1Y2tldC5yZWFkT25seSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnYnVja2V0LWVkaXQnLFxuICAgICAgbmFtZTogdG9vbEJ1Y2tldHMuRURJVC5uYW1lLFxuICAgICAgdG9vbHM6IHRvb2xzQnlCdWNrZXQuZWRpdCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnYnVja2V0LWV4ZWN1dGlvbicsXG4gICAgICBuYW1lOiB0b29sQnVja2V0cy5FWEVDVVRJT04ubmFtZSxcbiAgICAgIHRvb2xzOiB0b29sc0J5QnVja2V0LmV4ZWN1dGlvbixcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnYnVja2V0LW1jcCcsXG4gICAgICBuYW1lOiB0b29sQnVja2V0cy5NQ1AubmFtZSxcbiAgICAgIHRvb2xzOiB0b29sc0J5QnVja2V0Lm1jcCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAnYnVja2V0LW90aGVyJyxcbiAgICAgIG5hbWU6IHRvb2xCdWNrZXRzLk9USEVSLm5hbWUsXG4gICAgICB0b29sczogdG9vbHNCeUJ1Y2tldC5vdGhlcixcbiAgICB9LFxuICBdXG5cbiAgYnVja2V0Q29uZmlncy5mb3JFYWNoKCh7IGlkLCBuYW1lLCB0b29sczogYnVja2V0VG9vbHMgfSkgPT4ge1xuICAgIGlmIChidWNrZXRUb29scy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgY29uc3Qgc2VsZWN0ZWQgPSBjb3VudChidWNrZXRUb29scywgdCA9PiBzZWxlY3RlZFNldC5oYXModC5uYW1lKSlcbiAgICBjb25zdCBpc0Z1bGx5U2VsZWN0ZWQgPSBzZWxlY3RlZCA9PT0gYnVja2V0VG9vbHMubGVuZ3RoXG5cbiAgICBuYXZpZ2FibGVJdGVtcy5wdXNoKHtcbiAgICAgIGlkLFxuICAgICAgbGFiZWw6IGAke2lzRnVsbHlTZWxlY3RlZCA/IGZpZ3VyZXMuY2hlY2tib3hPbiA6IGZpZ3VyZXMuY2hlY2tib3hPZmZ9ICR7bmFtZX1gLFxuICAgICAgYWN0aW9uOiBjcmVhdGVCdWNrZXRUb2dnbGVBY3Rpb24oYnVja2V0VG9vbHMpLFxuICAgIH0pXG4gIH0pXG5cbiAgLy8gVG9nZ2xlIGJ1dHRvbiBmb3IgaW5kaXZpZHVhbCB0b29sc1xuICBjb25zdCB0b2dnbGVCdXR0b25JbmRleCA9IG5hdmlnYWJsZUl0ZW1zLmxlbmd0aFxuICBuYXZpZ2FibGVJdGVtcy5wdXNoKHtcbiAgICBpZDogJ3RvZ2dsZS1pbmRpdmlkdWFsJyxcbiAgICBsYWJlbDogc2hvd0luZGl2aWR1YWxUb29sc1xuICAgICAgPyAnSGlkZSBhZHZhbmNlZCBvcHRpb25zJ1xuICAgICAgOiAnU2hvdyBhZHZhbmNlZCBvcHRpb25zJyxcbiAgICBhY3Rpb246ICgpID0+IHtcbiAgICAgIHNldFNob3dJbmRpdmlkdWFsVG9vbHMoIXNob3dJbmRpdmlkdWFsVG9vbHMpXG4gICAgICAvLyBJZiBoaWRpbmcgdG9vbHMgYW5kIGZvY3VzIGlzIG9uIGFuIGluZGl2aWR1YWwgdG9vbCwgbW92ZSBmb2N1cyB0byB0b2dnbGUgYnV0dG9uXG4gICAgICBpZiAoc2hvd0luZGl2aWR1YWxUb29scyAmJiBmb2N1c0luZGV4ID4gdG9nZ2xlQnV0dG9uSW5kZXgpIHtcbiAgICAgICAgc2V0Rm9jdXNJbmRleCh0b2dnbGVCdXR0b25JbmRleClcbiAgICAgIH1cbiAgICB9LFxuICAgIGlzVG9nZ2xlOiB0cnVlLFxuICB9KVxuXG4gIC8vIE1lbW9pemUgTUNQIHNlcnZlciBidWNrZXRzIChtdXN0IGJlIG91dHNpZGUgY29uZGl0aW9uYWwgZm9yIGhvb2tzIHJ1bGVzKVxuICBjb25zdCBtY3BTZXJ2ZXJCdWNrZXRzID0gdXNlTWVtbyhcbiAgICAoKSA9PiBnZXRNY3BTZXJ2ZXJCdWNrZXRzKGN1c3RvbUFnZW50VG9vbHMpLFxuICAgIFtjdXN0b21BZ2VudFRvb2xzXSxcbiAgKVxuXG4gIC8vIEluZGl2aWR1YWwgdG9vbHMgKG9ubHkgaWYgZXhwYW5kZWQpXG4gIGlmIChzaG93SW5kaXZpZHVhbFRvb2xzKSB7XG4gICAgLy8gQWRkIE1DUCBzZXJ2ZXIgYnVja2V0cyBpZiBhbnkgZXhpc3RcbiAgICBpZiAobWNwU2VydmVyQnVja2V0cy5sZW5ndGggPiAwKSB7XG4gICAgICBuYXZpZ2FibGVJdGVtcy5wdXNoKHtcbiAgICAgICAgaWQ6ICdtY3Atc2VydmVycy1oZWFkZXInLFxuICAgICAgICBsYWJlbDogJ01DUCBTZXJ2ZXJzOicsXG4gICAgICAgIGFjdGlvbjogKCkgPT4ge30sIC8vIE5vIGFjdGlvbiAtIGp1c3QgYSBoZWFkZXJcbiAgICAgICAgaXNIZWFkZXI6IHRydWUsXG4gICAgICB9KVxuXG4gICAgICBtY3BTZXJ2ZXJCdWNrZXRzLmZvckVhY2goKHsgc2VydmVyTmFtZSwgdG9vbHM6IHNlcnZlclRvb2xzIH0pID0+IHtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWQgPSBjb3VudChzZXJ2ZXJUb29scywgdCA9PiBzZWxlY3RlZFNldC5oYXModC5uYW1lKSlcbiAgICAgICAgY29uc3QgaXNGdWxseVNlbGVjdGVkID0gc2VsZWN0ZWQgPT09IHNlcnZlclRvb2xzLmxlbmd0aFxuXG4gICAgICAgIG5hdmlnYWJsZUl0ZW1zLnB1c2goe1xuICAgICAgICAgIGlkOiBgbWNwLXNlcnZlci0ke3NlcnZlck5hbWV9YCxcbiAgICAgICAgICBsYWJlbDogYCR7aXNGdWxseVNlbGVjdGVkID8gZmlndXJlcy5jaGVja2JveE9uIDogZmlndXJlcy5jaGVja2JveE9mZn0gJHtzZXJ2ZXJOYW1lfSAoJHtzZXJ2ZXJUb29scy5sZW5ndGh9ICR7cGx1cmFsKHNlcnZlclRvb2xzLmxlbmd0aCwgJ3Rvb2wnKX0pYCxcbiAgICAgICAgICBhY3Rpb246ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2xOYW1lcyA9IHNlcnZlclRvb2xzLm1hcCh0ID0+IHQubmFtZSlcbiAgICAgICAgICAgIGhhbmRsZVRvZ2dsZVRvb2xzKHRvb2xOYW1lcywgIWlzRnVsbHlTZWxlY3RlZClcbiAgICAgICAgICB9LFxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgLy8gQWRkIHNlcGFyYXRvciBoZWFkZXIgYmVmb3JlIGluZGl2aWR1YWwgdG9vbHNcbiAgICAgIG5hdmlnYWJsZUl0ZW1zLnB1c2goe1xuICAgICAgICBpZDogJ3Rvb2xzLWhlYWRlcicsXG4gICAgICAgIGxhYmVsOiAnSW5kaXZpZHVhbCBUb29sczonLFxuICAgICAgICBhY3Rpb246ICgpID0+IHt9LFxuICAgICAgICBpc0hlYWRlcjogdHJ1ZSxcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gQWRkIGluZGl2aWR1YWwgdG9vbHNcbiAgICBjdXN0b21BZ2VudFRvb2xzLmZvckVhY2godG9vbCA9PiB7XG4gICAgICBsZXQgZGlzcGxheU5hbWUgPSB0b29sLm5hbWVcbiAgICAgIGlmICh0b29sLm5hbWUuc3RhcnRzV2l0aCgnbWNwX18nKSkge1xuICAgICAgICBjb25zdCBtY3BJbmZvID0gbWNwSW5mb0Zyb21TdHJpbmcodG9vbC5uYW1lKVxuICAgICAgICBkaXNwbGF5TmFtZSA9IG1jcEluZm9cbiAgICAgICAgICA/IGAke21jcEluZm8udG9vbE5hbWV9ICgke21jcEluZm8uc2VydmVyTmFtZX0pYFxuICAgICAgICAgIDogdG9vbC5uYW1lXG4gICAgICB9XG5cbiAgICAgIG5hdmlnYWJsZUl0ZW1zLnB1c2goe1xuICAgICAgICBpZDogYHRvb2wtJHt0b29sLm5hbWV9YCxcbiAgICAgICAgbGFiZWw6IGAke3NlbGVjdGVkU2V0Lmhhcyh0b29sLm5hbWUpID8gZmlndXJlcy5jaGVja2JveE9uIDogZmlndXJlcy5jaGVja2JveE9mZn0gJHtkaXNwbGF5TmFtZX1gLFxuICAgICAgICBhY3Rpb246ICgpID0+IGhhbmRsZVRvZ2dsZVRvb2wodG9vbC5uYW1lKSxcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGNvbnN0IGhhbmRsZUNhbmNlbCA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBpZiAob25DYW5jZWwpIHtcbiAgICAgIG9uQ2FuY2VsKClcbiAgICB9IGVsc2Uge1xuICAgICAgb25Db21wbGV0ZShpbml0aWFsVG9vbHMpXG4gICAgfVxuICB9LCBbb25DYW5jZWwsIG9uQ29tcGxldGUsIGluaXRpYWxUb29sc10pXG5cbiAgdXNlS2V5YmluZGluZygnY29uZmlybTpubycsIGhhbmRsZUNhbmNlbCwgeyBjb250ZXh0OiAnQ29uZmlybWF0aW9uJyB9KVxuXG4gIGNvbnN0IGhhbmRsZUtleURvd24gPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgIGlmIChlLmtleSA9PT0gJ3JldHVybicpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgY29uc3QgaXRlbSA9IG5hdmlnYWJsZUl0ZW1zW2ZvY3VzSW5kZXhdXG4gICAgICBpZiAoaXRlbSAmJiAhaXRlbS5pc0hlYWRlcikge1xuICAgICAgICBpdGVtLmFjdGlvbigpXG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChlLmtleSA9PT0gJ3VwJykge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBsZXQgbmV3SW5kZXggPSBmb2N1c0luZGV4IC0gMVxuICAgICAgLy8gU2tpcCBoZWFkZXJzIHdoZW4gbmF2aWdhdGluZyB1cFxuICAgICAgd2hpbGUgKG5ld0luZGV4ID4gMCAmJiBuYXZpZ2FibGVJdGVtc1tuZXdJbmRleF0/LmlzSGVhZGVyKSB7XG4gICAgICAgIG5ld0luZGV4LS1cbiAgICAgIH1cbiAgICAgIHNldEZvY3VzSW5kZXgoTWF0aC5tYXgoMCwgbmV3SW5kZXgpKVxuICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09ICdkb3duJykge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBsZXQgbmV3SW5kZXggPSBmb2N1c0luZGV4ICsgMVxuICAgICAgLy8gU2tpcCBoZWFkZXJzIHdoZW4gbmF2aWdhdGluZyBkb3duXG4gICAgICB3aGlsZSAoXG4gICAgICAgIG5ld0luZGV4IDwgbmF2aWdhYmxlSXRlbXMubGVuZ3RoIC0gMSAmJlxuICAgICAgICBuYXZpZ2FibGVJdGVtc1tuZXdJbmRleF0/LmlzSGVhZGVyXG4gICAgICApIHtcbiAgICAgICAgbmV3SW5kZXgrK1xuICAgICAgfVxuICAgICAgc2V0Rm9jdXNJbmRleChNYXRoLm1pbihuYXZpZ2FibGVJdGVtcy5sZW5ndGggLSAxLCBuZXdJbmRleCkpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8Qm94XG4gICAgICBmbGV4RGlyZWN0aW9uPVwiY29sdW1uXCJcbiAgICAgIG1hcmdpblRvcD17MX1cbiAgICAgIHRhYkluZGV4PXswfVxuICAgICAgYXV0b0ZvY3VzXG4gICAgICBvbktleURvd249e2hhbmRsZUtleURvd259XG4gICAgPlxuICAgICAgey8qIFJlbmRlciBDb250aW51ZSBidXR0b24gKi99XG4gICAgICA8VGV4dFxuICAgICAgICBjb2xvcj17Zm9jdXNJbmRleCA9PT0gMCA/ICdzdWdnZXN0aW9uJyA6IHVuZGVmaW5lZH1cbiAgICAgICAgYm9sZD17Zm9jdXNJbmRleCA9PT0gMH1cbiAgICAgID5cbiAgICAgICAge2ZvY3VzSW5kZXggPT09IDAgPyBgJHtmaWd1cmVzLnBvaW50ZXJ9IGAgOiAnICAnfVsgQ29udGludWUgXVxuICAgICAgPC9UZXh0PlxuXG4gICAgICB7LyogU2VwYXJhdG9yICovfVxuICAgICAgPERpdmlkZXIgd2lkdGg9ezQwfSAvPlxuXG4gICAgICB7LyogUmVuZGVyIGFsbCBuYXZpZ2FibGUgaXRlbXMgZXhjZXB0IENvbnRpbnVlICh3aGljaCBpcyBhdCBpbmRleCAwKSAqL31cbiAgICAgIHtuYXZpZ2FibGVJdGVtcy5zbGljZSgxKS5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IGlzQ3VycmVudGx5Rm9jdXNlZCA9IGluZGV4ICsgMSA9PT0gZm9jdXNJbmRleFxuICAgICAgICBjb25zdCBpc1RvZ2dsZUJ1dHRvbiA9IGl0ZW0uaXNUb2dnbGVcbiAgICAgICAgY29uc3QgaXNIZWFkZXIgPSBpdGVtLmlzSGVhZGVyXG5cbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICA8UmVhY3QuRnJhZ21lbnQga2V5PXtpdGVtLmlkfT5cbiAgICAgICAgICAgIHsvKiBBZGQgc2VwYXJhdG9yIGJlZm9yZSB0b2dnbGUgYnV0dG9uICovfVxuICAgICAgICAgICAge2lzVG9nZ2xlQnV0dG9uICYmIDxEaXZpZGVyIHdpZHRoPXs0MH0gLz59XG5cbiAgICAgICAgICAgIHsvKiBBZGQgbWFyZ2luIGJlZm9yZSBoZWFkZXJzICovfVxuICAgICAgICAgICAge2lzSGVhZGVyICYmIGluZGV4ID4gMCAmJiA8Qm94IG1hcmdpblRvcD17MX0gLz59XG5cbiAgICAgICAgICAgIDxUZXh0XG4gICAgICAgICAgICAgIGNvbG9yPXtcbiAgICAgICAgICAgICAgICBpc0hlYWRlclxuICAgICAgICAgICAgICAgICAgPyB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgIDogaXNDdXJyZW50bHlGb2N1c2VkXG4gICAgICAgICAgICAgICAgICAgID8gJ3N1Z2dlc3Rpb24nXG4gICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZGltQ29sb3I9e2lzSGVhZGVyfVxuICAgICAgICAgICAgICBib2xkPXtpc1RvZ2dsZUJ1dHRvbiAmJiBpc0N1cnJlbnRseUZvY3VzZWR9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHtpc0hlYWRlclxuICAgICAgICAgICAgICAgID8gJydcbiAgICAgICAgICAgICAgICA6IGlzQ3VycmVudGx5Rm9jdXNlZFxuICAgICAgICAgICAgICAgICAgPyBgJHtmaWd1cmVzLnBvaW50ZXJ9IGBcbiAgICAgICAgICAgICAgICAgIDogJyAgJ31cbiAgICAgICAgICAgICAge2lzVG9nZ2xlQnV0dG9uID8gYFsgJHtpdGVtLmxhYmVsfSBdYCA6IGl0ZW0ubGFiZWx9XG4gICAgICAgICAgICA8L1RleHQ+XG4gICAgICAgICAgPC9SZWFjdC5GcmFnbWVudD5cbiAgICAgICAgKVxuICAgICAgfSl9XG5cbiAgICAgIDxCb3ggbWFyZ2luVG9wPXsxfSBmbGV4RGlyZWN0aW9uPVwiY29sdW1uXCI+XG4gICAgICAgIDxUZXh0IGRpbUNvbG9yPlxuICAgICAgICAgIHtpc0FsbFNlbGVjdGVkXG4gICAgICAgICAgICA/ICdBbGwgdG9vbHMgc2VsZWN0ZWQnXG4gICAgICAgICAgICA6IGAke3NlbGVjdGVkU2V0LnNpemV9IG9mICR7Y3VzdG9tQWdlbnRUb29scy5sZW5ndGh9IHRvb2xzIHNlbGVjdGVkYH1cbiAgICAgICAgPC9UZXh0PlxuICAgICAgPC9Cb3g+XG4gICAgPC9Cb3g+XG4gIClcbn1cbiJdLCJpZ25vcmVMaXN0IjpbXX0=
