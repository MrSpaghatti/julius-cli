import { describe, it, expect } from '@jest/globals';
import {
  formatRelativeTime,
  getStateColor,
  extractRepo,
  getStateIcon,
  FILTER_STATES,
} from '../../../src/tui/utils.js';

describe('TUI Utils', () => {
  let realDateNow: () => number;

  beforeAll(() => {
    realDateNow = Date.now;
    Date.now = () => 2000000000000; // fixed "now"
  });

  afterAll(() => {
    Date.now = realDateNow;
  });

  describe('formatRelativeTime', () => {
    it('returns N/A for undefined', () => {
      expect(formatRelativeTime(undefined)).toBe('N/A');
    });

    it('returns "just now" for future timestamps', () => {
      const future = new Date(Date.now() + 10000).toISOString();
      expect(formatRelativeTime(future)).toBe('just now');
    });

    it('returns seconds for < 60s difference', () => {
      const past = new Date(Date.now() - 30000).toISOString();
      expect(formatRelativeTime(past)).toBe('30s ago');
    });

    it('returns minutes for < 60m difference', () => {
      const past = new Date(Date.now() - 120000).toISOString();
      expect(formatRelativeTime(past)).toBe('2m ago');
    });

    it('returns hours for < 24h difference', () => {
      const past = new Date(Date.now() - 7200000).toISOString();
      expect(formatRelativeTime(past)).toBe('2h ago');
    });

    it('returns days for >= 24h difference', () => {
      const past = new Date(Date.now() - 172800000).toISOString();
      expect(formatRelativeTime(past)).toBe('2d ago');
    });
  });

  describe('getStateColor', () => {
    it('maps COMPLETED to green', () => expect(getStateColor('COMPLETED')).toBe('green'));
    it('maps EXECUTING to yellow', () => expect(getStateColor('EXECUTING')).toBe('yellow'));
    it('maps PLANNING to cyan', () => expect(getStateColor('PLANNING')).toBe('cyan'));
    it('maps AWAITING_APPROVAL to magenta', () => expect(getStateColor('AWAITING_APPROVAL')).toBe('magenta'));
    it('maps PENDING to blue', () => expect(getStateColor('PENDING')).toBe('blue'));
    it('maps FAILED to red', () => expect(getStateColor('FAILED')).toBe('red'));
    it('maps CANCELLED to red', () => expect(getStateColor('CANCELLED')).toBe('red'));
    it('defaults to white for unknown states', () => expect(getStateColor(undefined)).toBe('white'));
  });

  describe('getStateIcon', () => {
    it('maps COMPLETED to checkmark', () => expect(getStateIcon('COMPLETED')).toBe('\u2713'));
    it('maps EXECUTING to circle', () => expect(getStateIcon('EXECUTING')).toBe('\u25CC'));
    it('maps FAILED to X', () => expect(getStateIcon('FAILED')).toBe('\u2717'));
    it('defaults to ? for unknown', () => expect(getStateIcon(undefined)).toBe('?'));
  });

  describe('extractRepo', () => {
    it('returns unknown for undefined sourceContext', () => {
      expect(extractRepo(undefined)).toBe('unknown');
    });

    it('returns unknown for undefined source', () => {
      expect(extractRepo({})).toBe('unknown');
    });

    it('extracts owner/repo from sources/github/owner/repo', () => {
      expect(extractRepo({ source: 'sources/github/owner/repo' })).toBe('owner/repo');
    });

    it('returns raw source when fewer than 3 parts', () => {
      expect(extractRepo({ source: 'custom/repo' })).toBe('custom/repo');
    });
  });

  describe('FILTER_STATES', () => {
    it('has all expected entries', () => {
      expect(FILTER_STATES).toEqual([
        'all', 'PENDING', 'EXECUTING', 'PLANNING',
        'AWAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED',
      ]);
    });
  });
});
