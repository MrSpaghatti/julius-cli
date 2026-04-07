# AI Agent Workflow Examples

This document provides practical examples for AI agents (Claude, Copilot, Gemini, etc.) using julius-cli.

---

## Prerequisites

```bash
# Install the CLI
npm install -g julius-cli

# Set your API key (one time setup)
export JULES_API_KEY="your-api-key-here"
# OR
julius-cli auth set "your-api-key-here"
```

---

## Example 1: Create and Monitor a Session

### Create a session and wait for completion

```bash
#!/bin/bash
set -e

# Create a new session
RESPONSE=$(julius-cli sessions create \
  --repo "myorg/myrepo" \
  --prompt "Fix the authentication bug in src/auth.ts" \
  --title "Auth Bug Fix" \
  --auto-pr \
  --format json)

# Extract session ID using jq
SESSION_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "Created session: $SESSION_ID"

# Poll until session completes
while true; do
  STATE=$(julius-cli sessions get "$SESSION_ID" --format json | jq -r '.state')
  echo "Current state: $STATE"
  
  if [ "$STATE" = "COMPLETED" ]; then
    echo "Session completed successfully!"
    break
  elif [ "$STATE" = "FAILED" ] || [ "$STATE" = "CANCELLED" ]; then
    echo "Session ended with state: $STATE"
    exit 1
  fi
  
  sleep 5
done

# Get the PR URL from outputs
PR_URL=$(julius-cli sessions get "$SESSION_ID" --format json | \
  jq -r '.outputs[0].pullRequest.url // empty')

if [ -n "$PR_URL" ]; then
  echo "Pull request created: $PR_URL"
fi
```

---

## Example 2: Interactive Session with Plan Approval

```bash
#!/bin/bash
set -e

# Create session requiring plan approval
SESSION_ID=$(julius-cli sessions create \
  --repo "myorg/myrepo" \
  --prompt "Refactor database connection pooling" \
  --require-approval \
  --format json | jq -r '.id')

echo "Session created: $SESSION_ID"

# Wait for plan
while true; do
  STATE=$(julius-cli sessions get "$SESSION_ID" --format json | jq -r '.state')
  
  if [ "$STATE" = "AWAITING_APPROVAL" ]; then
    echo "Plan is ready for approval"
    break
  fi
  
  sleep 3
done

# View the plan
echo "=== PLAN ==="
julius-cli activities list "$SESSION_ID" \
  --type PLAN \
  --format pretty

# Approve the plan
julius-cli sessions approve "$SESSION_ID"
echo "Plan approved"

# Monitor execution
while true; do
  STATE=$(julius-cli sessions get "$SESSION_ID" --format json | jq -r '.state')
  echo "Current state: $STATE"
  
  if [ "$STATE" = "COMPLETED" ] || [ "$STATE" = "FAILED" ]; then
    break
  fi
  
  sleep 5
done
```

---

## Example 3: List and Filter Sessions

```bash
#!/bin/bash

# List all active sessions
julius-cli sessions list \
  --state PENDING PLANNING EXECUTING \
  --format pretty

# List sessions for specific repo
julius-cli sessions list \
  --repo "myorg/myrepo" \
  --format json

# Get details for multiple sessions
SESSION_IDS=("session1" "session2" "session3")
for sid in "${SESSION_IDS[@]}"; do
  echo "=== Session: $sid ==="
  julius-cli sessions get "$sid" --format pretty
done
```

---

## Example 4: Monitor Session Activities

```bash
#!/bin/bash
set -e

SESSION_ID="$1"

if [ -z "$SESSION_ID" ]; then
  echo "Usage: $0 <session-id>"
  exit 1
fi

# Stream activities (simple polling)
LAST_COUNT=0

while true; do
  # Get all activities
  ACTIVITIES=$(julius-cli activities list "$SESSION_ID" --format json)
  CURRENT_COUNT=$(echo "$ACTIVITIES" | jq '.activities | length')
  
  # If new activities, show them
  if [ "$CURRENT_COUNT" -gt "$LAST_COUNT" ]; then
    echo "=== New Activities ==="
    echo "$ACTIVITIES" | jq ".activities[$LAST_COUNT:]"
    LAST_COUNT=$CURRENT_COUNT
  fi
  
  # Check if session is done
  STATE=$(julius-cli sessions get "$SESSION_ID" --format json | jq -r '.state')
  if [ "$STATE" = "COMPLETED" ] || [ "$STATE" = "FAILED" ] || [ "$STATE" = "CANCELLED" ]; then
    echo "Session ended with state: $STATE"
    break
  fi
  
  sleep 2
done
```

---

## Example 5: Send Follow-up Messages

```bash
#!/bin/bash
set -e

SESSION_ID="$1"

# Send initial message
julius-cli sessions send "$SESSION_ID" \
  --message "Please also add unit tests for the changes" \
  --format json

# Wait a bit for response
sleep 5

# Check for new activities
julius-cli activities list "$SESSION_ID" \
  --type MESSAGE \
  --format pretty

# Send another follow-up
julius-cli sessions send "$SESSION_ID" \
  --message "Make sure to update the documentation too" \
  --format json
```

---

## Example 6: Batch Session Creation

```bash
#!/bin/bash

# Read tasks from a file (one per line)
# Format: repo|prompt|title

while IFS='|' read -r repo prompt title; do
  echo "Creating session for: $title"
  
  SESSION_ID=$(julius-cli sessions create \
    --repo "$repo" \
    --prompt "$prompt" \
    --title "$title" \
    --auto-pr \
    --format json | jq -r '.id')
  
  echo "Created: $SESSION_ID"
  
  # Save to tracking file
  echo "$SESSION_ID|$repo|$title" >> sessions_tracking.txt
  
  # Small delay to avoid rate limiting
  sleep 1
done < tasks.txt
```

---

## Example 7: Python Integration

```python
#!/usr/bin/env python3
import json
import subprocess
import time

def run_jules_cli(command):
    """Run julius-cli command and return parsed JSON"""
    result = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        raise Exception(f"Command failed: {result.stderr}")
    
    return json.loads(result.stdout) if result.stdout else None

def create_session(repo, prompt, **kwargs):
    """Create a Jules session"""
    cmd = f'julius-cli sessions create --repo "{repo}" --prompt "{prompt}" --format json'
    
    if kwargs.get('title'):
        cmd += f' --title "{kwargs["title"]}"'
    if kwargs.get('auto_pr'):
        cmd += ' --auto-pr'
    if kwargs.get('require_approval'):
        cmd += ' --require-approval'
    
    return run_jules_cli(cmd)

def wait_for_session(session_id, timeout=600):
    """Wait for session to complete"""
    start_time = time.time()
    
    while True:
        if time.time() - start_time > timeout:
            raise TimeoutError(f"Session {session_id} timed out")
        
        session = run_jules_cli(f'julius-cli sessions get {session_id} --format json')
        state = session['state']
        
        print(f"Session {session_id}: {state}")
        
        if state in ['COMPLETED', 'FAILED', 'CANCELLED']:
            return session
        
        time.sleep(5)

# Example usage
if __name__ == '__main__':
    # Create session
    session = create_session(
        repo='myorg/myrepo',
        prompt='Add logging to all API endpoints',
        title='API Logging Enhancement',
        auto_pr=True
    )
    
    session_id = session['id']
    print(f"Created session: {session_id}")
    
    # Wait for completion
    final_session = wait_for_session(session_id)
    
    if final_session['state'] == 'COMPLETED':
        print("✓ Session completed successfully")
        
        # Get PR URL
        if final_session.get('outputs'):
            pr = final_session['outputs'][0].get('pullRequest')
            if pr:
                print(f"PR created: {pr['url']}")
    else:
        print(f"✗ Session failed: {final_session['state']}")
```

---

## Example 8: Node.js Integration

```javascript
#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function julesCommand(cmd) {
  const { stdout, stderr } = await execAsync(`julius-cli ${cmd} --format json`);
  if (stderr) console.error(stderr);
  return JSON.parse(stdout);
}

async function createSession({ repo, prompt, title, autoPr = false }) {
  const flags = [
    `--repo "${repo}"`,
    `--prompt "${prompt}"`,
    title ? `--title "${title}"` : '',
    autoPr ? '--auto-pr' : ''
  ].filter(Boolean).join(' ');
  
  return await julesCommand(`sessions create ${flags}`);
}

async function waitForState(sessionId, targetStates, pollInterval = 5000) {
  while (true) {
    const session = await julesCommand(`sessions get ${sessionId}`);
    
    console.log(`Session ${sessionId}: ${session.state}`);
    
    if (targetStates.includes(session.state)) {
      return session;
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

// Example usage
async function main() {
  try {
    // Create session
    const session = await createSession({
      repo: 'myorg/myrepo',
      prompt: 'Optimize database queries',
      title: 'DB Query Optimization',
      autoPr: true
    });
    
    console.log(`Created session: ${session.id}`);
    
    // Wait for completion
    const final = await waitForState(
      session.id,
      ['COMPLETED', 'FAILED', 'CANCELLED']
    );
    
    if (final.state === 'COMPLETED') {
      console.log('✓ Session completed');
      
      // Get activities
      const activities = await julesCommand(`activities list ${session.id}`);
      console.log(`Total activities: ${activities.activities.length}`);
    } else {
      console.error(`✗ Session ${final.state}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
```

---

## Example 9: Error Handling

```bash
#!/bin/bash

# Robust error handling with exit codes
SESSION_ID="$1"

# Function to check exit codes
check_jules_command() {
  local cmd="$1"
  local output
  
  output=$(eval "$cmd" 2>&1)
  local exit_code=$?
  
  case $exit_code in
    0)
      echo "$output"
      return 0
      ;;
    2)
      echo "ERROR: Authentication failed. Check API key." >&2
      exit 2
      ;;
    3)
      echo "ERROR: API request failed. Check connectivity." >&2
      exit 3
      ;;
    4)
      echo "ERROR: Resource not found." >&2
      exit 4
      ;;
    *)
      echo "ERROR: Unexpected error (code: $exit_code)" >&2
      exit 1
      ;;
  esac
}

# Use the function
SESSION_DATA=$(check_jules_command "julius-cli sessions get $SESSION_ID --format json")
echo "Session retrieved successfully"
```

---

## Example 10: CI/CD Integration

```yaml
# .github/workflows/jules-automation.yml
name: Jules Automated Fix

on:
  issues:
    types: [labeled]

jobs:
  create-jules-session:
    if: github.event.label.name == 'auto-fix'
    runs-on: ubuntu-latest
    
    steps:
      - name: Setup julius-cli
        run: |
          npm install -g julius-cli
          echo "JULES_API_KEY=${{ secrets.JULES_API_KEY }}" >> $GITHUB_ENV
      
      - name: Create Jules session
        id: create_session
        run: |
          SESSION=$(julius-cli sessions create \
            --repo "${{ github.repository }}" \
            --prompt "Fix issue #${{ github.event.issue.number }}: ${{ github.event.issue.title }}" \
            --title "Auto-fix #${{ github.event.issue.number }}" \
            --auto-pr \
            --format json)
          
          SESSION_ID=$(echo "$SESSION" | jq -r '.id')
          echo "session_id=$SESSION_ID" >> $GITHUB_OUTPUT
      
      - name: Wait for completion
        run: |
          SESSION_ID="${{ steps.create_session.outputs.session_id }}"
          
          for i in {1..60}; do
            STATE=$(julius-cli sessions get "$SESSION_ID" --format json | jq -r '.state')
            echo "Attempt $i: $STATE"
            
            if [ "$STATE" = "COMPLETED" ]; then
              echo "Session completed!"
              exit 0
            elif [ "$STATE" = "FAILED" ]; then
              echo "Session failed"
              exit 1
            fi
            
            sleep 10
          done
          
          echo "Timeout waiting for session"
          exit 1
      
      - name: Comment on issue
        if: success()
        uses: actions/github-script@v6
        with:
          script: |
            const sessionId = '${{ steps.create_session.outputs.session_id }}';
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `🤖 Jules has completed the automated fix! Session ID: ${sessionId}`
            });
```

---

## Tips for AI Agents

1. **Always use --format json** for programmatic parsing
2. **Check exit codes** to handle errors appropriately
3. **Poll with delays** to avoid rate limiting (5-10 seconds recommended)
4. **Use jq or equivalent** for JSON parsing in bash scripts
5. **Store session IDs** for tracking and monitoring
6. **Handle timeouts** - sessions can take several minutes
7. **Monitor activities** to understand what Jules is doing
8. **Use --quiet** when you only need exit codes
9. **Set JULES_API_KEY** env var instead of storing in config for CI/CD
10. **Batch operations** with small delays to respect rate limits

---

## Common Patterns

### Pattern: Create and forget
```bash
julius-cli sessions create --repo X --prompt Y --auto-pr --format quiet
# Exit code 0 = success, non-zero = failure
```

### Pattern: Create and wait
```bash
SESSION_ID=$(julius-cli sessions create ... | jq -r '.id')
while [ "$(julius-cli sessions get $SESSION_ID | jq -r '.state')" = "EXECUTING" ]; do
  sleep 5
done
```

### Pattern: Check before creating
```bash
# Check if API key is valid
julius-cli auth status --format json | jq -e '.valid' || exit 2

# Check if repo exists
julius-cli sources get "github/$REPO" --format quiet || exit 4
```

---

_For more information, see the [README.md](README.md) and [API documentation](IMPLEMENTATION.md)._
