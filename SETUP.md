# Setup: running Ponytail, CodeRabbit and the Ralph loop in Antigravity

Commands below come from each project's own docs. Where I could not confirm something it is marked **verify**.

## 0. Prerequisites
- Antigravity CLI (`agy`), signed in. Check: `agy --version` and `agy help`
- Node.js 20+, Git, a MongoDB Atlas free cluster
- A Gemini API key from Google AI Studio (free tier; do not send real client data on it)

## 1. Put this kit in a new project folder
```bash
mkdir taskflow && cd taskflow
# copy everything from this kit into it, including the hidden .agents folder
git init
chmod +x ralph.sh
```

## 2. Install Ponytail (keeps the agent from over-engineering)
Official install for Antigravity CLI:
```bash
agy plugin install https://github.com/DietrichGebert/ponytail
agy plugin list
```
Restart Antigravity afterwards. Then, inside an agent session:
- `/ponytail` shows the current level; `/ponytail lite|full|ultra|off` changes it. Default is `full`.
- `/ponytail-review` reviews the current diff and returns a delete-list.
- `/ponytail-audit` audits the whole repo.

Fallback if the plugin does not load: drop the ruleset from the Ponytail repo into `.agents/rules/` (its README describes this). One user report says plugin **hooks** may not run in the Antigravity IDE even when skills and rules load, so rely on the rules/skills, and **verify** with `/ponytail` that it is active.

## 3. Install CodeRabbit
```bash
curl -fsSL https://cli.coderabbit.ai/install.sh | sh     # or: brew install coderabbit
source ~/.zshrc                                           # or restart the shell
coderabbit auth login                                     # opens the browser
cr doctor                                                 # checks install, auth, git, connectivity
```
Then add the Antigravity plugin so the agent can run reviews itself:
```bash
agy plugin install https://github.com/coderabbitai/skills
agy plugin list
```
Use it: tell the agent "Run a CodeRabbit review", or in a terminal run `coderabbit review --plain` (reviews all uncommitted changes).
The free plan is rate-limited (reported as about 3 CLI reviews per hour), which is why only tasks marked `[review]` in `tasks.md` trigger one.

## 4. Environment
Create `.env.local` after task 2 scaffolds the app (or copy `.env.example`):
```
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=<run: openssl rand -base64 32>
GOOGLE_GENERATIVE_AI_API_KEY=<from Google AI Studio>
AI_MODEL=<a free-tier Gemini model listed in AI Studio>
```
Check which models are free in Google AI Studio, then set `AI_MODEL`. Never commit `.env.local`.

## 5. Run the Ralph loop
Do a supervised run first:
```bash
./ralph.sh once
```
Read `progress.md`, `git log` and `tasks.md`. If task 1 looks right, continue:
```bash
MAX_ITER=5 ./ralph.sh
```
Raise the cap slowly. The loop stops when `progress.md` contains `ALL_TASKS_DONE`, when the agent writes a `BLOCKED` note, or at `MAX_ITER`.

Do not add `--dangerously-skip-permissions` until you trust the loop, and then only inside a throwaway branch or container. If `agy -p` needs different flags on your version, change the one line in `ralph.sh` (**verify** with `agy help`).

## 6. Typical session
1. Run `./ralph.sh once`, read the result.
2. Run 3 to 5 iterations.
3. Run `/ponytail-review` on the diff and `coderabbit review --plain`.
4. Fix or re-queue issues by adding a task line to `tasks.md`.
5. Repeat.

## 7. Swapping to Claude later
Task 15 puts all AI calls behind `src/lib/ai/provider.ts`. To switch, install `@ai-sdk/anthropic`, change the model line in that one file, and set `ANTHROPIC_API_KEY`.
