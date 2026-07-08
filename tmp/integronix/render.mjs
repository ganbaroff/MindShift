// render.mjs — Playwright-based frame capturing tool for Integronix B2B showcase videos.
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const briefPath = process.argv[2] || 'briefs/showcase-v1.json';
const brief = JSON.parse(readFileSync(briefPath, 'utf8'));

const runId = brief.brief_id || 'test';
const outDir = `runs/${runId}`;
mkdirSync(outDir, { recursive: true });

async function run() {
  console.log(`Starting Integronix frame render for brief: ${runId}`);
  
  if (process.env.PULT_MOCK === '1') {
    console.log('[render:mock] Mocking frame output. Creating dummy MP4 video...');
    const dummyMp4 = `${outDir}/integronix-${runId}-showcase.mp4`;
    execFileSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=0x112239:s=1080x1920:d=40',
      '-pix_fmt', 'yuv420p', dummyMp4
    ], { stdio: 'ignore' });
    console.log(`Mock video created: ${dummyMp4}`);
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const htmlPath = join(process.cwd(), 'integronix_showcase.html');
  await page.goto(`file://${htmlPath}`);
  
  // Load data
  await page.evaluate((d) => window.loadData(d), brief);
  
  const totalFrames = 1200; // 40 seconds @ 30fps
  console.log(`Rendering ${totalFrames} frames...`);
  
  const frameDir = `${outDir}/frames`;
  mkdirSync(frameDir, { recursive: true });
  
  for (let i = 0; i < totalFrames; i++) {
    await page.evaluate((idx) => window.setFrame(idx), i);
    const framePath = `${frameDir}/f_${String(i).padStart(4, '0')}.png`;
    
    await page.screenshot({ path: framePath });
    if (i % 200 === 0) {
      console.log(`Rendered frame ${i}/${totalFrames}...`);
    }
  }
  
  await browser.close();
  console.log('Frame render completed successfully.');
  
  // Compile video using ffmpeg
  const outputMp4 = `${outDir}/integronix-${runId}-showcase.mp4`;
  console.log(`Compiling frames into video: ${outputMp4}`);
  
  execFileSync('ffmpeg', [
    '-y', '-r', '30', '-i', `${frameDir}/f_%04d.png`,
    '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '18', outputMp4
  ], { stdio: 'ignore' });
  
  console.log(`Video compiled successfully: ${outputMp4}`);
}

run().catch(e => {
  console.error('Fatal render crash:', e);
  process.exit(1);
});
