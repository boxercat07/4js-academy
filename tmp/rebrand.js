const fs = require('fs');
const path = require('path');

const directory = './app';

function replaceInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = content.replace(/AI Academy/g, 'Academy');
    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function traverseDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            traverseDirectory(filePath);
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            replaceInFile(filePath);
        }
    });
}

traverseDirectory(directory);
console.log('Global rebranding completed in ./app directory.');
