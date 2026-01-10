/**
 * Enhanced CLI Parser for Spider-Man Villain Timeline
 * 
 * Supports multiple commands:
 * - scrape: Scrape raw data from Marvel Fandom
 * - process: Process raw data into villain datasets
 * - merge: Merge series-specific datasets into combined output
 * - publish: Copy data files to public directory
 * - serve: Start HTTP server for visualization
 * - help: Show help information
 */

import { parseIssueSpec } from './cliParser';

export interface BaseOptions {
  command: 'scrape' | 'process' | 'merge' | 'publish' | 'serve' | 'help';
}

export interface ScrapeCommandOptions extends BaseOptions {
  command: 'scrape';
  series: string;
  issues: number[];
  out?: string;
  allSeries?: boolean;
}

export interface ProcessCommandOptions extends BaseOptions {
  command: 'process';
  series?: string;
  in?: string;
  out?: string;
  validate?: boolean;
}

export interface MergeCommandOptions extends BaseOptions {
  command: 'merge';
  inputs?: string; // Glob pattern
  out?: string;
}

export interface PublishCommandOptions extends BaseOptions {
  command: 'publish';
  src?: string;
  dest?: string;
}

export interface ServeCommandOptions extends BaseOptions {
  command: 'serve';
  port?: number;
}

export interface HelpCommandOptions extends BaseOptions {
  command: 'help';
}

export type CommandOptions =
  | ScrapeCommandOptions
  | ProcessCommandOptions
  | MergeCommandOptions
  | PublishCommandOptions
  | ServeCommandOptions
  | HelpCommandOptions;

/**
 * Parses command-line arguments for all commands
 * 
 * @param args - Command-line arguments (process.argv)
 * @returns Parsed command options
 */
export function parseCommandArgs(args: string[]): CommandOptions {
  // Get command (first argument after script name)
  const command = args[2] || 'help';

  switch (command) {
    case 'scrape':
      return parseScrapeCommand(args);
    case 'process':
      return parseProcessCommand(args);
    case 'merge':
      return parseMergeCommand(args);
    case 'publish':
      return parsePublishCommand(args);
    case 'serve':
      return parseServeCommand(args);
    case 'help':
      return { command: 'help' };
    default:
      throw new Error(`Unknown command: ${command}. Run with 'help' for usage information.`);
  }
}

/**
 * Parse scrape command arguments
 * Usage: scrape --series "Amazing Spider-Man Vol 1" --issues 1-20 [--out path]
 */
function parseScrapeCommand(args: string[]): ScrapeCommandOptions {
  const options: ScrapeCommandOptions = {
    command: 'scrape',
    series: 'Amazing Spider-Man Vol 1',
    issues: []
  };

  for (let i = 3; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--series' || arg === '-s' || arg === '--volume' || arg === '-v') {
      if (i + 1 < args.length) {
        options.series = args[++i];
      } else {
        throw new Error('--series flag requires an argument');
      }
    } else if (arg === '--issues' || arg === '-i') {
      if (i + 1 < args.length) {
        options.issues = parseIssueSpec(args[++i]);
      } else {
        throw new Error('--issues flag requires an argument');
      }
    } else if (arg === '--out' || arg === '-o') {
      if (i + 1 < args.length) {
        options.out = args[++i];
      } else {
        throw new Error('--out flag requires an argument');
      }
    } else if (arg === '--all-series' || arg === '-a') {
      options.allSeries = true;
    }
  }

  return options;
}

/**
 * Parse process command arguments
 * Usage: process --series "Amazing Spider-Man Vol 1" [--in path] [--out path] [--validate]
 */
function parseProcessCommand(args: string[]): ProcessCommandOptions {
  const options: ProcessCommandOptions = {
    command: 'process',
    validate: false
  };

  for (let i = 3; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--series' || arg === '-s') {
      if (i + 1 < args.length) {
        options.series = args[++i];
      } else {
        throw new Error('--series flag requires an argument');
      }
    } else if (arg === '--in') {
      if (i + 1 < args.length) {
        options.in = args[++i];
      } else {
        throw new Error('--in flag requires an argument');
      }
    } else if (arg === '--out' || arg === '-o') {
      if (i + 1 < args.length) {
        options.out = args[++i];
      } else {
        throw new Error('--out flag requires an argument');
      }
    } else if (arg === '--validate') {
      options.validate = true;
    }
  }

  return options;
}

/**
 * Parse merge command arguments
 * Usage: merge [--inputs "villains.*.json"] [--out path]
 */
function parseMergeCommand(args: string[]): MergeCommandOptions {
  const options: MergeCommandOptions = {
    command: 'merge'
  };

  for (let i = 3; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--inputs' || arg === '-i') {
      if (i + 1 < args.length) {
        options.inputs = args[++i];
      } else {
        throw new Error('--inputs flag requires an argument');
      }
    } else if (arg === '--out' || arg === '-o') {
      if (i + 1 < args.length) {
        options.out = args[++i];
      } else {
        throw new Error('--out flag requires an argument');
      }
    }
  }

  return options;
}

/**
 * Parse publish command arguments
 * Usage: publish [--src path] [--dest path]
 */
function parsePublishCommand(args: string[]): PublishCommandOptions {
  const options: PublishCommandOptions = {
    command: 'publish'
  };

  for (let i = 3; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--src' || arg === '-s') {
      if (i + 1 < args.length) {
        options.src = args[++i];
      } else {
        throw new Error('--src flag requires an argument');
      }
    } else if (arg === '--dest' || arg === '-d') {
      if (i + 1 < args.length) {
        options.dest = args[++i];
      } else {
        throw new Error('--dest flag requires an argument');
      }
    }
  }

  return options;
}

/**
 * Parse serve command arguments
 * Usage: serve [--port 8000]
 */
function parseServeCommand(args: string[]): ServeCommandOptions {
  const options: ServeCommandOptions = {
    command: 'serve',
    port: 8000
  };

  for (let i = 3; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' || arg === '-p') {
      if (i + 1 < args.length) {
        const port = parseInt(args[++i], 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error('--port must be a number between 1 and 65535');
        }
        options.port = port;
      } else {
        throw new Error('--port flag requires an argument');
      }
    }
  }

  return options;
}
