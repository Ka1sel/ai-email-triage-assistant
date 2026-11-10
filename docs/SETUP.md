# Setup checklist

**Status:** Configuration and column names have been inspected in the original export. Credential-free regression checks pass. A fresh import with your own connected Google services still needs an end-to-end run.

## Requirements

- An n8n instance that remains running during scheduled processing.
- A dedicated Gmail test inbox and permission to read messages, modify labels, and create drafts.
- A Gemini credential configured in n8n.
- A Google spreadsheet accessible to the credential used by the workflow.
- `workflows/email-triage-assistant.json` from this repository.

## Import and configuration

1. Import the sanitized JSON into n8n using **Import from File**. Keep the workflow inactive during setup.
2. Reconnect Gmail, Google Sheets, and Gemini credentials in n8n's credential manager. Credentials are intentionally not provided with the project.
3. Check every node that references an account-specific resource, including Gmail label identifiers, spreadsheet IDs, and sheet/tab names.
4. Create `AI/No Reply`, `AI/Needs Review`, `AI/Drafted`, and `AI/Resolved` in the test inbox. Replace `REPLACE_AI_NO_REPLY_LABEL_ID`, `REPLACE_AI_NEEDS_REVIEW_LABEL_ID`, `REPLACE_AI_DRAFTED_LABEL_ID`, and `REPLACE_AI_RESOLVED_LABEL_ID` with their actual Gmail label IDs. Update both the label nodes and the `Already Processed?` condition. You can edit a copy of the JSON before import to replace each placeholder consistently.
5. Create a spreadsheet tab named `Activity Log`. Import the header-only CSV at `examples/activity-log-headers.csv`. Replace `REPLACE_SPREADSHEET_ID` in every Google Sheets node. Re-select the tab and refresh the column mappings if prompted by n8n.
6. Confirm the lookup uses a stable message identifier to update the correct existing row during resolution.
7. Inspect the classifier and reply-generator prompts. Confirm sender, subject, and body reference the original normalized message.
8. The shared resolution schedule explicitly runs every five minutes. Set the workflow timezone to your intended timezone. The timestamp expression currently formats `Resolved At` in `Asia/Taipei`; change that expression if needed.
9. Run the scenarios in [TESTING.md](TESTING.md) manually in the test environment.
10. Enable scheduled processing only after the expected labels, drafts, and sheet entries have been checked.

For self-hosted Google OAuth setup, use [n8n's Google OAuth guide](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/). Use the redirect URL displayed by your own n8n credential screen.

## Configuration record to complete

| Setting | Verified value |
| --- | --- |
| Original n8n instance version | Not recorded in the export |
| Gemini model | `models/gemini-2.5-flash` in both model nodes; choose an available model in your account if necessary |
| Node packages | Built-in `n8n-nodes-base` and official `@n8n/n8n-nodes-langchain` nodes |
| Activity-log tab | `Activity Log` in the shared template |
| Message identifier used for row lookup | Gmail message `id`, stored in the `Message ID` column |
| Gmail labels | Four `REPLACE_AI_*_LABEL_ID` placeholders; three processing labels also appear in `Already Processed?` |
| Gmail intake | Every minute, maximum one message per poll, no additional filters in the original export |
| Resolution schedule | Explicit five-minute interval in the shared template |
| Resolution timestamp | `Asia/Taipei`, `yyyy-MM-dd HH:mm:ss` |

The sheet headers are `Timestamp`, `Message ID`, `Sender`, `Subject`, `Category`, `Urgency`, `Risk Level`, `Action`, `Status`, `Review Status`, `Review Notes`, and `Resolved At`. The manual-review branch stores `Status=Flagged` and `Review Status=Pending`. Resolution updates the latter to `Resolved` and writes `Resolved At` on the same message row.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Service inquiry unexpectedly flagged | Inspect the actual classifier input and references to normalized sender, subject, and body. |
| Google authentication rejected | Reconnect the n8n credential and check the enabled APIs, redirect URL, consent configuration, and permitted test users. |
| No new spreadsheet row | Inspect node execution output, spreadsheet access, selected tab, and exact header mapping. |
| Resolved record not updated | Confirm the label, scheduled execution, matching message identifier, and row lookup. |
| Resolution timestamp changes repeatedly | Inspect the existing status check before the update node. |
| Workflow stops after closing the local instance | Keep the n8n service running; the portfolio frontend does not run the automation. |
