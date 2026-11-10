# Shareable workflow export

`email-triage-assistant.json` comes from the original **AI Email Reply Assistant** export. It contains all 25 nodes and both trigger branches. Credential bindings, pinned messages, instance metadata, and account-specific resource references have been removed. The workflow is inactive.

Follow `../docs/SETUP.md` to replace its placeholders and reconnect credentials. The template's duplicate check is aligned with the three processing labels, and its resolution interval is explicitly five minutes. No live mailbox actions have been performed during packaging.

## Export the existing workflow

1. Open the working email assistant in n8n.
2. Open the workflow's three-dot menu and select **Download**.
3. Keep the unmodified export outside this public repository, or in the ignored `private/` folder.
4. Prepare a reviewed copy named `email-triage-assistant.json` in this folder.
5. Import the reviewed copy into a separate test workflow and reconnect credentials before recording a successful reproduction.

If the resolution branch is a separate workflow, export and include that separately as well.

## Review before publication

- Remove personal credential names and bindings. Review literal HTTP authentication headers, tokens, and secrets in node parameters and code.
- Remove pinned input data, private message contents, execution samples, personal inbox addresses, internal URLs, and instance metadata that should not be public.
- Replace account-specific sheet IDs and other resource references with documented placeholders. Record every required replacement in `docs/SETUP.md`.
- Preserve node names, connections, and expressions needed for the workflow to operate.
- Keep the published workflow inactive, and verify that importing it does not start processing a live inbox.
- Record the n8n version, model name, required node packages, actual sheet headers, label setup, and timezone.

Ignore rules do not inspect the contents of a workflow file. Review the JSON itself before sharing it.

The [official n8n export/import guide](https://docs.n8n.io/workflows/export-import/) explains workflow downloads and notes that exports can include credential names, IDs, and authentication headers.
