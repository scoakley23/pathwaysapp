import React from 'react';
import { CheckCircle } from 'lucide-react';
import GlossaryText from '@/components/lessons/GlossaryText';

export default function KeyPointsDisplay({ keyPoints }) {
  if (!keyPoints || keyPoints.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <CheckCircle className="w-6 h-6 text-white" />
        </div>
        Key Points to Remember
      </h3>
      <ul className="space-y-4">
        {keyPoints.map((point, idx) => {
          const pointText = typeof point === 'string' ? point : point.text;
          const definition = typeof point === 'string' ? null : point.definition;
          const imageUrl = typeof point === 'string' ? null : point.image_url;
          
          return (
            <li key={idx} className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="text-slate-800 leading-relaxed font-medium flex-1"><GlossaryText>{pointText}</GlossaryText></span>
              </div>
              {definition && (
                <div className="ml-10 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="text-sm text-slate-700 italic">{definition}</p>
                </div>
              )}
              {imageUrl && (
                <div className="ml-10 rounded-lg overflow-hidden border border-slate-300">
                  <img 
                    src={imageUrl} 
                    alt={pointText}
                    className="w-full h-auto object-cover max-h-64"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}