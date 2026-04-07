import Conf from 'conf';
import type { Template } from '../api/types.js';

interface TemplatesStore {
  templates: Record<string, Template>;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'bugfix',
    name: 'Bug Fix',
    description: 'Fix a specific bug in the repository',
    prompt: 'Fix the following bug in the repository: {{bug_description}}. The affected area is likely around {{affected_area}}.',
    variables: [
      {
        name: 'bug_description',
        description: 'Detailed description of the bug',
        required: true,
      },
      {
        name: 'affected_area',
        description: 'Files or modules likely affected by the bug',
        required: false,
      },
    ],
  },
  {
    id: 'add-tests',
    name: 'Add Unit Tests',
    description: 'Add unit tests for a specific file or module',
    prompt: 'Add comprehensive unit tests for the code in {{file_path}}. Use the existing testing framework and follow current patterns.',
    variables: [
      {
        name: 'file_path',
        description: 'Path to the file that needs tests',
        required: true,
      },
    ],
  },
  {
    id: 'refactor',
    name: 'Refactor Code',
    description: 'Refactor code to improve quality or performance',
    prompt: 'Refactor the following code in {{file_path}} to improve {{improvement_goal}}. Make sure to maintain the same external behavior.',
    variables: [
      {
        name: 'file_path',
        description: 'Path to the file that needs refactoring',
        required: true,
      },
      {
        name: 'improvement_goal',
        description: 'What should be improved (e.g., readability, performance)',
        required: true,
      },
    ],
  },
];

class TemplatesManager {
  private conf: Conf<TemplatesStore>;

  constructor() {
    this.conf = new Conf<TemplatesStore>({
      projectName: 'jules-cli',
      configName: 'templates',
      defaults: {
        templates: Object.fromEntries(DEFAULT_TEMPLATES.map((t) => [t.id, t])),
      },
    });
  }

  get(id: string): Template | undefined {
    return this.conf.get(`templates.${id}`) as Template | undefined;
  }

  getAll(): Template[] {
    const templates = this.conf.get('templates') || {};
    return Object.values(templates);
  }

  set(template: Template): void {
    this.conf.set(`templates.${template.id}`, template);
  }

  delete(id: string): void {
    this.conf.delete(`templates.${id}` as any);
  }

  clear(): void {
    this.conf.set('templates', {});
  }

  reset(): void {
    this.conf.set('templates', Object.fromEntries(DEFAULT_TEMPLATES.map((t) => [t.id, t])));
  }
}

export const templates = new TemplatesManager();
