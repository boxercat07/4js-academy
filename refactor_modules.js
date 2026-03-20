const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('app/technical-track.html', 'utf-8');
const dom = new JSDOM(html);
const document = dom.window.document;

// 1. Remove corrupted tailwind script
const bodyScriptTags = document.querySelectorAll('script#tailwind-config');
bodyScriptTags.forEach(t => t.remove());

// 2. Wrap all module-containers into `<ai-module>` custom element
const modulesContainers = document.querySelectorAll('section.module-container');
modulesContainers.forEach((el, index) => {
    // Determine title
    let title = "Module Title";
    const h3 = el.querySelector('h3');
    if (h3) title = h3.textContent.trim();

    // Determine the step (01, 02 etc)
    let step = ('0' + (index + 1)).slice(-2);

    // Get the inner lessons container
    const contentContainer = el.querySelector('.module-content');
    let innerHTMLContent = '';
    if (contentContainer) {
        innerHTMLContent = contentContainer.innerHTML;
    }

    // Create custom element
    const aiModuleWrapper = document.createElement('div');
    aiModuleWrapper.innerHTML = `<ai-module step="${step}" title="${title}">
        ${innerHTMLContent}
    </ai-module>`;

    // Replace the old section with the new element
    el.replaceWith(aiModuleWrapper.firstElementChild);
});

// Write to file
fs.writeFileSync('app/technical-track.html', dom.serialize());
console.log('Successfully refactored modules to <ai-module> and removed corrupted tailwind tag.');
