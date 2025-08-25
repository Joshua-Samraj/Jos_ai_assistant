import * as vscode from 'vscode';
import { GeminiService } from '../services/geminiService';
import { ConfigService } from '../services/configService';
import { StorageService, ChatSession } from '../services/storageService';
import { ChatBotWebview } from '../webview/chatBotWebview';

export class ChatBotCommand {
    private static storageService: StorageService;
    private static currentSession: ChatSession | null = null;

    static initialize(context: vscode.ExtensionContext): void {
        this.storageService = new StorageService(context);
    }

    static async execute(): Promise<void> {
        const apiKey = await ConfigService.checkApiKeyOrPrompt();
        if (!apiKey) {
            return;
        }

        // Don't create session immediately, wait for first message
        this.currentSession = null;

        const panel = ChatBotWebview.create();
        this.setupMessageHandling(panel);
        
        // Send welcome message and chat history
        ChatBotWebview.sendWelcomeMessage(panel);
        
        // Create a test session if none exist (for debugging)
        const existingSessions = this.storageService.getAllSessions();
        console.log('Existing sessions count:', existingSessions.length);
        if (existingSessions.length === 0) {
            console.log('Creating test session...');
            const testSession = this.storageService.createSession('Welcome to Jos AI');
            this.storageService.addMessage(testSession.id, 'Welcome! I\'m Jos AI, your coding assistant.', false);
            this.storageService.addMessage(testSession.id, 'How can I help you with your code today?', false);
            console.log('Test session created with ID:', testSession.id);
        }
        
        this.sendChatHistory(panel);
    }

    static async openHistoryPanel(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'josAiChatHistory',
            'Chat History',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.getChatHistoryWebviewContent();
        this.setupHistoryMessageHandling(panel);
    }

    private static setupMessageHandling(panel: vscode.WebviewPanel): void {
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'chatMessage':
                        await this.handleChatMessage(panel, message.message, message.sessionId);
                        break;
                    case 'loadSession':
                        await this.loadSession(panel, message.sessionId);
                        break;
                    case 'deleteSession':
                        await this.deleteSession(panel, message.sessionId);
                        break;
                    case 'clearHistory':
                        await this.clearHistory(panel);
                        break;
                    case 'refreshHistory':
                    case 'requestChatHistory':
                        this.sendChatHistory(panel);
                        break;
                }
            }
        );
    }

    private static setupHistoryMessageHandling(panel: vscode.WebviewPanel): void {
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'loadSession':
                        await this.loadSessionInNewChat(message.sessionId);
                        break;
                    case 'deleteSession':
                        this.storageService.deleteSession(message.sessionId);
                        this.refreshHistoryPanel(panel);
                        break;
                    case 'clearAllHistory':
                        this.storageService.clearAllHistory();
                        this.refreshHistoryPanel(panel);
                        break;
                    case 'exportHistory':
                        await this.exportHistory();
                        break;
                    case 'openStorageLocation':
                        await this.openStorageLocation();
                        break;
                    case 'searchSessions':
                        this.searchAndDisplaySessions(panel, message.query);
                        break;
                }
            }
        );
    }

    private static async handleChatMessage(panel: vscode.WebviewPanel, message: string, sessionId?: string): Promise<void> {
        // Use provided sessionId or create new session
        if (sessionId) {
            this.currentSession = this.storageService.getSession(sessionId) || this.storageService.createSession();
        } else if (!this.currentSession) {
            this.currentSession = this.storageService.createSession();
            // Notify webview of new session and refresh history
            panel.webview.postMessage({
                command: 'newSession',
                sessionId: this.currentSession.id
            });
            // Send updated history
            setTimeout(() => {
                this.sendChatHistory(panel);
            }, 100);
        }

        // Store user message
        this.storageService.addMessage(this.currentSession.id, message, true);

        const apiKey = ConfigService.getApiKey();

        if (!apiKey) {
            const errorResponse = 'Please set up your Gemini API key first using the command "Jos AI: Set Gemini API Key"';
            panel.webview.postMessage({
                command: 'chatResponse',
                text: errorResponse
            });
            // Store error response
            this.storageService.addMessage(this.currentSession.id, errorResponse, false);
            return;
        }

        try {
            const response = await GeminiService.getChatResponse(message, apiKey);
            if (response) {
                // Store AI response
                this.storageService.addMessage(this.currentSession.id, response, false);
                
                panel.webview.postMessage({
                    command: 'chatResponse',
                    text: response
                });
            } else {
                const errorResponse = 'Sorry, I couldn\'t process your request. Please try again.';
                panel.webview.postMessage({
                    command: 'chatResponse',
                    text: errorResponse
                });
                // Store error response
                this.storageService.addMessage(this.currentSession.id, errorResponse, false);
            }
        } catch (error) {
            const errorResponse = 'An error occurred while processing your message. Please try again.';
            panel.webview.postMessage({
                command: 'chatResponse',
                text: errorResponse
            });
            // Store error response
            this.storageService.addMessage(this.currentSession.id, errorResponse, false);
        }
    }

    private static sendChatHistory(panel: vscode.WebviewPanel): void {
        const recentSessions = this.storageService.getRecentSessions(10);
        console.log('Sending chat history:', recentSessions.length, 'sessions');
        
        // Add a small delay to ensure webview is ready
        setTimeout(() => {
            panel.webview.postMessage({
                command: 'chatHistory',
                sessions: recentSessions
            });
        }, 100);
    }

    private static async loadSession(panel: vscode.WebviewPanel, sessionId: string): Promise<void> {
        const session = this.storageService.getSession(sessionId);
        console.log('Loading session:', sessionId, 'found:', !!session);
        if (session) {
            console.log('Session messages count:', session.messages.length);
            this.currentSession = session;
            panel.webview.postMessage({
                command: 'loadSessionMessages',
                messages: session.messages
            });
        } else {
            console.log('Session not found:', sessionId);
        }
    }

    private static async loadSessionInNewChat(sessionId: string): Promise<void> {
        const session = this.storageService.getSession(sessionId);
        if (session) {
            const apiKey = await ConfigService.checkApiKeyOrPrompt();
            if (!apiKey) {
                return;
            }

            this.currentSession = session;
            const panel = ChatBotWebview.create();
            this.setupMessageHandling(panel);
            
            // Load the session messages
            panel.webview.postMessage({
                command: 'loadSessionMessages',
                messages: session.messages
            });
        }
    }

    private static async deleteSession(panel: vscode.WebviewPanel, sessionId: string): Promise<void> {
        this.storageService.deleteSession(sessionId);
        this.sendChatHistory(panel);
    }

    private static async clearHistory(panel: vscode.WebviewPanel): Promise<void> {
        const result = await vscode.window.showWarningMessage(
            'Are you sure you want to clear all chat history? This action cannot be undone.',
            'Clear All',
            'Cancel'
        );

        if (result === 'Clear All') {
            this.storageService.clearAllHistory();
            this.currentSession = null;
            this.sendChatHistory(panel);
            vscode.window.showInformationMessage('Chat history cleared successfully.');
        }
    }

    private static refreshHistoryPanel(panel: vscode.WebviewPanel): void {
        panel.webview.html = this.getChatHistoryWebviewContent();
    }

    private static searchAndDisplaySessions(panel: vscode.WebviewPanel, query: string): void {
        const sessions = query ? this.storageService.searchSessions(query) : this.storageService.getAllSessions();
        panel.webview.postMessage({
            command: 'searchResults',
            sessions: sessions
        });
    }

    private static async exportHistory(): Promise<void> {
        const historyData = this.storageService.exportHistory();
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('jos-ai-chat-history.json'),
            filters: {
                'JSON Files': ['json'],
                'All Files': ['*']
            }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(historyData, 'utf8'));
            vscode.window.showInformationMessage('Chat history exported successfully!');
        }
    }

    private static async openStorageLocation(): Promise<void> {
        const stats = this.storageService.getStorageStats();
        const storageUri = vscode.Uri.file(stats.filePath);
        
        try {
            // Try to open the file in VS Code
            await vscode.window.showTextDocument(storageUri);
        } catch (error) {
            // If file doesn't exist or can't be opened, show the folder
            const folderUri = vscode.Uri.file(require('path').dirname(stats.filePath));
            try {
                await vscode.commands.executeCommand('revealFileInOS', folderUri);
            } catch (folderError) {
                vscode.window.showInformationMessage(
                    `Storage file location: ${stats.filePath}`,
                    'Copy Path'
                ).then(selection => {
                    if (selection === 'Copy Path') {
                        vscode.env.clipboard.writeText(stats.filePath);
                    }
                });
            }
        }
    }

    private static getChatHistoryWebviewContent(): string {
        const sessions = this.storageService.getAllSessions();
        const stats = this.storageService.getStorageStats();

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat History</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-input-border);
        }
        
        .header h1 {
            margin: 0;
            color: #4CAF50;
        }
        
        .stats {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .search-container {
            margin-bottom: 20px;
        }
        
        .search-input {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
        }
        
        .actions {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }
        
        .btn-primary {
            background-color: #4CAF50;
            color: white;
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-danger {
            background-color: #f44336;
            color: white;
        }
        
        .btn:hover {
            opacity: 0.8;
        }
        
        .session-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .session-item {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .session-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .session-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #4CAF50;
        }
        
        .session-meta {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        
        .session-preview {
            font-size: 13px;
            color: var(--vscode-foreground);
            opacity: 0.8;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .session-actions {
            margin-top: 10px;
            display: flex;
            gap: 8px;
        }
        
        .session-actions .btn {
            padding: 4px 8px;
            font-size: 11px;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 Chat History</h1>
        <div class="stats">
            ${stats.sessionCount} sessions • ${stats.totalMessages} messages • ${stats.storageSize}
            <br>
            <small style="opacity: 0.7;">📁 ${stats.filePath} ${stats.fileExists ? '✅' : '❌'}</small>
        </div>
    </div>
    
    <div class="search-container">
        <input type="text" class="search-input" placeholder="Search conversations..." id="searchInput">
    </div>
    
    <div class="actions">
        <button class="btn btn-secondary" onclick="exportHistory()">Export History</button>
        <button class="btn btn-secondary" onclick="openStorageLocation()">Open Storage File</button>
        <button class="btn btn-danger" onclick="clearAllHistory()">Clear All</button>
    </div>
    
    <div class="session-list" id="sessionList">
        ${sessions.length === 0 ? 
            '<div class="empty-state">No chat history found. Start a conversation to see it here!</div>' :
            sessions.map(session => `
                <div class="session-item" onclick="loadSession('${session.id}')">
                    <div class="session-title">${this.escapeHtml(session.title)}</div>
                    <div class="session-meta">
                        ${new Date(session.createdAt).toLocaleDateString()} • ${session.messages.length} messages
                    </div>
                    <div class="session-preview">
                        ${session.messages.length > 0 ? this.escapeHtml(session.messages[0].text.substring(0, 100) + '...') : 'No messages'}
                    </div>
                    <div class="session-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-primary" onclick="loadSession('${session.id}')">Open</button>
                        <button class="btn btn-danger" onclick="deleteSession('${session.id}')">Delete</button>
                    </div>
                </div>
            `).join('')
        }
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function loadSession(sessionId) {
            vscode.postMessage({
                command: 'loadSession',
                sessionId: sessionId
            });
        }
        
        function deleteSession(sessionId) {
            if (confirm('Are you sure you want to delete this conversation?')) {
                vscode.postMessage({
                    command: 'deleteSession',
                    sessionId: sessionId
                });
            }
        }
        
        function clearAllHistory() {
            if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
                vscode.postMessage({
                    command: 'clearAllHistory'
                });
            }
        }
        
        function exportHistory() {
            vscode.postMessage({
                command: 'exportHistory'
            });
        }
        
        function openStorageLocation() {
            vscode.postMessage({
                command: 'openStorageLocation'
            });
        }
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                vscode.postMessage({
                    command: 'searchSessions',
                    query: this.value
                });
            }, 300);
        });
        
        // Listen for search results
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'searchResults') {
                updateSessionList(message.sessions);
            }
        });
        
        function updateSessionList(sessions) {
            const sessionList = document.getElementById('sessionList');
            if (sessions.length === 0) {
                sessionList.innerHTML = '<div class="empty-state">No conversations found.</div>';
            } else {
                sessionList.innerHTML = sessions.map(session => \`
                    <div class="session-item" onclick="loadSession('\${session.id}')">
                        <div class="session-title">\${escapeHtml(session.title)}</div>
                        <div class="session-meta">
                            \${new Date(session.createdAt).toLocaleDateString()} • \${session.messages.length} messages
                        </div>
                        <div class="session-preview">
                            \${session.messages.length > 0 ? escapeHtml(session.messages[0].text.substring(0, 100) + '...') : 'No messages'}
                        </div>
                        <div class="session-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-primary" onclick="loadSession('\${session.id}')">Open</button>
                            <button class="btn btn-danger" onclick="deleteSession('\${session.id}')">Delete</button>
                        </div>
                    </div>
                \`).join('');
            }
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
    }

    private static escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}