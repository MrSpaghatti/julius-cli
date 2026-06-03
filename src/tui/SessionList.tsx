import React from 'react';
import { Box, Text } from 'ink';
import type { Session } from '../api/types.js';
import { getStateColor, getStateIcon, extractRepo } from './utils.js';

interface SessionListProps {
  sessions: Session[];
  selectedIndex: number;
  loading: boolean;
}

export function SessionList({ sessions, selectedIndex, loading }: SessionListProps) {
  if (loading && sessions.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color="gray">Loading sessions...</Text>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color="gray">No active sessions</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {sessions.slice(0, 50).map((session, index) => {
        const isSelected = index === selectedIndex;
        const stateColor = getStateColor(session.state);
        const icon = getStateIcon(session.state);
        const repo = extractRepo(session.sourceContext);

        return (
          <Box
            key={session.id}
            paddingX={1}
            backgroundColor={isSelected ? 'blue' : undefined}
          >
            <Text color={stateColor}>{icon}</Text>
            <Box marginLeft={1} flexGrow={1}>
              <Text bold={isSelected} color={isSelected ? 'white' : undefined}>
                {session.id.slice(0, 12)}
              </Text>
            </Box>
            <Box width={12}>
              <Text color={stateColor}>{session.state}</Text>
            </Box>
            <Box flexShrink={1}>
              <Text color="gray" wrap="truncate-end">{repo}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
