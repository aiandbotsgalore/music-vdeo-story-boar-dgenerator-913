
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Scene, Project, ProjectSnapshot } from './types';
import { isProject } from './types';
import { enhanceText, generateConceptFromBrief, generateStoryboardFromScenes, generateImage, editImageWithMask, transcribeAudio, generateIdeaFromLyrics } from './services/geminiService';
import { dbService } from './services/dbService';
import MagicWandIcon from './components/MagicWandIcon';
import Spinner from './components/Spinner';
import RegenerateIcon from './components/RegenerateIcon';
import CinematicPreview from './components/Filmstrip';
import ImageModal from './components/ImageModal';
import ProjectSidebar from './components/ProjectSidebar';
import AsyncImage from './components/AsyncImage';
import CameraIcon from './components/CameraIcon';
import SceneBlock from './components/SceneBlock';
import StartScreen from './components/StartScreen';
import DownloadIcon from './components/DownloadIcon';
import FilmIcon from './components/FilmIcon';

declare var JSZip: any;


interface InputGroupProps {
    id: string;
    label: string;
    labelColorClass: string;
    value: string;
    placeholder: string;
    isEnhancing: boolean;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onEnhance: () => void;
    rows?: number;
    disabled?: boolean;
}

const InputGroup: React.FC<InputGroupProps> = ({ id, label, labelColorClass, value, placeholder, isEnhancing, onChange, onEnhance, rows = 3, disabled = false }) => (
    <div className="flex flex-col gap-2">
        <label htmlFor={id} className={`text-lg font-semibold ${labelColorClass}`}>{label}</label>
        <div className="relative">
            <textarea
                id={id}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 pr-12 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 text-gray-200 placeholder-gray-500 resize-y"
                disabled={isEnhancing || disabled}
            />
            <button
                onClick={onEnhance}
                disabled={isEnhancing || !value || disabled}
                className="absolute top-2 right-2 p-2 rounded-full bg-gray-700 hover:bg-cyan-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-cyan-300 transition-colors duration-200"
                aria-label={`Enhance ${label}`}
            >
                {isEnhancing ? <Spinner className="w-5 h-5" /> : <MagicWandIcon />}
            </button>
        </div>
    </div>
);

const STYLE_PRESETS: { [key: string]: string } = {
    'Cinematic Realism': 'Photorealistic, cinematic lighting, 8K resolution, shot on Arri Alexa, shallow depth of field, moody color grade.',
    'Anime': 'Modern anime style, vibrant colors, clean lines, dynamic angles, highly detailed backgrounds, inspired by Makoto Shinkai.',
    '90s VHS': 'Authentic 90s VHS aesthetic, slightly grainy, soft focus, aspect ratio 4:3, color bleeding, timestamp overlay in corner.',
    'Oil Painting': 'Classic oil painting style, visible brushstrokes, rich textures, dramatic chiaroscuro lighting, reminiscent of Rembrandt or Caravaggio.',
};

const createNewProject = (): Project => ({
    id: Date.now(),
    name: 'Untitled Project',
    ideaPrompt: '',
    lyrics: '',
    audioId: null,
    concept: '',
    narrativeArc: '',
    characterPrompt: '',
    selectedStyle: 'Cinematic Realism',
    customStyle: '',
    numVariants: 1,
    characterReferenceImageId: null,
    styleReferenceImageId: null,
    storyboard: [],
});

const dataUrlToBlob = async (dataUrl: string): Promise<{ blob: Blob, mimeType: string }> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return { blob, mimeType: blob.type };
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);


const CreativeBrief: React.FC<{
    currentProject: Project;
    updateCurrentProject: (updatedFields: Partial<Project>) => void;
    handleEnhance: (type: 'concept' | 'style' | 'character', field: 'concept' | 'customStyle' | 'characterPrompt') => void;
    handleGenerateIdea: () => void;
    isGeneratingIdea: boolean;
    isTranscribing: boolean;
    handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    enhancingState: { type: 'concept' | 'style' | 'character'; index?: number; field?: never } | { type: 'scene'; index: number; field: 'description' | 'actions' } | null;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'characterReferenceImageId' | 'styleReferenceImageId') => void;
    removeReferenceImage: (field: 'characterReferenceImageId' | 'styleReferenceImageId') => void;
    handleGenerateConcept: () => void;
    isGeneratingConcept: boolean;
    handleGenerateScenes: () => void;
    isGeneratingScenes: boolean;
}> = ({
    currentProject,
    updateCurrentProject,
    handleEnhance,
    handleGenerateIdea,
    isGeneratingIdea,
    isTranscribing,
    handleAudioUpload,
    enhancingState,
    handleImageUpload,
    removeReferenceImage,
    handleGenerateConcept,
    isGeneratingConcept,
    handleGenerateScenes,
    isGeneratingScenes,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const hasConcept = currentProject.concept && currentProject.narrativeArc;
    const isGenerating = isGeneratingConcept || isGeneratingScenes;

    return (
        <section className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg mb-8">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex justify-between items-center text-left text-2xl font-bold text-cyan-300 mb-4"
            >
                Creative Brief
                <ChevronDownIcon className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`} />
            </button>
            {!isCollapsed && (
                <>
                    {hasConcept && (
                        <div className="mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-600 space-y-4">
                            <div>
                                <label htmlFor="logline-edit" className="text-lg font-semibold text-cyan-300">Generated Logline (Editable)</label>
                                <textarea
                                    id="logline-edit"
                                    value={currentProject.concept}
                                    onChange={(e) => updateCurrentProject({ concept: e.target.value })}
                                    className="mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 text-gray-300 italic"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label htmlFor="narrative-edit" className="text-lg font-semibold text-cyan-300">Generated Narrative Arc (Editable)</label>
                                <textarea
                                    id="narrative-edit"
                                    value={currentProject.narrativeArc}
                                    onChange={(e) => updateCurrentProject({ narrativeArc: e.target.value })}
                                    className="mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 text-gray-300"
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <div className="flex justify-between items-center">
                                <label htmlFor="idea-prompt" className="text-lg font-semibold text-gray-300">1. Your Idea</label>
                                <button
                                    onClick={handleGenerateIdea}
                                    disabled={isGeneratingIdea || isTranscribing || !currentProject.lyrics || currentProject.lyrics.startsWith('[Transcribing')}
                                    className="flex items-center gap-2 text-sm bg-gray-700 hover:bg-cyan-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-cyan-300 transition-colors duration-200 py-1 px-3 rounded-full"
                                    aria-label="Generate idea from audio"
                                >
                                    {isGeneratingIdea ? <Spinner className="w-4 h-4" /> : <MagicWandIcon className="w-4 h-4" />}
                                    <span>Generate from Audio</span>
                                </button>
                            </div>
                            <textarea
                                id="idea-prompt"
                                value={currentProject.ideaPrompt}
                                onChange={(e) => updateCurrentProject({ ideaPrompt: e.target.value })}
                                placeholder="e.g., A lone astronaut exploring a vibrant, neon-lit alien jungle... or generate one from your audio."
                                rows={3}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 transition-all text-gray-200 placeholder-gray-500"
                            />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-lg font-semibold text-purple-300">2. Provide Lyrics</label>
                            <div className="flex items-center gap-4 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                                <label htmlFor="audio-upload" className={`cursor-pointer bg-purple-600 text-white font-bold py-2 px-4 rounded-md hover:bg-purple-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {isTranscribing ? <Spinner className="w-5 h-5" /> : 'Upload Audio'}
                                </label>
                                <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} disabled={isTranscribing} />
                                <span className="text-gray-400 text-sm">
                                    {isTranscribing ? 'Transcription in progress...' : 'Upload an audio file to automatically generate timestamped lyrics.'}
                                </span>
                            </div>
                            <textarea id="lyrics" value={currentProject.lyrics} onChange={(e) => updateCurrentProject({ lyrics: e.target.value })} placeholder={`Timestamped lyrics will appear here after audio processing, or you can paste them manually.\ne.g.,\n[00:01.500] City lights are calling\n[00:05.250] But I'm lost in the sound`} rows={7} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-gray-200 placeholder-gray-500 resize-y" disabled={isTranscribing} />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <label htmlFor="style" className="text-lg font-semibold text-yellow-300">3. Select visual style</label>
                            <select id="style" value={currentProject.selectedStyle} onChange={(e) => updateCurrentProject({ selectedStyle: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-gray-200">
                                {Object.keys(STYLE_PRESETS).map(style => <option key={style} value={style}>{style}</option>)}
                                <option value="Custom">Custom</option>
                            </select>
                        </div>
                        {currentProject.selectedStyle === 'Custom' && (
                            <InputGroup id="customStyle" label="Custom Style Prompt" labelColorClass="text-yellow-300" value={currentProject.customStyle} placeholder="e.g., Shot on 35mm film, moody lighting..." isEnhancing={enhancingState?.type === 'style'} onChange={(e) => updateCurrentProject({ customStyle: e.target.value })} onEnhance={() => handleEnhance('style', 'customStyle')} />
                        )}
                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-lg font-semibold text-yellow-300">4. (Optional) Upload Style Reference</label>
                            <div className="flex items-center gap-4 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                                <label htmlFor="style-image-upload" className="cursor-pointer bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors duration-200 whitespace-nowrap">
                                    Choose Style Image
                                </label>
                                <input id="style-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'styleReferenceImageId')} />
                                {currentProject.styleReferenceImageId ? (
                                    <div className="flex items-center gap-3">
                                        <AsyncImage imageId={currentProject.styleReferenceImageId} alt="Style Reference Preview" className="h-14 w-14 object-cover rounded-md border-2 border-gray-500" />
                                        <button onClick={() => removeReferenceImage('styleReferenceImageId')} className="text-red-400 hover:text-red-300 text-sm font-semibold" aria-label="Remove style reference image">&times; Remove</button>
                                    </div>
                                ) : <span className="text-gray-500 text-sm">No image selected for style reference.</span>}
                            </div>
                        </div>
                        <InputGroup id="character" label="5. Key Characters & Props" labelColorClass="text-pink-300" value={currentProject.characterPrompt} placeholder="e.g., Ivan, a musician with a red leather jacket and a vintage acoustic guitar." isEnhancing={enhancingState?.type === 'character'} onChange={(e) => updateCurrentProject({ characterPrompt: e.target.value })} onEnhance={() => handleEnhance('character', 'characterPrompt')} />
                        <div className="flex flex-col gap-2">
                            <label htmlFor="variants" className="text-lg font-semibold text-green-300">6. Image Variants per Scene</label>
                            <select id="variants" value={currentProject.numVariants} onChange={(e) => updateCurrentProject({ numVariants: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-gray-200">
                                <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-lg font-semibold text-teal-300">7. (Optional) Upload Character Reference</label>
                            <div className="flex items-center gap-4 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                                <label htmlFor="character-image-upload" className="cursor-pointer bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors duration-200 whitespace-nowrap">
                                    Choose Character Image
                                </label>
                                <input id="character-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'characterReferenceImageId')} />
                                {currentProject.characterReferenceImageId ? (
                                    <div className="flex items-center gap-3">
                                        <AsyncImage imageId={currentProject.characterReferenceImageId} alt="Character Reference Preview" className="h-14 w-14 object-cover rounded-md border-2 border-gray-500" />
                                        <button onClick={() => removeReferenceImage('characterReferenceImageId')} className="text-red-400 hover:text-red-300 text-sm font-semibold" aria-label="Remove character reference image">&times; Remove</button>
                                    </div>
                                ) : <span className="text-gray-500 text-sm">No image selected for character reference.</span>}
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-gray-700 flex flex-col items-center gap-4">
                        <button
                            onClick={handleGenerateConcept}
                            disabled={isGenerating || isTranscribing || !currentProject.lyrics}
                            className="w-full md:w-auto bg-gradient-to-r from-cyan-600 to-purple-700 text-white font-bold py-3 px-8 rounded-lg hover:from-cyan-500 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg flex items-center justify-center gap-3 mx-auto"
                        >
                            {isGeneratingConcept ? (<><Spinner /><span>Generating Concept...</span></>) : (<span>{hasConcept ? 'Re-generate Concept' : '1. Generate Concept'}</span>)}
                        </button>

                        {hasConcept && (
                             <button
                                onClick={handleGenerateScenes}
                                disabled={isGenerating || isTranscribing || !currentProject.concept}
                                className="w-full md:w-auto bg-gradient-to-r from-teal-500 to-sky-600 text-white font-bold py-3 px-8 rounded-lg hover:from-teal-400 hover:to-sky-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg flex items-center justify-center gap-3 mx-auto"
                            >
                                {isGeneratingScenes ? (<><Spinner /><span>Generating Scenes...</span></>) : (<span>{currentProject.storyboard.length > 0 ? 'Re-generate Scenes' : '2. Generate Scenes'}</span>)}
                            </button>
                        )}
                    </div>
                </>
            )}
        </section>
    );
};

interface MainContentProps {
    currentProject: Project | null;
    updateCurrentProject: (updater: Partial<Project> | ((prevProject: Project) => Partial<Project>)) => void;
    handleEnhance: (type: 'concept' | 'style' | 'character', field: 'concept' | 'customStyle' | 'characterPrompt') => void;
    handleGenerateIdea: () => void;
    isGeneratingIdea: boolean;
    isTranscribing: boolean;
    handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    enhancingState: { type: 'concept' | 'style' | 'character'; index?: number; field?: never } | { type: 'scene'; index: number; field: 'description' | 'actions' } | null;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'characterReferenceImageId' | 'styleReferenceImageId') => void;
    removeReferenceImage: (field: 'characterReferenceImageId' | 'styleReferenceImageId') => void;
    handleGenerateConcept: () => void;
    isGeneratingConcept: boolean;
    handleGenerateScenes: () => void;
    isGeneratingScenes: boolean;
    isBatchGenerating: boolean;
    generatingImages: Set<number>;
    imageGenerationErrors: Map<number, string>;
    editingImageIndex: number | null;
    activeModalIndex: number | null;
    setActiveModalIndex: React.Dispatch<React.SetStateAction<number | null>>;
    handleSceneFieldChange: (index: number, field: 'description' | 'actions', value: string) => void;
    handleEnhanceScene: (index: number, field: 'description' | 'actions') => void;
    generateImageForScene: (index: number) => Promise<void>;
    handleBatchGenerateImages: () => Promise<void>;
    handleEditImage: (sceneIndex: number, maskData: string, editPrompt: string) => Promise<void>;
    handleDownloadImage: (imageId: string) => Promise<void>;
    handleDownloadAllImages: () => Promise<void>;
    isDownloadingAll: boolean;
    handleExportStoryboard: () => void;
    isPreviewModeActive: boolean;
    setIsPreviewModeActive: React.Dispatch<React.SetStateAction<boolean>>;
}

const MainContent: React.FC<MainContentProps> = ({
    currentProject,
    updateCurrentProject,
    handleEnhance,
    handleGenerateIdea,
    isGeneratingIdea,
    isTranscribing,
    handleAudioUpload,
    enhancingState,
    handleImageUpload,
    removeReferenceImage,
    handleGenerateConcept,
    isGeneratingConcept,
    handleGenerateScenes,
    isGeneratingScenes,
    isBatchGenerating,
    generatingImages,
    imageGenerationErrors,
    editingImageIndex,
    activeModalIndex,
    setActiveModalIndex,
    handleSceneFieldChange,
    handleEnhanceScene,
    generateImageForScene,
    handleBatchGenerateImages,
    handleEditImage,
    handleDownloadImage,
    handleDownloadAllImages,
    isDownloadingAll,
    handleExportStoryboard,
    isPreviewModeActive,
    setIsPreviewModeActive,
}) => {

    if (!currentProject) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">Error</h2>
                <p className="text-gray-400 mb-6">No project is currently selected. Please return to the hub to select a project.</p>
            </div>
        );
    }

    const scenesWithoutImages = currentProject.storyboard.filter(s => !s.imageHistory || s.imageHistory.length === 0).length;
    
    const imagesToDownloadCount = useMemo(() => {
        return currentProject.storyboard.reduce((acc, scene) => {
            return acc + (scene.imageHistory?.flat().length || 0);
        }, 0);
    }, [currentProject.storyboard]);

    const hasImages = useMemo(() => currentProject.storyboard.some(s => s.imageHistory && s.imageHistory.length > 0), [currentProject.storyboard]);

    return (
        <>
            <header className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                    Music Video Outline Generator
                </h1>
                <p className="mt-2 text-gray-400">Bring your vision to life, from concept to storyboard.</p>
            </header>

            <main className="flex flex-col gap-8">
                 <div className="mb-4">
                    <label htmlFor="project-name" className="sr-only">Project Name</label>
                    <input
                        type="text"
                        id="project-name"
                        value={currentProject.name}
                        onChange={(e) => updateCurrentProject({ name: e.target.value })}
                        placeholder="Enter Project Title"
                        className="w-full bg-transparent text-3xl font-bold text-gray-100 border-0 border-b-2 border-gray-700 focus:ring-0 focus:border-cyan-400 transition-colors duration-300 p-2 -ml-2"
                        aria-label="Project Title"
                    />
                </div>
                <CreativeBrief
                    currentProject={currentProject}
                    updateCurrentProject={updateCurrentProject}
                    handleEnhance={handleEnhance}
                    handleGenerateIdea={handleGenerateIdea}
                    isGeneratingIdea={isGeneratingIdea}
                    isTranscribing={isTranscribing}
                    handleAudioUpload={handleAudioUpload}
                    enhancingState={enhancingState}
                    handleImageUpload={handleImageUpload}
                    removeReferenceImage={removeReferenceImage}
                    handleGenerateConcept={handleGenerateConcept}
                    isGeneratingConcept={isGeneratingConcept}
                    handleGenerateScenes={handleGenerateScenes}
                    isGeneratingScenes={isGeneratingScenes}
                />

                {currentProject.storyboard.length > 0 && (
                    <section className="flex flex-col gap-4">
                        <div className="flex flex-col items-center gap-4">
                            <h2 className="text-2xl font-bold text-center">Your Storyboard</h2>
                            <div className="flex flex-wrap justify-center items-center gap-4">
                                <button
                                    onClick={handleBatchGenerateImages}
                                    disabled={isBatchGenerating || scenesWithoutImages === 0 || !!enhancingState}
                                    className="w-full md:w-auto bg-gradient-to-r from-teal-500 to-sky-600 text-white font-bold py-3 px-8 rounded-lg hover:from-teal-400 hover:to-sky-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
                                >
                                    {isBatchGenerating ? (
                                        <><Spinner /><span>Generating Images...</span></>
                                    ) : (
                                        <span>{`Generate All Images (${scenesWithoutImages} remaining)`}</span>
                                    )}
                                </button>
                                {hasImages && (
                                    <button
                                        onClick={() => setIsPreviewModeActive(true)}
                                        disabled={!currentProject.audioId}
                                        className="w-full md:w-auto bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:from-cyan-400 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={!currentProject.audioId ? "Upload audio to enable preview" : "Open cinematic preview"}
                                    >
                                        <FilmIcon className="w-5 h-5"/>
                                        <span>Cinematic Preview</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleExportStoryboard}
                                    className="w-full md:w-auto bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
                                >
                                    Export JSON (Text Only)
                                </button>
                                <button
                                    onClick={handleDownloadAllImages}
                                    disabled={isDownloadingAll || imagesToDownloadCount === 0}
                                    className="w-full md:w-auto bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
                                >
                                    {isDownloadingAll ? (
                                        <><Spinner className="w-5 h-5"/><span>Zipping...</span></>
                                    ) : (
                                        <><DownloadIcon className="w-5 h-5"/><span>{`Download All (${imagesToDownloadCount})`}</span></>
                                    )}
                                </button>
                            </div>
                        </div>

                        {currentProject.storyboard.map((scene, index) => (
                            <SceneBlock
                                key={index}
                                scene={scene}
                                index={index}
                                enhancingState={enhancingState?.type === 'scene' && enhancingState.index === index ? enhancingState : null}
                                isGeneratingImage={generatingImages.has(index)}
                                imageGenerationErrorMessage={imageGenerationErrors.get(index)}
                                onFieldChange={handleSceneFieldChange}
                                onEnhance={handleEnhanceScene}
                                onGenerateImage={generateImageForScene}
                                onRegenerateImage={generateImageForScene}
                                onImageClick={setActiveModalIndex}
                            />
                        ))}
                    </section>
                )}

            </main>

            {activeModalIndex !== null && currentProject.storyboard[activeModalIndex] && (
                <ImageModal
                    scene={currentProject.storyboard[activeModalIndex]}
                    sceneIndex={activeModalIndex}
                    onClose={() => setActiveModalIndex(null)}
                    onDownload={handleDownloadImage}
                    onEdit={handleEditImage}
                    isEditing={editingImageIndex === activeModalIndex}
                />
            )}
            
            {isPreviewModeActive && (
                <CinematicPreview
                    scenes={currentProject.storyboard}
                    audioId={currentProject.audioId}
                    onClose={() => setIsPreviewModeActive(false)}
                />
            )}
        </>
    );
};


const App: React.FC = () => {
    const [view, setView] = useState<'start_screen' | 'project_view'>('start_screen');
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProjectIndex, setCurrentProjectIndex] = useState<number | null>(null);

    // Transient UI state
    const [isGeneratingConcept, setIsGeneratingConcept] = useState<boolean>(false);
    const [isGeneratingScenes, setIsGeneratingScenes] = useState<boolean>(false);
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [isGeneratingIdea, setIsGeneratingIdea] = useState<boolean>(false);
    const [enhancingState, setEnhancingState] = useState<{ type: 'concept' | 'style' | 'character'; index?: number; field?: never } | { type: 'scene'; index: number; field: 'description' | 'actions' } | null>(null);
    const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
    const [generatingImages, setGeneratingImages] = useState<Set<number>>(new Set());
    const [imageGenerationErrors, setImageGenerationErrors] = useState<Map<number, string>>(new Map());
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
    const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
    const [isPreviewModeActive, setIsPreviewModeActive] = useState<boolean>(false);


    const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [dailyRequestCount, setDailyRequestCount] = useState<number>(0);
    const [deletingProjectIndex, setDeletingProjectIndex] = useState<number | null>(null);

    const saveTimeoutRef = useRef<number | null>(null);
    const projectsRef = useRef(projects);
    const isInitialMount = useRef(true);

    const currentProject = currentProjectIndex !== null ? projects[currentProjectIndex] : null;
    
    useEffect(() => {
        dbService.initDB();
    }, []);
    
    // Load and reset daily counter if needed
    useEffect(() => {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('geminiDailyCount');
        if (stored) {
            try {
                const { date, count } = JSON.parse(stored);
                if (date === today) {
                    setDailyRequestCount(count);
                } else {
                    localStorage.setItem('geminiDailyCount', JSON.stringify({ date: today, count: 0 }));
                    setDailyRequestCount(0);
                }
            } catch {
                 localStorage.setItem('geminiDailyCount', JSON.stringify({ date: today, count: 0 }));
            }
        } else {
            localStorage.setItem('geminiDailyCount', JSON.stringify({ date: today, count: 0 }));
        }
    }, []);

    // Proactively check storage quota
    useEffect(() => {
        const checkStorage = async () => {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                try {
                    const { usage, quota } = await navigator.storage.estimate();
                    if (usage && quota && (usage / quota) > 0.8) {
                        alert('Warning: Local storage usage is over 80%. Consider deleting old projects to avoid save failures.');
                    }
                } catch (error) {
                    console.warn("Could not estimate storage quota.", error);
                }
            }
        };
        checkStorage();
        const interval = setInterval(checkStorage, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);


    // Load projects from IndexedDB on mount
    useEffect(() => {
        dbService.getProjects().then(projectsFromDb => {
            const validProjects = Array.isArray(projectsFromDb) ? projectsFromDb.filter(isProject) : [];
            setProjects(validProjects);
        }).catch(error => {
            console.error("Failed to load projects from IndexedDB", error);
            setProjects([]);
        });
    }, []);

    // Keep a ref to projects for callbacks that shouldn't re-run on every project change
    useEffect(() => {
        projectsRef.current = projects;
    }, [projects]);
    
    // Centralized auto-save logic that triggers on any change to the projects array
    useEffect(() => {
        // Don't save on the initial render cycle.
        // The load effect will populate projects, and its state update will trigger this effect again.
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setSaveStatus('saving');
        saveTimeoutRef.current = window.setTimeout(async () => {
            try {
                // Use the state directly, as this effect is dependent on it
                await dbService.saveProjects(projects);
                setSaveStatus('saved');
            } catch (error) {
                console.error("Failed to auto-save projects to IndexedDB", error);
                setSaveStatus('error');
                if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                    alert("Storage limit reached. Could not save project changes. Please delete old projects or images to free up space.");
                }
            }
        }, 1000); // Save 1 second after last change
    }, [projects]);

    const updateCurrentProject = useCallback((updater: Partial<Project> | ((prevProject: Project) => Partial<Project>)) => {
        if (currentProjectIndex === null) return;

        setProjects(prevProjects =>
            prevProjects.map((proj, index) => {
                if (index !== currentProjectIndex) return proj;
                const updatedFields = typeof updater === 'function' ? updater(proj) : updater;
                
                return { ...proj, ...updatedFields, id: proj.id };
            })
        );
    }, [currentProjectIndex]);

    const handleNewProject = () => {
        const newProject = createNewProject();
        const newIndex = projects.length;
        setProjects(prev => [...prev, newProject]);
        setCurrentProjectIndex(newIndex);
        setView('project_view');
    };

    const handleDeleteProject = async (index: number) => {
        if (deletingProjectIndex !== null) return;
        if (!window.confirm(`Are you sure you want to delete "${projects[index].name}"?`)) return;
        
        setDeletingProjectIndex(index);

        try {
            const projectToDelete = projects[index];
            const assetsToDelete: string[] = [];
            if (projectToDelete.characterReferenceImageId) assetsToDelete.push(projectToDelete.characterReferenceImageId);
            if (projectToDelete.styleReferenceImageId) assetsToDelete.push(projectToDelete.styleReferenceImageId);
            if (projectToDelete.audioId) assetsToDelete.push(projectToDelete.audioId);

            projectToDelete.storyboard.forEach(scene => {
                scene.imageHistory?.forEach(historySet => assetsToDelete.push(...historySet));
            });

            await Promise.all(assetsToDelete.map(id => dbService.deleteImage(id).catch(e => console.error(`Failed to delete asset ${id}`, e))));

            const newProjects = projects.filter((_, i) => i !== index);
            setProjects(newProjects);

            if (currentProjectIndex === index) {
                setCurrentProjectIndex(newProjects.length > 0 ? 0 : null);
            } else if (currentProjectIndex !== null && currentProjectIndex > index) {
                setCurrentProjectIndex(currentProjectIndex - 1);
            }
        } catch (error) {
            console.error("Error during project deletion:", error);
        } finally {
             setDeletingProjectIndex(null);
        }
    };
    
    const handleRevertProject = (index: number) => {
        if (currentProjectIndex !== index) {
            alert("Please select the project before reverting.");
            return;
        }
        const projectToRevert = projects[index];
        const snapshotsJSON = localStorage.getItem(`projectSnapshots_${projectToRevert.id}`);
        if (!snapshotsJSON) {
            alert("No previous versions found to revert to.");
            return;
        }
        
        try {
            const snapshots: ProjectSnapshot[] = JSON.parse(snapshotsJSON);
            if (snapshots.length > 0) {
                if (!window.confirm("Are you sure you want to revert to the last saved version? This will overwrite your current changes.")) return;
                
                const lastSnapshot = snapshots.pop();
                // FIX: Validate the project from localStorage with a type guard.
                // This ensures the object conforms to the Project interface and resolves a TypeScript error
                // caused by type widening when combining a validated state object with an unvalidated one from storage.
                if (lastSnapshot) {
                    if (isProject(lastSnapshot.project)) {
                        setProjects(prev => prev.map((p, i) => i === index ? lastSnapshot.project : p));
                        localStorage.setItem(`projectSnapshots_${projectToRevert.id}`, JSON.stringify(snapshots));
                    } else {
                        alert("Could not revert. The saved version is invalid and will be discarded.");
                        // Save snapshots with the invalid one removed
                        localStorage.setItem(`projectSnapshots_${projectToRevert.id}`, JSON.stringify(snapshots));
                    }
                }
            } else {
                alert("No previous versions found to revert to.");
            }
        } catch (error) {
            console.error("Failed to revert project", error);
            alert("Could not revert to the previous version.");
        }
    };

    const handleRenameProject = (index: number, newName: string) => {
         setProjects(prev => prev.map((p, i) => i === index ? { ...p, name: newName } : p));
    };

    const handleEnhance = useCallback(async (type: 'concept' | 'style' | 'character', field: 'concept' | 'customStyle' | 'characterPrompt') => {
        if (!currentProject) return;
        setEnhancingState({ type });
        const text = currentProject[field];
        const context = {
            concept: "a music video concept logline",
            style: "a music video's visual style guide",
            character: "descriptions of characters and props"
        }[type];
        const enhanced = await enhanceText(text, context);
        updateCurrentProject({ [field]: enhanced });
        setEnhancingState(null);
    }, [currentProject, updateCurrentProject]);

    const handleGenerateIdea = useCallback(async () => {
        if (!currentProject || !currentProject.lyrics || isTranscribing) return;

        setIsGeneratingIdea(true);
        try {
            const idea = await generateIdeaFromLyrics(currentProject.lyrics);
            updateCurrentProject({ ideaPrompt: idea });
        } catch (error) {
            console.error("Failed to generate idea:", error);
            updateCurrentProject({ ideaPrompt: "Error: Could not generate an idea. Please try again." });
        } finally {
            setIsGeneratingIdea(false);
        }
    }, [currentProject, isTranscribing, updateCurrentProject]);


    const handleGenerateConcept = useCallback(async () => {
        if (!currentProject) return;

        setIsGeneratingConcept(true);
        updateCurrentProject({ storyboard: [], concept: '', narrativeArc: '' });
        const finalStylePrompt = currentProject.selectedStyle === 'Custom' ? currentProject.customStyle : STYLE_PRESETS[currentProject.selectedStyle];

        const { logline, narrativeArc } = await generateConceptFromBrief(
            currentProject.ideaPrompt,
            currentProject.lyrics,
            currentProject.characterPrompt,
            finalStylePrompt
        );
        updateCurrentProject({ concept: logline, narrativeArc });
        setIsGeneratingConcept(false);

    }, [currentProject, updateCurrentProject]);
    
    const handleGenerateScenes = useCallback(async () => {
        if (!currentProject || !currentProject.concept) return;

        // Save snapshot before major changes
        const snapshotsJSON = localStorage.getItem(`projectSnapshots_${currentProject.id}`);
        let snapshots: ProjectSnapshot[] = [];
        if (snapshotsJSON) {
            try { snapshots = JSON.parse(snapshotsJSON); } catch { /* ignore */ }
        }
        snapshots.push({ timestamp: Date.now(), project: { ...currentProject } });
        if (snapshots.length > 3) snapshots.shift(); // Limit to 3 versions
        localStorage.setItem(`projectSnapshots_${currentProject.id}`, JSON.stringify(snapshots));

        setIsGeneratingScenes(true);
        const finalStylePrompt = currentProject.selectedStyle === 'Custom' ? currentProject.customStyle : STYLE_PRESETS[currentProject.selectedStyle];

        const { storyboard } = await generateStoryboardFromScenes(
            currentProject.concept,
            currentProject.narrativeArc,
            currentProject.lyrics,
            currentProject.characterPrompt,
            finalStylePrompt
        );

        updateCurrentProject({ storyboard });
        setIsGeneratingScenes(false);
    }, [currentProject, updateCurrentProject]);


    const handleSceneFieldChange = useCallback((index: number, field: 'description' | 'actions', value: string) => {
        updateCurrentProject(prevProject => {
            const newStoryboard = prevProject.storyboard.map((scene, i) =>
                i === index ? { ...scene, [field]: value } : scene
            );
            return { storyboard: newStoryboard };
        });
    }, [updateCurrentProject]);

    const handleEnhanceScene = useCallback(async (index: number, field: 'description' | 'actions') => {
        if (currentProjectIndex === null) return;
        const project = projectsRef.current[currentProjectIndex];
        if (!project) return;

        setEnhancingState({ type: 'scene', index, field });
        
        const sceneToEnhance = project.storyboard[index];
        const finalStylePrompt = project.selectedStyle === 'Custom' ? project.customStyle : STYLE_PRESETS[project.selectedStyle];
        
        let context = '';
        let textToEnhance = '';

        if (field === 'description') {
            textToEnhance = sceneToEnhance.description;
            context = `For a music video scene, enhance this visual description. Concept: ${project.concept} | Narrative Arc: ${project.narrativeArc} | Style: ${finalStylePrompt} | Characters: ${project.characterPrompt}. The corresponding lyric is "${sceneToEnhance.lyric}".`;
        } else { // field === 'actions'
            textToEnhance = sceneToEnhance.actions || '';
            context = `For a music video scene, enhance these character/object actions to be more dynamic and cinematic. The scene's visual description is "${sceneToEnhance.description}". The style is "${finalStylePrompt}". The lyric is "${sceneToEnhance.lyric}". Focus on vivid verbs and impactful movements.`;
        }

        const enhanced = await enhanceText(textToEnhance, context);
        
        updateCurrentProject(prevProject => {
            const newStoryboard = prevProject.storyboard.map((scene, i) =>
                i === index ? { ...scene, [field]: enhanced } : scene
            );
            return { storyboard: newStoryboard };
        });
        
        setEnhancingState(null);
    }, [currentProjectIndex, updateCurrentProject]);

    const generateImageForScene = useCallback(async (index: number) => {
        if (currentProjectIndex === null) return;
        
        if (dailyRequestCount >= 50) { // Safety limit for free tier
            const error = new Error('Daily API request limit approached. Please wait until tomorrow.');
            setImageGenerationErrors(prev => new Map(prev).set(index, error.message));
            throw error;
        }

        setGeneratingImages(prev => new Set(prev).add(index));
        setImageGenerationErrors(prev => {
            const newErrors = new Map(prev);
            newErrors.delete(index);
            return newErrors;
        });

        const project = projectsRef.current[currentProjectIndex];
        if (!project) {
            setGeneratingImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(index);
                return newSet;
            });
            return;
        }

        try {
            const sceneToGenerate = project.storyboard[index];
            const finalStylePrompt = project.selectedStyle === 'Custom' ? project.customStyle : STYLE_PRESETS[project.selectedStyle];
            
            const fetchRefImage = async (id: string | null) => {
                if (!id) return null;
                const blob = await dbService.getImage(id);
                if (!blob) return null;
                const dataUrl = await blobToBase64(blob);
                const [mimeTypePart, data] = dataUrl.split(';base64,');
                return { data, mimeType: mimeTypePart.split(':')[1] };
            };
            const charRef = await fetchRefImage(project.characterReferenceImageId);
            const styleRef = await fetchRefImage(project.styleReferenceImageId);
        
            const imageUrls = await generateImage(sceneToGenerate, index, project.storyboard, finalStylePrompt, project.characterPrompt, project.numVariants, charRef, styleRef);
            
            let imageIds: string[];
            try {
                imageIds = await Promise.all(imageUrls.map(async url => {
                    const { blob } = await dataUrlToBlob(url);
                    return dbService.saveImage(blob);
                }));
            } catch (dbError: any) {
                if (dbError instanceof DOMException && dbError.name === 'QuotaExceededError') {
                    console.error("IndexedDB quota exceeded.", dbError);
                    alert("Storage limit reached. Could not save new image. Please delete old projects or images to free up space.");
                    throw new Error("Storage limit reached. Please free up space.");
                }
                throw dbError; // Re-throw other DB errors
            }

            const newCount = dailyRequestCount + 1;
            setDailyRequestCount(newCount);
            const today = new Date().toDateString();
            localStorage.setItem('geminiDailyCount', JSON.stringify({ date: today, count: newCount }));

            updateCurrentProject(prevProject => {
                const newStoryboard = prevProject.storyboard.map((scene, i) => {
                    if (i === index) {
                        const oldHistory = scene.imageHistory || [];
                        const newHistory = [...oldHistory, imageIds];
                        if (newHistory.length > 5) {
                            const removedSet = newHistory.shift(); // Remove oldest
                            if(removedSet) {
                                removedSet.forEach(id => dbService.deleteImage(id).catch(err => console.error(`Failed to delete old image ${id}`, err)));
                            }
                        }
                        return { ...scene, imageHistory: newHistory };
                    }
                    return scene;
                });
                return { storyboard: newStoryboard };
            });

        } catch (error: any) {
            console.error(`Image generation failed for scene ${index}:`, error);
            let msg = error.message || 'An unknown error occurred.';
            const errorString = String(error).toLowerCase();
            if (errorString.includes("429") || errorString.includes("rate limit") || errorString.includes("quota")) {
                msg = 'API rate limit exceeded. Please wait and try again.';
            } else if (errorString.includes("400") || errorString.includes("invalid")) {
                 msg = 'Invalid request—check prompt safety or format.';
            }
            setImageGenerationErrors(prev => new Map(prev).set(index, msg));
            throw error;
        } finally {
            setGeneratingImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(index);
                return newSet;
            });
        }
    }, [currentProjectIndex, updateCurrentProject, dailyRequestCount]);


    const handleBatchGenerateImages = useCallback(async () => {
        if (!currentProject) return;
    
        const scenesToGenerate = currentProject.storyboard
            .map((scene, index) => ({ scene, index }))
            .filter(({ scene }) => !scene.imageHistory || scene.imageHistory.length === 0);
        
        if (scenesToGenerate.length === 0) return;
        
        setIsBatchGenerating(true);
    
        for (const { index } of scenesToGenerate) {
            try {
                await generateImageForScene(index);
                // 1-second delay to stay within free tier RPM limits (60 RPM)
                await new Promise(resolve => setTimeout(resolve, 1000)); 
            } catch (error: any) {
                console.error(`Failed to generate image for scene ${index} during batch operation:`, error);
                 if (error.message.includes('Daily API request limit')) {
                    alert('Batch generation stopped: Daily API limit reached.');
                    break; 
                }
            }
        }
    
        setIsBatchGenerating(false);
    
    }, [currentProject, generateImageForScene]);

    const handleEditImage = useCallback(async (sceneIndex: number, maskData: string, editPrompt: string) => {
        if (!currentProject) return;
        if (dailyRequestCount >= 50) {
            alert('Daily API request limit approached. Please wait until tomorrow.');
            return;
        }

        setEditingImageIndex(sceneIndex);
        setImageGenerationErrors(prev => {
            const newErrors = new Map(prev);
            newErrors.delete(sceneIndex);
            return newErrors;
        });

        try {
            const sceneToEdit = currentProject.storyboard[sceneIndex];
            const latestImageSet = sceneToEdit.imageHistory?.[sceneToEdit.imageHistory.length - 1];
            if (!latestImageSet || latestImageSet.length === 0) throw new Error("No image to edit.");

            const originalImageId = latestImageSet[0];
            const originalImageBlob = await dbService.getImage(originalImageId);
            if (!originalImageBlob) throw new Error("Original image not found in database.");

            const originalImageDataUrl = await blobToBase64(originalImageBlob);
            const [originalMime, originalData] = originalImageDataUrl.split(';base64,');
            const originalImage = { data: originalData, mimeType: originalMime.split(':')[1] };
            
            const [maskMime, maskBase64] = maskData.split(';base64,');
            const maskImage = { data: maskBase64, mimeType: maskMime.split(':')[1] };
            
            const finalStylePrompt = currentProject.selectedStyle === 'Custom' ? currentProject.customStyle : STYLE_PRESETS[currentProject.selectedStyle];

            const fetchRefImage = async (id: string | null) => {
                if (!id) return null;
                const blob = await dbService.getImage(id);
                if (!blob) return null;
                const dataUrl = await blobToBase64(blob);
                const [mimeTypePart, data] = dataUrl.split(';base64,');
                return { data, mimeType: mimeTypePart.split(':')[1] };
            };
            const charRef = await fetchRefImage(currentProject.characterReferenceImageId);
            const styleRef = await fetchRefImage(currentProject.styleReferenceImageId);

            const editedImageUrls = await editImageWithMask(originalImage, maskImage, editPrompt, finalStylePrompt, currentProject.characterPrompt, charRef, styleRef, sceneToEdit);

            let editedImageIds: string[];
            try {
                editedImageIds = await Promise.all(editedImageUrls.map(async url => {
                    const { blob } = await dataUrlToBlob(url);
                    return dbService.saveImage(blob);
                }));
            } catch (dbError: any) {
                if (dbError instanceof DOMException && dbError.name === 'QuotaExceededError') {
                   console.error("IndexedDB quota exceeded during edit.", dbError);
                   alert("Storage limit reached. Could not save edited image. Please delete old projects or images to free up space.");
                   throw new Error("Storage limit reached. Please free up space.");
                }
                throw dbError;
            }
            
            const newCount = dailyRequestCount + 1;
            setDailyRequestCount(newCount);
            const today = new Date().toDateString();
            localStorage.setItem('geminiDailyCount', JSON.stringify({ date: today, count: newCount }));

            updateCurrentProject(prevProject => {
                const newStoryboard = prevProject.storyboard.map((scene, i) => {
                    if (i === sceneIndex) {
                        const newHistory = [...(scene.imageHistory || []), editedImageIds];
                        return { ...scene, imageHistory: newHistory };
                    }
                    return scene;
                });
                return { storyboard: newStoryboard };
            });
        } catch (error: any) {
            console.error("Image editing failed:", error);
            setImageGenerationErrors(prev => new Map(prev).set(sceneIndex, error.message || 'An unknown error occurred.'));
        } finally {
            setEditingImageIndex(null);
        }
    }, [currentProject, updateCurrentProject, dailyRequestCount]);

    const handleDownloadImage = async (imageId: string) => {
        const blob = await dbService.getImage(imageId);
        if (!blob) {
            alert("Could not find image to download.");
            return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scene_${imageId.substring(0, 8)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadAllImages = async () => {
        if (!currentProject || isDownloadingAll) return;
    
        const imagesToDownload: { id: string; name: string }[] = [];
        currentProject.storyboard.forEach((scene, sceneIndex) => {
            scene.imageHistory?.forEach((historySet, historyIndex) => {
                historySet.forEach((imageId, variantIndex) => {
                    const sceneNumber = String(sceneIndex + 1).padStart(2, '0');
                    const historyNumber = String(historyIndex + 1).padStart(2, '0');
                    const variantNumber = String(variantIndex + 1).padStart(2, '0');
                    const timestamp = scene.timestamp.replace(/[\[\]:.]/g, '');
                    const filename = `scene-${sceneNumber}_ts-${timestamp}_regen-${historyNumber}_var-${variantNumber}.png`;
                    imagesToDownload.push({ id: imageId, name: filename });
                });
            });
        });
    
        if (imagesToDownload.length === 0) {
            alert("No images have been generated for this project yet.");
            return;
        }
    
        setIsDownloadingAll(true);
    
        try {
            const zip = new JSZip();
            for (const imageInfo of imagesToDownload) {
                const blob = await dbService.getImage(imageInfo.id);
                if (blob) {
                    zip.file(imageInfo.name, blob);
                }
            }
    
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            const projectName = currentProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `${projectName}_images.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
    
        } catch (error) {
            console.error("Failed to create or download zip file:", error);
            alert("An error occurred while preparing your download. Please try again.");
        } finally {
            setIsDownloadingAll(false);
        }
    };
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'characterReferenceImageId' | 'styleReferenceImageId') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file (e.g., PNG, JPG, WEBP).');
            return;
        }

        const currentId = currentProject?.[field];
        if (currentId) await dbService.deleteImage(currentId).catch(err => console.error(err));
        
        const newId = await dbService.saveImage(file);
        updateCurrentProject({ [field]: newId });

        e.target.value = '';
    };

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentProject) return;

        if (!file.type.startsWith('audio/')) {
            alert('Please upload a valid audio file (e.g., MP3, WAV, OGG).');
            return;
        }
        if (file.size > 20 * 1024 * 1024) { // 20MB limit
            alert('File is too large. Please upload an audio file under 20MB.');
            return;
        }

        setIsTranscribing(true);
        
        const currentAudioId = currentProject.audioId;
        if(currentAudioId) await dbService.deleteImage(currentAudioId).catch(console.error);

        const newAudioId = await dbService.saveImage(file);
        updateCurrentProject({ lyrics: `[Transcribing ${file.name}...]`, audioId: newAudioId });

        try {
            const dataUrl = await blobToBase64(file);
            const [, data] = dataUrl.split(';base64,');
            const audioPayload = { data, mimeType: file.type };
            const transcribedLyrics = await transcribeAudio(audioPayload);
            updateCurrentProject({ lyrics: transcribedLyrics });
        } catch (error) {
            console.error("Transcription failed:", error);
            updateCurrentProject({ lyrics: `Error during transcription. Please try again.` });
        } finally {
            setIsTranscribing(false);
            e.target.value = '';
        }
    };

    const removeReferenceImage = async (field: 'characterReferenceImageId' | 'styleReferenceImageId') => {
        if (!currentProject) return;
        const currentId = currentProject[field];
        if (currentId) {
            await dbService.deleteImage(currentId).catch(err => console.error(err));
        }
        updateCurrentProject({ [field]: null });
    };

    const handleExportStoryboard = useCallback(() => {
        if (!currentProject || currentProject.storyboard.length === 0) {
            alert('No storyboard available to export.');
            return;
        }
        const exportData = {
            logline: currentProject.concept,
            narrativeArc: currentProject.narrativeArc,
            storyboard: currentProject.storyboard.map(scene => ({
                timestamp: scene.timestamp,
                description: scene.description,
                actions: scene.actions,
                cameraAngle: scene.cameraAngle,
                lyric: scene.lyric,
                section: scene.section,
            })),
        };
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentProject.name.replace(/\s+/g, '_')}_storyboard.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [currentProject]);

    return (
        <div className="flex min-h-screen bg-gray-900 text-gray-200 font-sans">
            {view === 'start_screen' ? (
                <StartScreen 
                    projects={projects}
                    onSelectProject={(index) => {
                        setCurrentProjectIndex(index);
                        setView('project_view');
                    }}
                    onNewProject={handleNewProject}
                    onDeleteProject={handleDeleteProject}
                    deletingProjectIndex={deletingProjectIndex}
                />
            ) : (
                <>
                    <ProjectSidebar 
                        projects={projects}
                        currentProjectIndex={currentProjectIndex}
                        onSelectProject={setCurrentProjectIndex}
                        onNewProject={handleNewProject}
                        onDeleteProject={handleDeleteProject}
                        onRenameProject={handleRenameProject}
                        saveStatus={saveStatus}
                        deletingProjectIndex={deletingProjectIndex}
                        onRevertProject={handleRevertProject}
                        onGoToHub={() => {
                            setCurrentProjectIndex(null);
                            setView('start_screen');
                        }}
                    />
                    <div className="flex-grow p-4 md:p-8 overflow-y-auto h-screen">
                        <div className="max-w-5xl mx-auto">
                            <MainContent 
                                currentProject={currentProject}
                                updateCurrentProject={updateCurrentProject}
                                handleEnhance={handleEnhance}
                                handleGenerateIdea={handleGenerateIdea}
                                isGeneratingIdea={isGeneratingIdea}
                                isTranscribing={isTranscribing}
                                handleAudioUpload={handleAudioUpload}
                                enhancingState={enhancingState}
                                handleImageUpload={handleImageUpload}
                                removeReferenceImage={removeReferenceImage}
                                handleGenerateConcept={handleGenerateConcept}
                                isGeneratingConcept={isGeneratingConcept}
                                handleGenerateScenes={handleGenerateScenes}
                                isGeneratingScenes={isGeneratingScenes}
                                isBatchGenerating={isBatchGenerating}
                                generatingImages={generatingImages}
                                imageGenerationErrors={imageGenerationErrors}
                                editingImageIndex={editingImageIndex}
                                activeModalIndex={activeModalIndex}
                                setActiveModalIndex={setActiveModalIndex}
                                handleSceneFieldChange={handleSceneFieldChange}
                                handleEnhanceScene={handleEnhanceScene}
                                generateImageForScene={generateImageForScene}
                                handleBatchGenerateImages={handleBatchGenerateImages}
                                handleEditImage={handleEditImage}
                                handleDownloadImage={handleDownloadImage}
                                handleDownloadAllImages={handleDownloadAllImages}
                                isDownloadingAll={isDownloadingAll}
                                handleExportStoryboard={handleExportStoryboard}
                                isPreviewModeActive={isPreviewModeActive}
                                setIsPreviewModeActive={setIsPreviewModeActive}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default App;
