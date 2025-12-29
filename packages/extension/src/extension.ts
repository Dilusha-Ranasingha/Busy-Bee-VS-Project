// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ProductDashboardViewProvider } from './webview/ProductDashboardViewProvider';
import { FileSwitchTracker } from './tracking/FileSwitchTracker';

// Global tracker instance
let fileSwitchTracker: FileSwitchTracker | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "busy-bee-vs" is now active!');

	// Initialize File Switch Tracker
	const apiBaseUrl = 'http://localhost:4000'; // TODO: Make this configurable
	fileSwitchTracker = new FileSwitchTracker(context, apiBaseUrl);
	fileSwitchTracker.start();
	console.log('File Switch Tracker started');

	// Register the Product Dashboard webview
	const dashboardProvider = new ProductDashboardViewProvider(context.extensionUri);
	
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			ProductDashboardViewProvider.viewType,
			dashboardProvider
		)
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('busy-bee-vs.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Busy-Bee-VS!');
	});

	context.subscriptions.push(disposable);

	// Optional: Command to show current tracking stats
	const showStatsCommand = vscode.commands.registerCommand('busy-bee-vs.showFileSwitchStats', () => {
		if (fileSwitchTracker) {
			const stats = fileSwitchTracker.getCurrentStats();
			vscode.window.showInformationMessage(
				`File Switch Stats: ${stats.activationCount} activations in current window. Session: ${stats.sessionId}`
			);
		}
	});

	context.subscriptions.push(showStatsCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (fileSwitchTracker) {
		fileSwitchTracker.stop();
		console.log('File Switch Tracker stopped');
	}
}
