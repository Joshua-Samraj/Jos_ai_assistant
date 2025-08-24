export class WebviewUtils {
    static escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    static getCommonStyles(): string {
        return `
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            line-height: 1.6;
        }
        
        .inline-code {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            color: #E91E63;
        }
        
        .code-block {
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 8px;
            margin: 10px 0;
            border-left: 4px solid #4CAF50;
            overflow-x: auto;
            position: relative;
        }
        
        .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background-color: rgba(76, 175, 80, 0.1);
            border-bottom: 1px solid var(--vscode-input-border);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .code-block-content {
            padding: 12px;
        }
        
        .code-block pre {
            margin: 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            white-space: pre;
            overflow-x: auto;
            tab-size: 4;
            -moz-tab-size: 4;
        }
        
        .copy-button {
            background-color: #4CAF50;
            border: none;
            border-radius: 4px;
            color: white;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .copy-button:hover {
            background-color: #45a049;
            transform: scale(1.05);
        }
        
        .copy-button.copied {
            background-color: #2196F3;
        }
        
        .copy-icon {
            width: 12px;
            height: 12px;
            fill: currentColor;
        }
        
        .typewriter-cursor {
            display: inline-block;
            background-color: #4CAF50;
            width: 2px;
            height: 1.2em;
            animation: blink 1s infinite;
        }
        
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        
        .scroll-to-bottom {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background-color: #4CAF50;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            z-index: 1000;
        }
        
        .scroll-to-bottom:hover {
            background-color: #45a049;
            transform: scale(1.1);
        }
        
        .scroll-to-bottom.show {
            display: flex;
        }
        
        .scroll-arrow {
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 12px solid white;
        }`;
    }

    static getCommonScripts(): string {
        return `
        function markdownToHtml(text) {
            // First, process code blocks BEFORE any other transformations
            // This prevents line breaks from being converted to <br> inside code blocks
            
            let html = text;
            
            // Store code blocks temporarily to protect them from other transformations
            const codeBlocks = [];
            let codeBlockIndex = 0;
            
            // Code blocks with language detection
            html = html.replace(/\`\`\`(\\w+)?\\n?([\\s\\S]*?)\`\`\`/g, function(match, language, code) {
                const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
                const langLabel = language ? language.charAt(0).toUpperCase() + language.slice(1) : 'Code';
                
                // Store the original code exactly as it is (with newlines)
                const originalCode = code;
                
                // Create a placeholder for this code block
                const placeholder = \`__CODE_BLOCK_\${codeBlockIndex}__\`;
                codeBlockIndex++;
                
                // Store the complete code block HTML
                const codeBlockHtml = \`<div class="code-block" data-original-code="\${encodeForDataAttribute(originalCode)}">
                    <div class="code-block-header">
                        <span>\${langLabel}</span>
                        <button class="copy-button" onclick="copyCode('\${codeId}')">
                            <svg class="copy-icon" viewBox="0 0 16 16">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                            </svg>
                            Copy
                        </button>
                    </div>
                    <div class="code-block-content">
                        <pre id="\${codeId}">\${escapeHtmlForDisplay(originalCode.trim())}</pre>
                    </div>
                </div>\`;
                
                codeBlocks.push(codeBlockHtml);
                return placeholder;
            });
            
            // Now process the rest of the markdown (excluding code blocks)
            html = html
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            
            // Inline code
            html = html.replace(/\`([^\`]+)\`/g, '<code class="inline-code">$1</code>');
            
            // Bold text
            html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
            
            // Italic text
            html = html.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
            
            // Headers
            html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
            
            // Line breaks (only for non-code content)
            html = html.replace(/\\n/g, '<br>');
            
            // Restore code blocks
            codeBlocks.forEach((codeBlockHtml, index) => {
                html = html.replace(\`__CODE_BLOCK_\${index}__\`, codeBlockHtml);
            });
            
            return html;
        }
        
        // Helper function to encode text for data attributes while preserving newlines
        function encodeForDataAttribute(text) {
            return text
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
        
        // Helper function to escape HTML for display
        function escapeHtmlForDisplay(text) {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
        
        // Copy code functionality
        window.copyCode = function(codeId) {
            const codeElement = document.getElementById(codeId);
            if (!codeElement) {
                console.error('Code element not found:', codeId);
                return;
            }
            
            // Get the original code with preserved formatting
            let code = '';
            
            // Try to get the original code from the data attribute first
            const codeBlock = codeElement.closest('.code-block');
            if (codeBlock && codeBlock.dataset.originalCode) {
                // Decode HTML entities from the data attribute
                code = decodeHtmlEntities(codeBlock.dataset.originalCode);
            } else {
                // Fallback: try to preserve formatting from the pre element
                code = getFormattedTextFromPre(codeElement);
            }
            
            // Clean up any remaining HTML artifacts
            code = code.replace(/<br\\s*\\/?>/gi, '\\n');
            
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(code).then(() => {
                    showCopyFeedback(codeId);
                }).catch((err) => {
                    fallbackCopyText(code, codeId);
                });
            } else {
                fallbackCopyText(code, codeId);
            }
        };
        
        // Function to decode HTML entities
        function decodeHtmlEntities(text) {
            if (!text) return '';
            
            // Manual decoding to ensure proper handling
            let decoded = text
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&#x27;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&'); // Do this last to avoid double-decoding
            
            // Also use textarea method as backup
            const textarea = document.createElement('textarea');
            textarea.innerHTML = decoded;
            decoded = textarea.value;
            
            return decoded;
        }
        
        // Function to extract formatted text from pre element while preserving indentation
        function getFormattedTextFromPre(preElement) {
            // Try multiple methods to get the formatted text
            let text = '';
            
            // Method 1: Try to get from innerText (preserves formatting better)
            if (preElement.innerText) {
                text = preElement.innerText;
            }
            // Method 2: Try textContent as fallback
            else if (preElement.textContent) {
                text = preElement.textContent;
            }
            // Method 3: Parse HTML manually
            else {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = preElement.innerHTML;
                
                // Replace <br> tags with newlines
                tempDiv.innerHTML = tempDiv.innerHTML.replace(/<br\\s*\\/?>/gi, '\\n');
                
                // Get text content
                text = tempDiv.textContent || tempDiv.innerText || '';
            }
            
            // Decode any remaining HTML entities
            text = decodeHtmlEntities(text);
            
            return text;
        }
        
        function fallbackCopyText(text, codeId) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                showCopyFeedback(codeId);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
            
            document.body.removeChild(textArea);
        }
        
        function showCopyFeedback(codeId) {
            const codeElement = document.getElementById(codeId);
            if (!codeElement) return;
            
            const codeBlock = codeElement.closest('.code-block');
            if (!codeBlock) return;
            
            const copyButton = codeBlock.querySelector('.copy-button');
            if (!copyButton) return;
            
            const originalContent = copyButton.innerHTML;
            
            copyButton.innerHTML = \`
                <svg class="copy-icon" viewBox="0 0 16 16">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                </svg>
                Copied!
            \`;
            copyButton.classList.add('copied');
            
            setTimeout(() => {
                copyButton.innerHTML = originalContent;
                copyButton.classList.remove('copied');
            }, 2000);
        }`;
    }
}