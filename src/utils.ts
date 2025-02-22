import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { AddressInfo, createServer } from "net";

const EXTENSION_PREFIX = "godotTools";

export function get_configuration(name: string, default_value?: any) {
	let config_value = vscode.workspace.getConfiguration(EXTENSION_PREFIX).get(name, null);
	if (default_value && config_value === null) {
		return default_value;
	}
	return config_value;
}

export function set_configuration(name: string, value: any) {
	return vscode.workspace.getConfiguration(EXTENSION_PREFIX).update(name, value);
}

export function is_debug_mode(): boolean {
	return process.env.VSCODE_DEBUG_MODE === "true";
}

const CONTEXT_PREFIX = `${EXTENSION_PREFIX}.context.`;

export function set_context(name: string, value: any) {
	return vscode.commands.executeCommand("setContext", CONTEXT_PREFIX + name, value);
}

export function register_command(command: string, callback: (...args: any[]) => any, thisArg?: any): vscode.Disposable {
	return vscode.commands.registerCommand(`${EXTENSION_PREFIX}.${command}`, callback);
}

export function get_word_under_cursor(): string {
	const activeEditor = vscode.window.activeTextEditor;
	const document = activeEditor.document;
	const curPos = activeEditor.selection.active;
	const wordRange = document.getWordRangeAtPosition(curPos);
	const symbolName = document.getText(wordRange);
	return symbolName;
}

export async function get_project_version(): Promise<string | undefined> {
	const project_dir = await get_project_dir();

	if (!project_dir) {
		return undefined;
	}

	let godot_version = '3.x';
	const project_file = vscode.Uri.file(path.join(project_dir, 'project.godot'));
	const document = await vscode.workspace.openTextDocument(project_file);
	const text = document.getText();

	const match = text.match(/config\/features=PackedStringArray\((.*)\)/);
	if (match) {
		const line = match[0];
		const version = line.match(/\"(4.[0-9]+)\"/);
		if (version) {
			godot_version = version[1];
		}
	}
	return godot_version;
}

export async function get_project_dir() {
	let project_dir = undefined;
	let project_file = '';
	if (vscode.workspace.workspaceFolders != undefined) {
		const files = await vscode.workspace.findFiles("**/project.godot");
		if (files) {
			project_file = files[0].fsPath;
			if (fs.existsSync(project_file) && fs.statSync(project_file).isFile()) {
				project_dir = path.dirname(project_file);
			}
		}
	}
	return project_dir;
}

export function find_project_file(start: string, depth: number = 20) {
	// TODO: rename this, it's actually more like "find_parent_project_file"
	// This function appears to be fast enough, but if speed is ever an issue,
	// memoizing the result should be straightforward
	const folder = path.dirname(start);
	if (start == folder) {
		return null;
	}
	const project_file = path.join(folder, "project.godot");

	if (fs.existsSync(project_file) && fs.statSync(project_file).isFile()) {
		return project_file;
	} else {
		if (depth === 0) {
			return null;
		}
		return find_project_file(folder, depth - 1);
	}
}

export async function find_file(file: string): Promise<vscode.Uri | null> {
	if (fs.existsSync(file)) {
		return vscode.Uri.file(file);
	} else {
		const fileName = path.basename(file);
		const results = await vscode.workspace.findFiles("**/" + fileName);
		if (results.length == 1) {
			return results[0];
		}
	}
	return null;
}

export async function convert_resource_path_to_uri(resPath: string): Promise<vscode.Uri | null> {
	const files = await vscode.workspace.findFiles("**/project.godot");
	if (!files) {
		return null;
	}
	const project_dir = files[0].fsPath.replace("project.godot", "");
	return vscode.Uri.joinPath(vscode.Uri.file(project_dir), resPath.substring(6));
}

export async function get_free_port(): Promise<number> {
	return new Promise(res => {
		const srv = createServer();
		srv.listen(0, () => {
			const port = (srv.address() as AddressInfo).port;
			srv.close((err) => res(port));
		});
	});
}
