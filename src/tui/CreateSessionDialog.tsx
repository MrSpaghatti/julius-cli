import React, { useState, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getClient } from '../utils/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { execSync } from 'child_process';

interface CreateSessionDialogProps {
  onCreated: () => void;
  onCancel: () => void;
}

function detectGitRepo(): string {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8', timeout: 3000 }).trim();
    const m = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    return m ? m[1] : '';
  } catch {
    return '';
  }
}

export function CreateSessionDialog({ onCreated, onCancel }: CreateSessionDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [repo, setRepo] = useState(() => detectGitRepo());
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'prompt' | 'repo' | 'title'>('prompt');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  if (repo && phase === 'prompt') {
    setPhase('title');
  }

  useInput((input, key) => {
    if (key.escape && !submitting) {
      onCancel();
    }
  });

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const client = await getClient();
      const api = new SessionsAPI(client);
      await api.create({
        prompt,
        sourceContext: {
          source: repo.includes('/') ? `sources/github/${repo}` : repo,
        },
        title: title || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [prompt, repo, title, onCreated]);

  const advance = useCallback((value: string) => {
    if (phase === 'prompt') {
      setPrompt(value);
      if (repo) {
        setPhase('title');
      } else {
        setPhase('repo');
      }
    } else if (phase === 'repo') {
      setRepo(value);
      setPhase('title');
    } else if (phase === 'title') {
      setTitle(value);
      submit();
    }
  }, [phase, repo, submit]);

  if (error) {
    return (
      <Box borderStyle="single" borderColor="red" paddingX={1} paddingY={1} marginBottom={1}>
        <Text color="red">Error: {error}</Text>
        <Box marginLeft={2}>
          <Text color="gray">Press Esc to close</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1} paddingY={1} marginBottom={1}>
      <Box flexDirection="column" width="100%">
        <Text bold color="cyan">Create New Session</Text>
        {phase === 'prompt' && (
          <Box>
            <Text>Prompt: </Text>
            <TextInput
              value={prompt}
              onChange={setPrompt}
              placeholder="Describe what you want the agent to do..."
              onSubmit={advance}
            />
          </Box>
        )}
        {phase === 'repo' && (
          <Box>
            <Text>Repo (owner/repo): </Text>
            <TextInput
              value={repo}
              onChange={setRepo}
              placeholder="owner/repo"
              onSubmit={advance}
            />
          </Box>
        )}
        {phase === 'title' && (
          <Box>
            <Text>Title (optional, Enter to skip): </Text>
            <TextInput
              value={title}
              onChange={setTitle}
              placeholder="Session title"
              onSubmit={advance}
            />
          </Box>
        )}
        {submitting && <Text color="green">Creating session...</Text>}
        <Box marginTop={1}>
          <Text color="gray" dimColor>Esc to cancel</Text>
        </Box>
      </Box>
    </Box>
  );
}
