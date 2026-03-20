const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('app/technical-track.html', 'utf-8');
const dom = new JSDOM(html);
const document = dom.window.document;

// Find all buttons that contain the edit text in an icon
const editIcons = document.querySelectorAll('span.material-symbols-outlined');
editIcons.forEach(icon => {
    if (icon.textContent.trim() === 'edit') {
        const editButton = icon.closest('button');
        if (editButton && editButton.parentElement) {
            const container = editButton.parentElement;
            // Check if this container also has a delete button (meaning it's the action group)
            if (container.innerHTML.includes('delete')) {
                // Delete edit and delete buttons and insert more_vert
                container.innerHTML = `
                                <button class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white" title="Options">
                                    <span class="material-symbols-outlined text-lg">more_vert</span>
                                </button>
                `;
            }
        }
    }
});

fs.writeFileSync('app/technical-track.html', dom.serialize());
console.log('Replaced all edit/delete pairs with more_vert using JSDOM.');
