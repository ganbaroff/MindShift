// conveyor.mjs — Integronix B2B Showcase video generation conveyor script.
import { readFileSync, writeFileSync, mkdirSync, existsSync, write } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Setup environment and paths
const briefPath = process.argv[2] || 'briefs/showcase-v1.json';
if (!existsSync(briefPath)) {
  console.error(`Error: brief file not found: ${briefPath}`);
  process.exit(1);
}

const brief = JSON.parse(readFileSync(briefPath, 'utf8'));
const runId = brief.brief_id || 'test';
const outDir = `runs/${runId}`;
mkdirSync(outDir, { recursive: true });

async function run() {
  console.log(`=== INTEGRONIX CONVEYOR RUNNING [${runId}] ===`);

  // Step 1: Verbal Identity Compliance Check (Hard Rules)
  console.log('Running Verbal Identity Gate...');
  const textContent = JSON.stringify(brief).toLowerCase();
  
  const forbiddenWords = ['security', 'monitoring', 'mühafizə', 'охрана', 'sintegra', 'megatransko'];
  for (const word of forbiddenWords) {
    if (textContent.includes(word)) {
      throw new Error(`[GATE verbal] Forbidden word "${word}" found in brief. Integronix rules strictly prohibit this vocabulary to avoid licensing/credit conflicts!`);
    }
  }
  console.log('Verbal Identity Compliance: PASS ✓');

  // Step 2: Voice Generation (TTS)
  console.log('Synthesizing voiceovers...');
  const voiceFiles = [];
  
  for (let i = 0; i < brief.beats.length; i++) {
    const beat = brief.beats[i];
    const wavPath = `${outDir}/vo_${i}.wav`;
    
    if (process.env.PULT_MOCK === '1') {
      console.log(`[conveyor:mock] Mocking audio for beat ${i}...`);
      if (!existsSync(wavPath)) {
        execFileSync('ffmpeg', [
          '-y', '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=1',
          '-ar', '16000', '-ac', '1', wavPath
        ], { stdio: 'ignore' });
      }
    } else {
      console.log(`Synthesizing beat ${i} via Gemini TTS...`);
      // Import the active TTS library from Kapibara
      const { synthPcm, pcmToWav } = await import('../kapibara/gemini_tts.mjs');
      const text = beat.voiceover || beat.body;
      const { pcm: pcmBytes } = await synthPcm(text, brief.voice, brief.style);
      const wavBytes = pcmToWav(pcmBytes);
      writeFileSync(wavPath, Buffer.from(wavBytes));
    }
    voiceFiles.push(wavPath);
  }

  // Combine voiceovers into a single soundtrack
  const voiceMp3 = `${outDir}/voice.mp3`;
  console.log(`Concatenating voice files into ${voiceMp3}...`);
  
  // Build ffmpeg filter to concat audio files
  const ffmpegArgs = [];
  for (const vf of voiceFiles) {
    ffmpegArgs.push('-i', vf);
  }
  // Filter description for concat
  const filter = voiceFiles.map((_, idx) => `[${idx}:a]`).join('') + `concat=n=${voiceFiles.length}:v=0:a=1[a]`;
  ffmpegArgs.push('-filter_complex', filter, '-map', '[a]', '-y', voiceMp3);
  
  execFileSync('ffmpeg', ffmpegArgs, { stdio: 'ignore' });
  console.log('Soundtrack created successfully ✓');

  // Step 3: Run Playwright Frame Renderer & Video compiler
  console.log('Running frame rendering pipeline...');
  execFileSync('node', ['render.mjs', briefPath], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Step 4: Assemble Final Video
  const rawVideo = `${outDir}/integronix-${runId}-showcase.mp4`;
  const finalVideo = `${outDir}/integronix-${runId}-combined.mp4`;
  console.log(`Assembling final video with soundtrack: ${finalVideo}...`);
  
  execFileSync('ffmpeg', [
    '-y', '-i', rawVideo, '-i', voiceMp3,
    '-c:v', 'copy', '-c:a', 'aac', '-shortest', finalVideo
  ], { stdio: 'ignore' });
  
  console.log(`\n=== INTEGRONIX CONVEYOR SUCCESS ===`);
  console.log(`Output: ${finalVideo} ✓`);
}

run().catch(e => {
  console.error(`FATAL Integronix conveyor crash: ${e.message}`);
  process.exit(1);
});
