You are building TaskFlow, one task per run. Follow the rules in .agents/rules/taskflow.md.

1. Read PRD.md, tasks.md and progress.md.
2. Pick the first unchecked task in tasks.md. Do only that task and nothing else.
3. Implement it in the simplest way that meets the PRD. Add tests where the task says so or where permissions or data logic are involved.
4. Run `npm run lint`, `npm run typecheck` and `npm test`. Fix every failure before continuing. Skip a check only if the script does not exist yet (tasks 1 and 2 create them).
5. If the task is marked [review]: run `coderabbit review --plain`. Fix real bugs and security issues. Ignore style nits. Do not change files that were not flagged. Run the review at most twice for the task. If CodeRabbit is not installed, rate-limited or not logged in, note that in progress.md and continue.
6. Check the task off in tasks.md and append two or three lines to progress.md: what you did, anything the next run needs to know.
7. Commit with a clear message.
8. If every task in tasks.md is checked, write the line ALL_TASKS_DONE at the end of progress.md.
9. Stop. Do not start the next task.

If you are blocked (missing credentials, unclear requirement, failing environment), write the reason in progress.md under a "BLOCKED" heading, do not guess, and stop.
