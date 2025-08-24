import * as vscode from 'vscode';
import { CodeExplanationCommand } from './commands/codeExplanationCommand';
import { ChatBotCommand } from './commands/chatBotCommand';
import { ConfigService } from './services/configService';

export function activate(context: vscode.ExtensionContext) {
    console.log('Jos Code Explainer is now active!');

    // Initialize services
    ChatBotCommand.initialize(context);
    CodeExplanationCommand.initialize(context);

    // Register commands
    const explainCommand = vscode.commands.registerCommand(
        'jos-code-explainer.explainCode',
        () => CodeExplanationCommand.execute()
    );

    const setApiKeyCommand = vscode.commands.registerCommand(
        'jos-code-explainer.setApiKey',
        () => ConfigService.promptForApiKey()
    );

    const chatBotCommand = vscode.commands.registerCommand(
        'jos-code-explainer.openChatBot',
        () => ChatBotCommand.execute()
    );

    const chatHistoryCommand = vscode.commands.registerCommand(
        'jos-code-explainer.openChatHistory',
        () => ChatBotCommand.openHistoryPanel()
    );

    // Add commands to subscriptions
    context.subscriptions.push(explainCommand, setApiKeyCommand, chatBotCommand, chatHistoryCommand);
}

export function deactivate() {
    // Cleanup if needed
}