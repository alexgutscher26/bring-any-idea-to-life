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
import { bringToLife, refineCreation } from './services/gemini';
import { enqueue } from './services/queue';
import { saveCreation, getAllCreations, setCurrentUser, setCurrentUserInfo, getFolders, createFolder, renameFolder, getUserPlan, setUserPlan } from './services/storage';
import { ArrowUpTrayIcon, PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { useSession, signOut } from './services/authClient'
import { SignInModal } from './components/SignInModal'
import { SignUpModal } from './components/SignUpModal'

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

  useEffect(() => {
    const initData = async () => {
      // Session user
      setCurrentUserInfo(session?.user ? { id: session.user.id, email: session.user.email, name: session.user.name } : null);

      const params = new URLSearchParams(window.location.search);
      const checkout = params.get('checkout');
      if (checkout === 'success' && session?.user?.id) {
          try { await setUserPlan('PRO'); setIsPro(true); } catch (e) {}
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

      try { const plan = await getUserPlan(); setIsPro(plan === 'PRO'); } catch (e) {}
    };
    initData();
  }, [session]);

  useEffect(() => { /* folders persist via API */ }, [folders]);

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
      alert("Something went wrong while bringing your file to life. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

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
          alert("Failed to update the creation. Please try again.");
      } finally {
          setIsRefining(false);
      }
  };

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

  const handleReset = () => { setActiveCreation(null); setIsGenerating(false); setIsRefining(false); };
  const handleNewUpload = () => { handleReset(); setTimeout(() => { fileInputRef.current?.click(); }, 50); };
  const handleSelectCreation = (creation: Creation) => setActiveCreation(creation);
  const handleImportClick = () => importInputRef.current?.click();
  const handleCreateFolder = async (name: string) => {
    if (!session?.user?.id) { setShowSignIn(true); return; }
    const draft: Folder = { id: crypto.randomUUID(), name };
    try {
      const saved = await createFolder(draft);
      setFolders(prev => [...prev, { id: saved.id, name: saved.name }]);
    } catch (e: any) { console.error('Create folder failed', e); alert(e?.message || 'Failed to create folder'); }
  };
  const handleRenameFolder = async (id: string, name: string) => {
    if (!session?.user?.id) { setShowSignIn(true); return; }
    try { await renameFolder(id, name); setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f)); }
    catch (e: any) { console.error('Rename folder failed', e); alert(e?.message || 'Failed to rename folder'); }
  };
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
            } else alert("Invalid creation file format.");
        } catch (err) { console.error("Import error", err); alert("Failed to import creation."); }
        if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const isFocused = !!activeCreation || isGenerating;

  return (
    <div className="h-[100dvh] bg-zinc-950 bg-dot-grid text-zinc-50 selection:bg-blue-500/30 overflow-y-auto overflow-x-hidden relative flex flex-col">
      <div className={`min-h-full flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${isFocused ? 'opacity-0 scale-95 blur-sm pointer-events-none h-[100dvh] overflow-hidden' : 'opacity-100 scale-100 blur-0'}`}>
        <div className="w-full flex items-center justify-between py-6 relative z-20">
            <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Gemini 3.0</div>
            <div className="flex items-center gap-3">
                {!session && (
                  <>
                  <button onClick={() => setShowSignIn(true)} className="hidden sm:flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1">Sign In</button>
                  <button onClick={() => setShowSignUp(true)} className="hidden sm:flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1">Sign Up</button>
                  </>
                )}
                {session && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="hidden sm:inline">{session.user.name || session.user.email}</span>
                    <button onClick={() => signOut()} className="px-3 py-1 rounded-full border border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors">Sign Out</button>
                  </div>
                )}
                <button onClick={() => setShowPricing(true)} className="hidden sm:flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1">Pricing</button>
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
                <button onClick={handleNewUpload} disabled={isFocused} className="group flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                    <PlusIcon className="w-4 h-4 text-blue-600 group-hover:text-blue-500" />
                    <span className="hidden sm:inline">New</span><span className="sm:hidden">New</span>
                </button>
            </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center w-full pb-12">
          <div className="w-full mb-8 md:mb-16"><Hero /></div>
          <div className="w-full flex justify-center mb-8"><InputArea onGenerate={handleGenerate} isGenerating={isGenerating} disabled={isFocused} fileInputRef={fileInputRef} /></div>
        </div>
        <div className="flex-shrink-0 pb-6 w-full mt-auto flex flex-col items-center gap-6">
            <div className="w-full px-2 md:px-0">
                <CreationHistory 
                    history={history} folders={folders} isPro={isPro}
                    onSelect={handleSelectCreation} onCreateFolder={handleCreateFolder} onRenameFolder={handleRenameFolder} onMoveCreation={handleMoveCreation}
                    onTriggerUpgrade={() => setShowPricing(true)}
                />
            </div>
            <a href="https://x.com/ammaar" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-400 text-xs font-mono transition-colors pb-2">Created by @ammaar</a>
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
    </div>
  );
};

export default App;