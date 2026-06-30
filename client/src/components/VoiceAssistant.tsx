import React, { useState, useEffect, useRef } from 'react';
import { useTransactions } from '../context/TransactionContext';
import {
  Mic,
  MicOff,
  Sparkles,
  Loader,
  X,
  Plus,
  Check,
  AlertCircle,
  HelpCircle,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function VoiceAssistant() {
  const { parseVoiceCommand, addTransaction, voiceFilter, setVoiceFilter, clearVoiceFilter } = useTransactions();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Handlers for proposed "add" transaction from Gemini
  const [proposedTx, setProposedTx] = useState<any | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript('Listening...');
      };

      rec.onresult = async (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setTranscript(speechToText);
        handleProcessSpeech(speechToText);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access is blocked. Please check your browser permissions.');
        } else {
          setError(`Speech capture failed: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    setProposedTx(null);
    setSuccessMessage(null);
    setError(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
        setError('Failed to start microphone. Please try again.');
      }
    } else {
      setError('Web Speech API is not supported in this browser. Please use the text input option below.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleProcessSpeech = async (text: string) => {
    if (!text || text.trim() === '' || text === 'Listening...') return;
    setIsProcessing(true);
    setError(null);
    setProposedTx(null);

    try {
      const response = await parseVoiceCommand(text);
      if (!response) {
        throw new Error('Could not parse natural language command.');
      }

      if (response.action === 'filter') {
        // Set global filter
        setVoiceFilter({
          query: text,
          active: true,
          matchingIds: response.filters?.matchingIds || [],
          summary: response.summary
        });
        setSuccessMessage(`Voice Filter applied: ${response.summary}`);
      } else if (response.action === 'add' && response.newTransaction) {
        setProposedTx(response.newTransaction);
      } else {
        setSuccessMessage(response.summary || "I didn't recognize any specific command. Try saying 'show me my shopping expenses'.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to interpret command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProposed = async () => {
    if (!proposedTx) return;
    setIsProcessing(true);
    try {
      await addTransaction({
        description: proposedTx.description,
        amount: Number(proposedTx.amount),
        type: proposedTx.type,
        category: proposedTx.category,
        date: new Date().toISOString().split('T')[0], // Today's date
        paymentMethod: proposedTx.paymentMethod || 'Cash'
      });
      setSuccessMessage(`Saved! Created transaction "${proposedTx.description}" ($${Number(proposedTx.amount).toFixed(2)}) on Category "${proposedTx.category}".`);
      setProposedTx(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to record expense.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = data.get('commandText') as string;
    if (text && text.trim() !== '') {
      setTranscript(text);
      handleProcessSpeech(text);
      e.currentTarget.reset();
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 font-sans">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`h-14 w-14 rounded-full flex items-center justify-center shadow-xl border cursor-pointer relative ${
            isOpen
              ? 'bg-rose-500 hover:bg-rose-650 border-rose-400 text-white'
              : 'bg-indigo-600 hover:bg-indigo-750 border-indigo-500 text-white'
          }`}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              {voiceFilter?.active && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-white text-[9px] font-bold text-white items-center justify-center">1</span>
                </span>
              )}
              <Mic className="h-6 w-6" />
            </>
          )}
        </motion.button>
      </div>

      {/* Slide-Up Overlay Assistant Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-40 right-6 md:bottom-24 md:right-8 w-full max-w-sm bg-white dark:bg-neutral-900 border border-slate-150 dark:border-neutral-800 shadow-2xl rounded-2xl p-5 z-40 font-sans overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  AI Voice Command Hub
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {voiceFilter?.active && (
                  <button
                    onClick={clearVoiceFilter}
                    className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg text-slate-400 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mic Pulse Arena */}
            <div className="py-6 flex flex-col items-center justify-center space-y-4">
              <div className="relative flex items-center justify-center">
                {isListening && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                      className="absolute h-16 w-16 rounded-full bg-indigo-500/30"
                    />
                    <motion.div
                      animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, ease: 'easeInOut' }}
                      className="absolute h-16 w-16 rounded-full bg-indigo-500/20"
                    />
                  </>
                )}

                <button
                  onClick={startListening}
                  className={`h-16 w-16 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400'
                  }`}
                >
                  {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>
              </div>

              <div className="text-center w-full px-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                  {isListening ? 'Capture on: Speak now!' : 'Click the mic to speak your request'}
                </p>
                {transcript && (
                  <p className="text-xs text-slate-800 dark:text-neutral-200 font-medium italic mt-2 bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800/80">
                    "{transcript}"
                  </p>
                )}
              </div>
            </div>

            {/* Status / Output Display */}
            <div className="space-y-3">
              {/* Processing Loader */}
              {isProcessing && (
                <div className="flex items-center gap-2 justify-center py-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  <Loader className="h-4 w-4 animate-spin" />
                  Analyzing query...
                </div>
              )}

              {/* Error box */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Messages */}
              {successMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Transaction Save Proposal Card */}
              {proposedTx && (
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-bold">
                        Draft Expense
                      </span>
                      <h5 className="text-xs font-bold text-slate-950 dark:text-neutral-100 mt-1">
                        {proposedTx.description}
                      </h5>
                    </div>
                    <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                      ${Number(proposedTx.amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-indigo-100/30 pt-2.5">
                    <span>Category: {proposedTx.category}</span>
                    <span>Method: {proposedTx.paymentMethod || 'Cash'}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setProposedTx(null)}
                      className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-800 text-[10px] font-bold text-slate-600 dark:text-neutral-300 rounded-lg cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSaveProposed}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Approve & Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Text Input Fallback */}
            <form onSubmit={handleTextInputSubmit} className="mt-4 pt-4 border-t border-slate-100 dark:border-neutral-800">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Voice Fallback Type Input
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="commandText"
                  placeholder="e.g. show my food expenses"
                  className="w-full pl-3 pr-10 py-1.5 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 p-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>
            </form>

            {/* Tip Sheet */}
            <div className="mt-3.5 bg-slate-50 dark:bg-neutral-950/40 rounded-xl p-2.5 border border-slate-150/50 dark:border-neutral-800/50 flex gap-2">
              <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-400 leading-relaxed font-medium">
                <span className="font-bold text-slate-600 dark:text-neutral-300">Try saying:</span>
                <br />• "Show my Food expenses over $20"
                <br />• "Show what I spent on Utilities this month"
                <br />• "Add an expense of $14.50 for Pizza on Food"
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
