// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ProductDashboardViewProvider } from './webview/ProductDashboardViewProvider';
import { FileSwitchTracker } from './tracking/FileSwitchTracker';
import { FocusStreakTracker } from './tracking/FocusStreakTracker';
import { EditSessionTracker } from './tracking/EditSessionTracker';
import { SaveEditSessionTracker } from './tracking/SaveEditSessionTracker';
import { DiagnosticDensityTracker } from './tracking/DiagnosticDensityTracker';
import { AuthManager } from './auth/AuthManager';

// Global instances
let fileSwitchTracker: FileSwitchTracker | undefined;
let focusStreakTracker: FocusStreakTracker | undefined;
let editSessionTracker: EditSessionTracker | undefined;
let saveEditSessionTracker: SaveEditSessionTracker | undefined;
let diagnosticDensityTracker: DiagnosticDensityTracker | undefined;
let authManager: AuthManager;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "busy-bee-vs" is now active!');

	// Initialize Authentication Manager
	authManager = AuthManager.getInstance(context);
	
	// Listen for auth state changes
	context.subscriptions.push(
		authManager.onAuthChange((user) => {
			if (user) {
				console.log(`[Extension] User signed in: ${user.username}`);
				
				// Restart File Switch tracker with authenticated user
				if (fileSwitchTracker) {
					fileSwitchTracker.stop();
				}
				const apiBaseUrl = 'http://localhost:4000';
				fileSwitchTracker = new FileSwitchTracker(context, authManager, apiBaseUrl);
				fileSwitchTracker.start();
				
				// Start Focus Streak tracker
				if (focusStreakTracker) {
					focusStreakTracker.dispose();
				}
				focusStreakTracker = new FocusStreakTracker(authManager);
				console.log('Focus Streak Tracker started');				
				// Start Edit Session tracker
				if (editSessionTracker) {
					editSessionTracker.dispose();
				}
				editSessionTracker = new EditSessionTracker(authManager);
				console.log('Edit Session Tracker started');
				
				// Start Save-Edit Session tracker
				if (saveEditSessionTracker) {
					saveEditSessionTracker.dispose();
				}
				saveEditSessionTracker = new SaveEditSessionTracker(authManager);
				console.log('Save-Edit Session Tracker started');
				
				// Start Diagnostic Density tracker
				if (diagnosticDensityTracker) {
					diagnosticDensityTracker.dispose();
				}
				diagnosticDensityTracker = new DiagnosticDensityTracker(
					authManager,
					vscode.workspace.workspaceFolders?.[0]
				);
				console.log('Diagnostic Density Tracker started');
			} else {
				console.log('[Extension] User signed out');
				
				// Stop tracking when signed out
				if (fileSwitchTracker) {
					fileSwitchTracker.stop();
					fileSwitchTracker = undefined;
				}
				if (focusStreakTracker) {
					focusStreakTracker.dispose();
					focusStreakTracker = undefined;
				}
				if (editSessionTracker) {
					editSessionTracker.dispose();
					editSessionTracker = undefined;
				}
				if (saveEditSessionTracker) {
					saveEditSessionTracker.dispose();
					saveEditSessionTracker = undefined;
				}
				if (diagnosticDensityTracker) {
					diagnosticDensityTracker.dispose();
					diagnosticDensityTracker = undefined;
				}
			}
		})
	);

	// Initialize File Switch Tracker if user is already signed in
	if (authManager.isSignedIn()) {
		const apiBaseUrl = 'http://localhost:4000';
		fileSwitchTracker = new FileSwitchTracker(context, authManager, apiBaseUrl);
		fileSwitchTracker.start();
		console.log('File Switch Tracker started (user already authenticated)');
		
		// Start Focus Streak tracker
		focusStreakTracker = new FocusStreakTracker(authManager);
		console.log('Focus Streak Tracker started (user already authenticated)');
		
		// Start Edit Session tracker
		editSessionTracker = new EditSessionTracker(authManager);
		console.log('Edit Session Tracker started (user already authenticated)');
		
		// Start Save-Edit Session tracker
		saveEditSessionTracker = new SaveEditSessionTracker(authManager);
		console.log('Save-Edit Session Tracker started (user already authenticated)');
		
		// Start Diagnostic Density tracker
		diagnosticDensityTracker = new DiagnosticDensityTracker(
			authManager,
			vscode.workspace.workspaceFolders?.[0]
		);
		console.log('Diagnostic Density Tracker started (user already authenticated)');
	} else {
		console.log('User not authenticated. Sign in to start tracking.');
	}

	// Register the Product Dashboard webview
	const dashboardProvider = new ProductDashboardViewProvider(context.extensionUri, authManager);
	
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

	// GitHub Sign In Command
	const signInCommand = vscode.commands.registerCommand('busy-bee-vs.signIn', async () => {
		try {
			console.log('[Extension] Sign in command triggered');
			const user = await authManager.signIn();
			if (user) {
				vscode.window.showInformationMessage(`Welcome ${user.username}! File tracking started.`);
			} else {
				console.log('[Extension] Sign in returned undefined');
			}
		} catch (error) {
			console.error('[Extension] Sign in command error:', error);
			vscode.window.showErrorMessage(`Sign in failed: ${error}`);
		}
	});

	context.subscriptions.push(signInCommand);

	// GitHub Sign Out Command
	const signOutCommand = vscode.commands.registerCommand('busy-bee-vs.signOut', async () => {
		await authManager.signOut();
	});

	context.subscriptions.push(signOutCommand);

	// Optional: Command to show current tracking stats
	const showStatsCommand = vscode.commands.registerCommand('busy-bee-vs.showFileSwitchStats', () => {
		const user = authManager.getUser();
		if (!user) {
			vscode.window.showInformationMessage('Sign in with GitHub to view stats');
			return;
		}
		
		if (fileSwitchTracker) {
			const stats = fileSwitchTracker.getCurrentStats();
			vscode.window.showInformationMessage(
				`[${user.username}] File Switch Stats: ${stats.activationCount} activations in current session`
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
	if (focusStreakTracker) {
		focusStreakTracker.dispose();
		console.log('Focus Streak Tracker stopped');
	}
	if (editSessionTracker) {
		editSessionTracker.dispose();
		console.log('Edit Session Tracker stopped');
	}
	if (saveEditSessionTracker) {
		saveEditSessionTracker.dispose();
		console.log('Save-Edit Session Tracker stopped');
	}
	if (diagnosticDensityTracker) {
		diagnosticDensityTracker.dispose();
		console.log('Diagnostic Density Tracker stopped');
	}
}
