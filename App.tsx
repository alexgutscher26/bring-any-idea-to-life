/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { Hero } from './components/Hero';
import { InputArea } from './components/InputArea';
import { LivePreview } from './components/LivePreview';
import { CreationHistory, Creation, Folder } from './components/CreationHistory';
import { PricingModal } from './components/PricingModal';
import { SampleProjects } from './components/SampleProjects'
import { bringToLife, refineCreation } from './services/gemini';
import { enqueue } from './services/queue';
import { isTimeoutError } from './utils/timeout';
import { saveCreation, getAllCreations, setCurrentUser, setCurrentUserInfo, getFolders, createFolder, renameFolder, deleteFolder, getUserPlan, setUserPlan } from './services/storage';
import { ArrowUpTrayIcon, PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { useSession, signOut } from './services/authClient'
import { useToast } from './components/ToastProvider'
import { SignInModal } from './components/SignInModal'
import { SignUpModal } from './components/SignUpModal'
import { ConfirmModal } from './components/ConfirmModal'
import { useShortcuts } from './components/ShortcutProvider'
import { ShortcutManager } from './components/ShortcutManager'
import { Analytics } from '@vercel/analytics/react'

// Error Boundary for LivePreview
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class LivePreviewErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Updates state based on an error.
   */
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("LivePreview crashed:", error, errorInfo);
  }

  handleClose = () => {
    this.setState({ hasError: false });
    this.props.onClose();
  }

  /**
   * Renders an error message if there is a rendering error; otherwise, renders children.
   */
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed z-50 inset-4 md:inset-10 bg-[#0E0E10] border border-red-900/50 rounded-lg shadow-2xl flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 bg-red-500/10 rounded-full mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Preview System Error</h3>
          <p className="text-zinc-400 max-w-md mb-6">Something went wrong while rendering the preview. Please try resetting or generating again.</p>
          <button onClick={this.handleClose} className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-zinc-200 transition-colors">
            Close Preview
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Main application component for the Gemini 3.0 interface.
 *
 * This component manages the state for user sessions, creation history, folder management, and file uploads. It initializes user data, handles user plan upgrades, and manages the generation and refinement of creations. The component also provides functionality for importing files and creating folders, while ensuring that the UI reflects the current state of the application. Various effects are used to handle data initialization and context updates based on user interactions.
 *
 * @returns A React functional component rendering the application UI.
 */
const App: React.FC = () => {
  const [activeCreation, setActiveCreation] = useState<Creation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [isPro, setIsPro] = useState(false); // Subscription State
  const [history, setHistory] = useState<Creation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession()
  const [showSignIn, setShowSignIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [showShortcutManager, setShowShortcutManager] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; itemCount: number } | null>(null)
  const { register, setContext, setState, showFeedback } = useShortcuts()
  const { showToast } = useToast()

  useEffect(() => {
    /**
     * Initialize application data and user session information.
     *
     * This function sets the current user information based on the session, processes the checkout status,
     * retrieves folders and history from the database, and manages local storage for app history.
     * It also checks the user's plan and updates the application state accordingly.
     * Error handling is implemented for various asynchronous operations to ensure robustness.
     *
     * @returns {Promise<void>} A promise that resolves when the initialization is complete.
     */
    const initData = async () => {
      // Session user
      setCurrentUserInfo(session?.user ? { id: session.user.id, email: session.user.email, name: session.user.name } : null);

      const params = new URLSearchParams(window.location.search);
      const checkout = params.get('checkout');
      if (checkout === 'success' && session?.user?.id) {
        try { await setUserPlan('PRO'); setIsPro(true); } catch (e) { }
        params.delete('checkout');
        const url = new URL(window.location.href);
        url.search = params.toString();
        window.history.replaceState({}, '', url.toString());
      }

      setCurrentUserInfo(session?.user ? { id: session.user.id, email: session.user.email, name: session.user.name } : null)
      try {
        const dbFolders = await getFolders();
        setFolders(dbFolders.map(f => ({ id: f.id, name: f.name })));
      } catch (e) { console.error('Failed to load folders', e) }

      const savedHistory = localStorage.getItem('gemini_app_history');
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          await Promise.all(parsed.map(async (item: any) => {
            const creation = { ...item, timestamp: new Date(item.timestamp) };
            await saveCreation(creation);
          }));
          localStorage.removeItem('gemini_app_history');
        } catch (e) { console.error("Failed to migrate history", e); }
      }

      try {
        const dbHistory = await getAllCreations();
        dbHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (dbHistory.length > 0) {
          setHistory(dbHistory);
        } else {
          // Initial seed logic can be removed or kept
        }
      } catch (e) { console.error("Failed to load from DB", e); }

      try { const plan = await getUserPlan(); setIsPro(plan === 'PRO'); } catch (e) { }
    };
    initData();
  }, [session]);

  useEffect(() => { /* folders persist via API */ }, [folders]);

  /**
   * Handles the upgrade process to a PRO user plan.
   */
  const handleUpgrade = async () => {
    try { await setUserPlan('PRO'); setIsPro(true); } catch (e) { setIsPro(true); }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else reject(new Error('Failed to convert file to base64'));
      };
      reader.onerror = (error) => reject(error);
    });
  };

  /**
   * Handles the generation of a new creation based on the provided prompt and optional file.
   *
   * This function sets the generating state, processes the input file to convert it to base64 if provided,
   * and enqueues a request to generate files based on the prompt text. If files are generated successfully,
   * it creates a new creation object, saves it, and updates the active creation and history. Errors during the
   * process are caught and logged, with user alerts for specific failures.
   *
   * @param promptText - The text prompt used for generating the creation.
   * @param file - An optional file to be processed and included in the creation.
   */
  const handleGenerate = async (promptText: string, file?: File) => {
    setIsGenerating(true);
    setActiveCreation(null);
    try {
      let imageBase64: string | undefined;
      let mimeType: string | undefined;
      if (file) {
        imageBase64 = await fileToBase64(file);
        mimeType = file.type.toLowerCase();
      }

      const generatedFiles = await enqueue(() => bringToLife(promptText, imageBase64, mimeType), isPro ? 'high' : 'normal');

      if (generatedFiles && Object.keys(generatedFiles).length > 0) {
        const newCreation: Creation = {
          id: crypto.randomUUID(),
          name: file ? file.name : 'New Project',
          files: generatedFiles,
          originalImage: imageBase64 && mimeType ? `data:${mimeType};base64,${imageBase64}` : undefined,
          timestamp: new Date(),
        };
        await saveCreation(newCreation);
        setActiveCreation(newCreation);
        setHistory(prev => [newCreation, ...prev]);
      }
    } catch (error) {
      console.error("Failed to generate:", error);
      if (isTimeoutError(error)) {
        showToast("Generation timed out. The AI took too long to respond. Please try again.", 'error');
      } else {
        showToast("Something went wrong while bringing your file to life. Please try again.", 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handles the refinement of a creation based on the provided prompt and current files.
   *
   * The function checks if activeCreation is present, sets the refining state, and attempts to refine the current files using the refineCreation function. It updates the activeCreation with the new files and timestamp, saves the updated creation, and updates the history. In case of an error, it logs the error and shows an appropriate toast message based on the error type.
   *
   * @param prompt - The prompt used for refining the creation.
   * @param currentFiles - A record of current files with their content.
   * @returns A promise that resolves when the refinement process is complete.
   * @throws Error If the refinement process fails due to a timeout or other issues.
   */
  const handleRefine = async (prompt: string, currentFiles: Record<string, { content: string }>) => {
    if (!activeCreation) return;
    setIsRefining(true);
    try {
      const updatedFiles = await enqueue(() => refineCreation(currentFiles, prompt), isPro ? 'high' : 'normal');
      const updatedCreation: Creation = {
        ...activeCreation,
        files: updatedFiles,
        timestamp: new Date()
      };
      await saveCreation(updatedCreation);
      setActiveCreation(updatedCreation);
      setHistory(prev => prev.map(c => c.id === updatedCreation.id ? updatedCreation : c));
    } catch (error) {
      console.error("Refinement failed:", error);
      if (isTimeoutError(error)) {
        showToast("Refinement timed out. The AI took too long to respond. Please try again.", 'error');
      } else {
        showToast("Failed to update the creation. Please try again.", 'error');
      }
    } finally {
      setIsRefining(false);
    }
  };

  /**
   * Handles the auto-saving of creation files.
   *
   * This function checks if there is an active creation process. If so, it updates the creation object with the provided files and the current timestamp. It then attempts to save the updated creation using the saveCreation function. If the save is successful, it updates the history and the active creation state. In case of an error during the save process, it logs the error to the console.
   *
   * @param files - A record of files where each key is a string and the value is an object containing the file content.
   */
  const handleAutoSave = async (files: Record<string, { content: string }>) => {
    if (!activeCreation) return;
    const updated = { ...activeCreation, files, timestamp: new Date() };

    try {
      await saveCreation(updated);
      setHistory(prev => prev.map(c => c.id === updated.id ? updated : c));
      setActiveCreation(updated);
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  };

  /**
   * Resets the creation state and stops generation and refining processes.
   */
  const handleReset = () => { setActiveCreation(null); setIsGenerating(false); setIsRefining(false); };
  /**
   * Triggers a file input reset and simulates a click after a short delay.
   */
  const handleNewUpload = () => { handleReset(); setTimeout(() => { fileInputRef.current?.click(); }, 50); };
  /**
   * Sets the active creation to the provided creation.
   */
  const handleSelectCreation = (creation: Creation) => setActiveCreation(creation);
  /**
   * Triggers a click event on the import input reference.
   */
  const handleImportClick = () => importInputRef.current?.click();
  const handleCreateFolder = async (name: string) => {
    if (!session?.user?.id) { setShowSignIn(true); return; }
    const draft: Folder = { id: crypto.randomUUID(), name };
    try {
      const saved = await createFolder(draft);
      setFolders(prev => [...prev, { id: saved.id, name: saved.name }]);
    } catch (e: any) { console.error('Create folder failed', e); showToast(e?.message || 'Failed to create folder', 'error'); }
  };
  const handleRenameFolder = async (id: string, name: string) => {
    if (!session?.user?.id) { setShowSignIn(true); return; }
    try { await renameFolder(id, name); setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f)); }
    catch (e: any) { console.error('Rename folder failed', e); showToast(e?.message || 'Failed to rename folder', 'error'); }
  };
  const handleDeleteFolder = (id: string) => {
    if (!session?.user?.id) { setShowSignIn(true); return; }
    const folder = folders.find(f => f.id === id);
    const itemsInFolder = history.filter(c => c.folderId === id).length;
    const folderName = folder?.name || 'this folder';
    setConfirmDelete({ id, name: folderName, itemCount: itemsInFolder });
  };

  const confirmDeleteFolder = async () => {
    if (!confirmDelete) return;
    try {
      await deleteFolder(confirmDelete.id);
      setFolders(prev => prev.filter(f => f.id !== confirmDelete.id));
      // Move items back to root
      setHistory(prev => prev.map(c => c.folderId === confirmDelete.id ? { ...c, folderId: undefined } : c));
      setConfirmDelete(null);
    } catch (e: any) {
      console.error('Delete folder failed', e);
      showToast(e?.message || 'Failed to delete folder', 'error');
      setConfirmDelete(null);
    }
  };
  /**
   * Handles the creation of a move operation for a specified item.
   *
   * This function searches for an item in the history by its creationId. If found, it updates the item's folderId
   * and attempts to save the updated item using the saveCreation function. Upon successful save, it updates the
   * history state to reflect the changes. If the save operation fails, an error is logged to the console.
   *
   * @param creationId - The ID of the creation to be moved.
   * @param folderId - The ID of the folder to which the creation will be moved, or undefined if no folder is specified.
   */
  const handleMoveCreation = async (creationId: string, folderId: string | undefined) => {
    const item = history.find(c => c.id === creationId);
    if (item) {
      const updated = { ...item, folderId };
      try {
        await saveCreation(updated);
        setHistory(prev => prev.map(c => c.id === creationId ? updated : c));
      } catch (e) { console.error("Failed to move creation", e); }
    }
  };

  /**
   * Handles the import of a file through a file input change event.
   *
   * This function reads the selected file, parses its content as JSON, and checks for the presence of specific properties.
   * If valid, it creates a new Creation object, saves it, updates the history, and sets the active creation.
   * In case of errors during parsing or saving, it logs the error and alerts the user.
   * Finally, it resets the file input value.
   *
   * @param e - The change event from the file input element.
   */
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        if (parsed.files || parsed.html) {
          const importedCreation: Creation = { ...parsed, timestamp: new Date(parsed.timestamp || Date.now()), id: parsed.id || crypto.randomUUID() };
          await saveCreation(importedCreation);
          setHistory(prev => { const exists = prev.some(c => c.id === importedCreation.id); return exists ? prev : [importedCreation, ...prev]; });
          setActiveCreation(importedCreation);
        } else showToast("Invalid creation file format.", 'error');
      } catch (err) { console.error("Import error", err); showToast("Failed to import creation.", 'error'); }
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    setContext(activeCreation ? 'preview' : 'home')
    setState({ hasActiveCreation: !!activeCreation, isPro, isGenerating, isRefining })
  }, [activeCreation, isPro, isGenerating, isRefining])

  useEffect(() => {
    register({ id: 'open-shortcut-manager', label: 'Shortcut Manager', sequences: [[{ ctrl: true, key: ',' }], [{ ctrl: true, key: 'k' }, { ctrl: true, key: ',' }], [{ ctrl: true, key: 'm' }], [{ ctrl: true, key: 'k' }, { ctrl: true, key: 'm' }]], contexts: ['global'], run: () => setShowShortcutManager(true) })
    register({ id: 'save', label: 'Save', sequences: [[{ ctrl: true, key: 's' }], [{ ctrl: true, key: 'k' }, { ctrl: true, key: 's' }]], contexts: ['global'], when: s => !!s.hasActiveCreation, run: () => { window.dispatchEvent(new CustomEvent('shortcut-save')); showFeedback('Save', 'Ctrl+S') } })
  }, [])

  const hasFiles = !!activeCreation && ((activeCreation.files && Object.keys(activeCreation.files).length > 0) || !!activeCreation.html)
  const isFocused = hasFiles || isGenerating;

  const handleImportSample = async (creation: Creation) => {
    const c: Creation = { ...creation, id: creation.id || crypto.randomUUID(), timestamp: new Date() }
    await saveCreation(c)
    setActiveCreation(c)
    setHistory(prev => [c, ...prev])
  }

  const handleOpenFolder = (folderId: string | undefined) => {
    setActiveCreation(null)
  }

  return (
    <div className="h-[100dvh] bg-zinc-950 bg-dot-grid text-zinc-50 selection:bg-blue-500/30 overflow-y-auto overflow-x-hidden relative flex flex-col">
      <div className={`min-h-full flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${isFocused ? 'opacity-0 scale-95 blur-sm pointer-events-none h-[100dvh] overflow-hidden' : 'opacity-100 scale-100 blur-0'}`}>
        <div className="w-full flex items-center justify-between py-6 relative z-20" aria-label="Header">
          <div className="flex items-center gap-2">
            <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">BringSuite </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono uppercase tracking-widest">Beta</span>
          </div>
          <div className="flex items-center gap-3" aria-label="Header actions">
            {!session && (
              <>
                <button onClick={() => setShowSignIn(true)} aria-label="Sign In" className="hidden sm:flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1">Sign In</button>
                <button onClick={() => setShowSignUp(true)} aria-label="Sign Up" className="hidden sm:flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1">Sign Up</button>
              </>
            )}
            {session && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="hidden sm:inline">{session.user.name || session.user.email}</span>
                <button onClick={() => signOut()} aria-label="Sign Out" className="px-3 py-1 rounded-full border border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors">Sign Out</button>
              </div>
            )}
            <button onClick={() => setShowPricing(true)} aria-label="Pricing" className="hidden sm:flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1">Pricing</button>
            <button onClick={() => setShowShortcutManager(true)} aria-label="Shortcuts" className="hidden sm:flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1">Shortcuts</button>
            {!isPro && (
              <button onClick={() => setShowPricing(true)} className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-200 hover:text-white border border-amber-500/20 hover:border-amber-500/40 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <SparklesIcon className="w-3 h-3 text-amber-400" />
                <span>Upgrade</span>
              </button>
            )}
            {isPro && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                <SparklesIcon className="w-3 h-3" />
                <span>PRO</span>
              </div>
            )}
            <div className="w-px h-4 bg-zinc-800 mx-1 hidden sm:block"></div>
            <button onClick={handleNewUpload} disabled={isFocused} aria-label="New Upload" className="group flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
              <PlusIcon className="w-4 h-4 text-blue-600 group-hover:text-blue-500" />
              <span className="hidden sm:inline">New</span><span className="sm:hidden">New</span>
            </button>

          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center w-full pb-12">
          <div className="w-full mb-8 md:mb-16"><Hero /></div>
          <div className="w-full flex justify-center mb-8" aria-label="Upload"><InputArea onGenerate={handleGenerate} isGenerating={isGenerating} disabled={isFocused} fileInputRef={fileInputRef} /></div>
        </div>
        <div className="flex-shrink-0 pb-6 w-full mt-auto flex flex-col items-center gap-6">
          <div className="w-full px-2 md:px-0">
            <SampleProjects onImport={handleImportSample} />
            <CreationHistory
              history={history} folders={folders} isPro={isPro}
              onSelect={handleSelectCreation} onCreateFolder={handleCreateFolder} onRenameFolder={handleRenameFolder} onDeleteFolder={handleDeleteFolder} onMoveCreation={handleMoveCreation}
              onTriggerUpgrade={() => setShowPricing(true)}
              onOpenFolder={handleOpenFolder}
            />
          </div>
          <a href="https://x.com/snackforcode" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-400 text-xs font-mono transition-colors pb-2">Created by @ammaar</a>
        </div>
      </div>

      <LivePreviewErrorBoundary onClose={handleReset}>
        <LivePreview creation={activeCreation} isLoading={isGenerating} isRefining={isRefining} isFocused={isFocused} isPro={isPro} onReset={handleReset} onRefine={handleRefine} onTriggerUpgrade={() => setShowPricing(true)} onAutoSave={handleAutoSave} />
      </LivePreviewErrorBoundary>

      <div className="fixed bottom-4 right-4 z-50">
        <button onClick={handleImportClick} className="flex items-center space-x-2 p-2 text-zinc-500 hover:text-zinc-300 transition-colors opacity-60 hover:opacity-100" title="Import Artifact">
          <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline">Upload previous artifact</span>
          <ArrowUpTrayIcon className="w-5 h-5" />
        </button>
        <input type="file" ref={importInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
      </div>
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
      <SignUpModal isOpen={showSignUp} onClose={() => setShowSignUp(false)} />
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} onUpgrade={handleUpgrade} />
      <ShortcutManager isOpen={showShortcutManager} onClose={() => setShowShortcutManager(false)} />
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete Folder"
        message={confirmDelete ? (
          confirmDelete.itemCount > 0
            ? `Delete "${confirmDelete.name}"? This will move ${confirmDelete.itemCount} item${confirmDelete.itemCount > 1 ? 's' : ''} back to the archive.`
            : `Delete "${confirmDelete.name}"?`
        ) : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteFolder}
        onCancel={() => setConfirmDelete(null)}
      />
      <Analytics />
    </div>
  );
};

export default App;

