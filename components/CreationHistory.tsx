/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { ClockIcon, ArrowRightIcon, DocumentIcon, PhotoIcon, SparklesIcon, FolderIcon, ChevronLeftIcon, PlusIcon, PencilSquareIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export interface Folder {
    id: string;
    name: string;
}

export interface Creation {
  id: string;
  name: string;
  html?: string; // Deprecated, keeping for backward compatibility
  files?: Record<string, { content: string; language?: string }>; // New multi-file structure
  originalImage?: string; // Base64 data URL
  timestamp: Date;
  folderId?: string;
}

interface CreationHistoryProps {
  history: Creation[];
  folders: Folder[];
  isPro: boolean;
  onSelect: (creation: Creation) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onMoveCreation: (creationId: string, folderId: string | undefined) => void;
  onTriggerUpgrade: () => void;
}

export const CreationHistory: React.FC<CreationHistoryProps> = ({ 
    history, 
    folders, 
    isPro,
    onSelect, 
    onCreateFolder, 
    onRenameFolder, 
    onMoveCreation,
    onTriggerUpgrade
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [tempFolderName, setTempFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = folders.find(f => f.id === currentFolderId);
  // Filter content
  const visibleCreations = history.filter(c => c.folderId === currentFolderId);
  // Only show folders at root level
  const visibleFolders = currentFolderId ? [] : folders;

  useEffect(() => {
      if (isCreatingFolder && newFolderInputRef.current) {
          newFolderInputRef.current.focus();
          newFolderInputRef.current.select();
      }
  }, [isCreatingFolder]);

  const handleDragStart = (e: React.DragEvent, creationId: string) => {
      e.dataTransfer.setData("creationId", creationId);
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleDropOnFolder = (e: React.DragEvent, targetFolderId: string) => {
      e.preventDefault();
      const creationId = e.dataTransfer.getData("creationId");
      if (creationId) onMoveCreation(creationId, targetFolderId);
      setIsDragging(false);
  };

  const handleDropOnBack = (e: React.DragEvent) => {
      e.preventDefault();
      const creationId = e.dataTransfer.getData("creationId");
      if (creationId) onMoveCreation(creationId, undefined);
      setIsDragging(false);
  };

  const allowDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const startEditing = (folder: Folder) => { setEditingFolderId(folder.id); setTempFolderName(folder.name); };
  const saveEditing = () => { if (editingFolderId && tempFolderName.trim()) onRenameFolder(editingFolderId, tempFolderName.trim()); setEditingFolderId(null); };
  const handleStartCreating = () => { setIsCreatingFolder(true); setNewFolderName("New Folder"); };
  const handleConfirmCreating = () => { if (newFolderName.trim()) onCreateFolder(newFolderName.trim()); setIsCreatingFolder(false); };
  const handleCancelCreating = () => setIsCreatingFolder(false);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center space-x-3">
             <ClockIcon className="w-4 h-4 text-zinc-500" />
             <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                 {currentFolder ? currentFolder.name : 'Archive'}
             </h2>
             <div className="h-px w-8 bg-zinc-800"></div>
        </div>
        {!currentFolder && (
             <button onClick={handleStartCreating} disabled={isCreatingFolder} className={`text-xs text-zinc-500 hover:text-blue-400 flex items-center space-x-1 transition-colors ${isCreatingFolder ? 'opacity-50 cursor-default' : ''}`}>
                 <PlusIcon className="w-3 h-3" /> <span>New Folder</span>
             </button>
        )}
      </div>
      
      {history.length === 0 && folders.length === 0 && !isCreatingFolder ? (
        <div className="w-full h-32 border border-dashed border-zinc-800/50 rounded-xl flex flex-col items-center justify-center bg-zinc-900/20 text-zinc-500">
             <SparklesIcon className="w-6 h-6 mb-2 text-zinc-700" />
             <p className="text-sm font-medium">Your journey starts here</p>
             <p className="text-xs text-zinc-600 mt-1">Upload your first idea to bring it to life</p>
        </div>
      ) : (
          <div className="flex overflow-x-auto space-x-4 pb-2 px-2 scrollbar-hide min-h-[120px]">
            {currentFolder && (
                <button onClick={() => setCurrentFolderId(undefined)} onDragOver={allowDrop} onDrop={handleDropOnBack} className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-28 border border-dashed rounded-lg transition-colors ${isDragging ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'}`} title="Back to Archive">
                    <ChevronLeftIcon className="w-5 h-5 text-zinc-500" />
                    <span className="text-[10px] text-zinc-600 mt-1 font-medium">Back</span>
                </button>
            )}

            {!currentFolder && isCreatingFolder && (
                <div className="flex-shrink-0 relative w-36 h-28 bg-zinc-900/30 border border-blue-500/50 rounded-lg flex flex-col items-center justify-center gap-2 animate-in fade-in zoom-in-95">
                    <FolderIcon className="w-8 h-8 text-blue-400" />
                    <input ref={newFolderInputRef} type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onBlur={handleConfirmCreating} onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmCreating(); if (e.key === 'Escape') handleCancelCreating(); }} className="w-28 text-center bg-zinc-950 text-xs text-white border border-blue-500 rounded px-1 py-0.5 outline-none placeholder-zinc-600" placeholder="Folder Name" />
                </div>
            )}

            {visibleFolders.map(folder => (
                <div key={folder.id} onDragOver={allowDrop} onDrop={(e) => handleDropOnFolder(e, folder.id)} onClick={() => setCurrentFolderId(folder.id)} className={`group flex-shrink-0 relative w-36 h-28 bg-zinc-900/30 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-2 ${isDragging ? 'border-blue-500/30 bg-blue-500/5' : ''}`}>
                    <FolderIcon className="w-8 h-8 text-zinc-600 group-hover:text-blue-400 transition-colors" />
                    {editingFolderId === folder.id ? (
                        <input type="text" value={tempFolderName} onChange={(e) => setTempFolderName(e.target.value)} onBlur={saveEditing} onKeyDown={(e) => e.key === 'Enter' && saveEditing()} autoFocus onClick={(e) => e.stopPropagation()} className="w-24 text-center bg-zinc-950 text-xs text-white border border-blue-500 rounded px-1 py-0.5 outline-none" />
                    ) : (
                        <div className="flex items-center gap-1 max-w-full px-3 relative z-10">
                             <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 truncate pointer-events-none">{folder.name}</span>
                             <button onClick={(e) => { e.stopPropagation(); startEditing(folder); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-all" title="Rename"><PencilSquareIcon className="w-3 h-3" /></button>
                        </div>
                    )}
                    <div className="absolute top-2 right-2 text-[9px] text-zinc-600 font-mono pointer-events-none">{history.filter(c => c.folderId === folder.id).length}</div>
                </div>
            ))}

            {visibleCreations.map((item, index) => {
              // Lock items if NOT Pro and index >= 3 (Latest 3 are free)
              const isLocked = !isPro && index >= 3;
              const isPdf = item.originalImage?.startsWith('data:application/pdf');
              
              return (
                <div
                  key={item.id}
                  draggable={!isLocked}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => isLocked ? onTriggerUpgrade() : onSelect(item)}
                  className={`
                    group flex-shrink-0 relative flex flex-col text-left w-44 h-28 
                    bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 
                    rounded-lg transition-all duration-200 overflow-hidden cursor-pointer 
                    ${isLocked ? 'opacity-60' : 'active:cursor-grabbing'}
                  `}
                >
                  {isLocked && (
                      <div className="absolute inset-0 z-10 bg-zinc-950/50 backdrop-blur-[1px] flex items-center justify-center">
                          <LockClosedIcon className="w-6 h-6 text-zinc-500 group-hover:text-amber-500 transition-colors" />
                      </div>
                  )}

                  <div className="p-4 flex flex-col h-full pointer-events-none">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-1.5 bg-zinc-800 rounded group-hover:bg-zinc-700 transition-colors border border-zinc-700/50">
                          {isPdf ? <DocumentIcon className="w-4 h-4 text-zinc-400" /> : <PhotoIcon className="w-4 h-4 text-zinc-400" />}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400">
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-auto">
                      <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white truncate">{item.name}</h3>
                      {!isLocked && (
                        <div className="flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-blue-400">Restore</span>
                            <ArrowRightIcon className="w-3 h-3 text-blue-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {visibleCreations.length === 0 && currentFolder && (
                <div className="flex-shrink-0 w-44 h-28 border border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center text-zinc-600">
                    <span className="text-xs">Empty Folder</span>
                </div>
            )}
          </div>
      )}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};