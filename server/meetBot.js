// Google Meet bot using Puppeteer + puppeteer-stream.
//
// Joins a meeting as a named guest, records the tab's audio to a .webm file,
// and resolves when the call ends (or a max duration is hit). Optionally
// transcribes the audio if a transcription hook is configured.
//
// NOTE: Google Meet works well for guest bots. Zoom/Teams push users toward
// their native apps and actively block headless guests — supporting them
// reliably is a much larger effort and is intentionally left as a TODO.

import { launch, getStream, wss } from 'puppeteer-stream';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const RECORDINGS_DIR = process.env.RECORDINGS_DIR || './recordings';
const MAX_DURATION_MS = Number(process.env.MAX_DURATION_MS || 90 * 60 * 1000); // 90 min cap

export async function runMeetBot({ meetingUrl, botName, onStatus, onDone, onError }) {
  await mkdir(RECORDINGS_DIR, { recursive: true });
  let browser;
  try {
    onStatus?.('launching');
    browser = await launch({
      headless: 'new',
      executablePath: process.env.CHROME_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream', // auto-allow mic/cam prompts
        '--disable-notifications',
        '--window-size=1280,720',
      ],
    });

    const page = await browser.newPage();
    await page.goto(meetingUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    onStatus?.('joining');

    // Enter the guest name. Meet's DOM changes often, so we try a few selectors.
    try {
      await page.waitForSelector('input[type="text"], input[aria-label*="name" i]', { timeout: 15000 });
      const nameInput = await page.$('input[type="text"], input[aria-label*="name" i]');
      if (nameInput) await nameInput.type(botName);
    } catch { /* already signed in or different layout */ }

    // Click "Ask to join" / "Join now".
    const joinClicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /join now|ask to join|join/i.test(b.textContent || ''));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!joinClicked) throw new Error('Could not find a join button — meeting may require sign-in or has not started.');

    onStatus?.('recording');

    // Capture the tab's audio stream.
    const stream = await getStream(page, { audio: true, video: false });
    const filePath = join(RECORDINGS_DIR, `meet-${Date.now()}.webm`);
    const file = createWriteStream(filePath);
    stream.pipe(file);

    // Wait until the call ends (we get removed / "left the meeting") or cap hit.
    const ended = await waitForCallEnd(page, MAX_DURATION_MS);

    await stream.destroy();
    file.close();
    onStatus?.('processing');

    // Hand off for transcription. Plug in whisper.cpp or an API here.
    const transcript = await transcribeIfConfigured(filePath);

    await onDone?.({ audioPath: filePath, transcript });
    return { audioPath: filePath, transcript, ended };
  } catch (err) {
    onError?.(err);
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      (await wss)?.close?.();
    }
  }
}

// Resolve when Meet shows we've left, or after the max duration.
function waitForCallEnd(page, maxMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - start > maxMs) { clearInterval(timer); return resolve('max_duration'); }
      try {
        const left = await page.evaluate(() =>
          /you left the meeting|return to home screen|call ended/i.test(document.body.innerText || ''));
        if (left) { clearInterval(timer); return resolve('call_ended'); }
      } catch {
        clearInterval(timer);
        return resolve('disconnected');
      }
    }, 5000);
  });
}

// Optional: transcribe locally with whisper.cpp (free) if WHISPER_CPP_PATH is set,
// otherwise return null and let the app transcribe the uploaded file itself.
async function transcribeIfConfigured(audioPath) {
  if (!process.env.WHISPER_CPP_PATH) return null;
  // Left as an integration point — e.g. spawn whisper.cpp on audioPath and read the output.
  // See README for wiring whisper.cpp on the server for fully-free transcription.
  return null;
}
