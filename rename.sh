#!/usr/bin/env bash
set -e
echo "Step 1: replacing strings inside files..."
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" -o -name "*.html" -o -name "*.sql" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | while read -r f; do
  sed -i -e 's/AgriVest/Upeo/g' -e 's/Agrivest/Upeo/g' -e 's/agrivest/upeo/g' -e 's/AGRIVEST/UPEO/g' "$f" 2>/dev/null || true
done
echo "  strings replaced"
echo "Step 2: renaming files..."
[ -f "agrivestComplete.jsx" ] && mv agrivestComplete.jsx upeoComplete.jsx && echo "  agrivestComplete.jsx → upeoComplete.jsx"
[ -f "AgriVestComplete.jsx" ] && mv AgriVestComplete.jsx UpeoComplete.jsx && echo "  AgriVestComplete.jsx → UpeoComplete.jsx"
[ -f "agrivestPrototype.jsx" ] && mv agrivestPrototype.jsx upeoPrototype.jsx
[ -f "AgriVestPrototype.jsx" ] && mv AgriVestPrototype.jsx UpeoPrototype.jsx
[ -f "agrivest-design.md" ] && mv agrivest-design.md upeo-design.md
[ -f "agrivest-design-prompt.md" ] && mv agrivest-design-prompt.md upeo-design-prompt.md
echo "  files renamed"
echo "Step 3: renaming agrivest/ folder..."
[ -d "agrivest" ] && mv agrivest upeo && echo "  agrivest/ → upeo/"
echo "Step 4: fixing main.jsx..."
[ -f "main.jsx" ] && sed -i 's/agrivestComplete/upeoComplete/g; s/AgriVestComplete/UpeoComplete/g' main.jsx && echo "  main.jsx updated"
echo "Step 5: fixing index.html..."
[ -f "index.html" ] && sed -i 's/Agri Vest/Upeo/g; s/AgriVest/Upeo/g' index.html && echo "  index.html updated"
echo ""
echo "=== Done! ==="
ls *.jsx *.html *.json 2>/dev/null
echo "Folders:" && ls -d */ 2>/dev/null | grep -v node_modules
