import * as vscode from 'vscode';

export class ConfigService {
    private static readonly CONFIG_SECTION = 'jos-code-explainer';
    private static readonly API_KEY_SETTING = 'geminiApiKey';

    static getApiKey(): string | undefined {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<string>(this.API_KEY_SETTING);
    }

    static async setApiKey(apiKey: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update(this.API_KEY_SETTING, apiKey, vscode.ConfigurationTarget.Global);
    }

    static async promptForApiKey(): Promise<void> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Google Gemini API key',
            password: true,
            placeHolder: 'AIza...',
            validateInput: (value) => {
                if (!value || !value.startsWith('AIza')) {
                    return 'Please enter a valid Gemini API key (starts with AIza)';
                }
                return null;
            }
        });

        if (apiKey) {
            await this.setApiKey(apiKey);
            vscode.window.showInformationMessage('Gemini API key saved successfully!');
        }
    }

    static async checkApiKeyOrPrompt(): Promise<string | null> {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            const result = await vscode.window.showInformationMessage(
                'Gemini API key not found. Would you like to set it up?',
                'Set API Key',
                'Get Free API Key'
            );

            if (result === 'Set API Key') {
                await this.promptForApiKey();
                return this.getApiKey() || null;
            } else if (result === 'Get Free API Key') {
                vscode.env.openExternal(vscode.Uri.parse('https://aistudio.google.com/app/apikey'));
            }
            return null;
        }

        return apiKey;
    }
}