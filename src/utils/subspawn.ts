/* 
Copied from https://github.com/craigwardman/subspawn
Original library copyright (c) 2022 Craig Wardman

I had to vendor this library to fix the API in a couple places.
*/

import { ChildProcess, execSync, spawn, SpawnOptions } from 'child_process';

interface DictionaryOfStringChildProcessArray {
	[key: string]: ChildProcess[];
}
const children: DictionaryOfStringChildProcessArray = {};

export function killSubProcesses(owner: string) {
	if (!(owner in children)) {
		return;
	}

	children[owner].forEach((c) => {
		try {
			if (c.pid) {
				if (process.platform === 'win32') {
					execSync(`taskkill /pid ${c.pid} /T /F`);
				} else {
					process.kill(-c.pid);
				}
			}
		} catch { }
	});
}

process.on('exit', () => {
	Object.keys(children).forEach((owner) => killSubProcesses(owner));
});

function gracefulExitHandler() {
	process.exit();
}

process.on('SIGINT', gracefulExitHandler);
process.on('SIGTERM', gracefulExitHandler);
process.on('SIGQUIT', gracefulExitHandler);

export function subProcess(owner: string, command: string, options?: SpawnOptions) {
	const childProcess = spawn(command, options);

	children[owner] = children[owner] || [];
	children[owner].push(childProcess);

	return childProcess;
}
