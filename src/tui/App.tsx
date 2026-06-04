import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { getClient } from '../utils/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { ActivitiesAPI } from '../api/activities.js';
import type { Session, Activity } from '../api/types.js';
import { SessionList } from './SessionList.js';
import { ActivityPanel } from './ActivityPanel.js';
import { ChatPanel } from './ChatPanel.js';
import { CreateSessionDialog } from './CreateSessionDialog.js';
import { formatRelativeTime, getStateColor, extractRepo, FILTER_STATES } from './utils.js';

const POLL_INTERVAL = 5000;

export function App(): React.ReactNode {
  const { exit } = useApp();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [repoFilter, setRepoFilter] = useState('');
  const [showRepoFilter, setShowRepoFilter] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const prevFilterStateRef = useRef(filterState);

  const fetchSessions = useCallback(async () => {
    try {
      const client = await getClient();
      const api = new SessionsAPI(client);
      const filters: string[] = [];
      if (filterState !== 'all') {
        filters.push(`state="${filterState}"`);
      }
      if (repoFilter) {
        const parts = repoFilter.includes('/') ? repoFilter : `github/${repoFilter}`;
        filters.push(`source = "sources/${parts}"`);
      }
      const filter = filters.length > 0 ? filters.join(' AND ') : undefined;
      const result = await api.list(30, undefined, filter);
      if (result?.items) {
        setSessions(result.items);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, [filterState, repoFilter]);

  const fetchActivities = useCallback(async (sessionId: string) => {
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const client = await getClient();
      const api = new ActivitiesAPI(client);
      const result = await api.list(sessionId);
      if (result?.items) {
        setActivities(result.items);
      }
    } catch (err) {
      setActivities([]);
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  useEffect(() => {
    const selected = sessions[selectedIndex];
    if (selected) {
      fetchActivities(selected.id);
      const interval = setInterval(() => fetchActivities(selected.id), POLL_INTERVAL);
      return () => clearInterval(interval);
    } else {
      setActivities([]);
    }
  }, [selectedIndex, sessions, fetchActivities]);

  useInput((input, key) => {
    if (showCreateDialog) return;

    if (chatMode) {
      return;
    }

    if (showRepoFilter) {
      if (key.escape) {
        setShowRepoFilter(false);
        setRepoFilter('');
      }
      return;
    }

    if (input === 'q') {
      exit();
      return;
    }
    if (input === 'c') {
      setShowCreateDialog(true);
      return;
    }
    if (key.return) {
      if (sessions[selectedIndex]) {
        setChatMode(true);
      }
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(Math.min(sessions.length - 1, selectedIndex + 1));
      return;
    }

    if (input === 'r') {
      setShowRepoFilter(true);
      return;
    }

    if (input === 'p') {
      const session = sessions[selectedIndex];
      if (session && session.state === 'AWAITING_APPROVAL') {
        handleApprove();
      }
      return;
    }

    const stateIndex = FILTER_STATES.findIndex(s => s[0] === input && s !== 'all');
    if (stateIndex >= 0 && stateIndex + 1 < FILTER_STATES.length) {
      const newFilter = FILTER_STATES[stateIndex + 1];
      if (newFilter !== filterState) {
        setFilterState(newFilter);
        setSelectedIndex(0);
      }
      return;
    }
    if (input === 'a') {
      if (filterState !== 'all') {
        setFilterState('all');
        setSelectedIndex(0);
      }
      return;
    }
  });

  const handleCreateSession = useCallback(() => {
    setShowCreateDialog(false);
    fetchSessions();
  }, [fetchSessions]);

  const handleSendMessage = useCallback(async (message: string) => {
    const session = sessions[selectedIndex];
    if (!session) throw new Error('No session selected');
    const client = await getClient();
    const api = new SessionsAPI(client);
    await api.sendMessage(session.id, message);
    // Refresh activities to show the new message and response
    await fetchActivities(session.id);
  }, [selectedIndex, sessions, fetchActivities]);

  const handleLeaveChat = useCallback(() => {
    setChatMode(false);
  }, []);

  const handleApprove = useCallback(async () => {
    const session = sessions[selectedIndex];
    if (!session || session.state !== 'AWAITING_APPROVAL') return;
    setActionLoading(true);
    try {
      const client = await getClient();
      const api = new SessionsAPI(client);
      await api.approvePlan(session.id);
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve plan');
    } finally {
      setActionLoading(false);
    }
  }, [selectedIndex, sessions, fetchSessions]);

  const selectedSession = sessions[selectedIndex];

  return (
    <Box flexDirection="column" height="100%">
      {showCreateDialog && (
        <CreateSessionDialog
          onCreated={handleCreateSession}
          onCancel={() => setShowCreateDialog(false)}
        />
      )}

      <Box borderStyle="single" paddingX={1}>
        <Text bold>Julius CLI Dashboard</Text>
        <Box marginLeft={2}>
          <Text color="gray">julius-cli tui</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color="gray">|</Text>
        </Box>
        <Box marginLeft={2}>
          <Text>Filter: </Text>
          <Text bold color={filterState === 'all' ? 'green' : 'white'}>{filterState}</Text>
        </Box>
      </Box>

      {showRepoFilter && (
        <Box paddingX={1} paddingY={0}>
          <Text bold color="cyan">Repo filter: </Text>
          <Box flexGrow={1}>
            <TextInput
              value={repoFilter}
              onChange={setRepoFilter}
              onSubmit={(value) => {
                setRepoFilter(value);
                setShowRepoFilter(false);
                setSelectedIndex(0);
                fetchSessions();
              }}
              placeholder="owner/repo (Enter to apply, Esc to cancel)"
            />
          </Box>
        </Box>
      )}

      {repoFilter && !showRepoFilter && (
        <Box paddingX={1}>
          <Text color="cyan">Filter: repo={repoFilter}</Text>
          <Box marginLeft={1}>
            <Text color="gray" dimColor>(r to change)</Text>
          </Box>
        </Box>
      )}

      <Box flexGrow={1} minHeight={15}>
        <Box width="45%" borderStyle="single" flexDirection="column">
          <Box paddingX={1}>
            <Text bold>Sessions</Text>
            <Text color="gray"> ({sessions.length})</Text>
          </Box>
          <Box flexGrow={1}>
            <SessionList
              sessions={sessions}
              selectedIndex={selectedIndex}
              loading={loading}
            />
          </Box>
        </Box>

        <Box width="55%" borderStyle="single" flexDirection="column">
          {!selectedSession ? (
            <Box paddingX={1} paddingY={1} flexGrow={1} justifyContent="center" alignItems="center">
              <Text color="gray">{loading ? 'Loading...' : 'Select a session to view details'}</Text>
            </Box>
          ) : chatMode ? (
            <ChatPanel
              activities={activities}
              sessionId={selectedSession.id}
              sessionState={selectedSession.state}
              loading={activitiesLoading}
              error={activitiesError}
              onSendMessage={handleSendMessage}
              onExit={handleLeaveChat}
            />
          ) : (
            <>
              <Box paddingX={1} flexDirection="column">
                <Box>
                  <Text bold>Session </Text>
                  <Text color="gray">{selectedSession.id.slice(0, 20)}</Text>
                </Box>
                {selectedSession.title && (
                  <Box>
                    <Text bold>Title: </Text>
                    <Text>{selectedSession.title}</Text>
                  </Box>
                )}
                <Box>
                  <Text bold>State: </Text>
                  <Text color={getStateColor(selectedSession.state)}>
                    {selectedSession.state || 'UNKNOWN'}
                  </Text>
                  <Box marginLeft={2}>
                    <Text bold>Created: </Text>
                    <Text color="gray">{formatRelativeTime(selectedSession.createTime)}</Text>
                  </Box>
                  <Box marginLeft={2}>
                    <Text bold>Updated: </Text>
                    <Text color="gray">{formatRelativeTime(selectedSession.updateTime)}</Text>
                  </Box>
                </Box>
                <Box>
                  <Text bold>Repo: </Text>
                  <Text color="cyan">{extractRepo(selectedSession.sourceContext)}</Text>
                </Box>
                {selectedSession.prompt && (
                  <Box>
                    <Text bold>Prompt: </Text>
                    <Text wrap="truncate-end" color="gray">{selectedSession.prompt}</Text>
                  </Box>
                )}
                {selectedSession.automationMode && selectedSession.automationMode !== 'NONE' && (
                  <Box>
                    <Text bold>Auto-PR: </Text>
                    <Text color="yellow">{selectedSession.automationMode}</Text>
                  </Box>
                )}
                {selectedSession.outputs && selectedSession.outputs.length > 0 && (
                  <Box flexDirection="column">
                    <Text bold>Outputs:</Text>
                    {selectedSession.outputs.map((out, i) => (
                      <Box key={i} marginLeft={1}>
                        {out.pullRequest?.url ? (
                          <Text color="green">PR: {out.pullRequest.url}</Text>
                        ) : out.branch?.name ? (
                          <Text color="cyan">Branch: {out.branch.name}</Text>
                        ) : null}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              <Box flexGrow={1} borderStyle="single" marginX={0} flexDirection="column">
                <Box paddingX={1}>
                  <Text bold>Activity Stream</Text>
                  {activitiesLoading && <Text color="gray"> loading...</Text>}
                  <Text color="gray"> ({activities.length})</Text>
                </Box>
                <Box flexGrow={1}>
                  <ActivityPanel activities={activities} loading={activitiesLoading} error={activitiesError} />
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>

      <Box borderStyle="single" paddingX={1}>
        {error ? (
          <Text color="red">{error}</Text>
        ) : chatMode ? (
          <Text color="cyan">Chat mode — Esc to return to dashboard</Text>
        ) : (
          <>
            <Text color="gray">↑↓ Navigate</Text>
            <ColorDivider />
            <Text color="gray">Enter Chat</Text>
            <ColorDivider />
            <Text color="gray">r Filter Repo</Text>
            <ColorDivider />
            <Text color="gray">p Approve</Text>
            <ColorDivider />
            <Text color="gray">x Cancel</Text>
            <ColorDivider />
            <Text color="gray">c Create</Text>
            <ColorDivider />
            <Text color="gray">a All</Text>
            <ColorDivider />
            <Text color="gray">1-7 Filter State</Text>
            <ColorDivider />
            <Text color="gray">q Quit</Text>
            <Box marginLeft={2}>
              <Text color="gray" dimColor>
                {new Date().toLocaleTimeString()}
              </Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

function ColorDivider() {
  return (
    <Text color="gray" dimColor> | </Text>
  );
}
