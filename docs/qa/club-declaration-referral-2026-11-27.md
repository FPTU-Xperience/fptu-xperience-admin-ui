# Club declaration referral — Admin

The declarations queue now distinguishes direct submissions from records
forwarded by a club, using the server's `viaClub` filter before pagination.
Rows and review details show the actual referring club, endorsement reason,
endorser and forwarder. Club endorsement does not display as an XP award.

Opening a review fetches the latest record/version/capabilities. Loading or
failed detail reads block the final action. Review requests use that fresh
version and verified attributes; a synchronous guard blocks duplicate submits.
Failure preserves the modal for retry. The server independently checks campus,
forwarding stage, reviewer independence, version and idempotency.

Validation: 116 Node tests and the production build passed. The Admin product
browser suite checks source filtering, detail failure/retry, fresh versions,
club context, duplicate-submit suppression, final-review failure/retry and
320–1280px geometry. The mobile screenshot was inspected. PR CI and deployment
run the suite. Isolated browser fixtures do not establish real-account
production acceptance.
