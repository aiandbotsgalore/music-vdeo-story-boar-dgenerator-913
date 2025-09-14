
import React from 'react';
import type { Project } from '../types';
import Spinner from './Spinner';
import TrashIcon from './TrashIcon';
import UploadIcon from './UploadIcon';
import FolderIcon from './FolderIcon';

interface StartScreenProps {
  projects: Project[];
  onSelectProject: (index: number) => void;
  onNewProject: () => void;
  onDeleteProject: (index: number) => Promise<void>;
  deletingProjectIndex: number | null;
}

const StartScreen: React.FC<StartScreenProps> = ({ projects, onSelectProject, onNewProject, onDeleteProject, deletingProjectIndex }) => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gray-900 text-white">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          Music Video Outline Generator
        </h1>
        <p className="mt-4 text-lg text-gray-400">Your vision, from concept to storyboard.</p>
      </header>
      
      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-gray-800/50 p-8 rounded-xl border-2 border-dashed border-gray-600 hover:border-cyan-500 transition-all duration-300 flex flex-col items-center justify-center text-center transform hover:-translate-y-1">
          <UploadIcon className="w-12 h-12 text-gray-500 mb-4" />
          <h2 className="text-2xl font-bold text-cyan-300">Start Fresh</h2>
          <p className="text-gray-400 mt-2 mb-6">Create a new project by uploading an audio track.</p>
          <button
            onClick={onNewProject}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:from-cyan-400 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
          >
            New Project
          </button>
        </section>

        <section className="bg-gray-800/50 p-8 rounded-xl border border-gray-700 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <FolderIcon className="w-8 h-8 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-300">My Projects</h2>
          </div>
          <div className="flex-grow max-h-64 overflow-y-auto pr-2 -mr-2">
            {projects.length > 0 ? (
              <ul className="space-y-3">
                {projects.map((project, index) => (
                  <li key={project.id} className="group flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <button onClick={() => onSelectProject(index)} className="truncate flex-grow text-left text-gray-300 group-hover:text-white transition-colors">
                      {project.name}
                    </button>
                    <div className="flex-shrink-0 ml-4">
                      {deletingProjectIndex === index ? (
                        <Spinner className="w-5 h-5 text-gray-400" />
                      ) : (
                        <button
                          onClick={() => onDeleteProject(index)}
                          className="p-1 text-gray-500 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-all"
                          aria-label={`Delete ${project.name}`}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-full">
                 <p className="text-gray-500 text-center">You have no saved projects.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default StartScreen;
