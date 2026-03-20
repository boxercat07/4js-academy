const fs = require('fs');
const content = fs.readFileSync('landing_page_simplified_layout/code.html', 'utf8');
const match = content.match(/data:image\/png;base64,([^"']+)/);
if (match) {
    const b64 = match[1];
    fs.writeFileSync('app/logo.png', Buffer.from(b64, 'base64'));
    console.log("Success");
} else {
    console.log("Not found");
}
