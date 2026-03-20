const fs = require('fs');
let html = fs.readFileSync('app/technical-track.html', 'utf-8');

// Insert the SortableJS script tag just before the closing body tag
const sortableScript = `<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>\n        <script>`;

// Update the initialization script to also initialize Sortable on all module-content containers
const extraScript = `
                // Initialize Sortable for drag and drop reordering
                document.querySelectorAll('.module-content').forEach(container => {
                    new Sortable(container, {
                        group: 'shared', // set both lists to same group
                        animation: 150,
                        handle: '.drag-handle', // drag handle selector within list items
                        ghostClass: 'bg-slate-800/50', // Class name for the drop placeholder
                        chosenClass: 'border-primary/50', // Class name for the chosen item
                        dragClass: 'opacity-50', // Class name for the dragging item
                        onEnd: function (evt) {
                            console.log('Item moved from', evt.oldIndex, 'to', evt.newIndex);
                            // Ensure the Insert Content Item button stays at the bottom
                            const btn = container.querySelector('button.w-full.py-4');
                            if (btn && container.lastElementChild !== btn) {
                                container.appendChild(btn);
                            }
                        }
                    });
                });
`;

// Only replace if not already replaced
if (!html.includes('Sortable.min.js')) {
    html = html.replace('<script>', sortableScript);
    html = html.replace('// Initialize state', extraScript + '\n                // Initialize state');
    fs.writeFileSync('app/technical-track.html', html);
    console.log('SortableJS injected successfully.');
} else {
    console.log('SortableJS already injected.');
}
