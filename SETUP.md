# Quick Setup & Testing Guide

## Step-by-Step Installation

### Option 1: Quick Test (Recommended)

1. **Copy the extension to VS Code extensions folder:**

   **On macOS/Linux:**
   ```bash
   mkdir -p ~/.vscode/extensions/code-history-tracker
   cp -r /path/to/code-history-tracker/* ~/.vscode/extensions/code-history-tracker/
   cd ~/.vscode/extensions/code-history-tracker
   npm install
   ```

   **On Windows:**
   ```cmd
   mkdir %USERPROFILE%\.vscode\extensions\code-history-tracker
   xcopy /E /I path\to\code-history-tracker %USERPROFILE%\.vscode\extensions\code-history-tracker
   cd %USERPROFILE%\.vscode\extensions\code-history-tracker
   npm install
   ```

2. **Reload VS Code:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Developer: Reload Window"
   - Press Enter

3. **Verify it's working:**
   - Open any file in a git repository
   - Hover over a line of code
   - You should see a tooltip with git history!

### Option 2: Development Mode (For Testing/Modifying)

1. **Open the extension folder in VS Code:**
   ```bash
   code /path/to/code-history-tracker
   ```

2. **Press F5:**
   - This launches an Extension Development Host window
   - The extension will be active in that window only

3. **Open a git repository in the new window:**
   - Open any project with git history
   - Test the extension features

## Testing the Extension

### Create a Test Repository

If you don't have a git project handy, create one:

```bash
# Create test directory
mkdir ~/git-history-test
cd ~/git-history-test
git init

# Create a test file
cat > app.js << 'EOF'
function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        total += item.price;
    }
    return total;
}

function applyDiscount(total, discount) {
    return total * (1 - discount);
}

const cart = [
    { name: "Book", price: 15.99 },
    { name: "Pen", price: 2.99 }
];

console.log("Total:", calculateTotal(cart));
EOF

# Make first commit
git add app.js
git commit -m "Initial version with basic cart calculation"

# Modify the file
cat > app.js << 'EOF'
function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        total += item.price * item.quantity; // Added quantity support
    }
    return total;
}

function applyDiscount(total, discount) {
    if (discount > 1 || discount < 0) {
        throw new Error("Invalid discount");
    }
    return total * (1 - discount);
}

function formatPrice(price) {
    return `$${price.toFixed(2)}`;
}

const cart = [
    { name: "Book", price: 15.99, quantity: 2 },
    { name: "Pen", price: 2.99, quantity: 5 }
];

const total = calculateTotal(cart);
const discounted = applyDiscount(total, 0.1);
console.log("Total:", formatPrice(discounted));
EOF

git add app.js
git commit -m "Add quantity support and price formatting"

# One more change
sed -i '' 's/0.1/0.15/' app.js  # Change discount to 15%
git add app.js
git commit -m "Increase discount to 15%"
```

Now you have a test repository with history!

### Test Each Feature

1. **Test Hover:**
   - Open `app.js` in VS Code
   - Hover over line 3 (the `total += item.price * item.quantity;` line)
   - You should see a tooltip showing the last commit

2. **Test Line History:**
   - Right-click on line 3
   - Select "Show Line History"
   - A panel should open showing all commits that modified that line

3. **Test Function History:**
   - Right-click on line 1 (the `function calculateTotal` line)
   - Select "Show Function History"
   - See all commits that modified the `calculateTotal` function

## Expected Behavior

### Hover Tooltip Should Show:
```
📝 Line History

Last modified: 2 minutes ago

Commit: a3f2b1c4

Author: Your Name <your@email.com>

Message: Add quantity support and price formatting

---

Total commits affecting this line: 2

Right-click for full history
```

### History Panel Should Show:
A styled panel with:
- Commit hash (shortened)
- Author with avatar emoji
- Relative date
- Commit message
- Branch information
- Expandable diff

## Troubleshooting Installation

### Extension Not Loading

1. **Check the extensions folder:**
   ```bash
   ls ~/.vscode/extensions/code-history-tracker/
   ```
   Should see: `extension.js`, `package.json`, `node_modules/`

2. **Check for errors:**
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Type "Developer: Show Running Extensions"
   - Look for "code-history-tracker" in the list
   - Check for any errors

3. **View extension logs:**
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Type "Developer: Toggle Developer Tools"
   - Check Console tab for errors

### Hover Not Working

1. **Verify git is accessible:**
   ```bash
   git --version
   ```

2. **Check file is in a git repo:**
   ```bash
   cd /path/to/your/project
   git status
   ```

3. **Ensure file has history:**
   ```bash
   git log --oneline yourfile.js
   ```

### "npm install" Fails

If you see errors during `npm install`, try:

```bash
# Clear npm cache
npm cache clean --force

# Install again
npm install

# Or install specific dependencies manually
npm install @types/vscode @types/node
```

## Manual Testing Checklist

Once installed, test these scenarios:

- [ ] Hover over a line with history → See tooltip
- [ ] Hover over a new line (not committed) → No tooltip (expected)
- [ ] Right-click → "Show Line History" → Panel opens
- [ ] Right-click on function → "Show Function History" → Panel opens
- [ ] View diff in history panel → Click "View changes" → Diff appears
- [ ] Test on different file types (.js, .py, .java, etc.)
- [ ] Test on binary files → Should handle gracefully
- [ ] Test on non-git directory → Should show error message

## Next Steps

After testing, you can:

1. **Customize the extension:**
   - Edit `extension.js` to add features
   - Modify styling in the HTML generation functions
   - Add new commands in `package.json`

2. **Package for distribution:**
   ```bash
   npm install -g @vscode/vsce
   vsce package
   # Creates a .vsix file you can share
   ```

3. **Publish to VS Code Marketplace:**
   - Create a publisher account
   - Follow VS Code's publishing guide
   - Share with the world!

## Common Git Commands Used

The extension uses these git commands internally:

```bash
# Track line history
git log -L 10,10:file.js

# Track function history
git log -L :functionName:file.js

# Find when code was added/removed
git log -S "code snippet" file.js

# Get git root
git rev-parse --show-toplevel
```

You can run these manually to understand what the extension does!

## Performance Tips

For large repositories:

1. The extension may take longer on files with extensive history
2. Consider adding these options to git commands for better performance:
   ```javascript
   // In extension.js, add to git commands:
   --max-count=50  // Limit to 50 commits
   --since="1 year ago"  // Only show recent history
   ```

3. For very large repos, you might want to:
   - Add caching (store recent queries)
   - Debounce hover events
   - Add a loading indicator

## Getting Help

If you encounter issues:

1. Check the "Troubleshooting" section in README.md
2. Run git commands manually to verify they work
3. Check VS Code's developer console for JavaScript errors
4. Verify file permissions on the extension folder

Happy tracking! 🎉