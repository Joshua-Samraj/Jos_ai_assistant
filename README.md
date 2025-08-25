# Jos Code Explainer - Gemini AI

Jos Code Explainer is a Visual Studio Code extension that uses the free Google Gemini API to provide AI-powered code explanations and a conversational coding assistant directly within VS Code.

## Features

- **Explain Selected Code**: Select any code in your editor and get a clear, friendly explanation powered by Gemini AI.
- **Interactive ChatBot**: Open a chat panel to ask programming questions, get debugging help, or discuss best practices.
- **Chat History**: View, search, and manage your previous conversations and code explanations.
- **Secure API Key Management**: Easily set and manage your Gemini API key from the command palette.

![Code Explanation Screenshot](images/code-explanation.png)
![ChatBot Screenshot](images/chatbot.png)

## Requirements

- Visual Studio Code v1.60.0 or higher
- A free [Google Gemini API key](https://aistudio.google.com/app/apikey)

## Getting Started

1. **Install the Extension**  
   Download and install from the VS Code Marketplace or clone this repository and run it in VS Code.

2. **Set Up Your Gemini API Key**  
   - Run the command `Jos AI: Set Gemini API Key` from the Command Palette (`Ctrl+Shift+P`).
   - Paste your API key (starts with `AIza...`).

3. **Explain Code**  
   - Select code in your editor.
   - Right-click and choose `Jos AI: Explain Selected Code` or run the command from the palette.

4. **Open ChatBot**  
   - Run `Jos AI: Open ChatBot` to start a conversation with the AI.

5. **View Chat History**  
   - Run `Jos AI: Open Chat History` to browse, search, export, or delete previous sessions.

## Extension Settings

This extension contributes the following settings:

- `jos-code-explainer.geminiApiKey`: Your Google Gemini API key.

## Commands

- `Jos AI: Explain Selected Code` — Explains the currently selected code.
- `Jos AI: Set Gemini API Key` — Set or update your Gemini API key.
- `Jos AI: Open ChatBot` — Opens the AI chat assistant.
- `Jos AI: Open Chat History` — View and manage your chat history.

## Known Issues

- Gemini API rate limits may apply.
- Large code selections may be truncated for explanation.

## Release Notes

### 1.0.0

- Initial release with code explanation, chat, and history features.

---

## Contributing

Pull requests and suggestions are welcome! Please open an issue to discuss your ideas.

## License

MIT

---

**Enjoy using Jos Code Explainer!**
