const fs = require('fs');
let html = fs.readFileSync('app/technical-track.html', 'utf-8');

const correctScript = `<script>
    document.addEventListener('DOMContentLoaded', () => {
        // Chevron toggle logic
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
        });
    });
</script>\n</body>`;

html = html.replace('</body>', correctScript);
fs.writeFileSync('app/technical-track.html', html);
console.log('Added missing script tag');
