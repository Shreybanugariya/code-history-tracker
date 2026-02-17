const vscode = require('vscode');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Execute git command and return output
 */
function executeGit(cwd, args) {
    try {
        const cmd = `git ${args}`;
        const output = execSync(cmd, { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        return output;
    } catch (error) {
        throw new Error(`Git command failed: ${error.message}`);
    }
}

/**
 * Get git repository root for a file
 */
function getGitRoot(filePath) {
    try {
        const dir = path.dirname(filePath);
        const output = execSync('git rev-parse --show-toplevel', { 
            cwd: dir, 
            encoding: 'utf8' 
        });
        return output.trim();
    } catch (error) {
        return null;
    }
}

/**
 * Get relative path from git root
 */
function getRelativePath(filePath, gitRoot) {
    return path.relative(gitRoot, filePath);
}

/**
 * Parse git log output into structured commits
 */
function parseGitLog(output) {
    const commits = [];
    const commitBlocks = output.split('\n\ncommit ').filter(b => b.trim());
    
    for (let block of commitBlocks) {
        if (!block.startsWith('commit ')) {
            block = 'commit ' + block;
        }
        
        const lines = block.split('\n');
        const commit = {
            hash: '',
            author: '',
            date: '',
            message: '',
            branch: '',
            diff: ''
        };
        
        let inDiff = false;
        let diffLines = [];
        
        for (let line of lines) {
            if (line.startsWith('commit ')) {
                commit.hash = line.replace('commit ', '').trim();
            } else if (line.startsWith('Author: ')) {
                commit.author = line.replace('Author: ', '').trim();
            } else if (line.startsWith('Date: ')) {
                commit.date = line.replace('Date: ', '').trim();
            } else if (line.startsWith('Branches: ')) {
                commit.branch = line.replace('Branches: ', '').trim();
            } else if (line.startsWith('diff --git') || line.startsWith('---') || line.startsWith('+++')) {
                inDiff = true;
            } else if (inDiff) {
                diffLines.push(line);
            } else if (line.trim() && !line.startsWith(' ')) {
                // Likely part of commit message
                if (commit.message) {
                    commit.message += ' ' + line.trim();
                } else {
                    commit.message = line.trim();
                }
            } else if (line.trim().startsWith('•') || line.trim().match(/^\s+\w/)) {
                // Continuation of message
                commit.message += ' ' + line.trim();
            }
        }
        
        commit.diff = diffLines.join('\n');
        commits.push(commit);
    }
    
    return commits;
}

/**
 * Get history for a specific line range
 */
function getLineHistory(filePath, startLine, endLine) {
    const gitRoot = getGitRoot(filePath);
    if (!gitRoot) {
        throw new Error('Not a git repository');
    }
    
    const relativePath = getRelativePath(filePath, gitRoot);
    
    // Use git log -L to track line history
    const args = `log --pretty=format:"commit %H%nAuthor: %an <%ae>%nDate: %ad%nBranches: %D%n%n%s%n" --date=relative -L ${startLine},${endLine}:"${relativePath}"`;
    
    try {
        const output = executeGit(gitRoot, args);
        return parseGitLog(output);
    } catch (error) {
        // Try with just the current line if range fails
        if (startLine !== endLine) {
            const singleLineArgs = `log --pretty=format:"commit %H%nAuthor: %an <%ae>%nDate: %ad%nBranches: %D%n%n%s%n" --date=relative -L ${startLine},${startLine}:"${relativePath}"`;
            const output = executeGit(gitRoot, singleLineArgs);
            return parseGitLog(output);
        }
        throw error;
    }
}

/**
 * Get history for a function by name
 */
function getFunctionHistory(filePath, functionName) {
    const gitRoot = getGitRoot(filePath);
    if (!gitRoot) {
        throw new Error('Not a git repository');
    }
    
    const relativePath = getRelativePath(filePath, gitRoot);
    
    // Use git log -L to track function history
    const args = `log --pretty=format:"commit %H%nAuthor: %an <%ae>%nDate: %ad%nBranches: %D%n%n%s%n" --date=relative -L :${functionName}:"${relativePath}"`;
    
    const output = executeGit(gitRoot, args);
    return parseGitLog(output);
}

/**
 * Search for commits that modified specific code snippet
 */
function searchCodeHistory(filePath, codeSnippet) {
    const gitRoot = getGitRoot(filePath);
    if (!gitRoot) {
        throw new Error('Not a git repository');
    }
    
    const relativePath = getRelativePath(filePath, gitRoot);
    
    // Use git log -S to find commits that added/removed this code
    const args = `log -S "${codeSnippet}" --pretty=format:"commit %H%nAuthor: %an <%ae>%nDate: %ad%nBranches: %D%n%n%s%n" --date=relative -- "${relativePath}"`;
    
    const output = executeGit(gitRoot, args);
    return parseGitLog(output);
}

/**
 * Format commits for display in webview
 */
function formatCommitsHTML(commits, title) {
    if (!commits || commits.length === 0) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${escapeHTML(title)}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body { 
                        font-family: var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        padding: 24px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        line-height: 1.6;
                    }
                    .header {
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    h1 {
                        font-size: 20px;
                        font-weight: 600;
                        color: var(--vscode-foreground);
                        margin-bottom: 8px;
                    }
                    .no-results {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 60px 20px;
                        text-align: center;
                    }
                    .no-results-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                        opacity: 0.5;
                    }
                    .no-results-text {
                        color: var(--vscode-descriptionForeground);
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${escapeHTML(title)}</h1>
                </div>
                <div class="no-results">
                    <div class="no-results-icon">📝</div>
                    <p class="no-results-text">No commits found in history.</p>
                </div>
            </body>
            </html>
        `;
    }
    
    const commitHTML = commits.map((commit, index) => `
        <div class="commit-card">
            <div class="commit-header">
                <div class="commit-header-left">
                    <span class="commit-number">#${commits.length - index}</span>
                    <code class="commit-hash">${commit.hash.substring(0, 7)}</code>
                    ${commit.branch ? `<span class="commit-branch">🌿 ${escapeHTML(commit.branch.split(',')[0].trim())}</span>` : ''}
                </div>
                <span class="commit-date">📅 ${escapeHTML(commit.date)}</span>
            </div>
            
            <div class="commit-body">
                <p class="commit-message">${escapeHTML(commit.message)}</p>
                
                <div class="commit-author">
                    <svg class="author-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                    </svg>
                    <span class="author-name">${escapeHTML(commit.author)}</span>
                </div>
            </div>
            
            ${commit.diff ? `
                <details class="commit-diff">
                    <summary class="diff-summary">
                        <svg class="diff-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5 8.186 1.113zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/>
                        </svg>
                        <span>View changes</span>
                        <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </summary>
                    <pre class="diff-content"><code>${escapeHTML(commit.diff)}</code></pre>
                </details>
            ` : ''}
        </div>
    `).join('');
    
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHTML(title)}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body { 
                    font-family: var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    padding: 24px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    line-height: 1.6;
                }
                
                .header {
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                h1 {
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    margin-bottom: 8px;
                }
                
                .stats-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .commit-card {
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    border: 1px solid var(--vscode-panel-border);
                    border-left: 3px solid var(--vscode-charts-blue);
                    border-radius: 6px;
                    margin-bottom: 16px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                }
                
                .commit-card:hover {
                    border-left-color: var(--vscode-charts-purple);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                
                .commit-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background-color: var(--vscode-sideBar-background);
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .commit-header-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                
                .commit-number {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--vscode-descriptionForeground);
                    background-color: var(--vscode-input-background);
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                
                .commit-hash {
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 12px;
                    background-color: var(--vscode-textCodeBlock-background);
                    color: var(--vscode-textLink-foreground);
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-weight: 500;
                }
                
                .commit-branch {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    background-color: var(--vscode-input-background);
                    padding: 2px 8px;
                    border-radius: 10px;
                }
                
                .commit-date {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .commit-body {
                    padding: 16px;
                }
                
                .commit-message {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--vscode-foreground);
                    margin-bottom: 12px;
                    line-height: 1.5;
                }
                
                .commit-author {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .author-icon {
                    opacity: 0.7;
                }
                
                .author-name {
                    font-weight: 500;
                }
                
                .commit-diff {
                    margin-top: 12px;
                    border-top: 1px solid var(--vscode-panel-border);
                }
                
                .diff-summary {
                    padding: 10px 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: var(--vscode-textLink-foreground);
                    background-color: var(--vscode-editor-background);
                    transition: all 0.2s ease;
                    user-select: none;
                }
                
                .diff-summary:hover {
                    background-color: var(--vscode-list-hoverBackground);
                    color: var(--vscode-textLink-activeForeground);
                }
                
                .diff-icon {
                    flex-shrink: 0;
                }
                
                .chevron {
                    margin-left: auto;
                    transition: transform 0.2s ease;
                    opacity: 0.7;
                }
                
                details[open] .chevron {
                    transform: rotate(180deg);
                }
                
                .diff-content {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 16px;
                    margin: 0;
                    overflow-x: auto;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 11px;
                    line-height: 1.5;
                    color: var(--vscode-editor-foreground);
                    border-top: 1px solid var(--vscode-panel-border);
                }
                
                .diff-content code {
                    font-family: inherit;
                }
                
                /* Scrollbar styling */
                ::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }
                
                ::-webkit-scrollbar-track {
                    background: var(--vscode-editor-background);
                }
                
                ::-webkit-scrollbar-thumb {
                    background: var(--vscode-scrollbarSlider-background);
                    border-radius: 5px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: var(--vscode-scrollbarSlider-hoverBackground);
                }
                
                /* Empty state */
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${escapeHTML(title)}</h1>
                <div class="stats-badge">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
                    </svg>
                    <span>Found ${commits.length} commit${commits.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
            
            <div class="commits-list">
                ${commitHTML}
            </div>
        </body>
        </html>
    `;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[char]));
}

/**
 * Show commits in a webview panel
 */
function showCommitsPanel(context, commits, title) {
    const panel = vscode.window.createWebviewPanel(
        'codeHistory',
        title,
        vscode.ViewColumn.Beside,
        {}
    );
    
    panel.webview.html = formatCommitsHTML(commits, title);
}

/**
 * Extract function name at cursor position
 */
function getFunctionNameAtCursor(document, position) {
    const line = document.lineAt(position.line);
    const text = line.text;
    
    // Simple regex patterns for common function declarations
    const patterns = [
        /function\s+(\w+)\s*\(/,           // function name()
        /const\s+(\w+)\s*=\s*(?:async\s*)?\(/,  // const name = () or async
        /(\w+)\s*:\s*(?:async\s*)?function/,    // name: function
        /(?:public|private|protected)?\s*(\w+)\s*\([^)]*\)\s*{/, // method name()
        /def\s+(\w+)\s*\(/,                // Python def name()
        /fn\s+(\w+)\s*\(/,                 // Rust fn name()
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

function activate(context) {
    console.log('Code History Tracker extension activated');
    
    // Register hover provider for inline history preview
    const hoverProvider = vscode.languages.registerHoverProvider(
        { scheme: 'file' },
        {
            async provideHover(document, position) {
                try {
                    const gitRoot = getGitRoot(document.fileName);
                    if (!gitRoot) return;
                    
                    const line = position.line + 1; // Git uses 1-based line numbers
                    const commits = getLineHistory(document.fileName, line, line);
                    
                    if (commits.length === 0) return;
                    
                    const latestCommit = commits[0];
                    const totalCommits = commits.length;
                    
                    const markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`### 📝 Line History\n\n`);
                    markdown.appendMarkdown(`**Last modified:** ${latestCommit.date}\n\n`);
                    markdown.appendMarkdown(`**Commit:** \`${latestCommit.hash.substring(0, 8)}\`\n\n`);
                    markdown.appendMarkdown(`**Author:** ${latestCommit.author}\n\n`);
                    markdown.appendMarkdown(`**Message:** ${latestCommit.message}\n\n`);
                    markdown.appendMarkdown(`---\n\n`);
                    markdown.appendMarkdown(`*Total commits affecting this line: ${totalCommits}*\n\n`);
                    markdown.appendMarkdown(`Right-click for full history`);
                    
                    return new vscode.Hover(markdown);
                } catch (error) {
                    // Silently fail for hover - don't spam errors
                    return;
                }
            }
        }
    );
    
    // Command: Show Line History
    const lineHistoryCommand = vscode.commands.registerCommand(
        'codeHistoryTracker.showLineHistory',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            
            try {
                const position = editor.selection.active;
                const line = position.line + 1; // Git uses 1-based line numbers
                
                vscode.window.showInformationMessage('Searching git history...');
                
                const commits = getLineHistory(editor.document.fileName, line, line);
                
                const title = `History for Line ${line} in ${path.basename(editor.document.fileName)}`;
                showCommitsPanel(context, commits, title);
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
        }
    );
    
    // Command: Show Function History
    const functionHistoryCommand = vscode.commands.registerCommand(
        'codeHistoryTracker.showFunctionHistory',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            
            try {
                const position = editor.selection.active;
                let functionName = getFunctionNameAtCursor(editor.document, position);
                
                // If we couldn't auto-detect, ask the user
                if (!functionName) {
                    functionName = await vscode.window.showInputBox({
                        prompt: 'Enter function name to track',
                        placeHolder: 'functionName'
                    });
                    
                    if (!functionName) return;
                }
                
                vscode.window.showInformationMessage(`Tracking history for function: ${functionName}`);
                
                const commits = getFunctionHistory(editor.document.fileName, functionName);
                
                const title = `History for function "${functionName}" in ${path.basename(editor.document.fileName)}`;
                showCommitsPanel(context, commits, title);
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
        }
    );
    
    context.subscriptions.push(hoverProvider, lineHistoryCommand, functionHistoryCommand);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};