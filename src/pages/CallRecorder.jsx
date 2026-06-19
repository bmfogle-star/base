import { useState, useRef, useEffect } from 'react';
import {
  Mic, StopCircle, Loader, CheckCircle, ArrowLeft, AlertCircle,
  Upload, Video, FileAudio, RefreshCw, X, Clock, Zap, Lock
} from 'lucide-react';
import { decodeAudio, transcribeInBrowser, transcribeWithOpenAI } from '../lib/transcribe';
import Emoji from '../components/Emoji';
import { isLoggedIn, extractViaBackend } from '../lib/api';

const MODES = { PICK: 'pick', MIC: 'mic', UPLOAD: 'upload', ZOOM: 'zoom' };
const S = { IDLE: 'idle', RECORDING: 'recording', PROCESSING: 'processing', WAITING: 'waiting', DONE: 'done', ERROR: 'error' };

// ── helpers ──────────────────────────────────────────────────────────────────

async function extractWithClaude(transcript, apiKey) {
  if (!apiKey) return `Transcript:\n${transcript}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a sales assistant. Extract key personal details from this sales call transcript to help a salesperson build rapport.\n\nExtract and list:\n- Client name(s)\n- Hobbies and interests\n- Family members (names and relationships)\n- Upcoming personal events or milestones\n- Personal life details\n- Key business concerns or goals\n- Any other rapport-building details\n\nOnly include things actually mentioned. Skip categories with nothing to report.\n\nTranscript:\n${transcript}`,
      }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

async function createRecallBot(meetingUrl, recallKey) {
  if (!recallKey) throw new Error('Recall.ai API key required. Add it in Settings.');
  const res = await fetch('https://us-east-1.recall.ai/api/v1/bot/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${recallKey}`,
    },
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: 'Spark Recorder',
      transcription_options: { provider: 'assembly_ai' },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `Recall.ai error ${res.status}`);
  }
  return res.json();
}

async function getRecallBotStatus(botId, recallKey) {
  const res = await fetch(`https://us-east-1.recall.ai/api/v1/bot/${botId}/`, {
    headers: { Authorization: `Token ${recallKey}` },
  });
  if (!res.ok) throw new Error(`Status check failed ${res.status}`);
  return res.json();
}

// ── self-hosted bot server (free) ──
async function createSelfHostedBot(meetingUrl, clientId, baseUrl, token) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/bots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ meetingUrl, clientId, botName: 'Spark Recorder' }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Bot server error ${res.status}`);
  }
  return res.json();
}

async function getSelfHostedStatus(id, baseUrl, token) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/bots/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Status check failed ${res.status}`);
  return res.json();
}

async function getSelfHostedTranscript(id, baseUrl, token) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/bots/${id}/transcript`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Transcript fetch failed ${res.status}`);
  const data = await res.json();
  return data.transcript || '';
}

async function getRecallTranscript(botId, recallKey) {
  const res = await fetch(`https://us-east-1.recall.ai/api/v1/bot/${botId}/transcript/`, {
    headers: { Authorization: `Token ${recallKey}` },
  });
  if (!res.ok) throw new Error(`Transcript fetch failed ${res.status}`);
  const data = await res.json();
  // Convert Recall.ai word-level transcript to readable text
  if (Array.isArray(data)) {
    return data.map(s => `${s.speaker || 'Speaker'}: ${s.words?.map(w => w.text).join(' ') || ''}`).join('\n');
  }
  return JSON.stringify(data);
}

// ── mode cards ────────────────────────────────────────────────────────────────

function ModeCard({ icon, title, desc, color, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-start gap-4 bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 hover:border-${color}-400 rounded-xl p-4 text-left transition-colors group`}>
      <div className={`w-11 h-11 bg-${color}-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-${color}-200 transition-colors`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-900 dark:text-neutral-100 text-sm">{title}</p>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </button>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function CallRecorder({ clients, preselectedClientId, onSaveCall, onBack, apiKey, openaiKey, recallKey, botServerUrl, botServerToken }) {
  const useSelfHosted = !!botServerUrl;
  const [mode, setMode] = useState(MODES.PICK);
  const [status, setStatus] = useState(S.IDLE);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [transcript, setTranscript] = useState('');
  const [extracted, setExtracted] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // mic
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const accumulatedRef = useRef('');

  // upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [engine, setEngine] = useState('browser'); // 'browser' (free) | 'openai' (paid, faster)
  const fileInputRef = useRef(null);

  // zoom
  const [meetingUrl, setMeetingUrl] = useState('');
  const [botId, setBotId] = useState('');
  const [botStatus, setBotStatus] = useState('');
  const pollRef = useRef(null);

  useEffect(() => () => { stopTimer(); stopPoll(); if (recognitionRef.current) recognitionRef.current.abort(); }, []);

  function startTimer() { setElapsed(0); timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000); }
  function stopTimer() { clearInterval(timerRef.current); }
  function stopPoll() { clearInterval(pollRef.current); }
  function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  function reset() {
    setMode(MODES.PICK); setStatus(S.IDLE); setTranscript(''); setExtracted('');
    setErrorMsg(''); setUploadFile(null); setUploadProgress(''); setMeetingUrl('');
    setBotId(''); setBotStatus(''); setElapsed(0); accumulatedRef.current = '';
    stopTimer(); stopPoll();
  }

  function err(msg) { setStatus(S.ERROR); setErrorMsg(msg); stopTimer(); stopPoll(); }

  async function runExtraction(text) {
    setStatus(S.PROCESSING);
    try {
      // Prefer the backend (no personal key needed) when signed in; else BYOK.
      const result = isLoggedIn()
        ? await extractViaBackend(text)
        : await extractWithClaude(text, apiKey);
      setTranscript(text);
      setExtracted(result);
      setStatus(S.DONE);
    } catch (e) {
      setTranscript(text);
      setExtracted(`Transcript recorded on ${new Date().toLocaleDateString()}.\n\n${text}`);
      setStatus(S.DONE);
    }
  }

  // ── mic ──────────────────────────────────────────────────────────────────

  function startMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { err('Speech recognition not supported. Use Chrome, or try Upload mode instead.'); return; }
    accumulatedRef.current = '';
    setTranscript('');
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) accumulatedRef.current += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setTranscript(accumulatedRef.current + interim);
    };
    rec.onerror = e => { if (e.error === 'not-allowed') err('Microphone access denied. Please allow microphone and try again.'); };
    recognitionRef.current = rec;
    rec.start();
    setStatus(S.RECORDING);
    startTimer();
  }

  function stopMic() {
    stopTimer();
    recognitionRef.current?.stop();
    const text = accumulatedRef.current.trim();
    if (!text) { err('No speech detected. Try Upload mode or make sure your mic is working.'); return; }
    runExtraction(text);
  }

  // ── upload ────────────────────────────────────────────────────────────────

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (f) setUploadFile(f);
  }

  async function processUpload() {
    if (!uploadFile) return;
    setStatus(S.PROCESSING);
    try {
      let text;
      if (engine === 'openai') {
        setUploadProgress('Transcribing with OpenAI Whisper…');
        text = await transcribeWithOpenAI(uploadFile, openaiKey);
      } else {
        setUploadProgress('Decoding audio…');
        const audio = await decodeAudio(uploadFile);
        text = await transcribeInBrowser(audio, {
          model: 'Xenova/whisper-tiny.en',
          onProgress: (m) => {
            if (m.type === 'download') setUploadProgress(`Downloading speech model… ${m.progress}% (one-time)`);
            else if (m.status === 'transcribing') setUploadProgress('Transcribing on your device…');
          },
        });
      }
      if (!text?.trim()) throw new Error('No speech detected in that file.');
      setUploadProgress('Extracting client details with AI…');
      await runExtraction(text);
    } catch (e) {
      err(e.message);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setUploadFile(f);
  }

  // ── zoom bot ──────────────────────────────────────────────────────────────

  async function sendBot() {
    if (!meetingUrl.trim()) return;
    setStatus(S.PROCESSING);
    try {
      const bot = useSelfHosted
        ? await createSelfHostedBot(meetingUrl.trim(), selectedClientId, botServerUrl, botServerToken)
        : await createRecallBot(meetingUrl.trim(), recallKey);
      setBotId(bot.id);
      setBotStatus('joining');
      setStatus(S.WAITING);
      startPoll(bot.id);
    } catch (e) {
      err(e.message);
    }
  }

  function startPoll(id) {
    pollRef.current = setInterval(async () => {
      try {
        let s, getText;
        if (useSelfHosted) {
          const bot = await getSelfHostedStatus(id, botServerUrl, botServerToken);
          s = bot.status || '';
          getText = () => getSelfHostedTranscript(id, botServerUrl, botServerToken);
        } else {
          const bot = await getRecallBotStatus(id, recallKey);
          s = bot.status_changes?.at(-1)?.code || bot.status || '';
          getText = () => getRecallTranscript(id, recallKey);
        }
        setBotStatus(s);
        if (s === 'done' || s === 'call_ended') {
          stopPoll();
          setStatus(S.PROCESSING);
          setBotStatus('fetching transcript...');
          const text = await getText();
          await runExtraction(text);
        } else if (s === 'fatal' || s === 'error') {
          stopPoll();
          err('Bot encountered an error. Check that the meeting link is valid and the meeting has started.');
        }
      } catch (e) {
        stopPoll();
        err(e.message);
      }
    }, 8000);
  }

  function handleSave() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    const call = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: mode === MODES.MIC ? fmt(elapsed) : '',
      source: mode === MODES.UPLOAD ? 'file upload' : mode === MODES.ZOOM ? 'Zoom/Meet bot' : 'live mic',
      transcript,
      extracted,
      summary: extracted.split('\n')[0] || 'Call recorded',
    };
    onSaveCall({ ...client, callHistory: [...(client.callHistory || []), call] }, call);
  }

  const client = clients.find(c => c.id === selectedClientId);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={mode === MODES.PICK ? onBack : reset} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 -ml-1">
          <ArrowLeft size={20} className="text-gray-600 dark:text-neutral-300" />
        </button>
        <h1 className="text-2xl text-gray-900 dark:text-neutral-100">Call Recorder</h1>
      </div>

      {/* Client selector — always visible */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4 mb-4">
        <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300 block mb-2">Link to client</label>
        <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
          disabled={status !== S.IDLE}
          className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-neutral-900">
          <option value="">-- Select a client --</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>)}
        </select>
      </div>

      {/* ── MODE PICKER ── */}
      {mode === MODES.PICK && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-600 dark:text-neutral-300 px-1">How do you want to capture this call?</p>
          <ModeCard icon={<Mic size={18} className="text-green-700 dark:text-green-400" />} color="green" title="Live mic recording"
            desc="Records your microphone in real time. Put the other person on speaker to capture both sides."
            onClick={() => setMode(MODES.MIC)} />
          <ModeCard icon={<FileAudio size={18} className="text-purple-600" />} color="purple" title="Upload a recording"
            desc="Upload an audio or video file from your phone — iPhone Voice Memos, MP3, MP4, M4A, WAV. Whisper transcribes it automatically."
            onClick={() => setMode(MODES.UPLOAD)} />
          <ModeCard icon={<Video size={18} className="text-green-600 dark:text-green-400" />} color="green" title="Zoom / Google Meet / Teams bot"
            desc="Paste a meeting link and a bot joins the call, records everything, and sends the transcript straight back here."
            onClick={() => setMode(MODES.ZOOM)} />
        </div>
      )}

      {/* ── MIC MODE ── */}
      {mode === MODES.MIC && status === S.IDLE && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-6 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 ring-2 ring-gold/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic size={32} className="text-green-700 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-neutral-100 mb-1">Ready to record</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-5">Uses your browser mic. Put the call on speaker for both sides.</p>
          <button onClick={startMic} disabled={!selectedClientId}
            className="bg-green-800 text-white px-8 py-3 rounded-xl font-medium hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed">
            Start Recording
          </button>
          {!selectedClientId && <p className="text-xs text-gray-400 dark:text-neutral-500 mt-2">Select a client first</p>}
        </div>
      )}

      {mode === MODES.MIC && status === S.RECORDING && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Mic size={32} className="text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">{fmt(elapsed)}</p>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">Recording in progress…</p>
          {transcript && (
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-3 text-left mb-4 max-h-36 overflow-y-auto">
              <p className="text-xs text-gray-600 dark:text-neutral-300">{transcript}</p>
            </div>
          )}
          <button onClick={stopMic}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-700 mx-auto">
            <StopCircle size={18} /> Stop & Analyze
          </button>
        </div>
      )}

      {/* ── UPLOAD MODE ── */}
      {mode === MODES.UPLOAD && status === S.IDLE && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-3">Upload call recording</h3>
          <div
            onDrop={onDrop} onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${uploadFile ? 'border-purple-400 bg-purple-50' : 'border-gray-300 dark:border-neutral-700 hover:border-purple-400 hover:bg-purple-50'}`}>
            <input ref={fileInputRef} type="file" accept="audio/*,video/*,.m4a,.mp3,.mp4,.wav,.ogg,.webm" onChange={onFileChange} className="hidden" />
            {uploadFile ? (
              <div>
                <FileAudio size={28} className="text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 dark:text-neutral-100">{uploadFile.name}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                <button onClick={e => { e.stopPropagation(); setUploadFile(null); }} className="mt-2 text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <div>
                <Upload size={28} className="text-gray-400 dark:text-neutral-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Tap to choose a file</p>
                <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">MP3, MP4, M4A, WAV, OGG — up to 25 MB</p>
                <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">Or drag and drop here</p>
              </div>
            )}
          </div>

          {/* Transcription engine toggle */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-neutral-400 font-medium mb-2">Transcription engine</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setEngine('browser')}
                className={`border-2 rounded-xl p-3 text-left transition-colors ${engine === 'browser' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300'}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Lock size={13} className="text-purple-600" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Free & private</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Runs on your device. No key needed. ~40MB one-time download, slower.</p>
              </button>
              <button onClick={() => setEngine('openai')}
                className={`border-2 rounded-xl p-3 text-left transition-colors ${engine === 'openai' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300'}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Zap size={13} className="text-amber-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Fast (paid)</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-neutral-400">OpenAI Whisper. Quick & accurate. Needs API key.</p>
              </button>
            </div>
          </div>

          <div className="mt-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
            <p className="text-xs text-purple-700 font-medium mb-1"><Emoji e="📱" className="mr-1" />From your iPhone</p>
            <p className="text-xs text-purple-600">After a call: Open <strong>Voice Memos</strong> → tap the recording → share icon → "Save to Files" → upload here. Or use any call recording app and export the file.</p>
          </div>

          <button onClick={processUpload} disabled={!uploadFile || !selectedClientId}
            className="mt-4 w-full bg-purple-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Transcribe & Extract Info
          </button>
          {engine === 'openai' && !openaiKey && <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">⚠ OpenAI key not set — add it in Settings, or switch to Free</p>}
          {!selectedClientId && <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 text-center">Select a client first</p>}
        </div>
      )}

      {/* ── ZOOM MODE ── */}
      {mode === MODES.ZOOM && status === S.IDLE && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-1">Meeting bot</h3>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mb-4">Paste your Zoom, Google Meet, or Microsoft Teams link. A bot will join, record the whole call, and send the transcript here when it's done.</p>

          <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-1">Meeting link</label>
          <input type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
            placeholder="https://zoom.us/j/123456789 or meet.google.com/..."
            className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4" />

          <div className="bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 rounded-lg p-3 mb-4">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">Supported platforms</p>
            <p className="text-xs text-green-600 dark:text-green-400">✓ Zoom &nbsp; ✓ Google Meet &nbsp; ✓ Microsoft Teams &nbsp; ✓ Webex</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">The bot appears as "Spark Recorder" in your meeting. You can remove it at any time.</p>
          </div>

          <button onClick={sendBot} disabled={!meetingUrl.trim() || !selectedClientId}
            className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed">
            Send Bot to Meeting
          </button>
          {useSelfHosted
            ? <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">✓ Using your self-hosted bot server (free)</p>
            : !recallKey && <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">⚠ No bot configured — add your free bot server URL (or Recall.ai key) in Settings</p>}
          {!selectedClientId && <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 text-center">Select a client first</p>}
        </div>
      )}

      {/* ── ZOOM WAITING ── */}
      {mode === MODES.ZOOM && status === S.WAITING && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 ring-2 ring-gold/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-neutral-100 mb-1">Bot is in the meeting</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-3">Recording is in progress. This page will update automatically when the call ends.</p>
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg px-4 py-2 inline-block mb-4">
            <p className="text-xs text-gray-500 dark:text-neutral-400">Status: <span className="font-semibold text-gray-700 dark:text-neutral-300 capitalize">{botStatus.replace(/_/g, ' ')}</span></p>
          </div>
          <div className="flex justify-center">
            <div className="flex gap-1">
              {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-neutral-500 mt-4">Checking every 8 seconds…</p>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {status === S.PROCESSING && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-8 text-center">
          <Loader size={40} className="text-green-700 dark:text-green-400 mx-auto mb-4 animate-spin" />
          <p className="font-semibold text-gray-900 dark:text-neutral-100">
            {uploadProgress || 'Analyzing call…'}
          </p>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">AI is extracting key client details</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {status === S.ERROR && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-5 text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="font-semibold text-red-800 dark:text-red-300 mb-1">Something went wrong</p>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{errorMsg}</p>
          <button onClick={reset} className="bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-medium">Try Again</button>
        </div>
      )}

      {/* ── DONE ── */}
      {status === S.DONE && (
        <div>
          <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-xl p-4 mb-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Call analyzed — ready to save to {client?.name || 'client'}</p>
          </div>

          {transcript && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4 mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-2">Transcript</h3>
              <div className="max-h-40 overflow-y-auto">
                <p className="text-xs text-gray-600 dark:text-neutral-300 whitespace-pre-wrap">{transcript}</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-2">AI Extracted Info</h3>
            <p className="text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">{extracted}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800">
              Record Another
            </button>
            <button onClick={handleSave} disabled={!selectedClientId}
              className="flex-1 bg-green-800 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-900 disabled:opacity-50">
              Save to {client?.name?.split(' ')[0] || 'Client'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
