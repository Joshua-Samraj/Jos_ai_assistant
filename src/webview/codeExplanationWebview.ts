import * as vscode from 'vscode';
import { WebviewUtils } from './webviewUtils';

export class CodeExplanationWebview {
    static create(explanation: string, originalCode: string): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            'codeExplanation',
            'Code Explanation',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.getWebviewContent(explanation, originalCode);
        return panel;
    }

    private static getWebviewContent(explanation: string, originalCode: string): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${WebviewUtils.getCommonStyles()}
        
        body {
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .code-block {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            overflow-x: auto;
            border-left: 4px solid #4CAF50;
        }
        
        .explanation {
            background-color: var(--vscode-input-background);
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border: 1px solid var(--vscode-input-border);
        }
        
        h2 {
            color: #4CAF50;
            margin-top: 0;
        }
        
        pre {
            margin: 0;
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
        }
        
        .explanation-content {
            line-height: 1.8;
        }
        
        .explanation-content strong {
            color: #4CAF50;
            font-weight: bold;
        }
        
        .explanation-content em {
            font-style: italic;
            color: #FFA726;
        }
        
        .explanation-content h1, .explanation-content h2, .explanation-content h3 {
            color: #4CAF50;
            margin: 20px 0 10px 0;
        }
        
        .explanation-content ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .explanation-content li {
            margin: 5px 0;
        }
        
        .typing-indicator {
            display: flex;
            align-items: center;
            padding: 20px 0;
        }
        
        .dot {
            height: 8px;
            width: 8px;
            margin: 0 2px;
            background-color: #4CAF50;
            border-radius: 50%;
            display: inline-block;
            animation: typing 1.4s infinite ease-in-out both;
        }
        
        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }
        .dot:nth-child(3) { animation-delay: 0s; }
        
        @keyframes typing {
            0%, 80%, 100% {
                transform: scale(0);
                opacity: 0.5;
            }
            40% {
                transform: scale(1);
                opacity: 1;
            }
        }
        
        .chat-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: var(--vscode-editor-background);
            border-top: 2px solid var(--vscode-input-border);
            padding: 15px 20px;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
            z-index: 999;
        }
        
        .chat-input-container {
            display: flex;
            gap: 10px;
            align-items: center;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .chat-input {
            flex: 1;
            padding: 12px 15px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 25px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: 14px;
            outline: none;
            resize: none;
            min-height: 20px;
            max-height: 100px;
        }
        
        .chat-input:focus {
            border-color: #4CAF50;
            box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
        }
        
        .chat-send-btn {
            background-color: #4CAF50;
            border: none;
            border-radius: 50%;
            width: 45px;
            height: 45px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .chat-send-btn:hover {
            background-color: #45a049;
            transform: scale(1.05);
        }
        
        .chat-send-btn:disabled {
            background-color: #666;
            cursor: not-allowed;
            transform: none;
        }
        
        .send-icon {
            width: 0;
            height: 0;
            border-left: 12px solid white;
            border-top: 8px solid transparent;
            border-bottom: 8px solid transparent;
            margin-left: 3px;
        }
        
        .chat-messages {
            margin-bottom: 100px;
        }
        
        .chat-message {
            margin: 15px 0;
            padding: 15px;
            border-radius: 10px;
            max-width: 80%;
        }
        
        .chat-message.user {
            background-color: #4CAF50;
            color: white;
            margin-left: auto;
            text-align: right;
        }
        
        .chat-message.ai {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            margin-right: auto;
        }
        
        .chat-message.ai .message-content {
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>💡 Code Explanation</h2>
        
        <div class="code-block">
            <strong>Original Code:</strong>
            <pre>${WebviewUtils.escapeHtml(originalCode)}</pre>
        </div>
        
        <div class="explanation">
            <strong>Explanation:</strong>
            <div class="explanation-content" id="explanation-text">
                <div class="typing-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span style="margin-left: 10px; color: #4CAF50;">AI is thinking...</span>
                </div>
            </div>
        </div>

        <div class="chat-messages" id="chatMessages">
            <!-- Chat messages will be added here -->
        </div>
        
    </div>
    
    <button class="scroll-to-bottom" id="scrollToBottom" title="Scroll to bottom">
        <div class="scroll-arrow"></div>
    </button>
    
    <div class="chat-container">
        <div class="chat-input-container">
            <textarea 
                class="chat-input" 
                id="chatInput" 
                placeholder="Ask a question about the code or anything else..."
                rows="1"
            ></textarea>
            <button class="chat-send-btn" id="chatSendBtn" title="Send message">
                <div class="send-icon"></div>
            </button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        ${WebviewUtils.getCommonScripts()}
        
        function typeWriter(element, text, speed = 0.5) {
            element.innerHTML = '';
            let i = 0;
            const cursor = '<span class="typewriter-cursor"></span>';
            let scrollCounter = 0;
            let lastScrollHeight = 0;
            
            function getMaxScrollHeight() {
                return Math.max(
                    document.body.scrollHeight || 0,
                    document.documentElement.scrollHeight || 0,
                    document.body.offsetHeight || 0,
                    document.documentElement.offsetHeight || 0,
                    document.body.clientHeight || 0,
                    document.documentElement.clientHeight || 0
                );
            }
            
            function forceScrollToBottom() {
                const maxScroll = getMaxScrollHeight();
                
                if (maxScroll > lastScrollHeight) {
                    lastScrollHeight = maxScroll;
                    
                    try {
                        window.scrollTo(0, maxScroll);
                        document.documentElement.scrollTop = maxScroll;
                        document.body.scrollTop = maxScroll;
                    } catch (e) {
                        console.warn('Scroll failed:', e);
                    }
                }
            }
            
            function type() {
                if (i < text.length) {
                    element.innerHTML = markdownToHtml(text.substring(0, i + 1)) + cursor;
                    i++;
                    
                    scrollCounter++;
                    const scrollFrequency = text.length > 5000 ? 3 : 5;
                    
                    if (scrollCounter % scrollFrequency === 0) {
                        requestAnimationFrame(() => {
                            forceScrollToBottom();
                        });
                    }
                    
                    setTimeout(type, speed);
                } else {
                    element.innerHTML = markdownToHtml(text);
                    setTimeout(() => {
                        forceScrollToBottom();
                        setTimeout(forceScrollToBottom, 200);
                    }, 100);
                }
            }
            
            type();
        }
        
        // Chat functionality
        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');
        const chatMessages = document.getElementById('chatMessages');
        
        function addChatMessage(message, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`chat-message \${isUser ? 'user' : 'ai'}\`;
            
            if (isUser) {
                messageDiv.innerHTML = \`<div class="message-content">\${message}</div>\`;
                chatMessages.appendChild(messageDiv);
                
                setTimeout(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                }, 50);
            } else {
                messageDiv.innerHTML = \`<div class="message-content" id="ai-message-\${Date.now()}"></div>\`;
                chatMessages.appendChild(messageDiv);
                
                const aiMessageElement = messageDiv.querySelector('.message-content');
                typeWriter(aiMessageElement, message, 0.5);
            }
        }

        function sendChatMessage() {
            const message = chatInput.value.trim();
            if (!message) return;
            
            addChatMessage(message, true);
            chatInput.value = '';
            chatSendBtn.disabled = true;
            
            vscode.postMessage({
                command: 'chatMessage',
                message: message
            });
        }
        
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
        
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        
        chatSendBtn.addEventListener('click', sendChatMessage);

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'startTypewriter') {
                const explanationElement = document.getElementById('explanation-text');
                
                setTimeout(() => {
                    typeWriter(explanationElement, message.text, 0.5);
                }, 800);
            } else if (message.command === 'chatResponse') {
                addChatMessage(message.text, false);
                chatSendBtn.disabled = false;
            }
        });
    </script>
</body>
</html>`;
    }
}