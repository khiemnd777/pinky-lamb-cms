#!/usr/bin/env python3
"""Dedicated Pinky Lamb review parent, with ordinary Codex config and approvals.

Usage: python3 engineering/agent-kit/review-read-only.py --prompt 'Review ...'
Or pipe the review prompt to stdin. No Codex options are forwarded.
"""
import argparse
from pathlib import Path
import subprocess
import sys

CODEX = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex'
APPROVED_PROJECT = Path('/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb')
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--prompt', help='Review instructions; otherwise read stdin.')
    args = parser.parse_args(argv)
    if PROJECT_ROOT != APPROVED_PROJECT or Path(__file__).is_symlink():
        raise ValueError('Launcher must remain inside the approved Pinky Lamb project.')
    if args.prompt is None and sys.stdin.isatty():
        parser.error('Supply --prompt or pipe review instructions to stdin.')
    prompt = args.prompt if args.prompt is not None else sys.stdin.read()
    if not prompt.strip() or '\0' in prompt:
        parser.error('Review prompt must be nonempty text without NUL characters.')
    command = [CODEX, 'exec', '--sandbox', 'read-only', '--model', 'gpt-6.1-sol',
               '-c', 'model_reasoning_effort="high"', '--cd', str(PROJECT_ROOT),
               # This approved exported snapshot has no Git history. This option
               # changes repository-presence checking, not sandbox or approvals.
               '--skip-git-repo-check', '-']
    try:
        return subprocess.run(command, input=prompt, text=True, shell=False,
                              cwd=PROJECT_ROOT, check=False).returncode
    except OSError:
        print('Cannot start the installed Codex CLI; no fallback or configuration change.', file=sys.stderr)
        return 127


if __name__ == '__main__':
    raise SystemExit(main())
