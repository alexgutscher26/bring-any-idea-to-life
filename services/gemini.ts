/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { withTimeout } from '../utils/timeout';

// Using gemini-3-pro-preview for complex coding tasks.
const GEMINI_MODEL = 'gemini-3-pro-preview';
// Fallback model if Pro is experiencing high traffic/errors.
const FALLBACK_MODEL = 'gemini-2.5-flash';

// Timeout configurations (in milliseconds)
const GENERATION_TIMEOUT = 120000; // 2 minutes
const REFINEMENT_TIMEOUT = 90000;  // 1.5 minutes
const CONVERSION_TIMEOUT = 120000; // 2 minutes

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are an expert Senior Frontend Engineer and UI / UX Designer. 
Your task is to generate a complete, production - ready web application based on the user's request.

CORE OUTPUT DIRECTIVES:
1. ** Multi - File Structure **: You must return a VALID JSON object representing a virtual file system.
   - Keys: File paths(e.g., "index.html", "styles.css", "script.js", "utils.js").
   - Values: An object with a "content" property containing the code string.
   - Example: { "index.html": { "content": "..." }, "styles.css": { "content": "..." } }

2. ** Mandatory Files **:
- \`index.html\`: The entry point. Must link to CSS and JS files correctly using relative paths (e.g., <link rel="stylesheet" href="styles.css">, <script src="script.js"></script>).
   - \`styles.css\`: All custom CSS.
   - \`script.js\`: Main application logic.

3. **Tech Stack**:
   - **HTML5**: Semantic and accessible.
   - **CSS**: Modern CSS or Tailwind CSS (via CDN: <script src="https://cdn.tailwindcss.com"></script>).
   - **JavaScript**: Modern ES6+. No build steps. Use ES modules if creating multiple JS files (<script type="module" src="script.js"></script>).
   - **Icons**: Use Heroicons SVG paths inline or a library via CDN.
   - **Images**: No external images unless using reliable placeholders (e.g., Unsplash Source).

4. **Visuals**:
   - Use Glassmorphism, Bento Grids, and high-quality gradients.
   - Ensure mobile responsiveness.

RESPONSE FORMAT:
Return ONLY the raw JSON string. Do NOT use markdown blocks.`;

const REFINEMENT_INSTRUCTION = `You are an expert Web Developer.
Your task is to update an existing project based on the user's request.

INPUT:
- You will receive the current state of the project files in JSON format.
- You will receive a User Request.

OUTPUT:
- Return a JSON object containing the FULL content of the files that need to be updated.
- You MUST return the complete file content for any file you touch.
- If a file is unchanged, you may omit it from the response, OR return the full set (preferred for safety).
- You can add new files if needed.

RESPONSE FORMAT:
Return ONLY the raw JSON string. Do not use markdown blocks.`;

const PROJECT_CONVERSION_INSTRUCTION = `You are an expert Frontend Architect.
Your task is to convert a legacy HTML/CSS/JS project into a modern, production-ready framework project (React or Vue).

INPUT:
- A JSON object representing the current file structure (index.html, styles.css, script.js).

OUTPUT:
- A JSON object representing a full file system for the target framework using Vite.
- Keys: File paths (e.g., "package.json", "src/App.tsx", "vite.config.ts").
- Values: { "content": "..." }.

FRAMEWORK RULES:
1. **React**: Use Vite + React + TypeScript + Tailwind CSS.
   - Files needed: 
     - package.json (include react, react-dom, lucide-react, tailwindcss, vite, etc.)
     - tsconfig.json
     - vite.config.ts
     - index.html (root with div#root and module script)
     - src/main.tsx (mounts App)
     - src/App.tsx (Main component)
     - src/index.css (Tailwind directives)
     - postcss.config.js
     - tailwind.config.js
   - Move logic from script.js to React components (hooks).
   - Move styles to Tailwind classes or src/index.css.

2. **Vue**: Use Vite + Vue 3 + TypeScript + Tailwind CSS.
   - Files needed: 
     - package.json (vue, vite, tailwindcss, etc.)
     - tsconfig.json
     - vite.config.ts
     - index.html
     - src/main.ts
     - src/App.vue
     - src/style.css (Tailwind directives)
     - postcss.config.js
     - tailwind.config.js

RESPONSE FORMAT:
Return ONLY the raw JSON string of the file map. Do not wrap in markdown code blocks.`;

async function executeGeneration(modelName: string, contents: any, config: any, attempt: number = 0): Promise<Record<string, { content: string }>> {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: { ...config, responseMimeType: "application/json" },
    });

    let text = response.text || "{}";

    // Robust Cleanup:
    // 1. Remove standard markdown code blocks
    text = text.replace(/^```(json)?\s*/g, '').replace(/```\s*$/g, '');

    // 2. Robust extraction: Find the absolute first '{' and the absolute last '}'
    // This prevents issues where the model adds "Here is your code:" before or after the JSON.
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        text = text.substring(firstOpen, lastClose + 1);
    }

    try {
        const parsed = JSON.parse(text);
        // Normalize if the AI returns { "files": { ... } } instead of direct map
        if (parsed.files) return parsed.files;
        return parsed;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response. Raw text:", text);
        console.error("Parse error:", e);

        // Last resort fallback: if it looks like HTML and failed parsing, wrap it.
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            return { "index.html": { content: text } };
        }

        throw new Error("AI response was not valid JSON. Please try again.");
    }
}

/**
 * Initiates the AI generation process with a prompt and optional file data.
 */
export async function bringToLife(prompt: string, fileBase64?: string, mimeType?: string): Promise<Record<string, { content: string }>> {
    return withTimeout(
        bringToLifeInternal(prompt, fileBase64, mimeType),
        GENERATION_TIMEOUT,
        'AI generation timed out. Please try again.'
    );
}

/**
 * Generates a web application based on a user prompt and an optional image file.
 *
 * The function constructs a final prompt based on the provided prompt and fileBase64.
 * It handles SVG and non-SVG images differently, preparing the necessary context for
 * the web app generation. The function attempts to execute the generation process
 * using a specified model, retrying up to three times in case of failure.
 *
 * @param prompt - The user prompt for the web app generation.
 * @param fileBase64 - An optional base64-encoded string of the image file.
 * @param mimeType - An optional MIME type of the image file.
 * @returns A promise that resolves to a record containing the generated content.
 * @throws Error If the generation process fails after maximum retries.
 */
async function bringToLifeInternal(prompt: string, fileBase64?: string, mimeType?: string): Promise<Record<string, { content: string }>> {
    const parts: any[] = [];

    let finalPrompt = "";
    const isSvg = mimeType === 'image/svg+xml';

    if (fileBase64) {
        if (isSvg) {
            try {
                const svgContent = atob(fileBase64);
                finalPrompt = `TASK: Turn this SVG wireframe into a fully functional, multi-file web app.\n\nUSER PROMPT: ${prompt || "Make it interactive."}\n\nSVG CONTEXT:\n${svgContent}`;
            } catch (e) {
                finalPrompt = `Analyze the implied structure. ${prompt ? `\n\nUSER REQUEST: ${prompt}` : ''}`;
            }
        } else {
            finalPrompt = `Analyze this image. Build a fully functional web app matching this design. Split code into index.html, styles.css, and script.js. \n\nUSER REQUEST: ${prompt || "Build what you see."}`;
        }
    } else {
        finalPrompt = prompt || "Create a demo app that shows off your capabilities. Use index.html, styles.css, and script.js.";
    }

    if (fileBase64 && mimeType && !isSvg) {
        parts.push({
            inlineData: {
                data: fileBase64,
                mimeType: mimeType,
            },
        });
    }

    parts.push({ text: finalPrompt });

    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const useModel = (attempt === 0) ? GEMINI_MODEL : FALLBACK_MODEL;
            console.log(`Generation attempt ${attempt + 1} using model: ${useModel}`);

            return await executeGeneration(
                useModel,
                { role: 'user', parts: parts },
                { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.4 },
                attempt
            );

        } catch (error: any) {
            console.warn(`Gemini generation attempt ${attempt + 1} failed:`, error);
            if (attempt < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            else throw error;
        }
    }
    throw new Error("Generation failed");
}

/**
 * Refines the given files based on the user prompt with a timeout.
 */
export async function refineCreation(currentFiles: Record<string, { content: string }>, userPrompt: string): Promise<Record<string, { content: string }>> {
    return withTimeout(
        refineCreationInternal(currentFiles, userPrompt),
        REFINEMENT_TIMEOUT,
        'AI refinement timed out. Please try again.'
    );
}

async function refineCreationInternal(currentFiles: Record<string, { content: string }>, userPrompt: string): Promise<Record<string, { content: string }>> {
    const fileContext = JSON.stringify(currentFiles, null, 2);
    const parts = [
        { text: `CURRENT PROJECT FILES:\n${fileContext}` },
        { text: `USER REQUEST: ${userPrompt}` }
    ];

    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const useModel = (attempt === 0) ? GEMINI_MODEL : FALLBACK_MODEL;
            console.log(`Refinement attempt ${attempt + 1} using model: ${useModel}`);

            const updates = await executeGeneration(
                useModel,
                { role: 'user', parts: parts },
                { systemInstruction: REFINEMENT_INSTRUCTION, temperature: 0.3 },
                attempt
            );

            // Merge updates into current files
            return { ...currentFiles, ...updates };

        } catch (error: any) {
            console.warn(`Refinement attempt ${attempt + 1} failed:`, error);
            if (attempt < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            else throw error;
        }
    }
    throw new Error("Refinement failed");
}

/**
 * Converts files to the specified framework format.
 */
export async function convertToFramework(files: Record<string, { content: string }>, framework: 'react' | 'vue'): Promise<Record<string, { content: string }>> {
    return withTimeout(
        convertToFrameworkInternal(files, framework),
        CONVERSION_TIMEOUT,
        'Framework conversion timed out. Please try again.'
    );
}

/**
 * Converts project files to a specified framework structure.
 */
async function convertToFrameworkInternal(files: Record<string, { content: string }>, framework: 'react' | 'vue'): Promise<Record<string, { content: string }>> {
    const fileContext = JSON.stringify(files, null, 2);
    const prompt = `Convert this project to a complete ${framework === 'react' ? 'React + Vite + TypeScript' : 'Vue + Vite + TypeScript'} project structure.
    
    CURRENT FILES:
    ${fileContext}
    
    IMPORTANT: Return ONLY the JSON object of the new file structure.`;

    return await executeGeneration(
        GEMINI_MODEL,
        { role: 'user', parts: [{ text: prompt }] },
        { systemInstruction: PROJECT_CONVERSION_INSTRUCTION, temperature: 0.2 }
    );
}