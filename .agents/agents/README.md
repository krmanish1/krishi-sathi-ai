# Agents Directory

This directory is used to define custom AI agents or personas for the Krishi AI Saathi project.

## Adding a Custom Agent

To define a custom agent for the Google Antigravity SDK:
1. Create a subdirectory under this folder (e.g., `.agents/agents/code-reviewer/`).
2. Add an `AGENT.md` or configuration file with the agent's system prompt, persona, model settings, and equipped skills.

Example:
```markdown
# Code Reviewer Agent
- **Model**: gemini-3.5-flash
- **System Prompt**: "You are a senior React Native and Expo developer reviewing code changes against the Feature-Sliced Design rules defined in the workspace."
- **Skills**:
  - `krishi-sathi-ai-development`
```
