const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
console.log('Connecting to:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
  
  db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return;
    }
    console.log('Tables:', rows.map(r => r.name).join(', '));
    
    db.get("SELECT COUNT(*) as count FROM User", (err, row) => {
        if (err) {
            console.error('Error counting users:', err.message);
        } else {
            console.log('User count:', row.count);
        }
        db.close();
    });
  });
});
