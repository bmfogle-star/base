import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, StopCircle, Loader, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';

const STATES = { IDLE: 'idle', RECORDING: 'recording', PROCESSING: 'processing', DONE: 'done', ERROR: 'error' };

export default function CallRecorder({ clients, preselectedClientId, onSaveCall, onBack, apiKey }) {
  const [state, setState] = useState(STATES.IDLE);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [transcript, setTranscript] = useState('');
  const [extracted, setExtracted] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [mode, setMode] = useState('record'); // 'record' | 'manual'
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const accumulatedRef = useRef('');

  useEffect(() => {
    return () => {
      stopTimer();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  function startTimer() {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }

  function stopTimer() {
    clearInterval(timerRef.current);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  async function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition is not supported in this browser. Please use Chrome or use manual transcript mode.');
      setState(STATES.ERROR);
      return;
    }

    accumulatedRef.current = '';
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (finalText) accumulatedRef.current += finalText;
      setTranscript(accumulatedRef.current + interim);
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setErrorMsg('Microphone access denied. Please allow microphone access and try again.');
        setState(STATES.ERROR);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState(STATES.RECORDING);
    startTimer();
  }

  async function stopAndProcess() {
    stopTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setState(STATES.PROCESSING);

    const text = accumulatedRef.current || transcript;
    if (!text.trim()) {
      setErrorMsg('No speech was detected. Try using manual transcript mode.');
      setState(STATES.ERROR);
      return;
    }

    await extractInfo(text);
  }

  async function processManual() {
    if (!manualTranscript.trim()) return;
    setState(STATES.PROCESSING);
    await extractInfo(manualTranscript);
  }

  async function extractInfo(text) {
    if (!apiKey) {
      // Fallback: basic extraction without AI
      const extracted = `Transcript recorded on ${new Date().toLocaleDateString()}.\n\nFull transcript:\n${text}`;
      setExtracted(extracted);
      setTranscript(text);
      setState(STATES.DONE);
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
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
            content: `You are a sales assistant. Extract key personal details from this sales call transcript that would help a salesperson feel more personable with this client.\n\nExtract and organize:\n- Client's name\n- Hobbies and interests\n- Family members (names, relationships)\n- Upcoming personal events or milestones\n- Any personal life details mentioned\n- Key business concerns or goals\n- Any other details useful for building rapport\n\nBe concise. Only include what was actually mentioned. If nothing was mentioned for a category, skip it.\n\nTranscript:\n${text}`,
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setExtracted(data.content[0].text);
      setTranscript(text);
      setState(STATES.DONE);
    } catch (err) {
      setExtracted(`Transcript recorded on ${new Date().toLocaleDateString()}.\n\nFull transcript:\n${text}\n\n(AI extraction unavailable: ${err.message})`);
      setTranscript(text);
      setState(STATES.DONE);
    }
  }

  function handleSave() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const call = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: formatTime(elapsed),
      transcript: transcript || manualTranscript,
      extracted,
      summary: extracted.split('\n')[0] || 'Call recorded',
    };

    const updatedClient = {
      ...client,
      callHistory: [...(client.callHistory || []), call],
    };

    // Merge extracted info into client profile
    onSaveCall(updatedClient, call);
  }

  function reset() {
    setState(STATES.IDLE);
    setTranscript('');
    setExtracted('');
    setManualTranscript('');
    setElapsed(0);
    setErrorMsg('');
    accumulatedRef.current = '';
  }

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 -ml-1">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Call Recorder</h1>
      </div>

      {/* Client selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <label className="text-sm font-semibold text-gray-700 block mb-2">Client for this call</label>
        <select
          value={selectedClientId}
          onChange={e => setSelectedClientId(e.target.value)}
          disabled={state !== STATES.IDLE}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">-- Select a client --</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>
          ))}
        </select>
      </div>

      {/* Mode toggle */}
      {state === STATES.IDLE && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('record')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${mode === 'record' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            🎙 Live Recording
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            ✍️ Paste Transcript
          </button>
        </div>
      )}

      {/* Recording UI */}
      {mode === 'record' && state === STATES.IDLE && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic size={32} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Ready to record</h3>
          <p className="text-sm text-gray-500 mb-5">Uses your browser's speech recognition to transcribe the call in real time.</p>
          <button
            onClick={startRecording}
            disabled={!selectedClientId}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Recording
          </button>
          {!selectedClientId && <p className="text-xs text-gray-400 mt-2">Select a client first</p>}
        </div>
      )}

      {state === STATES.RECORDING && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Mic size={32} className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600 mb-1">{formatTime(elapsed)}</p>
          <p className="text-sm text-gray-500 mb-4">Recording in progress...</p>
          {transcript && (
            <div className="bg-gray-50 rounded-lg p-3 text-left mb-4 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-600">{transcript}</p>
            </div>
          )}
          <button
            onClick={stopAndProcess}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-700 transition-colors mx-auto"
          >
            <StopCircle size={18} />
            Stop & Analyze
          </button>
        </div>
      )}

      {/* Manual transcript */}
      {mode === 'manual' && state === STATES.IDLE && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Paste call transcript or notes</label>
          <textarea
            value={manualTranscript}
            onChange={e => setManualTranscript(e.target.value)}
            rows={8}
            placeholder="Paste a call transcript, notes, or summary here. AI will extract key client details automatically..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={processManual}
            disabled={!selectedClientId || !manualTranscript.trim()}
            className="mt-3 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Extract Info with AI
          </button>
          {!selectedClientId && <p className="text-xs text-gray-400 mt-2 text-center">Select a client first</p>}
        </div>
      )}

      {state === STATES.PROCESSING && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Loader size={40} className="text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="font-semibold text-gray-900">Analyzing call...</p>
          <p className="text-sm text-gray-500 mt-1">AI is extracting key client details</p>
        </div>
      )}

      {state === STATES.ERROR && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="font-semibold text-red-800 mb-1">Something went wrong</p>
          <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
          <button onClick={reset} className="bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-medium">
            Try Again
          </button>
        </div>
      )}

      {state === STATES.DONE && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">Call analyzed successfully!</p>
          </div>

          {transcript && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Transcript</h3>
              <div className="max-h-40 overflow-y-auto">
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{transcript || manualTranscript}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">AI Extracted Info</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{extracted}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
              Record Another
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedClientId}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Save to Client
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
