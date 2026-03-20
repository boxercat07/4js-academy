const fs = require('fs');
let html = fs.readFileSync('app/technical-track.html', 'utf-8');

// The HTML structure of the buttons varies slightly in whitespace. We'll use a regex that matches the two buttons exactly in the context of the action buttons container.
const regex = /<button[\s\S]*?class="p-1\.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white"[\s\S]*?<span class="material-symbols-outlined text-lg"[\s\S]*?>edit<\/span>[\s\S]*?<\/button>\s*<button[\s\S]*?class="p-1\.5 hover:bg-red-900\/20 rounded text-slate-500 hover:text-red-400"[\s\S]*?<span class="material-symbols-outlined text-lg"[\s\S]*?>delete<\/span>[\s\S]*?<\/button>/g;

const replacement = `<button class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white">
                                    <span class="material-symbols-outlined text-lg">more_vert</span>
                                </button>`;

const newHtml = html.replace(regex, replacement);

if (html !== newHtml) {
    fs.writeFileSync('app/technical-track.html', newHtml);
    console.log('Replaced lesson edit/delete buttons successfully.');
} else {
    console.log('No matches found.');
}
