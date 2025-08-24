import * as vscode from 'vscode';

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
    private static readonly STORAGE_KEY = 'jos-ai-chat-history';
    private static readonly MAX_SESSIONS = 50; // Limit to prevent excessive storage
    private static readonly MAX_MESSAGES_PER_SESSION = 100;

    constructor(private context: vscode.ExtensionContext) { }

    // Get all chat sessions
    getAllSessions(): ChatSession[] {
        const sessions = this.context.globalState.get<ChatSession[]>(StorageService.STORAGE_KEY, []);
        return sessions.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
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
        this.context.globalState.update(StorageService.STORAGE_KEY, []);
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

    // Get storage statistics
    getStorageStats(): { sessionCount: number; totalMessages: number; storageSize: string } {
        const sessions = this.getAllSessions();
        const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
        const storageSize = this.calculateStorageSize(sessions);

        return {
            sessionCount: sessions.length,
            totalMessages,
            storageSize: this.formatBytes(storageSize)
        };
    }

    private saveSessions(sessions: ChatSession[]): void {
        this.context.globalState.update(StorageService.STORAGE_KEY, sessions);
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