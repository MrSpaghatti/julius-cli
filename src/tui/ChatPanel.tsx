import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Activity } from '../api/types.js';

const AUTHOR_LABELS: Record<string, string> = {
  USER: 'you',
  AGENT: 'agent',
};

const AUTHOR_COLORS: Record<string, string> = {
  USER: 'green',
  AGENT: 'cyan',
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface ChatMessageProps {
  activity: Activity;
}

function ChatMessage({ activity }: ChatMessageProps) {
  const label = AUTHOR_LABELS[activity.author] || activity.author;
  const color = AUTHOR_COLORS[activity.author] || 'white';
  const isUser = activity.author === 'USER';

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1}>
      <Box>
        <Text bold color={color}>{isUser ? '▸' : '◂'}</Text>
        <Box marginLeft={1} width={6}>
          <Text bold color={color}>{label}</Text>
        </Box>
        <Text color="gray">[{formatTime(activity.createTime)}]</Text>
      </Box>
      <Box marginLeft={3}>
        <Text wrap="wrap">{activity.content}</Text>
      </Box>
    </Box>
  );
}

interface ChatPanelProps {
  activities: Activity[];
  sessionId: string;
  sessionState?: string;
  loading: boolean;
  error?: string | null;
  onSendMessage: (message: string) => Promise<void>;
  onExit: () => void;
}

export function ChatPanel({
  activities,
  sessionId,
  sessionState,
  loading,
  error,
  onSendMessage,
  onExit,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const chatActivities = activities.filter(a => a.type === 'MESSAGE');

  useInput((_input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setSendError(null);
    setInputValue('');

    try {
      await onSendMessage(trimmed);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message');
      setInputValue(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} paddingY={1} borderStyle="single">
        <Box flexDirection="column" width="100%">
          <Box>
            <Text bold>Chat — </Text>
            <Text color="gray">{sessionId.slice(0, 20)}</Text>
          </Box>
          {sessionState && (
            <Box>
              <Text bold>State: </Text>
              <Text>{sessionState}</Text>
            </Box>
          )}
        </Box>
      </Box>

      <Box flexGrow={1} flexDirection="column">
        {error ? (
          <Box paddingX={1} paddingY={1}>
            <Text color="red">{error}</Text>
          </Box>
        ) : chatActivities.length === 0 && !loading ? (
          <Box paddingX={1} paddingY={1}>
            <Text color="gray">No messages yet. Send one to start the conversation.</Text>
          </Box>
        ) : (
          <>
            {chatActivities.map((activity) => (
              <ChatMessage key={activity.id} activity={activity} />
            ))}
            {loading && (
              <Box paddingX={1}>
                <Text color="gray">Loading messages...</Text>
              </Box>
            )}
          </>
        )}
      </Box>

      {sendError && (
        <Box paddingX={1} marginBottom={1}>
          <Text color="red">Failed to send: {sendError}</Text>
        </Box>
      )}

      <Box borderStyle="single" paddingX={1} paddingY={0} marginTop={0}>
        <Box>
          <Text bold color="green">{'>'}</Text>
          <Box marginLeft={1} flexGrow={1}>
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              placeholder="Type a message... (Enter to send)"
            />
          </Box>
          {sending && <Text color="gray"> sending...</Text>}
        </Box>
      </Box>

      <Box paddingX={1}>
        <Text color="gray">Enter Send | Esc Back to Dashboard</Text>
      </Box>
    </Box>
  );
}
