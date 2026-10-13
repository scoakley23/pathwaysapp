import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIExplanation({ question, answer, context = "US Civics Test" }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getExplanation = async () => {
    if (explanation) {
        setIsOpen(!isOpen);
        return;
    }

    setLoading(true);
    setIsOpen(true);
    try {
      const prompt = `Explain clearly and simply why "${answer}" is the correct answer to the question: "${question}". 
      Context: ${context}. 
      Target audience: English language learners studying for US Citizenship. 
      Keep it concise (2-3 sentences).`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setExplanation(typeof response === 'string' ? response : JSON.stringify(response));
    } catch (error) {
      console.error("Error fetching explanation:", error);
      setExplanation("Sorry, I couldn't generate an explanation right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full">
      {!isOpen && !explanation ? (
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={getExplanation}
            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-medium"
        >
            <Sparkles className="w-3 h-3 mr-1.5" />
            Explain with AI
        </Button>
      ) : (
        <div className="border border-indigo-100 bg-indigo-50/50 rounded-lg overflow-hidden transition-all">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
            >
                <span className="flex items-center"><Sparkles className="w-3 h-3 mr-1.5" /> AI Explanation</span>
                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                                <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                            </div>
                        ) : (
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {explanation}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      )}
    </div>
  );
}