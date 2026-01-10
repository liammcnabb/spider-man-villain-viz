/**
 * Publisher - Handles publishing workflow
 * 
 * Responsibilities:
 * - Copy data files from data/ to public/data/
 * - Support copying specific files or all files
 * - Support CLI arguments: --src, --dest
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PublishOptions {
  srcDir?: string;
  destDir?: string;
  pattern?: string; // Glob pattern for files to copy
}

export class Publisher {
  private defaultSrcDir: string;
  private defaultDestDir: string;

  constructor() {
    this.defaultSrcDir = path.join(process.cwd(), 'data');
    this.defaultDestDir = path.join(process.cwd(), 'public', 'data');
  }

  /**
   * Ensures destination directory exists
   */
  private ensureDestDir(destDir: string): void {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
      console.log(`Created destination directory: ${destDir}`);
    }
  }

  /**
   * Copy a single file
   */
  private copyFile(src: string, dest: string): void {
    try {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ ${path.basename(src)}`);
    } catch (error) {
      console.error(`  ✗ Failed to copy ${path.basename(src)}:`, error);
      throw error;
    }
  }

  /**
   * Get list of files to publish
   */
  private getFilesToPublish(srcDir: string, pattern: string): string[] {
    const files = fs.readdirSync(srcDir)
      .filter(f => {
        // Match pattern (default: *.json)
        if (pattern === '*.json') {
          return f.endsWith('.json');
        }
        // Custom pattern matching can be added here
        return f.match(new RegExp(pattern.replace('*', '.*')));
      })
      .map(f => path.join(srcDir, f));
    
    return files;
  }

  /**
   * Publish data files to public directory
   * 
   * @param options - Publishing configuration options
   */
  async run(options: PublishOptions = {}): Promise<void> {
    const srcDir = options.srcDir || this.defaultSrcDir;
    const destDir = options.destDir || this.defaultDestDir;
    const pattern = options.pattern || '*.json';

    // Ensure source directory exists
    if (!fs.existsSync(srcDir)) {
      throw new Error(`Source directory not found: ${srcDir}`);
    }

    // Ensure destination directory exists
    this.ensureDestDir(destDir);

    console.log(`📤 Publishing data files...`);
    console.log(`   Source: ${srcDir}`);
    console.log(`   Destination: ${destDir}`);

    // Get files to copy
    const files = this.getFilesToPublish(srcDir, pattern);

    if (files.length === 0) {
      console.log(`⚠️  No files found matching pattern: ${pattern}`);
      return;
    }

    console.log(`   Copying ${files.length} file(s):`);

    // Copy each file
    for (const srcFile of files) {
      const filename = path.basename(srcFile);
      const destFile = path.join(destDir, filename);
      this.copyFile(srcFile, destFile);
    }

    console.log(`✓ Published ${files.length} file(s) to ${destDir}`);
  }

  /**
   * Publish specific files
   */
  async publishFiles(filenames: string[], srcDir?: string, destDir?: string): Promise<void> {
    const src = srcDir || this.defaultSrcDir;
    const dest = destDir || this.defaultDestDir;

    this.ensureDestDir(dest);

    console.log(`📤 Publishing ${filenames.length} specific file(s)...`);

    for (const filename of filenames) {
      const srcFile = path.join(src, filename);
      const destFile = path.join(dest, filename);

      if (!fs.existsSync(srcFile)) {
        console.error(`  ✗ File not found: ${filename}`);
        continue;
      }

      this.copyFile(srcFile, destFile);
    }

    console.log(`✓ Published to ${dest}`);
  }
}
