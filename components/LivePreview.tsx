/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ArrowDownTrayIcon, PlusIcon, ViewColumnsIcon, CodeBracketIcon, XMarkIcon, CommandLineIcon, MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, ArchiveBoxArrowDownIcon, PaperAirplaneIcon, LockClosedIcon, DocumentIcon, DocumentTextIcon, PhotoIcon, FolderIcon, CloudArrowUpIcon, CheckCircleIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon } from '@heroicons/react/24/outline';
import { SparklesIcon, BoltIcon } from '@heroicons/react/24/solid';
import { Creation } from './CreationHistory';
import { useShortcuts } from './ShortcutProvider'
import { convertToFramework } from '../services/gemini';

interface LivePreviewProps {
  creation: Creation | null;
  isLoading: boolean;
  isRefining: boolean;
  isFocused: boolean;
  isPro: boolean;
  onReset: () => void;
  onRefine: (prompt: string, currentFiles: Record<string, { content: string }>) => void;
  onTriggerUpgrade: () => void;
  onAutoSave?: (files: Record<string, { content: string }>) => void;
}

type ViewMode = 'full' | 'split-image' | 'split-code';

// Global libraries
declare global {
  interface Window {
    pdfjsLib: any;
    Prism: any;
    JSZip: any;
  }
}

// --- Components ---

/**
 * Render a file icon based on the file extension.
 *
 * The function checks the file name's extension and returns a corresponding icon wrapped in a span with specific styling.
 * It handles various file types including HTML, CSS, JavaScript, TypeScript, and JSON, each with a unique color scheme.
 * If the file extension does not match any known types, a default icon is returned.
 *
 * @param name - The name of the file, which determines the icon to be displayed.
 * @returns A JSX element representing the appropriate file icon.
 */
const FileIcon = ({ name }: { name: string }) => {
    if (name.endsWith('.html')) return <span className="text-orange-500"><CodeBracketIcon className="w-4 h-4" /></span>;
    if (name.endsWith('.css')) return <span className="text-blue-400"><DocumentTextIcon className="w-4 h-4" /></span>;
    if (name.endsWith('.js') || name.endsWith('.ts')) return <span className="text-yellow-400"><CommandLineIcon className="w-4 h-4" /></span>;
    if (name.endsWith('.json')) return <span className="text-green-400"><DocumentIcon className="w-4 h-4" /></span>;
    return <DocumentIcon className="w-4 h-4 text-zinc-500" />;
};

/**
 * Renders a file explorer component with a list of files.
 */
const FileExplorer = ({ files, activeFile, onSelectFile }: { files: Record<string, any>, activeFile: string, onSelectFile: (f: string) => void }) => {
    return (
        <div className="w-48 bg-[#121214] border-r border-zinc-800 flex flex-col shrink-0">
            <div className="h-9 flex items-center px-4 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Explorer
            </div>
            <div className="flex-1 overflow-y-auto py-2">
                <div className="px-2 mb-2 text-xs text-zinc-600 font-medium flex items-center gap-1"><FolderIcon className="w-3 h-3" /> PROJECT</div>
                {Object.keys(files).sort().map(fileName => (
                    <button 
                        key={fileName}
                        onClick={() => onSelectFile(fileName)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${activeFile === fileName ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                    >
                        <FileIcon name={fileName} />
                        <span className="truncate">{fileName}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

/**
 * Renders a loading step component with visual indicators based on its state.
 *
 * The component displays a loading step with a text label and an indicator that changes
 * based on the `active` and `completed` props. If the step is completed, a checkmark icon
 * is shown; if it is active, a pulsing dot is displayed; otherwise, a static dot is rendered.
 * The opacity and translation of the component also adjust based on its state.
 *
 * @param {Object} props - The properties for the loading step.
 * @param {string} props.text - The text to display for the loading step.
 * @param {boolean} props.active - Indicates if the loading step is currently active.
 * @param {boolean} props.completed - Indicates if the loading step has been completed.
 */
const LoadingStep = ({ text, active, completed }: { text: string, active: boolean, completed: boolean }) => (
    <div className={`flex items-center space-x-3 transition-all duration-500 ${active || completed ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-4'}`}>
        <div className={`w-4 h-4 flex items-center justify-center ${completed ? 'text-green-400' : active ? 'text-blue-400' : 'text-zinc-700'}`}>
            {completed ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : active ? (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
            ) : (
                <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div>
            )}
        </div>
        <span className={`font-mono text-xs tracking-wide uppercase ${active ? 'text-zinc-200' : completed ? 'text-zinc-400 line-through' : 'text-zinc-600'}`}>{text}</span>
    </div>
);

/**
 * Renders a code editor component with syntax highlighting and undo/redo functionality.
 *
 * The component utilizes Prism.js for syntax highlighting based on the file extension. It manages the scroll synchronization between a textarea and a preformatted text element. The editor can be in read-only mode, displaying a prompt to upgrade for editing capabilities. It also handles changes to the code and triggers appropriate callbacks for undo and redo actions.
 *
 * @param code - The current code content to be displayed in the editor.
 * @param fileName - The name of the file being edited, used for determining syntax highlighting.
 * @param onChange - Callback function to handle changes in the code.
 * @param readOnly - Boolean indicating if the editor is in read-only mode.
 * @param onTriggerUpgrade - Optional callback for triggering an upgrade to a pro version.
 * @param onUndo - Optional callback for handling undo actions.
 * @param onRedo - Optional callback for handling redo actions.
 * @param canUndo - Optional boolean indicating if an undo action is possible.
 * @param canRedo - Optional boolean indicating if a redo action is possible.
 */
const CodeEditor = ({ 
    code, 
    fileName, 
    onChange, 
    readOnly, 
    onTriggerUpgrade,
    onUndo,
    onRedo,
    canUndo,
    canRedo
}: { 
    code: string, 
    fileName: string, 
    onChange: (val: string) => void, 
    readOnly: boolean, 
    onTriggerUpgrade?: () => void,
    onUndo?: () => void,
    onRedo?: () => void,
    canUndo?: boolean,
    canRedo?: boolean
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const [highlighted, setHighlighted] = useState('');
    
    const prismLang = useMemo(() => {
        if (fileName.endsWith('.css')) return 'css';
        if (fileName.endsWith('.js')) return 'javascript';
        if (fileName.endsWith('.json')) return 'json';
        return 'markup';
    }, [fileName]);

    useEffect(() => {
        if (window.Prism) {
            const lang = window.Prism.languages[prismLang] || window.Prism.languages.markup;
            try {
                setHighlighted(window.Prism.highlight(code, lang, prismLang));
            } catch (e) {
                setHighlighted(code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
            }
        }
    }, [code, prismLang]);

    

    /**
     * Synchronizes the scroll position of a textarea and a preformatted text element.
     */
    const handleScroll = () => {
        if (textareaRef.current && preRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0c0c0e] font-mono text-[13px] relative overflow-hidden">
            <div className="flex items-center justify-between bg-[#18181b] border-b border-zinc-800 px-4 h-9 shrink-0 text-xs text-zinc-400">
                 <span>{fileName}</span>
                 <div className="flex items-center gap-2">
                    {!readOnly && (
                        <>
                            <button onClick={onUndo} disabled={!canUndo} className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 transition-colors text-zinc-400 hover:text-white" title="Undo (Ctrl+Z)">
                                <ArrowUturnLeftIcon className="w-3 h-3" />
                            </button>
                            <button onClick={onRedo} disabled={!canRedo} className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 transition-colors text-zinc-400 hover:text-white" title="Redo (Ctrl+Y)">
                                <ArrowUturnRightIcon className="w-3 h-3" />
                            </button>
                            <div className="w-px h-3 bg-zinc-700 mx-1"></div>
                        </>
                    )}
                    {readOnly && <span className="flex items-center gap-1 text-amber-500"><LockClosedIcon className="w-3 h-3" /> Read Only</span>}
                 </div>
            </div>
            
            <div className="relative flex-1 h-full overflow-hidden group">
                 {/* PRO Gating Overlay */}
                {readOnly && (
                    <div className="absolute inset-0 z-30 bg-[#0c0c0e]/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                        <LockClosedIcon className="w-8 h-8 text-zinc-600 mb-3" />
                        <p className="text-zinc-400 text-sm mb-4">Upgrade to Pro to edit code.</p>
                        <button onClick={onTriggerUpgrade} className="px-4 py-1.5 bg-white text-black font-bold rounded text-xs hover:bg-zinc-200">Unlock</button>
                    </div>
                )}

                <pre ref={preRef} className={`absolute inset-0 m-0 p-4 pointer-events-none overflow-hidden text-left ${readOnly ? 'blur-[1px] opacity-50' : ''}`} style={{ lineHeight: '24px' }}>
                    <code className={`language-${prismLang}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={handleScroll}
                    className={`absolute inset-0 w-full h-full bg-transparent text-transparent caret-white p-4 resize-none outline-none whitespace-pre ${readOnly ? 'pointer-events-none' : ''}`}
                    style={{ lineHeight: '24px' }}
                    spellCheck={false}
                />
            </div>
        </div>
    );
};

// --- Command Palette ---

/**
 * Renders a command palette for file selection and action execution.
 *
 * The CommandPalette component manages its open state, handles user input for searching files and actions, and allows navigation through the results using keyboard events. It filters the provided files and actions based on the user's query, updates the selection index, and executes the corresponding action or file selection upon user confirmation. The component also handles closing the palette and focusing the input field when opened.
 *
 * @param isOpen - A boolean indicating whether the command palette is currently open.
 * @param onClose - A function to be called when the command palette is closed.
 * @param files - An array of file names to be displayed in the command palette.
 * @param onSelectFile - A function to be called when a file is selected.
 * @param actions - An array of action objects, each containing an id, label, icon, action function, and an optional shortcut.
 * @returns A JSX element representing the command palette, or null if it is not open.
 */
const CommandPalette = ({ 
    isOpen, 
    onClose, 
    files, 
    onSelectFile, 
    actions 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    files: string[], 
    onSelectFile: (f: string) => void, 
    actions: { id: string, label: string, icon: React.ReactNode, action: () => void, shortcut?: string }[] 
}) => {
    const [query, setQuery] = useState("");
    const [idx, setIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredFiles = files.filter(f => f.toLowerCase().includes(query.toLowerCase()));
    const filteredActions = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));
    const all = [
        ...filteredFiles.map(f => ({ type: 'file', val: f })), 
        ...filteredActions.map(a => ({ type: 'action', val: a }))
    ];

    useEffect(() => {
        if(isOpen) {
            setQuery("");
            setIdx(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    useEffect(() => {
        /**
         * Handles keyboard events for navigation and selection.
         *
         * The function listens for specific key presses: 'ArrowDown' and 'ArrowUp' to navigate through a list, 'Enter' to select an item, and 'Escape' to close the interface. It prevents default actions for these keys and updates the index accordingly. If an item is selected, it checks its type and either triggers a file selection or an action associated with the item.
         *
         * @param e - The keyboard event triggered by user interaction.
         */
        const keyHandler = (e: KeyboardEvent) => {
             if(!isOpen) return;
             if(e.key === 'ArrowDown') {
                 e.preventDefault();
                 setIdx(i => (i + 1) % all.length);
             } else if(e.key === 'ArrowUp') {
                 e.preventDefault();
                 setIdx(i => (i - 1 + all.length) % all.length);
             } else if(e.key === 'Enter') {
                 e.preventDefault();
                 const item = all[idx];
                 if(item) {
                     if(item.type === 'file') onSelectFile(item.val as string);
                     else (item.val as any).action();
                     onClose();
                 }
             } else if(e.key === 'Escape') {
                 onClose();
             }
        };
        window.addEventListener('keydown', keyHandler);
        return () => window.removeEventListener('keydown', keyHandler);
    }, [isOpen, all, idx, onClose, onSelectFile]);

    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 font-sans">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-full max-w-2xl bg-[#18181b] border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                 <div className="flex items-center px-4 py-4 border-b border-zinc-800/50">
                     <MagnifyingGlassIcon className="w-5 h-5 text-zinc-500" />
                     <input ref={inputRef} className="flex-1 bg-transparent border-none outline-none text-white ml-3 placeholder-zinc-600 text-sm" placeholder="Type a command or search files..." value={query} onChange={e => {setQuery(e.target.value); setIdx(0);}} />
                     <div className="text-[10px] text-zinc-600 font-mono border border-zinc-800 rounded px-1.5 py-0.5">ESC</div>
                 </div>
                 <div className="max-h-[60vh] overflow-y-auto py-2">
                     {!all.length && <div className="px-4 py-8 text-center text-zinc-500 text-sm">No matching results</div>}
                     
                     {filteredFiles.length > 0 && <div className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Files</div>}
                     {filteredFiles.map((f, i) => (
                         <button key={f} onClick={() => {onSelectFile(f); onClose();}} className={`w-full px-4 py-2 text-left flex items-center gap-3 text-sm ${i === idx ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800/50'}`}>
                             <DocumentTextIcon className={`w-4 h-4 ${i === idx ? 'text-white' : 'text-zinc-500'}`} />
                             {f}
                         </button>
                     ))}

                     {filteredActions.length > 0 && <div className="px-4 py-2 mt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Actions</div>}
                     {filteredActions.map((a, i) => {
                         const globalIdx = filteredFiles.length + i;
                         const isActive = globalIdx === idx;
                         return (
                            <button key={a.id} onClick={() => {a.action(); onClose();}} className={`w-full px-4 py-2 text-left flex items-center justify-between text-sm ${isActive ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800/50'}`}>
                                <div className="flex items-center gap-3">
                                    <span className={isActive ? 'text-white' : 'text-zinc-500'}>{a.icon}</span>
                                    <span>{a.label}</span>
                                </div>
                                {a.shortcut && <span className={`text-[10px] font-mono ${isActive ? 'text-white/80' : 'text-zinc-600'}`}>{a.shortcut}</span>}
                            </button>
                         )
                     })}
                 </div>
                 <div className="bg-zinc-900/50 px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
                     <span>Use <strong className="text-zinc-400">↑↓</strong> to navigate</span>
                     <span><strong className="text-zinc-400">Enter</strong> to select</span>
                 </div>
            </div>
        </div>
    );
}

// --- Logic for Virtual Bundling ---

/**
 * Bundles HTML, CSS, and JavaScript files into a single HTML document.
 *
 * The function first checks for the presence of an 'index.html' file. If found, it initializes the HTML content with its content.
 * It then iterates over the provided files to inject CSS styles and JavaScript scripts into the HTML.
 * CSS files are injected within `<style>` tags, while JavaScript files are injected within `<script>` tags,
 * handling both linked and unlinked cases for each type of file.
 *
 * @param files - A record of file names to their respective content objects.
 */
const bundleFiles = (files: Record<string, { content: string }>) => {
    const indexFile = files['index.html'];
    if (!indexFile) return "<h1>Error: index.html not found</h1>";

    let html = indexFile.content;

    // Inject CSS
    Object.entries(files).forEach(([name, file]) => {
        if (name.endsWith('.css')) {
             // Robust replacement handling relative paths ./styles.css or styles.css
             const linkRegex = new RegExp(`<link[^>]+href=["'](\\./)?${name.replace('.', '\\.')}["'][^>]*>`, 'gi');
             if (linkRegex.test(html)) {
                 html = html.replace(linkRegex, `<style>\n/* ${name} */\n${file.content}\n</style>`);
             } else {
                 // Fallback: Append if not linked (optional, but safer for AI generated code)
                 html = html.replace('</head>', `<style>\n/* ${name} */\n${file.content}\n</style></head>`);
             }
        }
    });

    // Inject JS
    Object.entries(files).forEach(([name, file]) => {
        if (name.endsWith('.js')) {
             const scriptRegex = new RegExp(`<script[^>]+src=["'](\\./)?${name.replace('.', '\\.')}["'][^>]*>\\s*<\\/script>`, 'gi');
             if (scriptRegex.test(html)) {
                 html = html.replace(scriptRegex, `<script>\n// ${name}\n${file.content}\n</script>`);
             } else {
                 // Try to find body end
                 html = html.replace('</body>', `<script>\n// ${name}\n${file.content}\n</script></body>`);
             }
        }
    });

    return html;
};

/**
 * LivePreview component for rendering a live coding environment with file management and preview capabilities.
 *
 * This component manages the state for files, loading status, view modes, and user interactions. It includes features such as auto-saving, undo/redo functionality, and exporting projects. The component also handles intelligent syncing of files based on project changes and provides a command palette for quick actions.
 *
 * @param {LivePreviewProps} props - The properties for the LivePreview component.
 * @param {Creation} props.creation - The current project creation data.
 * @param {boolean} props.isLoading - Indicates if the project is currently loading.
 * @param {boolean} props.isRefining - Indicates if the project is currently being refined.
 * @param {boolean} props.isFocused - Indicates if the component is currently focused.
 * @param {boolean} props.isPro - Indicates if the user has a pro account.
 * @param {function} props.onReset - Callback function to reset the preview.
 * @param {function} props.onRefine - Callback function to submit refinement prompts.
 * @param {function} props.onTriggerUpgrade - Callback function to trigger an upgrade.
 * @param {function} props.onAutoSave - Callback function for auto-saving files.
 * @returns {JSX.Element} The rendered LivePreview component.
 */
export const LivePreview: React.FC<LivePreviewProps> = ({ creation, isLoading, isRefining, isFocused, isPro, onReset, onRefine, onTriggerUpgrade, onAutoSave }) => {
    const [loadingStep, setLoadingStep] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>('full');
    const [showPalette, setShowPalette] = useState(false);
    
    // File System State
    const [files, setFiles] = useState<Record<string, { content: string }>>({});
    const [activeFile, setActiveFile] = useState('index.html');
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    
    // Undo/Redo State
    const [past, setPast] = useState<Record<string, { content: string }>[]>([]);
    const [future, setFuture] = useState<Record<string, { content: string }>[]>([]);
    const lastEditTimeRef = useRef(0);
    
    const [debouncedFiles, setDebouncedFiles] = useState<Record<string, { content: string }>>({});
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [iframeSrc, setIframeSrc] = useState('');
    const { register, setContext } = useShortcuts()
    
    // Refs for intelligent syncing
    const prevCreationIdRef = useRef<string | null>(null);
    const prevIsRefiningRef = useRef(false);
    const viewModeInitRef = useRef<string | null>(null);
    
    // UI Resizing
    const [splitRatio, setSplitRatio] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Smart Initialization and Syncing
    // We only overwrite local files from props if:
    // 1. The creation ID changes (switching projects)
    // 2. Refinement finished (AI updated files)
    useEffect(() => {
        const hasIdChanged = creation?.id !== prevCreationIdRef.current;
        const hasFinishedRefining = prevIsRefiningRef.current && !isRefining;

        if (creation && (hasIdChanged || hasFinishedRefining)) {
            if (creation.files) {
                setFiles(creation.files);
                setDebouncedFiles(creation.files);
                if (hasIdChanged) {
                     // Keep active file if possible, else reset
                     if (!creation.files[activeFile]) {
                         setActiveFile(Object.keys(creation.files)[0] || 'index.html');
                     }
                     // Reset History on project switch
                     setPast([]);
                     setFuture([]);
                }
            } else if (creation.html) {
                // Legacy
                const legacyFiles = { 'index.html': { content: creation.html } };
                setFiles(legacyFiles);
                setDebouncedFiles(legacyFiles);
                setActiveFile('index.html');
                if (hasIdChanged) {
                    setPast([]);
                    setFuture([]);
                }
            }
            
            prevCreationIdRef.current = creation.id;
            setSaveStatus('saved');
        }
        prevIsRefiningRef.current = isRefining;
    }, [creation, isRefining, activeFile]);

    // Auto-Save Logic
    useEffect(() => {
        if (!creation || !onAutoSave || Object.keys(files).length === 0) return;

        if (saveStatus === 'saved') setSaveStatus('unsaved');

        const timeoutId = setTimeout(() => {
            setSaveStatus('saving');
            onAutoSave(files);
            setLastSavedTime(new Date());
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 2000); // 2 seconds inactivity debounce

        // Fallback: Max interval (e.g. if typing continuously for 30s)
        const intervalId = setInterval(() => {
            if (saveStatus === 'unsaved') {
                setSaveStatus('saving');
                onAutoSave(files);
                setLastSavedTime(new Date());
                setTimeout(() => setSaveStatus('saved'), 500);
            }
        }, 30000); // 30 seconds max wait

        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, [files, onAutoSave, creation]); // Dependencies trigger on file change

    // Debounce Code Changes for Preview rendering
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedFiles(files), 1000);
        return () => clearTimeout(timer);
    }, [files]);

    // Update Preview Iframe
    useEffect(() => {
        if (Object.keys(debouncedFiles).length === 0) return;
        const bundled = bundleFiles(debouncedFiles);
        setIframeSrc(bundled);
    }, [debouncedFiles]);

    // Loading Animation
    useEffect(() => {
        if (isLoading) {
            setLoadingStep(0);
            const interval = setInterval(() => setLoadingStep(p => (p < 3 ? p + 1 : p)), 2000); 
            return () => clearInterval(interval);
        } else setLoadingStep(0);
    }, [isLoading]);

    // View Mode Initialization (Fixed to not reset on auto-save)
    useEffect(() => {
        // Only initialize view mode if we haven't for this creation ID yet
        if (creation && !isLoading && creation.id !== viewModeInitRef.current) {
            if (creation.originalImage) setViewMode('split-image');
            else setViewMode('full');
            viewModeInitRef.current = creation.id;
        }
    }, [creation?.id, creation?.originalImage, isLoading]);

    useEffect(() => {
        if (viewMode === 'split-code' && !isLoading) setContext('editor')
        else setContext('preview')
    }, [viewMode, isLoading])

    useEffect(() => {
        register({ id: 'toggle-palette', label: 'Command Palette', sequences: [[{ ctrl: true, key: 'k' }], [{ ctrl: true, key: 'k' }, { ctrl: true, key: 'k' }]], contexts: ['global', 'preview'], run: () => setShowPalette(p => !p) })
    }, [])

    

    // Handle Resize
    const startResizing = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const stopResizing = useCallback(() => setIsDragging(false), []);
    const resize = useCallback((e: MouseEvent) => {
        if (isDragging && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            let newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            setSplitRatio(Math.max(20, Math.min(80, newRatio)));
        }
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
            document.body.style.cursor = 'col-resize';
        } else {
            document.body.style.cursor = '';
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            document.body.style.cursor = '';
        };
    }, [isDragging, resize, stopResizing]);

    useEffect(() => {
        /**
         * Handles the auto-saving process for files.
         *
         * This function checks if the necessary conditions for auto-saving are met, including the presence of
         * `creation`, `onAutoSave`, and non-empty `files`. If conditions are satisfied, it updates the save status
         * to 'saving', invokes the `onAutoSave` callback with the `files`, updates the last saved time, and
         * sets a timeout to change the save status to 'saved' after 500 milliseconds.
         */
        const handler = () => {
            if (!creation || !onAutoSave || Object.keys(files).length === 0) return
            setSaveStatus('saving')
            onAutoSave(files)
            setLastSavedTime(new Date())
            setTimeout(() => setSaveStatus('saved'), 500)
        }
        window.addEventListener('shortcut-save', handler as EventListener)
        return () => window.removeEventListener('shortcut-save', handler as EventListener)
    }, [creation, onAutoSave, files])

    // Handlers
    /**
     * Handles changes to the file content.
     *
     * This function updates the file's content and manages the edit history. It checks if the user is in a pro mode before proceeding. If more than 1 second has passed since the last edit, it captures the current state of the files into a history array, ensuring that the history does not exceed 30 entries. It also resets the future redo stack and updates the last edit time. Finally, it marks the current file as unsaved.
     *
     * @param newContent - The new content to be set for the active file.
     */
    const handleFileChange = (newContent: string) => {
        if (!isPro) return; 

        const now = Date.now();
        // Snapshot history if it's been more than 1s since last edit (grouping typing bursts)
        if (now - lastEditTimeRef.current > 1000) {
            setPast(p => {
                const newPast = [...p, files];
                if (newPast.length > 30) newPast.shift(); // Cap history at 30 steps
                return newPast;
            });
            setFuture([]); // New edit clears future redo stack
        }
        lastEditTimeRef.current = now;

        setFiles(prev => ({
            ...prev,
            [activeFile]: { ...prev[activeFile], content: newContent }
        }));
        setSaveStatus('unsaved');
    };
    
    /**
     * Reverts to the previous state by updating files and history.
     */
    const handleUndo = () => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        
        setFuture(f => [files, ...f]);
        setFiles(previous);
        setPast(newPast);
        setSaveStatus('unsaved');
    };

    const handleRedo = () => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        
        setPast(p => [...p, files]);
        setFiles(next);
        setFuture(newFuture);
        setSaveStatus('unsaved');
    };

    useEffect(() => {
        if (!isPro) return
        register({ id: 'editor-undo', label: 'Undo', sequences: [[{ ctrl: true, key: 'z' }]], contexts: ['editor'], run: () => handleUndo() })
        register({ id: 'editor-redo', label: 'Redo', sequences: [[{ ctrl: true, key: 'y' }], [{ ctrl: true, key: 'z', shift: true }]], contexts: ['editor'], run: () => handleRedo() })
    }, [isPro, past, future])

    /**
     * Handles the submission of the refine form.
     */
    const handleRefineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (refinementPrompt.trim() && !isRefining) {
            onRefine(refinementPrompt, files);
            setRefinementPrompt('');
        }
    };

    // Export Handlers (Updated for Multi-file)
    const handleExportZip = useCallback(async () => {
        if (!window.JSZip) {
            alert("Export module loading... please try again.");
            return;
        }
        const zip = new window.JSZip();
        Object.entries(files).forEach(([name, file]) => {
            zip.file(name, file.content);
        });
        try {
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${creation?.name.replace(/\s+/g, '_') || 'project'}.zip`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch (err) { console.error(err); alert("ZIP generation failed."); }
        setShowExportMenu(false);
    }, [files, creation]);

    const handleFrameworkExport = useCallback(async (framework: 'react' | 'vue') => {
        if (!isPro) { onTriggerUpgrade(); setShowExportMenu(false); return; }
        if (!window.JSZip) {
             alert("Export tools are initializing. Please wait a moment.");
             return;
        }
        
        setIsConverting(true);
        try {
            const projectFiles = await convertToFramework(files, framework);
            
            const zip = new window.JSZip();
            // Add all generated files to zip
            Object.entries(projectFiles).forEach(([path, file]) => {
                 zip.file(path, file.content);
            });
            
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; 
            a.download = `${creation?.name.replace(/\s+/g, '-').toLowerCase() || 'project'}-${framework}.zip`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch (e) { 
             console.error(e);
             alert(`Failed to convert to ${framework}. The AI might be busy. Please try again.`); 
        } 
        finally { setIsConverting(false); setShowExportMenu(false); }
    }, [files, isPro, onTriggerUpgrade, creation]);

    const commandActions = useMemo(() => [
        { id: 'undo', label: 'Undo', icon: <ArrowUturnLeftIcon className="w-4 h-4" />, action: handleUndo, shortcut: 'Ctrl+Z' },
        { id: 'redo', label: 'Redo', icon: <ArrowUturnRightIcon className="w-4 h-4" />, action: handleRedo, shortcut: 'Ctrl+Y' },
        { id: 'export-zip', label: 'Export ZIP', icon: <ArchiveBoxArrowDownIcon className="w-4 h-4" />, action: handleExportZip },
        { id: 'export-react', label: 'Export React', icon: <BoltIcon className="w-4 h-4" />, action: () => handleFrameworkExport('react'), shortcut: 'PRO' },
        { id: 'export-vue', label: 'Export Vue', icon: <BoltIcon className="w-4 h-4" />, action: () => handleFrameworkExport('vue'), shortcut: 'PRO' },
        { id: 'view-full', label: 'View: Full', icon: <ViewColumnsIcon className="w-4 h-4" />, action: () => setViewMode('full') },
        { id: 'view-split-code', label: 'View: Code', icon: <CommandLineIcon className="w-4 h-4" />, action: () => setViewMode('split-code') },
        ...(creation?.originalImage ? [{ id: 'view-split-image', label: 'View: Input', icon: <PhotoIcon className="w-4 h-4" />, action: () => setViewMode('split-image') }] : []),
        { id: 'close', label: 'Close Preview', icon: <XMarkIcon className="w-4 h-4" />, action: onReset },
    ], [handleExportZip, handleFrameworkExport, creation, onReset, handleUndo, handleRedo]);

    const leftPanelStyle = { '--left-panel-width': `${splitRatio}%` } as React.CSSProperties;

  return (
    <div className={`fixed z-40 flex flex-col rounded-lg overflow-hidden border border-zinc-800 bg-[#0E0E10] shadow-2xl transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1) ${isFocused ? 'inset-2 md:inset-4 opacity-100 scale-100' : 'top-1/2 left-1/2 w-[90%] h-[60%] -translate-x-1/2 -translate-y-1/2 opacity-0 scale-95 pointer-events-none'}`}>
      
      {/* Header */}
      <div className="bg-[#121214] px-4 py-3 flex items-center justify-between border-b border-zinc-800 shrink-0">
        <div className="flex items-center space-x-3 w-32">
           <div className="flex space-x-2 group/controls">
                <button onClick={onReset} className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-red-500 transition-colors flex items-center justify-center" title="Close Preview"><XMarkIcon className="w-2 h-2 text-black opacity-0 group-hover/controls:opacity-100" /></button>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-yellow-500 transition-colors"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-green-500 transition-colors"></div>
           </div>
        </div>
        <div className="flex items-center space-x-3 text-zinc-500">
            <BoltIcon className="w-3 h-3 text-blue-500" />
            <span className="text-[11px] font-mono uppercase tracking-wider">{isLoading ? 'Building...' : isRefining ? 'Refining...' : creation ? creation.name : 'Preview'}</span>
            
            {/* Save Indicator */}
            {!isLoading && creation && (
                <div className={`flex items-center gap-1.5 transition-opacity duration-300 ${saveStatus === 'unsaved' ? 'opacity-50' : 'opacity-100'}`}>
                    {saveStatus === 'saving' ? (
                         <CloudArrowUpIcon className="w-3 h-3 text-blue-400 animate-pulse" />
                    ) : saveStatus === 'saved' ? (
                         <CheckCircleIcon className="w-3 h-3 text-green-500" />
                    ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div>
                    )}
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wide">
                        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Edited'}
                    </span>
                </div>
            )}
        </div>
        <div className="flex items-center justify-end space-x-1 min-w-32">
            {!isLoading && creation && (
                <>
                    {creation.originalImage && (
                         <button onClick={() => setViewMode(m => m === 'split-image' ? 'full' : 'split-image')} title="Input" className={`p-1.5 rounded-md transition-all ${viewMode === 'split-image' ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/50' : 'text-zinc-500 hover:bg-zinc-800'}`}><ViewColumnsIcon className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => setViewMode(m => m === 'split-code' ? 'full' : 'split-code')} title="Code" className={`p-1.5 rounded-md transition-all ${viewMode === 'split-code' ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/50' : 'text-zinc-500 hover:bg-zinc-800'}`}><CommandLineIcon className="w-4 h-4" /></button>
                    
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                    
                    <div className="relative" ref={exportMenuRef}>
                        <button onClick={() => setShowExportMenu(!showExportMenu)} className={`p-1.5 rounded-md transition-all ${showExportMenu ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800'}`} title="Export">
                            {isConverting ? <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin"></div> : <ArrowDownTrayIcon className="w-4 h-4" />}
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#18181b] border border-zinc-800 rounded-lg shadow-xl py-1 z-50">
                                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Download</div>
                                <button onClick={handleExportZip} className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"><ArchiveBoxArrowDownIcon className="w-3 h-3" /> ZIP Package</button>
                                
                                <div className="my-1 border-t border-zinc-800"></div>
                                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1"> <SparklesIcon className="w-3 h-3" /> Pro Export</div>
                                
                                <button onClick={() => handleFrameworkExport('react')} className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-800 flex items-center gap-2 group ${!isPro ? 'opacity-70' : 'text-zinc-200'}`}>
                                    <span className="w-3 h-3 flex items-center justify-center">{!isPro && <LockClosedIcon className="w-2.5 h-2.5 text-zinc-500 group-hover:text-amber-500" />}</span>
                                    React Project (ZIP)
                                </button>
                                <button onClick={() => handleFrameworkExport('vue')} className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-800 flex items-center gap-2 group ${!isPro ? 'opacity-70' : 'text-zinc-200'}`}>
                                    <span className="w-3 h-3 flex items-center justify-center">{!isPro && <LockClosedIcon className="w-2.5 h-2.5 text-zinc-500 group-hover:text-amber-500" />}</span>
                                    Vue Project (ZIP)
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
      </div>

      {/* Main Content */}
      <div ref={containerRef} className="relative w-full flex-1 bg-[#09090b] flex flex-col md:flex-row overflow-hidden" style={leftPanelStyle}>
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 w-full">
             <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 mb-6 text-blue-500 animate-spin-slow"><BoltIcon className="w-12 h-12" /></div>
                    <h3 className="text-zinc-100 font-mono text-lg tracking-tight">Architecting Solution</h3>
                    <p className="text-zinc-500 text-sm mt-2">Gemini is coding your project...</p>
                </div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 animate-[loading_3s_ease-in-out_infinite] w-1/3"></div></div>
                 <div className="border border-zinc-800 bg-black/50 rounded-lg p-4 space-y-3 font-mono text-sm">
                     <LoadingStep text="Planning file structure" active={loadingStep === 0} completed={loadingStep > 0} />
                     <LoadingStep text="Writing clean code" active={loadingStep === 1} completed={loadingStep > 1} />
                     <LoadingStep text="Optimizing for performance" active={loadingStep === 2} completed={loadingStep > 2} />
                     <LoadingStep text="Finalizing preview" active={loadingStep === 3} completed={loadingStep > 3} />
                 </div>
             </div>
          </div>
        ) : (Object.keys(files).length > 0) ? (
          <>
            {/* Left Panel: Code/Image */}
            <div className={`relative flex border-b md:border-b-0 md:border-r border-zinc-800 bg-[#0c0c0e] overflow-hidden ${viewMode !== 'full' ? 'opacity-100' : 'opacity-0 border-none'} ${viewMode !== 'full' ? 'w-full h-1/2 md:h-full md:w-[var(--left-panel-width)]' : 'w-0 h-0'} ${isDragging ? 'transition-none' : 'transition-all duration-500 ease-in-out'}`}>
                
                {/* Split View: Code Editor + Explorer */}
                {viewMode === 'split-code' && (
                    <div className="flex w-full h-full">
                        <FileExplorer files={files} activeFile={activeFile} onSelectFile={setActiveFile} />
                        <div className="flex-1 h-full border-l border-zinc-800">
                            <CodeEditor 
                                code={files[activeFile]?.content || ''} 
                                fileName={activeFile} 
                                onChange={handleFileChange} 
                                readOnly={!isPro} 
                                onTriggerUpgrade={onTriggerUpgrade}
                                onUndo={handleUndo}
                                onRedo={handleRedo}
                                canUndo={past.length > 0}
                                canRedo={future.length > 0}
                            />
                        </div>
                    </div>
                )}

                {/* Split View: Image Input */}
                {viewMode === 'split-image' && creation?.originalImage && (
                    <div className="relative w-full h-full flex flex-col">
                        <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur text-zinc-400 text-[10px] font-mono uppercase px-2 py-1 rounded border border-zinc-800 pointer-events-none">Input Source</div>
                        <div className="w-full h-full p-6 flex items-center justify-center overflow-hidden bg-[#121214]">
                            <img src={creation.originalImage} alt="Input" className="max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded" />
                        </div>
                    </div>
                )}
            </div>

            {/* Resizer Handle */}
            {viewMode !== 'full' && !isLoading && (
                <div className="hidden md:flex w-1 hover:w-1.5 hover:bg-blue-500/10 z-30 cursor-col-resize items-center justify-center bg-zinc-900 transition-all border-l border-zinc-800 hover:border-blue-500 select-none" onMouseDown={startResizing}><div className="w-0.5 h-6 bg-zinc-700 rounded-full pointer-events-none"></div></div>
            )}

            {/* Right Panel: Preview */}
            <div className={`relative h-full bg-white overflow-hidden flex-1 ${isDragging ? 'transition-none pointer-events-none' : 'transition-all duration-500 ease-in-out'}`}>
                 <iframe title="Preview" srcDoc={iframeSrc} className={`w-full h-full transition-opacity duration-300 ${isRefining ? 'opacity-50 blur-sm scale-[0.99]' : 'opacity-100 scale-100'}`} sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin" />
                
                {/* Refinement Bar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30">
                    <form onSubmit={handleRefineSubmit} className="relative group">
                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 ${isRefining ? 'opacity-60 animate-pulse' : ''}`}></div>
                        <div className="relative flex items-center bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-2xl">
                            {isRefining ? <div className="w-5 h-5 ml-3 mr-2 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div> : <SparklesIcon className="w-5 h-5 text-blue-400 ml-3 mr-2 animate-pulse" />}
                            <input type="text" value={refinementPrompt} onChange={(e) => setRefinementPrompt(e.target.value)} disabled={isRefining} className="bg-transparent border-none text-sm text-white placeholder-zinc-500 focus:ring-0 flex-1 h-10" placeholder={isRefining ? "Applying changes..." : "Make the title larger, change color..."} />
                            <button type="submit" disabled={!refinementPrompt.trim() || isRefining} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors"><PaperAirplaneIcon className="w-4 h-4 -rotate-45" /></button>
                        </div>
                    </form>
                </div>
            </div>
          </>
        ) : null}
      </div>
      
      <CommandPalette 
        isOpen={showPalette} 
        onClose={() => setShowPalette(false)} 
        files={Object.keys(files)} 
        onSelectFile={setActiveFile} 
        actions={commandActions} 
      />

    </div>
  );
};
