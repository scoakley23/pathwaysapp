import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Check, ArrowRight, AlertCircle, Loader2, Activity, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { speakText } from "@/components/utils/textToSpeech";
import { wordDiff } from "@/components/utils/wordDiff";

export default function ReadingPracticeCard({ sentence, onComplete, onNext }) {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [status, setStatus] = useState('idle'); // idle, listening, processing, success, retry, manual, unsupported
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [wordResults, setWordResults] = useState(null);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const spokenTextRef = useRef('');
  const silenceTimeoutRef = useRef(null);

  useEffect(() => {
    // Reset state on new sentence
    setSpokenText('');
    setStatus('idle');
    setAnalysis(null);
    setIsAnalyzing(false);
    setWordResults(null);
  }, [sentence]);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      const resetSilenceTimer = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        // Auto-stop after 10 seconds of silence — generous for beginners pausing between words
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
          }
        }, 10000);
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setStatus('listening');
        setSpokenText('');
        setAnalysis(null);
        setWordResults(null);
        spokenTextRef.current = '';
        startRecording();
        resetSilenceTimer();
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setSpokenText(transcript);
        spokenTextRef.current = transcript;
        resetSilenceTimer();
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        setIsListening(false);
        setStatus('error');
        stopRecording();
      };

      recognitionRef.current.onend = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        setIsListening(false);
        stopRecording();
      };
    } else {
      setStatus('unsupported');
    }

    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [sentence]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');

      const options = mimeType ? { mimeType } : undefined;
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const type = mediaRecorderRef.current.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type });
        analyzeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setSpokenText('');
      setStatus('listening');
      setAnalysis(null);
      setWordResults(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleShowAnswer = () => {
    speakText(sentence.text, 'en');
    setStatus('manual');
    setAnalysis(null);
    setWordResults(null);
  };

  const generateFallbackFeedback = (diff) => {
    const missing = diff.words.filter(w => w.status === 'missing').map(w => w.word);
    if (missing.length === 0) {
      return "All words detected! Focus on speaking with natural rhythm and clear pronunciation.";
    }
    if (missing.length === diff.totalWords) {
      return "None of the words matched. Try reading the sentence slowly, one word at a time.";
    }
    return `You missed: "${missing.join('", "')}". Read more slowly and enunciate each word clearly.`;
  };

  const analyzeAudio = async (audioBlob) => {
    // ── 1. Word-level diff using the real-time speech recognition transcript ──
    // This is deterministic and CANNOT be tricked by the LLM — it's ground truth.
    const transcript = spokenTextRef.current || spokenText;
    const diff = wordDiff(sentence.text, transcript);
    setWordResults(diff.words);

    const wordAccuracy = diff.accuracy;

    // ── 2. No speech detected → automatic fail (score 0) ──
    if (!transcript || transcript.trim().length < 2 || diff.spokenWordCount === 0) {
      const result = {
        transcription: '(no speech detected)',
        pronunciation_score: 0,
        intonation_score: 0,
        fluency_score: 0,
        overall_score: 0,
        phoneme_feedback: "We couldn't detect any speech. Make sure your microphone is working and speak clearly into it.",
        general_feedback: 'No speech detected'
      };
      setAnalysis(result);
      setStatus('retry');
      onComplete(false, 0);
      return;
    }

    setIsAnalyzing(true);

    let llmResult = null;

    // ── 3. LLM analysis for pronunciation quality (NOT transcription) ──
    if (audioBlob && audioBlob.size > 500) {
      try {
        const fileExt = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([audioBlob], `reading_practice.${fileExt}`, { type: audioBlob.type });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        const prompt = `You are a STRICT English pronunciation evaluator for USCIS citizenship test preparation.

TARGET SENTENCE: "${sentence.text}"
SPEECH-TO-TEXT TRANSCRIPT (from real-time recognition, reliable): "${transcript}"
WORD MATCH ACCURACY: ${wordAccuracy}% (${diff.matchedCount} of ${diff.totalWords} words matched)

Listen to the audio and evaluate pronunciation quality ONLY. Do NOT re-transcribe — the transcript above is ground truth.

STRICT SCORING RULES — these are MANDATORY and override your own judgment:
- If WORD MATCH ACCURACY is below 60%, pronunciation_score MUST be below 50. The person said the wrong words.
- If WORD MATCH ACCURACY is below 40%, ALL scores MUST be below 30.
- If WORD MATCH ACCURACY is below 20%, ALL scores MUST be below 15.
- If the audio is mostly silence, background noise, mumbling, or inaudible, ALL scores MUST be below 20.
- Do NOT assume the person said the right words if the transcript doesn't match the target.
- Accent is acceptable. Saying completely wrong words or being inaudible is NOT acceptable.

Evaluate each category 0-100:
- pronunciation_score: Clarity of individual sounds and correct word production
- intonation_score: Natural sentence rhythm, stress, and intonation patterns
- fluency_score: Smooth, continuous delivery without excessive pauses or hesitation
- overall_score: MUST equal round(wordAccuracy * 0.6 + pronunciation * 0.2 + fluency * 0.1 + intonation * 0.1)

Provide specific, actionable feedback on which sounds or words need improvement.`;

        llmResult = await base44.integrations.Core.InvokeLLM({
          prompt,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              pronunciation_score: { type: "number" },
              intonation_score: { type: "number" },
              fluency_score: { type: "number" },
              overall_score: { type: "number" },
              phoneme_feedback: { type: "string" },
              general_feedback: { type: "string" }
            },
            required: ["pronunciation_score", "intonation_score", "fluency_score", "overall_score", "phoneme_feedback", "general_feedback"]
          }
        });
      } catch (error) {
        console.error("LLM analysis failed, using word-accuracy fallback", error);
      }
    }

    setIsAnalyzing(false);

    // ── 4. Calculate final scores — word accuracy is the dominant, deterministic factor ──
    let pronunciation = llmResult?.pronunciation_score ?? wordAccuracy;
    let intonation = llmResult?.intonation_score ?? Math.round(wordAccuracy * 0.5);
    let fluency = llmResult?.fluency_score ?? Math.round(wordAccuracy * 0.7);

    // Cross-validate: LLM CANNOT override word accuracy (prevents false high scores)
    if (wordAccuracy < 60) {
      pronunciation = Math.min(pronunciation, wordAccuracy + 10);
    }
    if (wordAccuracy < 40) {
      pronunciation = Math.min(pronunciation, 30);
      intonation = Math.min(intonation, 30);
      fluency = Math.min(fluency, 30);
    }
    if (wordAccuracy < 20) {
      pronunciation = Math.min(pronunciation, 15);
      intonation = Math.min(intonation, 15);
      fluency = Math.min(fluency, 15);
    }

    // Overall = weighted, word accuracy is dominant (60%)
    let overall = Math.round(wordAccuracy * 0.6 + pronunciation * 0.2 + fluency * 0.1 + intonation * 0.1);

    // Hard cap: if word accuracy is poor, overall can never exceed it
    if (wordAccuracy < 50) {
      overall = Math.min(overall, wordAccuracy);
    }

    const result = {
      transcription: transcript,
      pronunciation_score: Math.round(pronunciation),
      intonation_score: Math.round(intonation),
      fluency_score: Math.round(fluency),
      overall_score: overall,
      phoneme_feedback: llmResult?.phoneme_feedback || generateFallbackFeedback(diff),
      general_feedback: overall >= 70
        ? 'Great job! Your reading is clear and accurate.'
        : wordAccuracy < 50
          ? 'You missed several words. Focus on reading each word carefully and slowly.'
          : 'Good effort! Keep practicing to improve your accuracy.'
    };

    setAnalysis(result);

    if (overall >= 70) {
      setStatus('success');
      onComplete(true, overall);
    } else {
      setStatus('retry');
      onComplete(false, overall);
    }
  };

  if (status === 'unsupported') {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold">Browser Not Supported</h3>
        <p className="text-slate-600">Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.</p>
        <Button onClick={onNext} className="mt-4">Skip</Button>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="bg-white shadow-xl border-0 overflow-hidden rounded-2xl">
        <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />

        <CardContent className="p-8 md:p-12 flex flex-col items-center text-center min-h-[500px] justify-between">

          <div className="space-y-6 w-full">
            <div className="flex justify-between items-start">
               <span className="text-xs font-bold tracking-wider text-purple-500 uppercase">Reading Practice</span>
               <Button variant="ghost" size="sm" onClick={() => speakText(sentence.text, 'en')} className="text-slate-400 hover:text-purple-600">
                 <Volume2 className="w-4 h-4 mr-1" /> Listen
               </Button>
            </div>

            {/* Sentence display — with word-by-word highlighting when results available */}
            <div className="py-4">
              {wordResults ? (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {wordResults.map((w, i) => (
                    <span key={i} className={`px-2.5 py-1 rounded-lg text-2xl md:text-3xl font-bold transition-colors ${
                      w.status === 'correct'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600 line-through'
                    }`}>
                      {w.word}
                    </span>
                  ))}
                </div>
              ) : (
                <h2 className="text-3xl md:text-4xl font-bold text-slate-800 leading-tight">
                  {sentence.text}
                </h2>
              )}
            </div>
          </div>

          <div className="w-full space-y-8">
             {/* Feedback Area */}
             <div className="min-h-[160px] w-full flex flex-col items-center justify-center">
                {isListening ? (
                    <div className="flex items-center gap-2 text-purple-600 animate-pulse">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-75" />
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-150" />
                        <span className="font-medium">Listening & Recording...</span>
                    </div>
                ) : isAnalyzing ? (
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                         <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                         <p className="text-sm font-medium">Analyzing your pronunciation...</p>
                    </div>
                ) : status === 'manual' ? (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-blue-50 p-6 rounded-xl mb-6 text-center w-full border border-blue-100">
                            <p className="text-lg font-medium text-slate-800 mb-2">Listen to the correct pronunciation</p>
                            <div className="flex gap-3 justify-center">
                              <Button onClick={() => speakText(sentence.text, 'en')} variant="outline" className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200">
                                  <Volume2 className="w-5 h-5 mr-2" /> Play Audio
                              </Button>
                            </div>
                        </div>
                        <p className="text-slate-600 font-medium mb-4">Were you able to read it correctly?</p>
                        <div className="flex gap-4">
                            <Button onClick={() => setStatus('retry')} variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-600 min-w-[120px]">
                                No, Try Again
                            </Button>
                            <Button onClick={() => onComplete(true)} className="bg-green-600 hover:bg-green-700 min-w-[120px]">
                                <Check className="w-4 h-4 mr-2" /> Yes, I Got It
                            </Button>
                        </div>
                    </div>
                ) : analysis ? (
                    <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                         {analysis.transcription && analysis.transcription !== '(no speech detected)' && (
                             <div className="mb-3 p-2 bg-white rounded-lg border border-slate-200">
                                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">You said:</p>
                                 <p className="text-sm text-slate-700 italic">"{analysis.transcription}"</p>
                             </div>
                         )}

                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${analysis.overall_score >= 70 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {analysis.overall_score >= 70 ? <Check className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-900 text-lg">{analysis.overall_score}%</p>
                                    <p className="text-xs text-slate-500">Overall Score</p>
                                </div>
                            </div>
                            <div className="text-right max-w-[60%]">
                                <p className="text-sm font-medium text-slate-800">{analysis.general_feedback}</p>
                            </div>
                         </div>

                         <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-1">Pronunciation</p>
                                <Progress value={analysis.pronunciation_score} className="h-2" />
                                <span className="text-xs font-medium mt-1 block">{analysis.pronunciation_score}%</span>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-1">Intonation</p>
                                <Progress value={analysis.intonation_score} className="h-2" />
                                <span className="text-xs font-medium mt-1 block">{analysis.intonation_score}%</span>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-1">Fluency</p>
                                <Progress value={analysis.fluency_score} className="h-2" />
                                <span className="text-xs font-medium mt-1 block">{analysis.fluency_score}%</span>
                            </div>
                         </div>

                         {analysis.phoneme_feedback && (
                             <div className="bg-white p-2 rounded-lg border border-slate-100 text-left">
                                 <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Tip:</p>
                                 <p className="text-sm text-slate-600">{analysis.phoneme_feedback}</p>
                             </div>
                         )}
                    </div>
                ) : spokenText ? (
                    <div className="text-slate-500">
                        <p className="text-xs uppercase font-bold mb-1">You said:</p>
                        <p className="text-lg">"{spokenText}"</p>
                        <p className="text-xs text-slate-400 mt-2">Waiting for analysis...</p>
                    </div>
                ) : (
                    <p className="text-slate-400">Tap microphone to start reading</p>
                )}
             </div>

             {/* Controls */}
             <div className="flex flex-col items-center gap-4">
                <div className="flex justify-center gap-4">
                    {(!analysis || analysis.overall_score < 70) && status !== 'manual' ? (
                        <Button
                            size="lg"
                            onClick={toggleListening}
                            disabled={isAnalyzing}
                            className={`h-16 w-16 rounded-full shadow-lg transition-all duration-300 ${
                                isListening
                                ? 'bg-red-100 text-red-600 hover:bg-red-200 ring-4 ring-red-50'
                                : analysis
                                    ? 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 ring-4 ring-purple-50'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105'
                            } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isListening ? <MicOff className="w-6 h-6" /> : analysis ? <RotateCcw className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </Button>
                    ) : status !== 'manual' ? (
                        <Button onClick={onNext} className="h-12 px-8 text-lg rounded-xl bg-purple-600 hover:bg-purple-700">
                            Next Sentence <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    ) : null}
                </div>

                {analysis && analysis.overall_score < 70 && !isListening && !isAnalyzing && (
                    <p className="text-sm text-purple-600 font-medium">Tap the retry button to try again</p>
                )}

                {/* Show Answer / Skip Button */}
                {status !== 'success' && status !== 'manual' && !isListening && !isAnalyzing && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShowAnswer}
                        className="text-slate-400 hover:text-purple-600 text-xs font-medium"
                    >
                        Can't get it right? Show Answer / Skip
                    </Button>
                )}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}