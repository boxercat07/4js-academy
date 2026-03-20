const fs = require('fs');
let html = fs.readFileSync('app/technical-track.html', 'utf-8');

// Remove the conflicting onclick
html = html.replace(/onclick="this\.closest\('\.module-container'\)\.classList\.toggle\('module-collapsed'\)"/g, '');

// Update the script tag to include icon rotation
const newScript = `<script>
    document.addEventListener('DOMContentLoaded', () => {
        // Chevron toggle logic
        document.querySelectorAll('.chevron-icon').forEach(icon => {
            icon.addEventListener('click', e => {
                const moduleContainer = e.target.closest('.module-container');
                if (moduleContainer) {
                    moduleContainer.classList.toggle('module-collapsed');
                    const content = moduleContainer.querySelector('.space-y-3');
                    if (content) {
                        content.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                        if (moduleContainer.classList.contains('module-collapsed')) {
                            content.style.maxHeight = '0px';
                            content.style.paddingTop = '0px';
                            content.style.paddingBottom = '0px';
                            content.style.opacity = '0';
                            content.style.overflow = 'hidden';
                            icon.style.transform = 'rotate(-90deg)';
                        } else {
                            content.style.maxHeight = '1500px';
                            content.style.paddingTop = '1rem';
                            content.style.paddingBottom = '1rem';
                            content.style.opacity = '1';
                            icon.style.transform = 'rotate(0deg)';
                            // Remove hidden overflow after transition
                            setTimeout(() => {
                                if (!moduleContainer.classList.contains('module-collapsed')) {
                                    content.style.overflow = 'visible';
                                }
                            }, 400);
                        }
                    }
                }
            });
        });

        // Initialize state
        document.querySelectorAll('.module-container').forEach(moduleContainer => {
            const content = moduleContainer.querySelector('.space-y-3');
            const icon = moduleContainer.querySelector('.chevron-icon');
            if (content && icon) {
                content.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                if (moduleContainer.classList.contains('module-collapsed')) {
                     content.style.maxHeight = '0px';
                     content.style.paddingTop = '0px';
                     content.style.paddingBottom = '0px';
                     content.style.opacity = '0';
                     content.style.overflow = 'hidden';
                     icon.style.transform = 'rotate(-90deg)';
                } else {
                     content.style.maxHeight = '1500px';
                     content.style.paddingTop = '1rem';
                     content.style.paddingBottom = '1rem';
                     content.style.opacity = '1';
                     content.style.overflow = 'visible';
                     icon.style.transform = 'rotate(0deg)';
                }
            }
        });
    });
</script>`;

html = html.replace(/<script>[\s\S]*?<\/script>\s*<\/body>/, newScript + '\n    </body>');

fs.writeFileSync('app/technical-track.html', html);
console.log('Fixed chevron toggle logic and removed onclick');
