import { OutputChannel, StdioOutputChannel, NullOutputChannel } from './channel.js';

let currentChannel: OutputChannel = new StdioOutputChannel();

export const Output = {
  log(message: string): void {
    currentChannel.log(message);
  },

  error(message: string): void {
    currentChannel.error(message);
  },

  warn(message: string): void {
    currentChannel.warn(message);
  },

  info(message: string): void {
    currentChannel.info(message);
  },

  write(data: Uint8Array | string): void {
    currentChannel.write(data);
  },

  isInteractive(): boolean {
    return currentChannel.isInteractive();
  },

  getChannel(): OutputChannel {
    return currentChannel;
  },

  setChannel(channel: OutputChannel): void {
    currentChannel = channel;
  },

  /** Convenience: swap to quiet mode (info/warn suppressed, log/error still flow). */
  setQuiet(quiet: boolean): void {
    if (quiet) {
      currentChannel = new NullOutputChannel();
    } else {
      currentChannel = new StdioOutputChannel();
    }
  },
};
