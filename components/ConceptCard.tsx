import React from 'react';
import type { Concept } from '../types';

interface ConceptCardProps {
  concept: Concept;
  onSelect: () => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ concept, onSelect }) => (
  <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex flex-col justify-between transform transition-all hover:scale-105 hover:border-cyan-500/50">
    <div>
      <h3 className="text-xl font-bold text-cyan-400">{concept.logline}</h3>
      <p className="text-gray-400 mt-2 text-sm">{concept.narrativeArc}</p>
    </div>
    <button
      onClick={onSelect}
      className="mt-4 w-full bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 transition-colors duration-200"
    >
      Select This Concept
    </button>
  </div>
);

export default ConceptCard;
