import React from 'react';
import { Box, Text } from 'ink';
import type { Activity } from '../api/types.js';

const ACTIVITY_ICONS: Record<string, string> = {
  PLAN: '📋',
  MESSAGE: '💬',
  PROGRESS: '⚡',
  ERROR: '✗',
};

const ACTIVITY_COLORS: Record<string, string> = {
  PLAN: 'cyan',
  MESSAGE: 'white',
  PROGRESS: 'yellow',
  ERROR: 'red',
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + '...';
}

interface ActivityPanelProps {
  activities: Activity[];
  loading: boolean;
}

export function ActivityPanel({ activities, loading }: ActivityPanelProps) {
  if (loading && activities.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color="gray">Loading activities...</Text>
      </Box>
    );
  }

  if (activities.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color="gray">No activities yet</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {activities.map((activity) => {
        const icon = ACTIVITY_ICONS[activity.type] || '•';
        const color = ACTIVITY_COLORS[activity.type] || 'white';
        const authorLabel = activity.author === 'AGENT' ? 'agent' : 'user';

        return (
          <Box key={activity.id} paddingX={1} flexDirection="column">
            <Box>
              <Text color={color}>{icon}</Text>
              <Box marginLeft={1} width={7}>
                <Text color={color} bold>{activity.type}</Text>
              </Box>
              <Box width={10}>
                <Text color="gray">[{formatTime(activity.createTime)}]</Text>
              </Box>
              <Box>
                <Text color="gray" dimColor>({authorLabel})</Text>
              </Box>
            </Box>
            <Box marginLeft={4} marginBottom={1}>
              <Text wrap="wrap">{truncate(activity.content, 200)}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
