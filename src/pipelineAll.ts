import { spawn } from 'child_process';

// Use platform-correct npm executable and avoid shell so arguments stay intact
const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const SERIES = [
  { name: 'Amazing Spider-Man Vol 1', issues: '1-441' },
  { name: 'Amazing Spider-Man Annual Vol 1', issues: '1-28' },
  { name: 'Untold Tales of Spider-Man Vol 1', issues: '1-25' },
];

async function runCommand(
  command: string,
  args: string[]
): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
    });

    proc.on('close', (code) => {
      resolve(code || 0);
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function runFullPipelineForAll() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  RUNNING FULL PIPELINE FOR ALL SERIES     ║');
  console.log('╚════════════════════════════════════════════╝\n');

  for (let i = 0; i < SERIES.length; i++) {
    const { name, issues } = SERIES[i];
    const isLast = i === SERIES.length - 1;

    console.log(`\n${'='.repeat(50)}`);
    console.log(
      `SERIES ${i + 1}/${SERIES.length}: ${name} (Issues ${issues})`
    );
    console.log(`${'='.repeat(50)}\n`);

    try {
      const exitCode = await runCommand(NPM_CMD, [
        'run',
        'pipeline',
        '--',
        '--series',
        name,
        '--issues',
        issues,
      ]);

      if (exitCode !== 0) {
        console.error(
          `\n❌ Pipeline failed for ${name} with exit code ${exitCode}`
        );
        process.exit(1);
      }

      console.log(`✅ Completed: ${name}\n`);
    } catch (error) {
      console.error(`\n❌ Error running pipeline for ${name}:`, error);
      process.exit(1);
    }

    if (!isLast) {
      console.log('Waiting before next series...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  ✅ FULL PIPELINE COMPLETE!               ║');
  console.log('║  All series have been scraped, processed,  ║');
  console.log('║  merged, and published successfully!       ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`${'='.repeat(50)}\n`);
}

runFullPipelineForAll().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
