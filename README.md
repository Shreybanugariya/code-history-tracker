# Code History Tracker - VS Code Extension

A VS Code extension that lets you track the complete history of any line of code or function without manually searching through git history.

## Features

### 🎯 Hover to See History
Simply hover over any line of code to see:
- When it was last modified
- Who made the change
- The commit message
- Total number of times the line was modified

### 📊 Line History
Right-click on any line and select "Show Line History" to see:
- All commits that modified that specific line
- Author information
- Dates (relative, like "2 days ago")
- Commit messages
- Branch information
- Full diff for each change

### 🔍 Function History
Right-click on a function and select "Show Function History" to:
- Track the entire evolution of a function
- See when it was created, modified, or removed
- View all commits that touched that function
- Understand how a function changed over time

## Installation

### From Source

1. **Clone or download this extension:**
   ```bash
   cd ~/.vscode/extensions
   git clone <this-repo> code-history-tracker
   ```

2. **Install dependencies:**
   ```bash
   cd code-history-tracker
   npm install
   ```

3. **Reload VS Code:**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Reload Window" and press Enter

### Prerequisites

- Git must be installed and accessible from command line
- Your project must be a git repository

## Usage

### Method 1: Hover (Quick Preview)

1. Simply **hover your mouse** over any line of code
2. A tooltip appears showing the last commit that modified that line
3. See author, date, commit hash, and message

### Method 2: Context Menu (Full History)

**For Line History:**
1. Click on any line of code
2. Right-click to open context menu
3. Select "Show Line History"
4. A panel opens showing all commits that modified that line

**For Function History:**
1. Click on a function definition
2. Right-click to open context menu
3. Select "Show Function History"
4. See the complete evolution of that function

## Real-World Use Cases

### 1. **Bug Investigation**
You find a bug in a function. Right-click → "Show Function History" to see:
- When was this function introduced?
- What commits modified it?
- Who can you ask about this code?

### 2. **Code Archaeology**
Wondering why a line exists? Hover over it to see:
- The commit message explaining why it was added
- When it was added
- Who added it (and you can ask them!)

### 3. **Tracking Removals**
Want to know when a function call was removed?
1. Use git history to find the old code
2. Use "Show Function History" on the old version
3. See exactly when and why it was removed

### 4. **Code Review Context**
During code review, quickly understand:
- How many times this code has been modified
- If it's touching frequently-changed code
- Historical context for the change

### 5. **Onboarding**
New to a codebase? Hover over unfamiliar code to:
- See recent changes and their explanations
- Identify code owners
- Understand evolution of critical sections

## Example Output

When you view line history, you'll see:

```
History for Line 42 in app.js

Found 5 commits

┌─────────────────────────────────────────────────┐
│ a3f2b1c4              2 days ago                │
│ Fix validation logic for user input             │
│ 👤 Jane Doe <jane@example.com>                  │
│ 🌿 main, origin/main                            │
│ ▼ View changes                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 7c8d9e2f              2 weeks ago               │
│ Add input validation                            │
│ 👤 John Smith <john@example.com>                │
│ 🌿 feature/validation                           │
└─────────────────────────────────────────────────┘
...
```

## How It Works

The extension uses powerful git commands under the hood:

1. **For Line History:** `git log -L <start>,<end>:<file>`
   - Tracks how specific lines changed over time
   - Shows you every commit that touched those lines

2. **For Function History:** `git log -L :<funcname>:<file>`
   - Git automatically tracks function boundaries
   - Works for most languages (JavaScript, Python, Java, C++, etc.)

3. **For Hover Info:** Quick `git log -L` on the current line
   - Lightweight, fast lookup
   - Cached to avoid repeated git calls

## Supported Languages

Function tracking works with languages that git understands:
- ✅ JavaScript/TypeScript
- ✅ Python
- ✅ Java
- ✅ C/C++
- ✅ C#
- ✅ Go
- ✅ Ruby
- ✅ PHP
- ✅ Rust

Line tracking works with **all** text files.

## Configuration

Currently, the extension works out of the box with no configuration needed. 

Future configuration options could include:
- Custom git command timeouts
- Number of commits to show in hover
- Custom styling for commit display
- Branch filtering

## Performance

- **Hover:** Very fast (<100ms) - only queries the last commit
- **Line History:** Fast (100-500ms) - depends on file history
- **Function History:** Medium (500ms-2s) - depends on function complexity and history

Git operations are performed on-demand, so there's no performance impact when not using the extension.

## Troubleshooting

### "Not a git repository" error
- Make sure your workspace is a git repository
- Run `git init` if needed

### "Git command failed" error
- Ensure git is installed: `git --version`
- Check that git is in your PATH
- Verify the file is tracked by git: `git ls-files <filename>`

### Function history not working
- Make sure you're clicking on a function definition
- Try manually entering the function name when prompted
- Some languages/syntaxes may not be recognized by git

### Hover not showing
- Wait a moment - git queries take time
- Check that the file has commit history
- Try right-click → "Show Line History" for full details

## Development

To modify or extend this extension:

1. **Edit the code:**
   ```bash
   code ~/.vscode/extensions/code-history-tracker
   ```

2. **Key files:**
   - `extension.js` - Main extension logic
   - `package.json` - Extension manifest and commands

3. **Testing:**
   - Press F5 in VS Code to launch Extension Development Host
   - Make changes and reload the window to test

4. **Adding features:**
   - Add new commands in `package.json` under `contributes.commands`
   - Implement handlers in `extension.js`
   - Register commands in `activate()` function

## Extending Functionality

### Add Search by Code Snippet
```javascript
// Already implemented! See searchCodeHistory() function
// You can add a command to search for when specific code was added/removed
```

### Add Branch Filtering
```javascript
// Modify executeGit() calls to add:
// --branches=feature/* to only show commits from feature branches
```

### Add Time Range Filtering
```javascript
// Add to git commands:
// --since="2 weeks ago" --until="1 week ago"
```

## Future Enhancements

- [ ] Blame annotations in gutter
- [ ] Time-travel view (see file at any commit)
- [ ] Compare function across branches
- [ ] Search for when code was removed
- [ ] Integration with PR/issue tracking
- [ ] Commit graph visualization
- [ ] Code ownership statistics
- [ ] Hotspot detection (frequently changed code)

## License

MIT

## Contributing

Contributions welcome! This extension is designed to be simple and extensible.

Key areas for contribution:
- Better language/function detection
- Performance optimizations
- UI/UX improvements
- Additional git history queries

---

**Made with ❤️ to make git history more accessible**