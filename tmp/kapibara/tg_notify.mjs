// tg_notify.mjs — helper script to send gate notifications (text/audio) to the CEO.
import { readFileSync, existsSync } from 'node:fs';
import { requireEnv } from './env.mjs';

const tok = requireEnv('TELEGRAM_CREATORBOT_TOKEN');
const CEO_CHAT_ID = '5150355926';

const text = process.argv[2];
const audioPath = process.argv[3];

async function run() {
  if (!text) {
    console.error('Usage: node tg_notify.mjs <text> [audioPath]');
    process.exit(1);
  }

  if (audioPath && existsSync(audioPath)) {
    console.log(`Uploading audio sample: ${audioPath}...`);
    const fileBytes = readFileSync(audioPath);
    const fd = new FormData();
    fd.append('chat_id', CEO_CHAT_ID);
    fd.append('caption', text);
    fd.append('audio', new Blob([fileBytes], { type: 'audio/mpeg' }), audioPath.split(/[\\/]/).pop());

    const r = await fetch(`https://api.telegram.org/bot${tok}/sendAudio`, {
      method: 'POST',
      body: fd
    });
    const j = await r.json();
    if (j.ok === true) {
      console.log('SUCCESS: Audio gate notification sent.');
    } else {
      console.error('FAILED to send audio notification:', JSON.stringify(j));
      process.exit(1);
    }
  } else {
    console.log('Sending text gate notification...');
    const r = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CEO_CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });
    const j = await r.json();
    if (j.ok === true) {
      console.log('SUCCESS: Text gate notification sent.');
    } else {
      console.error('FAILED to send text notification:', JSON.stringify(j));
      process.exit(1);
    }
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
