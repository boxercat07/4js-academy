const fs = require('fs');
let html = fs.readFileSync('stitch-tech-track.html', 'utf-8');

// 1. Fix head references
html = html.replace(
    '<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>',
    '<script src="https://cdn.tailwindcss.com"></script>\n        <link rel="stylesheet" href="shared.css" />\n        <script src="components.js"></script>\n        <script src="tailwind-config.js"></script>'
);

// 2. Wrap body in layout and admin-header / admin-sidebar
// Notice stitch-tech-track has <body class="page-transition"> then <div class="flex min-h-screen">
html = html.replace(
    '<div class="flex min-h-screen">',
    '<div class="flex min-h-screen">\n            <admin-sidebar active-page="tracks"></admin-sidebar>'
);

html = html.replace(
    '<learner-header></learner-header>',
    '<admin-header></admin-header>'
);

// 3. Remove "Content Management" or "LEARNING Track" breadcrumb text
// Breadcrumb is roughly `<a class="hover:text-primary transition-colors" href="admin-content.html" style="">LEARNING Track</a>`
html = html.replace(
    '<a class="hover:text-primary transition-colors" href="admin-content.html" style="">\n                                LEARNING Track\n                            </a>',
    '<span class="text-slate-500 transition-colors">Track Editor</span>'
);

// 4. Remove floating info panel footer
const footerStr = `                <footer
                    class="mt-20 border-t border-slate-800 pt-8 pb-12 flex flex-col md:flex-row items-center justify-between opacity-60 text-sm"
                    style=""
                >
                    <div class="flex items-center gap-2 mb-4 md:mb-0" style="">
                        <span class="material-symbols-outlined text-primary text-xl" style="">auto_awesome</span>
                        <span class="font-bold text-white tracking-widest uppercase text-xs" style="">Track Summary</span>
                    </div>
                    <div class="flex items-center gap-6 text-slate-500 font-medium" style="">
                        <span style="">3 Modules</span>
                        <span style="">12 Items</span>
                        <span style="">EST. Time: 4h 30m</span>
                    </div>
                </footer>`;

html = html.replace(footerStr, '');

// 5. Replace buttons in modules
const moduleOldBtns = `                                    <button
                                        class="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                                        style=""
                                        title="Edit Module Title"
                                    >
                                        <span class="material-symbols-outlined text-xl" style="">edit</span>
                                    </button>
                                    <button
                                        class="p-2 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400 transition-colors"
                                        style=""
                                        title="Delete Module"
                                    >
                                        <span class="material-symbols-outlined text-xl" style="">delete</span>
                                    </button>`;

const moduleNewBtn = `                                    <button class="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="Options">
                                        <span class="material-symbols-outlined text-xl">more_vert</span>
                                    </button>`;

html = html.split(moduleOldBtns).join(moduleNewBtn);

// Make expand_more act as a trigger and cursor-pointer
html = html.split('<span class="material-symbols-outlined text-2xl transition-transform duration-300" style="">expand_more</span>')
    .join('<span class="material-symbols-outlined text-2xl transition-transform duration-300 chevron-icon cursor-pointer">expand_more</span>');

// Replace buttons in lessons
const lessonOldBtns = `                                        <button
                                            class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white"
                                            style=""
                                        >
                                            <span class="material-symbols-outlined text-lg" style="">edit</span>
                                        </button>
                                        <button
                                            class="p-1.5 hover:bg-red-900/20 rounded text-slate-500 hover:text-red-400"
                                            style=""
                                        >
                                            <span class="material-symbols-outlined text-lg" style="">delete</span>
                                        </button>`;

const lessonNewBtns = `                                        <button class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white">
                                            <span class="material-symbols-outlined text-lg">more_vert</span>
                                        </button>`;

html = html.split(lessonOldBtns).join(lessonNewBtns);

// Remove `<script>` tag logic for chevron toggle so we can inject ours cleanly at the end
const badScript = `            // Optional: you can add specific JS to handle the drag UI visually or reorder data.`;

const correctScript = `        // Chevron toggle logic
        document.querySelectorAll('.chevron-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const moduleContainer = e.target.closest('.module-container');
                if (moduleContainer) {
                    moduleContainer.classList.toggle('module-collapsed');
                    const content = moduleContainer.querySelector('.space-y-3');
                    if (content) {
                        if (moduleContainer.classList.contains('module-collapsed')) {
                            content.style.maxHeight = '0px';
                            content.style.paddingTop = '0px';
                            content.style.paddingBottom = '0px';
                            content.style.overflow = 'hidden';
                        } else {
                            content.style.maxHeight = '1000px';
                            content.style.paddingTop = '1rem';
                            content.style.paddingBottom = '1rem';
                        }
                    }
                }
            });
        });`;

html = html.split(badScript).join(correctScript);

fs.writeFileSync('app/technical-track.html', html);
console.log('Update Complete.');
