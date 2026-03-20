const fs = require('fs');
let html = fs.readFileSync('app/technical-track.html', 'utf-8');

// I will rebuild the missing HTML from earlier tool calls.
const restoreHTML = `                <div class="flex items-center gap-3">
                    <button class="w-10 h-10 border border-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ml-4">
                        <span class="material-symbols-outlined">search</span>
                    </button>
                    <button class="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">add</span>
                        New Track
                    </button>
                </div>
            </header>
            
            <div class="p-6 max-w-5xl mx-auto w-full mb-20">
                <!-- Track Meta Header -->
                <div class="mb-8 border-b border-slate-800 pb-8">
                    <div class="flex items-start justify-between mb-4">
                        <div>
                            <div class="flex items-center gap-3 mb-2">
                                <span class="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                                    Technical Track
                                </span>
                                <span class="status-badge bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    Draft
                                </span>
                            </div>
                            <h1 class="text-3xl font-display text-white mb-2">Generative AI Engineering</h1>
                            <p class="text-slate-400 max-w-2xl leading-relaxed">
                                Master the fundamentals and advanced concepts of building applications with LLMs, prompt engineering, and RAG architectures.
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            <button class="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors font-semibold text-sm">
                                Preview
                            </button>
                            <button class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2" onclick="document.getElementById('publish-modal').classList.remove('hidden')">
                                <span class="material-symbols-outlined text-[18px]">publish</span>
                                Publish Track
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Editor Controls -->
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-1 border-b border-slate-800 w-full">
                        <button class="border-b-2 border-primary pb-4 text-sm font-bold text-white flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">account_tree</span>
                            Structure Editor
                        </button>
                        <button class="border-b-2 border-transparent pb-4 text-sm font-bold text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2 ml-6">
                            <span class="material-symbols-outlined text-sm">settings</span>
                            Track Settings
                        </button>
                    </div>
                </div>

                <!-- Sequential Content Flow -->
                <div class="space-y-6">
                    <!-- Module 1 -->
                    <section class="group relative bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden module-container">
                        <!-- Module Header -->
                        <div class="p-5 flex items-center justify-between bg-slate-900/60 border-b border-slate-800">
                            <div class="flex items-center gap-4">
                                <div class="drag-handle text-slate-600 hover:text-slate-400 transition-colors">
                                    <span class="material-symbols-outlined">drag_indicator</span>
                                </div>
                                <div>
                                    <span class="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                                        Module 01
                                    </span>
                                    <h3 class="text-lg font-bold">Neural Network Foundations</h3>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 group-hover:opacity-100 transition-opacity opacity-100">
                                <button class="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors flex items-center justify-center toggle-module">
                                    <span class="material-symbols-outlined text-2xl chevron-icon cursor-pointer transition-transform duration-300">expand_less</span>
                                </button>
                                <button class="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="Options">
                                    <span class="material-symbols-outlined text-xl">more_vert</span>
                                </button>
                            </div>
                        </div>

                        <!-- Lessons/Blocks Container -->
                        <div class="p-4 space-y-3 module-content transition-all duration-300 overflow-visible" style="max-height: 1500px; padding-top: 1rem; padding-bottom: 1rem; opacity: 1;">
                            
                            <!-- 1. Introduction to AI -->
                            <div class="flex items-center justify-between bg-background-dark border border-slate-800 p-4 rounded-lg hover:border-slate-600 transition-colors group/item">
                                <div class="flex items-center gap-4">
                                    <div class="drag-handle text-slate-700">
                                        <span class="material-symbols-outlined text-sm">drag_handle</span>
                                    </div>
                                    <div class="size-10 bg-primary/10 rounded flex items-center justify-center text-primary">
                                        <span class="material-symbols-outlined">description</span>
                                    </div>
                                    <div>
                                        <p class="text-sm font-semibold">Introduction to AI</p>
                                        <p class="text-[10px] text-slate-500 uppercase tracking-wider font-bold">PAGE</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1 group-hover/item:opacity-100 transition-opacity opacity-100">
                                    <button class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white">
                                        <span class="material-symbols-outlined text-lg">more_vert</span>
                                    </button>
                                </div>
                            </div>`;

// Find everything from '<div class="flex items-center gap-3">' on line 115 down to the '2. Neural Network Basics' comment.
const exactMatchRegex = /<div class="flex items-center gap-3">\s*<button class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white">\s*<span class="material-symbols-outlined text-lg">more_vert<\/span>\s*<\/button>\s*<\/div>\s*<\/div>\s*<!-- 2\. Neural Network Basics -->/;

if (html.match(exactMatchRegex)) {
    html = html.replace(exactMatchRegex, restoreHTML + '\n                            <!-- 2. Neural Network Basics -->');
    fs.writeFileSync('app/technical-track.html', html);
    console.log('Restored missing HTML.');
} else {
    console.error('Regex did not match the corrupted block.');
}
