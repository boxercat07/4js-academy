const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const rawHTML = fs.readFileSync('stitch-tech-track.html', 'utf-8');
const dom = new JSDOM(rawHTML);
const document = dom.window.document;

// 1. Update Header to use admin-header
const header = document.querySelector('learner-header');
if (header) {
    const adminHeader = document.createElement('admin-header');
    header.parentNode.replaceChild(adminHeader, header);
}

// 2. Add Sidebar and layout class
const bodyDiv = document.querySelector('body > div');
if (bodyDiv && !document.querySelector('admin-sidebar')) {
    const sidebar = document.createElement('admin-sidebar');
    sidebar.setAttribute('active-page', 'content');
    bodyDiv.insertBefore(sidebar, bodyDiv.firstChild);
}

// 3. Remove 'LEARNING Track' Breadcrumb
const breadcrumbs = Array.from(document.querySelectorAll('a'));
const breadcrumb = breadcrumbs.find(el => el.textContent.includes('LEARNING Track'));
if (breadcrumb) {
    const parentSpan = document.createElement('span');
    parentSpan.className = 'text-slate-500 transition-colors';
    parentSpan.textContent = 'Track Editor';
    breadcrumb.parentNode.replaceChild(parentSpan, breadcrumb);
}

// 4. Remove Footer
const footer = document.querySelector('footer');
if (footer) footer.remove();

// 5. Unify CRUD buttons
const containerDivs = document.querySelectorAll('.module-container > div:first-child');
containerDivs.forEach(div => {
    const buttonsDiv = div.querySelector('div:last-child');
    if (buttonsDiv && buttonsDiv.querySelectorAll('button').length > 1) {
        // Find expand button
        const expandBtn = Array.from(buttonsDiv.querySelectorAll('button')).find(b => b.innerHTML.includes('expand_more'));
        buttonsDiv.innerHTML = '';
        if (expandBtn) {
            expandBtn.innerHTML = '<span class="material-symbols-outlined text-2xl transition-transform duration-300 chevron-icon cursor-pointer">expand_more</span>';
            buttonsDiv.appendChild(expandBtn);
        }

        const moreBtn = document.createElement('button');
        moreBtn.className = 'p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors';
        moreBtn.title = 'Options';
        moreBtn.innerHTML = '<span class="material-symbols-outlined text-xl">more_vert</span>';
        buttonsDiv.appendChild(moreBtn);
    }
});

// For lessons:
const lessonItemDivs = document.querySelectorAll('[class*="group/item"]');
lessonItemDivs.forEach(item => {
    const buttonsDiv = item.querySelector('div:last-child');
    if (buttonsDiv && buttonsDiv.querySelectorAll('button').length > 1) {
        buttonsDiv.innerHTML = '<button class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white"><span class="material-symbols-outlined text-lg">more_vert</span></button>';
    }
});

// 6. Update Chevron click logic block at the bottom
const scripts = document.querySelectorAll('script');
const lastScript = scripts[scripts.length - 1];
if (lastScript && !lastScript.src) {
    lastScript.textContent = "\n" +
        "        // Chevron toggle logic\n" +
        "        document.querySelectorAll('.chevron-icon').forEach(icon => {\n" +
        "            icon.addEventListener('click', (e) => {\n" +
        "                const moduleContainer = e.target.closest('.module-container');\n" +
        "                if (moduleContainer) {\n" +
        "                    moduleContainer.classList.toggle('module-collapsed');\n" +
        "                    // Additional style adjustments to actually collapse visually via max-height or padding manipulation\n" +
        "                    const content = moduleContainer.querySelector('.space-y-3');\n" +
        "                    if(content) {\n" +
        "                        if (moduleContainer.classList.contains('module-collapsed')) {\n" +
        "                            content.style.maxHeight = '0px';\n" +
        "                            content.style.paddingTop = '0px';\n" +
        "                            content.style.paddingBottom = '0px';\n" +
        "                            content.style.overflow = 'hidden';\n" +
        "                        } else {\n" +
        "                            content.style.maxHeight = '1000px';\n" +
        "                            content.style.paddingTop = '1rem';\n" +
        "                            content.style.paddingBottom = '1rem';\n" +
        "                        }\n" +
        "                    }\n" +
        "                }\n" +
        "            });\n" +
        "        });\n" +
        "    ";
}

fs.writeFileSync('app/technical-track.html', dom.serialize());
console.log('Successfully wrote clean HTML to app/technical-track.html');
