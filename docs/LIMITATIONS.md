# Current limitations and next steps

This is a working portfolio prototype as described in the case study. The original workflow is now packaged as a sanitized export with local logic tests. It still needs to be reproduced from a clean import with connected Google services.

- AI classification can be incorrect. Sensitive requests and outgoing reply drafts require human review.
- The local n8n instance must remain running for trigger and scheduled processing.
- Gmail-label duplicate checks do not guarantee protection against simultaneous executions.
- Failure notifications, retry behavior, and recovery from partial spreadsheet writes have not been demonstrated in this repository.
- Classification accuracy, time savings, and long-term reliability have not been measured here.
- The interactive portfolio demo is a simulation using synthetic data.

## Deferred reliability work

The current portfolio priority is packaging the existing project and completing a second case study. The following work remains planned before using this workflow for business-critical processing.

1. Exercise API timeouts and rate limits, and define appropriate retry behavior.
2. Notify an operator when processing fails.
3. Recover when Gmail actions succeed but spreadsheet logging fails.
4. Improve deduplication and concurrency handling.
5. Evaluate classification against a larger labeled test set and report observed results.

These items are a roadmap, not implemented features.
