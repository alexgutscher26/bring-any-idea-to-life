/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useState, useEffect } from 'react';
import { ArrowUpTrayIcon, SparklesIcon, CpuChipIcon, PaperAirplaneIcon, PhotoIcon, CommandLineIcon, CalculatorIcon } from '@heroicons/react/24/outline';

interface InputAreaProps {
  onGenerate: (prompt: string, file?: File) => void;
  isGenerating: boolean;
  disabled?: boolean;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * A React component that cycles through an array of text phrases with a fade effect.
 */
const CyclingText = () => {
    const words = [
        "a napkin sketch",
        "a chaotic whiteboard",
        "a game level design",
        "a sci-fi interface",
        "a diagram of a machine",
        "an ancient scroll"
    ];
    const [index, setIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false); // fade out
            setTimeout(() => {
                setIndex(prev => (prev + 1) % words.length);
                setFade(true); // fade in
            }, 500); // Wait for fade out
        }, 3000); // Slower cycle to read longer text
        return () => clearInterval(interval);
    }, [words.length]);

    return (
        <span className={`inline-block whitespace-nowrap transition-all duration-500 transform ${fade ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-2 blur-sm'} text-white font-medium pb-1 border-b-2 border-blue-500/50`}>
            {words[index]}
        </span>
    );
};

export const InputArea: React.FC<InputAreaProps> = ({ onGenerate, isGenerating, disabled = false, fileInputRef }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [prompt, setPrompt] = useState("");

  /**
   * Handles the uploaded file by checking its type and generating output if valid.
   */
  const handleFile = (file: File) => {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      onGenerate(prompt, file);
    } else {
      alert("Please upload an image or PDF.");
    }
  };

  /**
   * Handles file input changes and processes the selected file.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
    // Reset value so the same file can be selected again if needed
    if (e.target) e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isGenerating) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [disabled, isGenerating, prompt]); // Added prompt dependency

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!disabled && !isGenerating) {
        setIsDragging(true);
    }
  }, [disabled, isGenerating]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  /**
   * Handles the submission of text input.
   *
   * This function checks if the prompt is not empty, if the submission is not disabled,
   * and if a generation process is not currently in progress. If all conditions are met,
   * it calls the onGenerate function with the provided prompt.
   */
  const handleTextSubmit = () => {
      if (!prompt.trim() || disabled || isGenerating) return;
      onGenerate(prompt);
  };

  /**
   * Sets the prompt text without auto-submitting.
   */
  const handleQuickPrompt = (text: string) => {
      setPrompt(text);
      // We don't auto-submit to let the user tweak it if they want,
      // or we could auto-submit. Let's auto-focus instead (implicit in React state update + render)
  };

  /**
   * Handles the creation of a sample SVG wireframe and triggers the generation process.
   */
  const handleSampleWireframe = () => {
      if (disabled || isGenerating) return;
      // Create a dummy SVG wireframe
      const svgContent = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg" style="background:#f3f4f6">
        <rect x="50" y="50" width="700" height="100" rx="8" fill="#d1d5db" stroke="#9ca3af" stroke-dasharray="4 4"/>
        <text x="400" y="110" font-family="monospace" font-size="24" fill="#4b5563" text-anchor="middle">HERO HEADER</text>
        <rect x="50" y="180" width="200" height="300" rx="8" fill="#e5e7eb" stroke="#9ca3af" stroke-dasharray="4 4"/>
        <text x="150" y="330" font-family="monospace" font-size="20" fill="#4b5563" text-anchor="middle">NAV</text>
        <rect x="280" y="180" width="470" height="300" rx="8" fill="#ffffff" stroke="#9ca3af"/>
        <text x="515" y="330" font-family="monospace" font-size="20" fill="#4b5563" text-anchor="middle">MAIN CONTENT</text>
        <circle cx="700" cy="540" r="30" fill="#3b82f6" opacity="0.5"/>
        <text x="700" y="545" font-family="monospace" font-size="24" fill="white" text-anchor="middle">+</text>
        </svg>
      `;
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const file = new File([blob], "sample_wireframe.svg", { type: 'image/svg+xml' });
      onGenerate("Turn this low-fidelity wireframe into a modern, responsive landing page.", file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto perspective-1000 flex flex-col gap-6">
      
      {/* 1. Main Upload Area */}
      <div 
        className={`relative group transition-all duration-300 ${isDragging ? 'scale-[1.01]' : ''}`}
      >
        <label
          className={`
            relative flex flex-col items-center justify-center
            h-48 sm:h-56 md:h-64
            bg-zinc-900/30 
            backdrop-blur-sm
            rounded-xl border border-dashed
            cursor-pointer overflow-hidden
            transition-all duration-300
            ${isDragging 
              ? 'border-blue-500 bg-zinc-900/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' 
              : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/40'
            }
            ${isGenerating ? 'pointer-events-none' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
            {/* Technical Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px'}}>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-4 md:space-y-6 p-6 w-full">
                <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-transform duration-500 ${isDragging ? 'scale-110' : 'group-hover:-translate-y-1'}`}>
                    <div className={`absolute inset-0 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-xl flex items-center justify-center ${isGenerating ? 'animate-pulse' : ''}`}>
                        {isGenerating ? (
                            <CpuChipIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-400 animate-spin-slow" />
                        ) : (
                            <ArrowUpTrayIcon className={`w-6 h-6 md:w-8 md:h-8 text-zinc-300 transition-all duration-300 ${isDragging ? '-translate-y-1 text-blue-400' : ''}`} />
                        )}
                    </div>
                </div>

                <div className="space-y-2 w-full max-w-3xl">
                    <h3 className="flex flex-col items-center justify-center text-lg sm:text-xl md:text-3xl text-zinc-100 leading-none font-bold tracking-tighter gap-2 md:gap-3">
                        <span>Bring</span>
                        <div className="h-6 sm:h-8 md:h-10 flex items-center justify-center w-full">
                           <CyclingText />
                        </div>
                        <span>to life</span>
                    </h3>
                    <p className="text-zinc-500 text-xs sm:text-sm font-light tracking-wide">
                        <span className="hidden md:inline">Drag & Drop</span>
                        <span className="md:hidden">Tap</span> to upload image/PDF
                    </p>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={isGenerating || disabled}
            />
        </label>
      </div>

      {/* 2. Text Input & Actions */}
      <div className="w-full flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          {/* Text Input Bar */}
          <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <SparklesIcon className="h-5 w-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input 
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Or describe what you want to build..."
                className="block w-full pl-12 pr-12 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                disabled={isGenerating || disabled}
              />
              <button 
                onClick={handleTextSubmit}
                disabled={!prompt.trim() || isGenerating}
                className="absolute inset-y-1.5 right-1.5 aspect-square rounded-lg bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400 transition-all flex items-center justify-center"
              >
                  <PaperAirplaneIcon className="w-4 h-4 -rotate-45 translate-x-px -translate-y-px" />
              </button>
          </div>
      </div>

      {/* 3. Quick Start Pills */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider py-1.5">Quick Start:</span>
          
          <button 
            onClick={() => handleQuickPrompt("Create a fully functional scientific calculator with a history log.")}
            className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 group"
          >
            <CalculatorIcon className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" />
            Calculator
          </button>

          <button 
             onClick={() => handleQuickPrompt("Design a modern, dark-themed landing page for a SaaS product called 'Nebula'.")}
             className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 group"
          >
            <CommandLineIcon className="w-3.5 h-3.5 group-hover:text-purple-400 transition-colors" />
            Landing Page
          </button>

          <button 
             onClick={() => handleQuickPrompt("Build a Kanban board with drag-and-drop tasks.")}
             className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 group"
          >
            <CommandLineIcon className="w-3.5 h-3.5 group-hover:text-green-400 transition-colors" />
            Kanban App
          </button>

           <div className="w-px h-5 bg-zinc-800 mx-1 hidden md:block"></div>

           <button 
             onClick={handleSampleWireframe}
             className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 text-xs text-blue-400 transition-all flex items-center gap-1.5"
          >
            <PhotoIcon className="w-3.5 h-3.5" />
            Try Sample Wireframe
          </button>
      </div>
    </div>
  );
};