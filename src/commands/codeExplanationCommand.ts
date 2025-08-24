import * as vscode from 'vscode';
import { GeminiService } from '../services/geminiService';
import { ConfigService } from '../services/configService';
import { StorageService, ChatSession } from '../services/storageService';
import { CodeExplanationWebview } from '../webview/codeExplanationWebview';

export class CodeExplanationCommand {
    private static storageService: StorageService;
    private static currentSession: ChatSession | null = null;

    static initialize(context: vscode.ExtensionContext): void {
        this.storageService = new StorageService(context);
    }
    static async execute(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showWarningMessage('Please select some code to explain');
            return;
        }

        const apiKey = await ConfigService.checkApiKeyOrPrompt();
        if (!apiKey) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Gemini AI: Analyzing code...",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 30, message: "Sending request to Gemini..." });
                const explanation = await GeminiService.getCodeExplanation(selectedText, apiKey);

                progress.report({ increment: 70, message: "Processing response..." });
                if (explanation) {
                    // Create a new session for this code explanation
                    const sessionTitle = `Code: ${selectedText.substring(0, 30).replace(/\n/g, ' ')}...`;
                    this.currentSession = this.storageService.createSession(sessionTitle);
                    
                    // Store the original code as user message
                    this.storageService.addMessage(this.currentSession.id, `Explain this code:\n\`\`\`\n${selectedText}\n\`\`\``, true);
                    
                    // Store the explanation as AI response
                    this.storageService.addMessage(this.currentSession.id, explanation, false);

                    const panel = CodeExplanationWebview.create(explanation, selectedText);
                    this.setupMessageHandling(panel);
                    
                    // Send the explanation text to be animated
                    panel.webview.postMessage({
                        command: 'startTypewriter',
                        text: explanation
                    });
                } else {
                    vscode.window.showErrorMessage('Failed to get explanation from Gemini API.');
                }
            } catch (error) {
                vscode.window.showErrorMessage('Error: ' + error);
            }
        });
    }

    private static setupMessageHandling(panel: vscode.WebviewPanel): void {
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'chatMessage':
                        await this.handleChatMessage(panel, message.message);
                        break;
                }
            }
        );
    }

    private static async handleChatMessage(panel: vscode.WebviewPanel, message: string): Promise<void> {
        if (!this.currentSession) {
            // Create a new session if none exists
            this.currentSession = this.storageService.createSession('Code Discussion');
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
}