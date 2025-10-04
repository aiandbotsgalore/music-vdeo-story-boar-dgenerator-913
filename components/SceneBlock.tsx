

import React, { useState, useEffect, useMemo } from 'react';
import type { Scene } from '../types';
import MagicWandIcon from './MagicWandIcon';
import Spinner from './Spinner';
import RegenerateIcon from './RegenerateIcon';
import AsyncImage from './AsyncImage';
import CameraIcon from './CameraIcon';

// Helper to map song sections to colors
const getSectionClass = (section?: string): string => {
    switch (section?.toLowerCase()) {
        case 'verse': return 'border-blue-500/50';
        case 'chorus': return 'border-red-500/50';
        case 'bridge': return 'border-yellow-500/50';
        case 'intro': return 'border-green-500/50';
        case 'outro': return 'border-purple-500/50';
        case 'instrumental': return 'border-indigo-500/50';
        default: return 'border-gray-700';
    }
};

interface SceneBlockProps {
    scene: Scene;
    index: number;
    enhancingState: { type: 'scene'; index: number; field: 'description' | 'actions' } | null;
    isGeneratingImage: boolean;
    imageGenerationErrorMessage?: string;
    onFieldChange: (index: number, field: 'description' | 'actions', newValue: string) => void;
    onEnhance: (index: number, field: 'description' | 'actions') => void;
    onGenerateImage: (index: number) => void;
    onRegenerateImage: (index: number) => void;
    onImageClick: (index: number) => void;
    isBatchProcessing: boolean;
}

const SceneBlock: React.FC<SceneBlockProps> = ({ scene, index, enhancingState, isGeneratingImage, imageGenerationErrorMessage, onFieldChange, onEnhance, onGenerateImage, onRegenerateImage, onImageClick, isBatchProcessing }) => {
    
    const [activeVariantIndex, setActiveVariantIndex] = useState(0);
    const latestImageSet = scene.imageHistory?.[scene.imageHistory.length - 1] || [];
    
    const sectionClass = useMemo(() => getSectionClass(scene.section), [scene.section]);

    useEffect(() => {
        setActiveVariantIndex(0);
    }, [scene.imageHistory]);
    
    const activeImageId = latestImageSet[activeVariantIndex];
    const hasError = !!imageGenerationErrorMessage;

    const isEnhancingDescription = enhancingState?.field === 'description';
    const isEnhancingActions = enhancingState?.field === 'actions';
    const isEnhancingAnything = !!enhancingState || isBatchProcessing;

    return (
    <div className={`bg-gray-800 rounded-lg p-4 border-2 ${sectionClass} flex flex-col md:flex-row gap-4 transition-all`}>
        <div className="flex-1 space-y-2">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-cyan-400">{scene.timestamp}</h3>
                <div className="flex items-center gap-2">
                    {scene.cameraAngle && (
                        <span className="text-xs font-semibold bg-teal-800 text-teal-200 px-2 py-1 rounded-full flex items-center gap-1.5" title="Suggested Camera Angle">
                            <CameraIcon className="w-3 h-3"/>
                            {scene.cameraAngle}
                        </span>
                    )}
                    {scene.section && <span className="text-xs font-semibold bg-gray-700 text-gray-300 px-2 py-1 rounded-full">{scene.section}</span>}
                </div>
            </div>
            {scene.lyric && <p className="text-purple-300 italic text-sm">{`♪ ${scene.lyric}`}</p>}
             <div>
                <label htmlFor={`scene-desc-${index}`} className="block text-sm font-medium text-gray-400 mb-1">Visual Description</label>
                <div className="relative">
                    <textarea
                        id={`scene-desc-${index}`}
                        value={scene.description}
                        onChange={(e) => onFieldChange(index, 'description', e.target.value)}
                        rows={4}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 pr-10 focus:ring-1 focus:ring-cyan-500 transition-all text-gray-300 resize-y"
                        aria-label={`Scene description for ${scene.timestamp}`}
                    />
                    <button
                        onClick={() => onEnhance(index, 'description')}
                        disabled={isEnhancingAnything}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-600 hover:bg-cyan-600 disabled:opacity-50 text-cyan-300 transition-colors"
                        aria-label="Enhance scene description"
                    >
                        {isEnhancingDescription ? <Spinner className="w-4 h-4" /> : <MagicWandIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            <div>
                <label htmlFor={`scene-actions-${index}`} className="block text-sm font-medium text-gray-400 mb-1">Scene Actions</label>
                <div className="relative">
                    <textarea
                        id={`scene-actions-${index}`}
                        value={scene.actions || ''}
                        onChange={(e) => onFieldChange(index, 'actions', e.target.value)}
                        rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 pr-10 focus:ring-1 focus:ring-cyan-500 transition-all text-gray-300 resize-y"
                        placeholder="e.g., He looks up at the sky as a single tear rolls down his cheek."
                        aria-label={`Scene actions for ${scene.timestamp}`}
                    />
                    <button
                        onClick={() => onEnhance(index, 'actions')}
                        disabled={isEnhancingAnything}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-600 hover:bg-cyan-600 disabled:opacity-50 text-cyan-300 transition-colors"
                        aria-label="Enhance scene actions"
                    >
                        {isEnhancingActions ? <Spinner className="w-4 h-4" /> : <MagicWandIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
        <div className="w-full md:w-80 flex flex-col items-center justify-between gap-2">
            <div 
                className="w-full aspect-video bg-gray-900 rounded-md flex items-center justify-center overflow-hidden border border-gray-700 cursor-pointer group relative"
                onClick={() => latestImageSet.length > 0 && onImageClick(index)}
            >
                {activeImageId && !isGeneratingImage ? (
                   <AsyncImage imageId={activeImageId} alt={`Visual for scene ${scene.timestamp}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : !isGeneratingImage && !hasError && (
                    <span className="text-gray-500 text-sm">No Image</span>
                )}
                
                {activeImageId && isGeneratingImage && (
                    <>
                        <AsyncImage imageId={activeImageId} alt={`Visual for scene ${scene.timestamp}`} className="w-full h-full object-cover blur-sm" />
                        <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center gap-2 text-sm text-gray-400">
                           <Spinner className="w-8 h-8"/>
                           <span>Generating...</span>
                       </div>
                    </>
                )}

                {!activeImageId && isGeneratingImage && (
                     <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-sm text-gray-400">
                        <Spinner className="w-8 h-8"/>
                        <span>Generating...</span>
                    </div>
                )}
                 {hasError && (
                     <div className="absolute inset-0 bg-red-900/50 flex flex-col items-center justify-center p-2 text-sm text-red-200 text-center gap-2">
                        <span className="font-semibold">Error</span>
                        <p className="text-xs">{imageGenerationErrorMessage}</p>
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent onImageClick from firing
                                onGenerateImage(index);
                            }}
                            className="mt-1 bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>

            {latestImageSet.length > 1 && (
                <div className="flex justify-center gap-2 pt-1">
                    {latestImageSet.map((id, idx) => (
                        <button key={id} onClick={() => setActiveVariantIndex(idx)} className={`w-16 h-9 rounded-md overflow-hidden transition-all duration-200 ring-2 ${activeVariantIndex === idx ? 'ring-cyan-400 scale-105' : 'ring-transparent hover:ring-gray-500'}`}>
                           <AsyncImage imageId={id} alt={`Variant ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
            
            <div className="w-full flex gap-2 mt-2">
                <button
                    onClick={() => onGenerateImage(index)}
                    disabled={isGeneratingImage || !scene.description || isBatchProcessing}
                    className="flex-grow bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isGeneratingImage ? 'Wait' : (latestImageSet.length > 0) ? 'Generate New' : 'Generate Image'}
                </button>
                {latestImageSet.length > 0 && (
                     <button
                        onClick={() => onRegenerateImage(index)}
                        disabled={isGeneratingImage || isBatchProcessing}
                        className="p-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed"
                        aria-label="Regenerate image with minor variations"
                    >
                        <RegenerateIcon className="w-5 h-5"/>
                    </button>
                )}
            </div>
        </div>
    </div>
)};

export default React.memo(SceneBlock);