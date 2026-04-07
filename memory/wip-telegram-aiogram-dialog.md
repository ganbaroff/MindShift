# WIP: Telegram upgrade to aiogram-dialog

## Plan
1. pip install aiogram aiogram-dialog in Railway + CI
2. Create aiogram Dispatcher + Router inside FastAPI webhook
3. ProposalsDialog: paginated list → detail card → Act/Execute/Reject buttons
4. FindingsDialog: paginated findings with severity filter
5. SwarmDialog: task input → agent selection → execution → result

## Architecture
FastAPI webhook endpoint stays. But instead of manual if/elif routing,
pass Telegram Update through aiogram Dispatcher. Dialog framework handles the rest.

## Key: don't rewrite everything. Wrap existing _handle_* functions in dialog windows.
