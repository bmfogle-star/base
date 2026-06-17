// Transcription helpers — free in-browser Whisper (default) or paid OpenAI Whisper (faster).

const WHISPER_SAMPLE_RATE = 16000;

// Decode any audio/video file into a mono Float32Array at 16kHz for Whisper.
export async function decodeAudio(file) {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: WHISPER_SAMPLE_RATE });
  const decoded = await ctx.decodeAudioData(arrayBuffer);

  // Downmix to mono
  let audio;
  if (decoded.numberOfChannels === 2) {
    const left = decoded.getChannelData(0);
    const right = decoded.getChannelData(1);
    audio = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) audio[i] = (left[i] + right[i]) / 2;
  } else {
    audio = decoded.getChannelData(0);
  }
  ctx.close();
  return audio;
}

// Free path: transcribe in the browser via a Web Worker. Reports progress.
export function transcribeInBrowser(audio, { model, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/whisperWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'download' || msg.type === 'status') {
        onProgress?.(msg);
      } else if (msg.type === 'result') {
        worker.terminate();
        resolve(msg.text);
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.error));
      }
    };
    worker.onerror = (err) => { worker.terminate(); reject(err); };
    worker.postMessage({ audio, model: model || 'Xenova/whisper-tiny.en' });
  });
}

// Paid path: OpenAI Whisper API. Fast and accurate.
export async function transcribeWithOpenAI(file, openaiKey) {
  if (!openaiKey) throw new Error('OpenAI API key required. Add it in Settings.');
  const form = new FormData();
  form.append('file', file);
  form.append('model', 'whisper-1');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Whisper error ${res.status}`);
  }
  const data = await res.json();
  return data.text;
}
