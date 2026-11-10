# Manual reproduction and test evidence

The portfolio describes earlier controlled tests. This document specifies how to reproduce those scenarios after importing the actual workflow. No new live-service executions have been performed as part of preparing these files.

## Credential-free regression checks

Run `npm test` with Node.js 22 or later. Ten tests evaluate the actual exported classifier-validation JavaScript, routing expressions, duplicate-label condition, resolution-update guard, draft preparation, and sanitization invariants. The tests include malformed model output and high-risk requests with an incorrect model review flag.

These checks passed locally during packaging. They use synthetic inputs and a minimal n8n input-context stub. They do not measure model classification quality or verify the behavior of Gmail and Google Sheets nodes.

## Import compatibility

The sanitized JSON was successfully imported into a clean, isolated n8n 2.47.3 instance. The imported workflow remained inactive with no connected credentials. This confirms the import step; it does not establish successful execution of the Google-service nodes.

## Before running

Use a dedicated inbox and spreadsheet. Connect your own credentials, confirm the mappings, and keep scheduled triggers inactive until the initial manual checks are complete. The fixture addresses use the reserved `example.com` domain and are illustrative; send test messages from accounts you control.

## Scenarios

| Test | Procedure | Expected observation |
| --- | --- | --- |
| Newsletter | Send the newsletter fixture and execute intake. | No-reply branch, processing label, skipped log entry, no reply draft. |
| Billing dispute | Send the duplicate-charge fixture. | Human-review branch, review label, pending log entry. |
| Service inquiry | Send the service-inquiry fixture. | Draft created, draft label and log entry; nothing automatically sent. |
| Already processed | Run intake again for an already labeled message. | Duplicate check stops repeated processing. |
| Resolve review | Apply `AI/Resolved` to the flagged message and run resolution. | Existing matching row changes to resolved with a timestamp. |
| Resolve again | Run resolution again for the same message. | Original resolution timestamp remains unchanged. |
| Scheduled resolution | Prepare a pending row, apply the resolved label, and allow the configured schedule to run. | Scheduled execution updates the matching row without a manual trigger. |

## Record the result

Copy `examples/test-run.csv` for each test session. Fill in actual observations, pass/fail, execution timestamp, n8n version, and a reference to sanitized evidence. Do not mark a scenario as passed from the expected outcome alone.

Useful evidence includes the execution branch, Gmail label, draft content, relevant sheet row, and before/after resolution timestamps. Keep raw inbox data and credential screens in an ignored local folder.

The browser simulation demonstrates the intended interaction. It does not execute n8n or count as a workflow test.

## Deliberately deferred

API outages, rate limits, partial logging failures, and simultaneous executions are outside the current reproduction suite. See [LIMITATIONS.md](LIMITATIONS.md). Do not infer production resilience from the seven happy-path and state-transition scenarios above.
