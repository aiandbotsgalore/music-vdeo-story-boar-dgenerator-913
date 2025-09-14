import React, { useState, useCallback } from 'react';
import type { Scene } from '../types';
import Spinner from './Spinner';
import MaskingCanvas from './MaskingCanvas';
import CloseIcon from './CloseIcon';
import DownloadIcon from './DownloadIcon';
import EditIcon from './EditIcon';
import { useImageUrl } from '../hooks/useImageUrl';
import AsyncImage from './AsyncImage';

interface ImageModalProps {
  scene: Scene;
  sceneIndex: number;
  onClose: () => void;
  onDownload: (imageId: string) => void;
  onEdit: (sceneIndex: number, maskData: string, editPrompt: string) => void;
  isEditing: boolean;
}

const ImageModal: React.FC<ImageModalProps> = ({ scene, sceneIndex, onClose, onDownload, onEdit, isEditing }) => {
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(scene.imageHistory ? scene.imageHistory.length - 1 : 0);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const [maskData, setMaskData] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState('');

  const activeImageArray = scene.imageHistory?.[activeHistoryIndex] || [];
  const activeImageId = activeImageArray[activeVariantIndex];
  const activeImageUrl = useImageUrl(activeImageId);

  const handleEditSubmit = useCallback(() => {
    if (!maskData || !editPrompt) {
      alert("Please create a mask and provide an edit description.");
      return;
    }
    onEdit(sceneIndex, maskData, editPrompt);
  }, [sceneIndex, maskData, editPrompt, onEdit]);
  
  if (!scene) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col gap-4 p-5 border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-cyan-400">Scene: {scene.timestamp}</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 transition-colors">
                <CloseIcon />
            </button>
        </div>

        <div className="flex-grow relative flex items-center justify-center bg-black rounded-lg min-h-[30vh]">
            {isEditing && editMode ? (
                 <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center">
                    <Spinner className='w-10 h-10' />
                    <p className='mt-2 text-gray-300'>Applying your edits...</p>
                 </div>
            ) : editMode ? (
                 activeImageUrl ? (
                    <div className='w-full max-w-2xl mx-auto'>
                        <p className="text-center text-gray-300 mb-2 text-sm">Draw on the image to select the area you want to change.</p>
                        <MaskingCanvas baseImageSrc={activeImageUrl} onMaskReady={setMaskData} />
                    </div>
                ) : <Spinner />
            ) : (
                activeImageUrl ? (
                    <img src={activeImageUrl} alt={`Visual for ${scene.timestamp}`} className="max-h-[50vh] w-auto object-contain rounded-lg" />
                ) : <Spinner />
            )}
        </div>
        
        {editMode ? (
            <div className="flex gap-4">
                <input
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Describe your change, e.g., 'make the jacket red'"
                    className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 transition-all text-gray-200"
                    disabled={isEditing}
                />
                <button onClick={handleEditSubmit} disabled={isEditing || !editPrompt} className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-500 transition-colors disabled:bg-gray-600">
                    {isEditing ? 'Applying...' : 'Apply Edit'}
                </button>
                <button onClick={() => setEditMode(false)} disabled={isEditing} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-500 transition-colors disabled:opacity-50">
                    Cancel
                </button>
            </div>
        ) : (
            <div className="flex justify-between items-center">
                <div className="flex gap-3">
                    <button onClick={() => activeImageId && onDownload(activeImageId)} disabled={!activeImageId} className="flex items-center gap-2 bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50">
                        <DownloadIcon className='w-5 h-5'/> Download
                    </button>
                    <button onClick={() => setEditMode(true)} disabled={!activeImageId} className="flex items-center gap-2 bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50">
                        <EditIcon className='w-5 h-5' /> Edit with Mask
                    </button>
                </div>
                 {activeImageArray.length > 1 && (
                    <div className="flex justify-center gap-2">
                        <span className="text-sm self-center mr-2 text-gray-400">Variants:</span>
                        {activeImageArray.map((id, idx) => (
                            <button key={`var-${id}`} onClick={() => setActiveVariantIndex(idx)} className={`w-16 h-9 rounded-md overflow-hidden transition-all duration-200 ring-2 ${activeVariantIndex === idx ? 'ring-cyan-400' : 'ring-transparent hover:ring-gray-500'}`}>
                               <AsyncImage imageId={id} alt={`Variant ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}

        {scene.imageHistory && scene.imageHistory.length > 1 && (
            <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">History:</h3>
                <div className="flex gap-2 pb-2 overflow-x-auto">
                    {scene.imageHistory.map((historyItem, idx) => (
                         <button key={`hist-${idx}-${historyItem[0]}`} onClick={() => {setActiveHistoryIndex(idx); setActiveVariantIndex(0);}} className={`w-20 h-12 rounded-md overflow-hidden transition-all duration-200 ring-2 flex-shrink-0 ${activeHistoryIndex === idx ? 'ring-purple-400' : 'ring-transparent hover:ring-gray-500'}`}>
                           <AsyncImage imageId={historyItem[0]} alt={`History ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageModal;