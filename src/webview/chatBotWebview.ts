import * as vscode from 'vscode';
import { WebviewUtils } from './webviewUtils';

export class ChatBotWebview {
    static create(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            'josAiChatBot',
            'Jos AI ChatBot',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.getWebviewContent();
        return panel;
    }

    static sendWelcomeMessage(panel: vscode.WebviewPanel): void {
        setTimeout(() => {
            panel.webview.postMessage({
                command: 'welcomeMessage',
                text: 'Hi there!  I\'m Jos AI, your coding assistant. Ask me anything about programming, code explanations, debugging help, or general tech questions. How can I help you today?'
            });
        }, 500);
    }

    private static getWebviewContent(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${WebviewUtils.getCommonStyles()}
        
        body {
            padding: 0;
            margin: 0;
            height: 100vh;
            display: flex;
            flex-direction: row;
        }
        
        .sidebar {
            width: 250px;
            background-color: var(--vscode-sideBar-background);
            border-right: 1px solid var(--vscode-sideBar-border);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: margin-left 0.3s ease;
        }
        
        .sidebar.hidden {
            margin-left: -250px;
        }
        
        .sidebar-header {
            padding: 15px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
            background-color: var(--vscode-sideBarSectionHeader-background);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .sidebar-header h3 {
            margin: 0;
            font-size: 14px;
            color: var(--vscode-sideBarTitle-foreground);
        }
        
        .close-sidebar-btn {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            font-size: 16px;
            line-height: 1;
            transition: background-color 0.2s ease;
        }
        
        .close-sidebar-btn:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
        }
        
        .sidebar-content {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        
        .history-item {
            padding: 8px 12px;
            margin-bottom: 5px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            line-height: 1.3;
            transition: background-color 0.2s ease;
            border: 1px solid transparent;
        }
        
        .history-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .history-item.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            border-color: var(--vscode-focusBorder);
        }
        
        .history-title {
            font-weight: 500;
            color: var(--vscode-foreground);
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .history-meta {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
        }
        
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .header {
            background-color: var(--vscode-input-background);
            border-bottom: 2px solid var(--vscode-input-border);
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .header h1 {
            margin: 0;
            color: #4CAF50;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .toggle-sidebar-btn {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .toggle-sidebar-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        
        .new-chat-btn {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: linear-gradient(135deg, #4CAF50, #45a049);
            border: none;
            color: white;
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }
        
        .new-chat-btn:hover {
            transform: translateY(-50%) scale(1.05);
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }
        
        .header-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .header p {
            margin: 8px 0 0 0;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        
        .header p {
            margin: 8px 0 0 0;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .chat-message {
            max-width: 80%;
            padding: 15px 20px;
            border-radius: 18px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        
        .chat-message.user {
            background-color: #4CAF50;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 6px;
        }
        
        .chat-message.ai {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            align-self: flex-start;
            border-bottom-left-radius: 6px;
        }
        
        .chat-message.welcome {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            align-self: center;
            max-width: 90%;
            text-align: center;
            border-radius: 18px;
        }
        
        .message-content {
            line-height: 1.6;
        }
        
        .message-content strong {
            color: #4CAF50;
            font-weight: bold;
        }
        
        .message-content em {
            font-style: italic;
            color: #FFA726;
        }
        
        .message-content h1, .message-content h2, .message-content h3 {
            color: #4CAF50;
            margin: 15px 0 8px 0;
        }
        
        .message-content ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .message-content li {
            margin: 5px 0;
        }
        
        .typing-indicator {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 18px;
            border-bottom-left-radius: 6px;
            align-self: flex-start;
            max-width: 80%;
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
        
        .input-container {
            background-color: var(--vscode-editor-background);
            border-top: 2px solid var(--vscode-input-border);
            padding: 20px;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .input-wrapper {
            display: flex;
            gap: 12px;
            align-items: flex-end;
            max-width: 1000px;
            margin: 0 auto;
        }
        
        .chat-input {
            flex: 1;
            padding: 15px 20px;
            border: 2px solid var(--vscode-input-border);
            border-radius: 25px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: 14px;
            outline: none;
            resize: none;
            min-height: 20px;
            max-height: 120px;
            transition: border-color 0.3s ease;
        }
        
        .chat-input:focus {
            border-color: #4CAF50;
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
        }
        
        .chat-input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        
        .send-button {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }
        
        .send-button:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
        }
        
        .send-button:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .send-icon {
            width: 0;
            height: 0;
            border-left: 14px solid white;
            border-top: 9px solid transparent;
            border-bottom: 9px solid transparent;
            margin-left: 3px;
        }
        
        .scroll-to-bottom {
            bottom: 120px;
        }
        
        /* Scrollbar styling */
        .chat-messages::-webkit-scrollbar {
            width: 8px;
        }
        
        .chat-messages::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background);
        }
        
        .chat-messages::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-hoverBackground);
            border-radius: 4px;
        }
        
        .chat-messages::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-activeBackground);
        }
    </style>
</head>
<body>
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h3>Recent Chats</h3>
            <button class="close-sidebar-btn" id="closeSidebarBtn" title="Hide sidebar">×</button>
        </div>
        <div class="sidebar-content" id="sidebarContent">
            <!-- Recent conversations will be loaded here -->
        </div>
    </div>
    
    <div class="main-content">
        <div class="header">
            <button class="toggle-sidebar-btn" id="toggleSidebarBtn" title="Toggle recent chats">
                <span id="sidebarToggleIcon">📋</span>
                <span id="sidebarToggleText">Recent</span>
            </button>
            <div class="header-content">
                <h1>Jos AI ChatBot</h1>
                <p>Your intelligent coding assistant - Ask me anything!</p>
            </div>
            <button class="new-chat-btn" id="newChatBtn" title="Start new conversation">
                <span></span>
                <span>New Chat</span>
            </button>
        </div>
        
        <div class="chat-container">
            <div class="chat-messages" id="chatMessages">
                <!-- Messages will be added here -->
            </div>
            
            <div class="input-container">
                <div class="input-wrapper">
                    <textarea 
                        class="chat-input" 
                        id="chatInput" 
                        placeholder="Ask me about code, debugging, best practices, or anything tech-related..."
                        rows="1"
                    ></textarea>
                    <button class="send-button" id="sendButton" title="Send message">
                        <div class="send-icon"></div>
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <button class="scroll-to-bottom" id="scrollToBottom" title="Scroll to bottom">
        <div class="scroll-arrow"></div>
    </button>
    
    <script>
        // Wait for DOM to be ready
        setTimeout(function() {
            const vscode = acquireVsCodeApi();
            const chatMessages = document.getElementById('chatMessages');
            const chatInput = document.getElementById('chatInput');
            const sendButton = document.getElementById('sendButton');
            const scrollToBottomBtn = document.getElementById('scrollToBottom');
            const sidebarContent = document.getElementById('sidebarContent');
            const sidebar = document.getElementById('sidebar');
            const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
            const closeSidebarBtn = document.getElementById('closeSidebarBtn');
            const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
            const sidebarToggleText = document.getElementById('sidebarToggleText');
            const newChatBtn = document.getElementById('newChatBtn');
            
            let currentSessionId = null;
            let sidebarVisible = true;
            
            ${WebviewUtils.getCommonScripts()}
            
            function typeWriter(element, text, speed = 1) {
                element.innerHTML = '';
                let i = 0;
                const cursor = '<span class="typewriter-cursor"></span>';
                
                function type() {
                    if (i < text.length) {
                        element.innerHTML = markdownToHtml(text.substring(0, i + 1)) + cursor;
                        i++;
                        
                        if (i % 10 === 0) {
                            scrollToBottom();
                        }
                        
                        setTimeout(type, speed);
                    } else {
                        element.innerHTML = markdownToHtml(text);
                        scrollToBottom();
                    }
                }
                
                type();
            }
            
            function scrollToBottom() {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            function toggleScrollButton() {
                const isAtBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 50;
                scrollToBottomBtn.classList.toggle('show', !isAtBottom);
            }
            
            function addMessage(text, isUser = false, isWelcome = false) {
                const messageDiv = document.createElement('div');
                
                if (isWelcome) {
                    messageDiv.className = 'chat-message welcome';
                    messageDiv.innerHTML = \`<div class="message-content">\${text}</div>\`;
                    chatMessages.appendChild(messageDiv);
                    scrollToBottom();
                    return;
                }
                
                if (isUser) {
                    messageDiv.className = 'chat-message user';
                    messageDiv.innerHTML = \`<div class="message-content">\${text}</div>\`;
                    chatMessages.appendChild(messageDiv);
                    scrollToBottom();
                } else {
                    const typingDiv = document.createElement('div');
                    typingDiv.className = 'typing-indicator';
                    typingDiv.innerHTML = \`
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span style="margin-left: 10px; color: #4CAF50;">Jos AI is thinking...</span>
                    \`;
                    chatMessages.appendChild(typingDiv);
                    scrollToBottom();
                    
                    setTimeout(() => {
                        chatMessages.removeChild(typingDiv);
                        
                        messageDiv.className = 'chat-message ai';
                        messageDiv.innerHTML = \`<div class="message-content" id="ai-message-\${Date.now()}"></div>\`;
                        chatMessages.appendChild(messageDiv);
                        
                        const messageContent = messageDiv.querySelector('.message-content');
                        typeWriter(messageContent, text, 1);
                    }, 1000);
                }
            }
            
            function sendMessage() {
                const message = chatInput.value.trim();
                if (!message) return;
                
                addMessage(message, true);
                chatInput.value = '';
                sendButton.disabled = true;
                autoResize();
                
                vscode.postMessage({
                    command: 'chatMessage',
                    message: message,
                    sessionId: currentSessionId
                });
            }
            
            function loadChatHistory(sessions) {
                console.log('Loading chat history:', sessions);
                if (!sidebarContent) {
                    console.log('Sidebar content not found');
                    return;
                }
                
                let historyHtml = \`
                    <div class="history-item" onclick="startNewChat()" style="border: 1px dashed var(--vscode-input-border); margin-bottom: 10px;">
                        <div class="history-title" style="color: #4CAF50;">New Chat</div>
                        <div class="history-meta">Start a fresh conversation</div>
                    </div>
                \`;
                
                if (sessions.length === 0) {
                    historyHtml += '<div style="padding: 10px; color: var(--vscode-descriptionForeground); font-size: 12px;">No recent conversations</div>';
                } else {
                    historyHtml += sessions.map(session => \`
                        <div class="history-item" onclick="loadSession('\${session.id}')" data-session-id="\${session.id}">
                            <div class="history-title">\${escapeHtml(session.title)}</div>
                            <div class="history-meta">\${new Date(session.lastUpdatedAt).toLocaleDateString()} • \${session.messages.length} msgs</div>
                        </div>
                    \`).join('');
                }
                
                sidebarContent.innerHTML = historyHtml;
                console.log('Chat history loaded, sessions count:', sessions.length);
            }
            
            function loadSession(sessionId) {
                console.log('Loading session:', sessionId);
                
                // Clear current chat messages
                chatMessages.innerHTML = '';
                
                // Update active session styling
                document.querySelectorAll('.history-item').forEach(item => {
                    item.classList.remove('active');
                });
                const activeItem = document.querySelector(\`[data-session-id="\${sessionId}"]\`);
                if (activeItem) {
                    activeItem.classList.add('active');
                    console.log('Marked session as active');
                } else {
                    console.log('Could not find session item to mark as active');
                }
                
                currentSessionId = sessionId;
                
                vscode.postMessage({
                    command: 'loadSession',
                    sessionId: sessionId
                });
            }
            
            function loadSessionMessages(messages) {
                console.log('Loading session messages:', messages.length);
                chatMessages.innerHTML = '';
                
                messages.forEach((msg, index) => {
                    console.log('Loading message', index, ':', msg.text.substring(0, 50) + '...');
                    // Add messages without animation for existing conversations
                    addMessageInstant(msg.text, msg.isUser);
                });
                
                // Scroll to bottom after loading all messages
                setTimeout(() => {
                    scrollToBottom();
                }, 100);
            }
            
            function addMessageInstant(text, isUser = false) {
                const messageDiv = document.createElement('div');
                
                if (isUser) {
                    messageDiv.className = 'chat-message user';
                    messageDiv.innerHTML = \`<div class="message-content">\${escapeHtml(text)}</div>\`;
                } else {
                    messageDiv.className = 'chat-message ai';
                    const processedText = typeof markdownToHtml === 'function' ? markdownToHtml(text) : escapeHtml(text);
                    messageDiv.innerHTML = \`<div class="message-content">\${processedText}</div>\`;
                }
                
                chatMessages.appendChild(messageDiv);
            }
            
            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
            
            function autoResize() {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            }
            
            function toggleSidebar() {
                sidebarVisible = !sidebarVisible;
                sidebar.classList.toggle('hidden', !sidebarVisible);
                
                if (sidebarVisible) {
                    sidebarToggleIcon.textContent = '';
                    sidebarToggleText.textContent = 'Recent';
                } else {
                    sidebarToggleIcon.textContent = '';
                    sidebarToggleText.textContent = 'Show Recent';
                }
            }
            
            function startNewChat() {
                // Clear current session
                currentSessionId = null;
                chatMessages.innerHTML = '';
                
                // Remove active styling from history items
                document.querySelectorAll('.history-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Focus on input
                chatInput.focus();
            }
            
            // Event listeners
            chatInput.addEventListener('input', autoResize);
            
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            sendButton.addEventListener('click', sendMessage);
            scrollToBottomBtn.addEventListener('click', scrollToBottom);
            chatMessages.addEventListener('scroll', toggleScrollButton);
            toggleSidebarBtn.addEventListener('click', toggleSidebar);
            closeSidebarBtn.addEventListener('click', toggleSidebar);
            newChatBtn.addEventListener('click', startNewChat);
            
            // Listen for messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                console.log('Received message:', message.command, message);
                
                switch (message.command) {
                    case 'welcomeMessage':
                        addMessage(message.text, false, true);
                        break;
                    case 'chatResponse':
                        addMessage(message.text, false);
                        sendButton.disabled = false;
                        break;
                    case 'chatHistory':
                        loadChatHistory(message.sessions);
                        break;
                    case 'loadSessionMessages':
                        console.log('Loading session messages:', message.messages);
                        loadSessionMessages(message.messages);
                        break;
                    case 'newSession':
                        currentSessionId = message.sessionId;
                        // Refresh history to show the new session
                        setTimeout(() => {
                            vscode.postMessage({ command: 'refreshHistory' });
                        }, 500);
                        break;
                }
            });
            
            // Request chat history on load
            setTimeout(() => {
                vscode.postMessage({ command: 'requestChatHistory' });
            }, 200);
            
            // Focus input on load
            setTimeout(() => {
                if (chatInput) {
                    chatInput.focus();
                }
            }, 300);
        }, 100);
    </script>
</body>
</html>`;
    }
}