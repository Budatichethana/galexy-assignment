# Copilot Progress Checklist

This file tracks what has already been completed in this project.

## Setup

- [x] Next.js project scaffolded
- [x] TypeScript enabled
- [x] Tailwind CSS configured
- [x] Dependencies installed (`npm install`)
- [x] Build verification completed (`npm run build`)
- [x] Clean minimal page set with Tailwind test block

## Instructions

- [x] Local direction file created (`NEXTFLOW_COPILOT_INSTRUCTIONS.md`)
- [x] Direction file added to `.gitignore`

## Next Work

- [x] Basic React Flow canvas setup (2 nodes, 1 edge, controls, minimap, grid)
- [x] React Flow node/edge state management with dynamic Add Node
- [x] Build Sidebar UI for node list
- [x] Build custom React Flow node cards
- [x] Node input fields with connection-based disabling
- [x] Node UI/UX polish (centered handles, consistent width, output placeholder)
- [x] Temporary node output handling with Run Node button
- [x] Input chaining between connected nodes
- [x] DAG-based workflow execution (parallel levels) with Run Workflow button
- [x] Add status indicators (success/failed/running)
- [x] Single-node and partial workflow execution modes
- [x] Trigger.dev-backed node execution via server API
- [x] LLM provider switched from Gemini to Groq
- [ ] Add loading spinner states
- [ ] Add output display area inside node cards

## Trigger.dev Setup

- [x] Trigger.dev initialized for project (`trigger/` exists)
- [x] Trigger.dev dev worker starts and connects
- [x] First simple task created (`trigger/tasks/llmTask.ts`)
- [x] Basic `llm-node` task implemented (`{ prompt: string } -> string`)
- [x] Task exported for Trigger.dev discovery
