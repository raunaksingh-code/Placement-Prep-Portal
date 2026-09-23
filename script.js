
const fs = require('fs');
let content = fs.readFileSync('backend/app/api/admin.py', 'utf8');

// Replace the invalid calculation
content = content.replace(
    /          total = a\.correct_count \+ a\.incorrect_count \+ a\.unattempted_count\s*\n          acc = round\(\(a\.correct_count \/ total \* 100\) if total > 0 else 0\.0, 1\)/g,
    '          total = a.total\\n          acc = round(max(0, a.score) / total * 100, 1) if total > 0 else 0.0'
);

fs.writeFileSync('backend/app/api/admin.py', content);

