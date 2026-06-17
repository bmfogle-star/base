// In-browser Whisper transcription using transformers.js
// Runs entirely on the user's device — no API key, no server, fully private.
import { pipeline, env } from '@xenova/transformers';

// Allow remote model download from the HuggingFace hub, cache locally.
env.allowLocalModels = false;

let transcriber = null;
let currentModel = null;

async function getTranscriber(model, onProgress) {
  if (transcriber && currentModel === model) return transcriber;
  currentModel = model;
  transcriber = await pipeline('automatic-speech-recognition', model, {
    progress_callback: onProgress,
  });
  return transcriber;
}

self.onmessage = async (e) => {
  const { audio, model } = e.data;
  try {
    const asr = await getTranscriber(model || 'Xenova/whisper-tiny.en', (p) => {
      if (p.status === 'progress') {
        self.postMessage({ type: 'download', file: p.file, progress: Math.round(p.progress || 0) });
      } else if (p.status === 'ready' || p.status === 'done') {
        self.postMessage({ type: 'status', status: p.status });
      }
    });

    self.postMessage({ type: 'status', status: 'transcribing' });

    const output = await asr(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    self.postMessage({ type: 'result', text: output.text.trim() });
  } catch (err) {
    self.postMessage({ type: 'error', error: err.message || String(err) });
  }
};
