import { Command } from 'commander';
import blessed from 'blessed';
import contrib from 'blessed-contrib';
import chalk from 'chalk';
import { cli } from '../cli.js';
import { getClient } from '../utils/client.js';
import { SessionsAPI } from '../api/sessions.js';
import { ActivitiesAPI } from '../api/activities.js';
import { inferRepo } from '../utils/git.js';
import type { Session, Activity } from '../api/types.js';

export function createTuiCommand(): Command {
  return new Command('tui')
    .alias('dash')
    .description('Start the TUI dashboard')
    .option('-r, --repo <repo>', 'Default repository for this session')
    .action(async (options: { repo?: string }) => {
      let currentRepo = options.repo;
      if (!currentRepo) {
        try {
          const inferred = inferRepo();
          currentRepo = `${inferred.provider}/${inferred.repo}`;
        } catch (e) {
          currentRepo = 'None';
        }
      }

      // Initialize APIs
      let client;
      let sessionsApi: SessionsAPI;
      let activitiesApi: ActivitiesAPI;
      let isConnected = false;

      try {
        client = await getClient();
        sessionsApi = new SessionsAPI(client);
        activitiesApi = new ActivitiesAPI(client);
        isConnected = true;
      } catch (e) {
        isConnected = false;
      }

      // Blessed screen
      const screen = blessed.screen({
        smartCSR: true,
        title: 'julius-cli dashboard',
        fullUnicode: true,
      });

      // Grid layout
      const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

      // --- Components ---

      // Header
      const headerBox = grid.set(0, 0, 1, 12, blessed.box, {
        content: '',
        style: {
          fg: 'white',
          bg: 'black',
        },
        tags: true,
      });

      // Sessions List
      const sessionsList = grid.set(1, 0, 10, 4, blessed.list, {
        label: ' Sessions ',
        keys: true,
        vi: true,
        mouse: true,
        style: {
          item: { fg: 'white' },
          selected: { bg: 'blue', fg: 'white', bold: true },
          border: { fg: 'gray' },
          focus: { border: { fg: 'green' } },
        },
        border: { type: 'line' },
        tags: true,
        scrollable: true,
        scrollbar: { ch: ' ', track: { bg: 'cyan' }, style: { inverse: true } },
      });

      // Activities Log
      const activitiesLog = grid.set(1, 4, 10, 8, blessed.log, {
        label: ' Activities ',
        keys: true,
        vi: true,
        mouse: true,
        style: {
          fg: 'white',
          border: { fg: 'gray' },
          focus: { border: { fg: 'green' } },
        },
        border: { type: 'line' },
        tags: true,
        scrollable: true,
        scrollbar: { ch: ' ', track: { bg: 'cyan' }, style: { inverse: true } },
      });

      // Command Input Bar
      const commandInput = grid.set(11, 0, 1, 12, blessed.textbox, {
        keys: true,
        mouse: true,
        inputOnFocus: true,
        style: {
          fg: 'white',
          bg: 'black',
          focus: { bg: 'blue' },
        },
      });
      // prefix text for commandInput
      const promptText = `julius-cli [${currentRepo}] > `;
      commandInput.setValue(promptText);


      let sessions: Session[] = [];
      let selectedSessionId: string | null = null;
      let lastActivityId: string | null = null;
      let commandHistory: string[] = [];
      let historyIndex = -1;

      // Update header
      const updateHeader = () => {
        const version = 'v0.7.1'; // TODO: Get from package.json dynamically?
        const statusDot = isConnected ? '{green-fg}●{/green-fg} Connected' : '{red-fg}●{/red-fg} Disconnected';
        headerBox.setContent(` {bold}julius-cli{/bold} ${version} | Repo: ${currentRepo} | Status: ${statusDot}`);
        screen.render();
      };

      updateHeader();

      // Color mapping for session states
      const stateColors: Record<string, string> = {
        'COMPLETED': 'green',
        'EXECUTING': 'yellow',
        'FAILED': 'red',
        'CANCELLED': 'gray',
        'PENDING': 'blue',
      };

      const formatSessionItem = (session: Session) => {
        const color = stateColors[session.state || 'PENDING'] || 'white';
        return `{${color}-fg}●{/} ${session.id.substring(0, 8)}: ${session.title || session.prompt.substring(0, 20)}`;
      };

      const pollSessions = async () => {
        if (!sessionsApi) return;
        try {
          const res = await sessionsApi.list(30);
          sessions = res.items || [];

          const items = sessions.map(formatSessionItem);
          const oldIndex = sessionsList.selected;
          sessionsList.setItems(items as any);
          if (oldIndex < items.length) {
              sessionsList.select(oldIndex);
          }

          if (!selectedSessionId && sessions.length > 0) {
            selectedSessionId = sessions[0].id;
          }

          if (!isConnected) {
            isConnected = true;
            updateHeader();
          }
          screen.render();
        } catch (e) {
          isConnected = false;
          updateHeader();
          activitiesLog.log(`{red-fg}Error fetching sessions: ${(e as Error).message}{/}`);
        }
      };

      const pollActivities = async () => {
        if (!activitiesApi || !selectedSessionId) return;
        try {
          const res = await activitiesApi.list(selectedSessionId, 50);
          const activities = res.items || [];

          // Clear log if we switched session
          if (activitiesLog.getLabel() !== ` Activities for ${selectedSessionId.substring(0,8)} `) {
            activitiesLog.setContent('');
            activitiesLog.setLabel(` Activities for ${selectedSessionId.substring(0,8)} `);
            lastActivityId = null;
          }

          activitiesLog.setContent('');

          for (let act of activities.reverse()) {
              let color = 'white';
              if (act.type === 'ERROR') color = 'red';
              if (act.type === 'PLAN') color = 'blue';
              if (act.type === 'PROGRESS') color = 'yellow';

              const authorStr = act.author === 'USER' ? '{green-fg}USER{/}' : '{magenta-fg}AGENT{/}';
              activitiesLog.log(`[${new Date(act.createTime).toLocaleTimeString()}] ${authorStr} [${act.type}] {${color}-fg}${act.content}{/}`);
          }

          if (!isConnected) {
            isConnected = true;
            updateHeader();
          }
          screen.render();
        } catch (e) {
          isConnected = false;
          updateHeader();
          activitiesLog.log(`{red-fg}Error fetching activities: ${(e as Error).message}{/}`);
        }
      };

      // Intervals
      const sessionInterval = setInterval(pollSessions, 5000);
      const activityInterval = setInterval(pollActivities, 2000);

      pollSessions();

      // Events
      sessionsList.on('select', (item: any, index: number) => {
        if (sessions[index]) {
            selectedSessionId = sessions[index].id;
            pollActivities(); // immediate poll

            // Show modal with details
            const modal = blessed.box({
                parent: screen,
                top: 'center',
                left: 'center',
                width: '60%',
                height: '60%',
                border: 'line',
                style: { border: { fg: 'yellow' } },
                tags: true,
                content: `{bold}Session Details:{/}\n\nID: ${sessions[index].id}\nTitle: ${sessions[index].title}\nState: ${sessions[index].state}\nPrompt: ${sessions[index].prompt}`,
                keys: true,
                vi: true,
                scrollable: true,
            });
            modal.focus();
            screen.render();

            modal.key(['escape', 'q', 'enter'], () => {
                modal.destroy();
                sessionsList.focus();
                screen.render();
            });
        }
      });

      let currentPaneIndex = 0;
      const panes = [sessionsList, activitiesLog, commandInput];

      screen.key(['tab'], () => {
        currentPaneIndex = (currentPaneIndex + 1) % panes.length;
        panes[currentPaneIndex].focus();
        if (panes[currentPaneIndex] === commandInput) {
            commandInput.readInput();
        }
      });

      screen.key(['r'], () => {
         pollSessions();
         pollActivities();
      });

      screen.key(['c'], () => {
         commandInput.setValue(promptText + 'sessions create -p "');
         commandInput.focus();
         screen.render();
      });

      screen.key(['/'], () => {
         // simple search simulation by focusing command input for a search command, though fully simulating search takes more logic.
         commandInput.setValue(promptText + 'sessions list --filter "');
         commandInput.focus();
         screen.render();
      });

      screen.key(['q', 'C-c'], () => {
        clearInterval(sessionInterval);
        clearInterval(activityInterval);
        return process.exit(0);
      });

      // Command Input logic
      commandInput.key(['C-c'], () => {
          commandInput.setValue(promptText);
          screen.render();
      });

      commandInput.key(['up', 'down'], (ch: any, key: any) => {
         if (commandHistory.length === 0) return;
         if (key.name === 'up') {
             historyIndex = Math.max(0, historyIndex - 1);
         } else if (key.name === 'down') {
             historyIndex = Math.min(commandHistory.length, historyIndex + 1);
         }

         if (historyIndex === commandHistory.length) {
             commandInput.setValue(promptText);
         } else {
             commandInput.setValue(promptText + commandHistory[historyIndex]);
         }
         screen.render();
      });

      commandInput.on('submit', async (value: string) => {
          const cmdStr = value.substring(promptText.length).trim();
          commandInput.setValue(promptText);

          if (!cmdStr) {
              commandInput.focus();
              commandInput.readInput();
              return;
          }

          commandHistory.push(cmdStr);
          historyIndex = commandHistory.length;

          activitiesLog.log(`> Executing: ${cmdStr}`);
          screen.render();

          try {
             const parts = cmdStr.split(' ');
             const oldLog = console.log;
             const oldError = console.error;
             let outputStr = '';
             console.log = (...args: any[]) => { outputStr += args.join(' ') + '\n'; };
             console.error = (...args: any[]) => { outputStr += args.join(' ') + '\n'; };

             await cli.parseAsync(parts, { from: 'user' });

             console.log = oldLog;
             console.error = oldError;

             activitiesLog.log(outputStr);
          } catch (e) {
             activitiesLog.log(`{red-fg}Command error: ${(e as Error).message}{/}`);
          }

          commandInput.focus();
          commandInput.readInput();
          screen.render();
      });

      sessionsList.focus();
      screen.render();
    });
}
