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
   * Validate that source directory and files exist
   */
  private validateSources(srcDir: string, pattern: string): { valid: boolean; files: string[]; errors: string[] } {
    const errors: string[] = [];

    // Check source directory
    if (!fs.existsSync(srcDir)) {
      errors.push(`Source directory not found: ${srcDir}`);
      return { valid: false, files: [], errors };
    }

    // Get files
    const files = this.getFilesToPublish(srcDir, pattern);

    if (files.length === 0) {
      errors.push(`No files found matching pattern: ${pattern}`);
    }

    return {
      valid: errors.length === 0,
      files,
      errors
    };
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

    console.log(`\n📤 Publishing data files...`);
    console.log(`   Source: ${srcDir}`);
    console.log(`   Destination: ${destDir}`);
    console.log(`   Pattern: ${pattern}`);

    // Validate sources
    const validation = this.validateSources(srcDir, pattern);

    if (!validation.valid) {
      console.error(`\n❌ Validation failed:`);
      validation.errors.forEach(err => console.error(`   • ${err}`));
      throw new Error('Publishing validation failed');
    }

    // Ensure destination directory exists
    this.ensureDestDir(destDir);

    console.log(`\n   Files to publish (${validation.files.length}):`);

    // Copy each file with size info
    let totalSize = 0;
    for (const srcFile of validation.files) {
      const filename = path.basename(srcFile);
      const destFile = path.join(destDir, filename);
      const stats = fs.statSync(srcFile);
      const sizeKB = (stats.size / 1024).toFixed(1);
      totalSize += stats.size;
      
      this.copyFile(srcFile, destFile);
      console.log(`    (${sizeKB} KB)`);
    }

    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    console.log(`\n✓ Successfully published ${validation.files.length} file(s)`);
    console.log(`  Total size: ${totalSizeMB} MB`);
    console.log(`  Destination: ${destDir}\n`);
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
