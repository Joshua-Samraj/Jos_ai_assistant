import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export class GeminiService {
    private static readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    private static readonly TIMEOUT = 30000;
    private static readonly HISTORY_FILE = 'jos-ai-chat-history.json';

    static async getCodeExplanation(code: string, apiKey: string): Promise<string | null> {
        try {
            const prompt = `Hey! I'm looking at this code and could use some help understanding it:

\`\`\`
${code}
\`\`\`

Could you explain what's going on here? I'd love to know:
- What this code actually does
- How it works (walk me through it)
- Any cool patterns or concepts I should know about
- Maybe some tips or improvements if you spot any

Talk to me like you're explaining it to a fellow developer - keep it friendly and conversational, not too formal. Thanks!`;

            const response = await axios.post(`${this.API_BASE_URL}?key=${apiKey}`, {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.TIMEOUT
            });

            return response.data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (error: any) {
            console.error('Gemini API error:', error);
            this.handleApiError(error);
            return null;
        }
    }

    static async getChatResponse(message: string, apiKey: string, sessionId?: string): Promise<string | null> {
        try {
            // Read and parse chat history
            let chatHistory = [];
            try {
                const historyPath = path.join(__dirname, this.HISTORY_FILE);
                if (fs.existsSync(historyPath)) {
                    const historyData = fs.readFileSync(historyPath, 'utf8');
                    const history = JSON.parse(historyData);
                    
                    // If sessionId is provided, get messages from that specific session
                    if (sessionId) {
                        const session = history.find((s: any) => s.id === sessionId);
                        if (session) {
                            chatHistory = session.messages.map((msg: any) => ({
                                role: msg.isUser ? 'user' : 'model',
                                parts: [{ text: msg.text }]
                            }));
                        }
                    } else {
                        // Get messages from all sessions (or limit to recent ones)
                        chatHistory = history.flatMap((session: any) => 
                            session.messages.map((msg: any) => ({
                                role: msg.isUser ? 'user' : 'model',
                                parts: [{ text: msg.text }]
                            }))
                        ).slice(-10); // Limit to last 10 messages to avoid token limits
                    }
                }
            } catch (error) {
                console.warn('Could not load chat history:', error);
            }

            const systemPrompt = `You are a helpful AI assistant specializing in programming and code-related questions. 
You have the following conversation history with this user. Continue the conversation naturally.`;

            // Build the contents array with history and current message
            const contents = [
                {
                    parts: [{ text: systemPrompt }],
                    role: 'user'
                },
                ...chatHistory,
                {
                    parts: [{ text: `Current user question: ${message}` }],
                    role: 'user'
                }
            ];

            const response = await axios.post(`${this.API_BASE_URL}?key=${apiKey}`, {
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.TIMEOUT
            });

            return response.data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (error: any) {
            console.error('Gemini Chat API error:', error);
            this.handleApiError(error);
            return null;
        }
    }

    private static handleApiError(error: any): void {
        const vscode = require('vscode');
        
        if (error.response?.status === 400) {
            vscode.window.showErrorMessage('Invalid Gemini API key or request. Please check your API key.');
        } else if (error.response?.status === 429) {
            vscode.window.showErrorMessage('Gemini API rate limit exceeded. Please try again later.');
        } else if (error.response?.status === 403) {
            vscode.window.showErrorMessage('Gemini API access denied. Please check your API key permissions.');
        } else {
            vscode.window.showErrorMessage(`Gemini API error: ${error.message}`);
        }
    }
}