import { spawn } from 'node:child_process';
import type { CommandSpec } from '../services/actions.js';

export type ExecutionResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export function executeLocal(spec: CommandSpec, options: { useSudo?: boolean } = {}): Promise<ExecutionResult> {
  return new Promise(resolve => {
    const command = options.useSudo ? 'sudo' : spec.command;
    const args = options.useSudo ? [spec.command, ...spec.args] : spec.args;
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
    }, spec.timeoutMs);

    child.stdout.on('data', chunk => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', chunk => stderr.push(Buffer.from(chunk)));
    child.on('close', code => {
      clearTimeout(timer);
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        timedOut
      });
    });
  });
}
