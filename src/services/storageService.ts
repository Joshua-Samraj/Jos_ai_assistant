import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: number;
    sessionId?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    lastUpdatedAt: number;
}

export class StorageService {
    private static readonly STORAGE_FILE = 'jos-ai-chat-history.json';
    private static readonly MAX_SESSIONS = 50; // Limit to prevent excessive storage
    private static readonly MAX_MESSAGES_PER_SESSION = 100;
    private readonly storageFilePath: string;

    constructor(private context: vscode.ExtensionContext) {
        // Get the workspace root folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            this.storageFilePath = path.join(workspaceFolder.uri.fsPath, StorageService.STORAGE_FILE);
        } else {
            // Fallback to extension's global storage path if no workspace
            this.storageFilePath = path.join(context.globalStorageUri.fsPath, StorageService.STORAGE_FILE);
        }
        
        // Ensure the directory exists
        this.ensureStorageDirectory();
    }

    // Get all chat sessions
    getAllSessions(): ChatSession[] {
        try {
            const sessions = this.loadSessionsFromFile();
            return sessions.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
        } catch (error) {
            console.error('Error loading sessions:', error);
            return [];
        }
    }

    // Get a specific session by ID
    getSession(sessionId: string): ChatSession | undefined {
        const sessions = this.getAllSessions();
        return sessions.find(session => session.id === sessionId);
    }

    // Create a new chat session
    createSession(title?: string): ChatSession {
        const session: ChatSession = {
            id: this.generateId(),
            title: title || this.generateSessionTitle(),
            messages: [],
            createdAt: Date.now(),
            lastUpdatedAt: Date.now()
        };

        const sessions = this.getAllSessions();
        sessions.unshift(session);

        // Limit the number of sessions
        if (sessions.length > StorageService.MAX_SESSIONS) {
            sessions.splice(StorageService.MAX_SESSIONS);
        }

        this.saveSessions(sessions);
        return session;
    }

    // Add a message to a session
    addMessage(sessionId: string, text: string, isUser: boolean): ChatMessage {
        const sessions = this.getAllSessions();
        const sessionIndex = sessions.findIndex(s => s.id === sessionId);

        if (sessionIndex === -1) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const message: ChatMessage = {
            id: this.generateId(),
            text,
            isUser,
            timestamp: Date.now(),
            sessionId
        };

        const session = sessions[sessionIndex];
        session.messages.push(message);
        session.lastUpdatedAt = Date.now();

        // Update session title based on first user message if it's still default
        if (isUser && session.messages.filter(m => m.isUser).length === 1 && session.title.startsWith('Chat ')) {
            session.title = this.generateTitleFromMessage(text);
        }

        // Limit messages per session
        if (session.messages.length > StorageService.MAX_MESSAGES_PER_SESSION) {
            session.messages.splice(0, session.messages.length - StorageService.MAX_MESSAGES_PER_SESSION);
        }

        this.saveSessions(sessions);
        return message;
    }

    // Update session title
    updateSessionTitle(sessionId: string, title: string): void {
        const sessions = this.getAllSessions();
        const session = sessions.find(s => s.id === sessionId);

        if (session) {
            session.title = title;
            session.lastUpdatedAt = Date.now();
            this.saveSessions(sessions);
        }
    }

    // Delete a session
    deleteSession(sessionId: string): void {
        const sessions = this.getAllSessions();
        const filteredSessions = sessions.filter(s => s.id !== sessionId);
        this.saveSessions(filteredSessions);
    }

    // Clear all chat history
    clearAllHistory(): void {
        try {
            this.saveSessionsToFile([]);
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    }

    // Get recent sessions (last 10)
    getRecentSessions(limit: number = 10): ChatSession[] {
        const sessions = this.getAllSessions();
        return sessions.slice(0, limit);
    }

    // Search sessions by title or message content
    searchSessions(query: string): ChatSession[] {
        const sessions = this.getAllSessions();
        const lowercaseQuery = query.toLowerCase();

        return sessions.filter(session => {
            // Search in title
            if (session.title.toLowerCase().includes(lowercaseQuery)) {
                return true;
            }

            // Search in messages
            return session.messages.some(message =>
                message.text.toLowerCase().includes(lowercaseQuery)
            );
        });
    }

    // Export chat history
    exportHistory(): string {
        const sessions = this.getAllSessions();
        return JSON.stringify(sessions, null, 2);
    }

    // Import chat history
    importHistory(jsonData: string): boolean {
        try {
            const sessions = JSON.parse(jsonData) as ChatSession[];

            // Validate the data structure
            if (!Array.isArray(sessions)) {
                return false;
            }

            // Basic validation of session structure
            const isValid = sessions.every(session =>
                session.id &&
                session.title &&
                Array.isArray(session.messages) &&
                typeof session.createdAt === 'number'
            );

            if (!isValid) {
                return false;
            }

            this.saveSessions(sessions);
            return true;
        } catch (error) {
            console.error('Failed to import chat history:', error);
            return false;
        }
    }

    // Export to a specific file
    async exportToFile(filePath: string): Promise<boolean> {
        try {
            const sessions = this.getAllSessions();
            const jsonData = JSON.stringify(sessions, null, 2);
            fs.writeFileSync(filePath, jsonData, 'utf8');
            return true;
        } catch (error) {
            console.error('Failed to export to file:', error);
            return false;
        }
    }

    // Import from a specific file
    async importFromFile(filePath: string): Promise<boolean> {
        try {
            if (!fs.existsSync(filePath)) {
                return false;
            }

            const jsonData = fs.readFileSync(filePath, 'utf8');
            return this.importHistory(jsonData);
        } catch (error) {
            console.error('Failed to import from file:', error);
            return false;
        }
    }

    // Get storage statistics
    getStorageStats(): { sessionCount: number; totalMessages: number; storageSize: string; filePath: string; fileExists: boolean } {
        const sessions = this.getAllSessions();
        const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
        const storageSize = this.calculateStorageSize(sessions);

        return {
            sessionCount: sessions.length,
            totalMessages,
            storageSize: this.formatBytes(storageSize),
            filePath: this.storageFilePath,
            fileExists: fs.existsSync(this.storageFilePath)
        };
    }

    private saveSessions(sessions: ChatSession[]): void {
        try {
            this.saveSessionsToFile(sessions);
        } catch (error) {
            console.error('Error saving sessions:', error);
        }
    }

    private ensureStorageDirectory(): void {
        try {
            const dir = path.dirname(this.storageFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        } catch (error) {
            console.error('Error creating storage directory:', error);
        }
    }

    private loadSessionsFromFile(): ChatSession[] {
        try {
            if (!fs.existsSync(this.storageFilePath)) {
                // Create empty file if it doesn't exist
                this.saveSessionsToFile([]);
                return [];
            }

            const fileContent = fs.readFileSync(this.storageFilePath, 'utf8');
            if (!fileContent.trim()) {
                return [];
            }

            const sessions = JSON.parse(fileContent) as ChatSession[];
            
            // Validate the data structure
            if (!Array.isArray(sessions)) {
                console.warn('Invalid sessions data format, resetting to empty array');
                return [];
            }

            return sessions;
        } catch (error) {
            console.error('Error loading sessions from file:', error);
            // Return empty array on error and try to backup corrupted file
            this.backupCorruptedFile();
            return [];
        }
    }

    private saveSessionsToFile(sessions: ChatSession[]): void {
        try {
            const jsonData = JSON.stringify(sessions, null, 2);
            fs.writeFileSync(this.storageFilePath, jsonData, 'utf8');
        } catch (error) {
            console.error('Error saving sessions to file:', error);
            throw error;
        }
    }

    private backupCorruptedFile(): void {
        try {
            if (fs.existsSync(this.storageFilePath)) {
                const backupPath = this.storageFilePath + '.backup.' + Date.now();
                fs.copyFileSync(this.storageFilePath, backupPath);
                console.log('Corrupted file backed up to:', backupPath);
            }
        } catch (error) {
            console.error('Error backing up corrupted file:', error);
        }
    }

    // Get the storage file path (useful for debugging or manual access)
    getStorageFilePath(): string {
        return this.storageFilePath;
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    private generateSessionTitle(): string {
        const now = new Date();
        return `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }

    private generateTitleFromMessage(message: string): string {
        // Extract first meaningful part of the message for title
        const words = message.trim().split(' ').slice(0, 6);
        let title = words.join(' ');

        if (title.length > 50) {
            title = title.substring(0, 47) + '...';
        }

        return title || this.generateSessionTitle();
    }

    private calculateStorageSize(sessions: ChatSession[]): number {
        return JSON.stringify(sessions).length * 2; // Rough estimate (UTF-16)
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}