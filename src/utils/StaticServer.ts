/**
 * StaticServer - Cross-platform Node.js HTTP server
 * 
 * Provides a simple, cross-platform alternative to Python's http.server
 * for serving the Spider-Man Villain Timeline visualization.
 * 
 * Features:
 * - No external dependencies (uses Node.js built-in http module)
 * - Works on Windows, macOS, Linux
 * - Serves static files from a specified directory
 * - Graceful shutdown with SIGINT handling
 * - Optional request logging
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

export interface ServerOptions {
  port?: number;
  directory?: string;
  hostname?: string;
  verbose?: boolean;
}

const MIME_TYPES: { [key: string]: string } = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

/**
 * Get MIME type for a file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * StaticServer - Serves static files over HTTP
 */
export class StaticServer {
  private port: number;
  private directory: string;
  private hostname: string;
  private verbose: boolean;
  private server?: http.Server;

  constructor(options: ServerOptions = {}) {
    this.port = options.port || 8000;
    this.directory = options.directory || path.join(process.cwd(), 'public');
    this.hostname = options.hostname || '127.0.0.1';
    this.verbose = options.verbose || false;
  }

  /**
   * Request handler - serves files from the directory
   */
  private requestHandler = (req: http.IncomingMessage, res: http.ServerResponse): void => {
    // Parse the request URL
    const parsedUrl = url.parse(req.url || '/', true);
    let pathname = parsedUrl.pathname || '/';

    if (this.verbose) {
      console.log(`  ${req.method} ${pathname}`);
    }

    // Normalize path and prevent directory traversal attacks
    let filePath = path.normalize(path.join(this.directory, pathname));
    
    // Security check: ensure file is within the served directory
    if (!filePath.startsWith(path.normalize(this.directory))) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    // Check if it's a directory
    fs.stat(filePath, (err, stats) => {
      if (err) {
        // File not found
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      if (stats.isDirectory()) {
        // Try index.html in directory
        filePath = path.join(filePath, 'index.html');
        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
          res.end(data);
        });
      } else {
        // Serve the file
        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
            return;
          }
          res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
          res.end(data);
        });
      }
    });
  };

  /**
   * Start the HTTP server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer(this.requestHandler);

        this.server.listen(this.port, this.hostname, () => {
          console.log(`\n🕷️  Spider-Man Villain Timeline Server`);
          console.log(`📍 URL: http://${this.hostname}:${this.port}`);
          console.log(`📁 Directory: ${this.directory}`);
          console.log(`\nPress Ctrl+C to stop the server.\n`);
          resolve();
        });

        this.server.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the HTTP server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

/**
 * Start a static server with the given options
 */
export async function startStaticServer(options: ServerOptions = {}): Promise<void> {
  const server = new StaticServer(options);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Terminating server...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to start server:', error.message);
    } else {
      console.error('Failed to start server:', error);
    }
    process.exit(1);
  }
}
