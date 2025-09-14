
import React from 'react';
import type { Project } from '../types';
import TrashIcon from './TrashIcon';
import EditIcon from './EditIcon';
import Spinner from './Spinner';
import CheckIcon from './CheckIcon';
import UndoIcon from './UndoIcon';
import HomeIcon from './HomeIcon';


interface ProjectSidebarProps {
  projects: Project[];
  currentProjectIndex: number | null;
  onSelectProject: (index: number) => void;
  onNewProject: () => void;
  onDeleteProject: (index: number) => void;
  onRenameProject: (index: number, newName: string) => void;
  saveStatus: 'saved' | 'saving' | 'error';
  deletingProjectIndex: number | null;
  onRevertProject: (index: number) => void;
  onGoToHub: () => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  currentProjectIndex,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onRenameProject,
  saveStatus,
  deletingProjectIndex,
  onRevertProject,
  onGoToHub,
}) => {
    
  const handleRename = (index: number, currentName: string) => {
    const newName = prompt("Enter new project name:", currentName);
    if (newName && newName.trim() !== "") {
      onRenameProject(index, newName.trim());
    }
  };

  const getSaveStatusContent = () => {
    switch (saveStatus) {
        case 'saving':
            return (
                <>
                    <Spinner className="w-3 h-3" />
                    <span>Saving...</span>
                </>
            );
        case 'error':
            return (
                <span className='text-red-400'>Save failed</span>
            );
        case 'saved':
        default:
            return (
                 <div className='flex items-center gap-1.5 text-gray-400'>
                    <CheckIcon className="w-4 h-4 text-green-400" />
                    <span>All changes saved.</span>
                </div>
            );
    }
  }
    
  return (
    <aside className="w-64 bg-gray-900/50 border-r border-gray-700 p-4 flex flex-col h-screen sticky top-0">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          My Projects
        </h2>
        <button onClick={onGoToHub} title="Back to Project Hub" className="p-1 text-gray-400 hover:text-white transition-colors">
            <HomeIcon className='w-6 h-6' />
        </button>
      </div>
      <button
        onClick={onNewProject}
        className="w-full bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 transition-colors duration-200 mb-4"
      >
        + New Project
      </button>
      <nav className="flex-grow overflow-y-auto">
        <ul>
          {projects.map((project, index) => (
            <li key={project.id} className="mb-2">
              <div
                onClick={() => onSelectProject(index)}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  currentProjectIndex === index
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="truncate flex-grow mr-2">{project.name}</span>
                <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {currentProjectIndex === index && (
                       <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRevertProject(index);
                            }}
                            className="p-1 hover:text-cyan-400"
                            aria-label="Revert to previous version"
                            title="Revert to previous version"
                        >
                           <UndoIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRename(index, project.name);
                        }}
                        className="p-1 hover:text-yellow-400"
                        aria-label="Rename project"
                    >
                       <EditIcon className="w-4 h-4" />
                    </button>
                    {deletingProjectIndex === index ? (
                        <Spinner className="w-4 h-4 text-gray-400 mx-1" />
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteProject(index);
                            }}
                            className="p-1 hover:text-red-400"
                            aria-label="Delete project"
                        >
                           <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </nav>
      <div className="text-xs text-gray-500 text-center mt-2 flex items-center justify-center gap-2 h-5">
        {getSaveStatusContent()}
      </div>
    </aside>
  );
};

export default ProjectSidebar;
