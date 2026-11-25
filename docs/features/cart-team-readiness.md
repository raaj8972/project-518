# Team checkout readiness

The event cart now offers a direct **Create a team** action when the student has no teams, with the event's team-size requirement displayed next to selection. The action opens the team-creation form at `/dashboard/teams?from=cart&create=1` without clearing the cart. The Teams page retains the cart context and provides **Return to event cart**.

Checkout stays disabled until a selected team has the required number of distinct accepted participants, including its captain. Pending invitations and duplicate owner/member records do not increase the count. Failed team reads show a retry action. Team and membership changes refresh readiness while the cart is open.

On submission, current event settings and current group membership are checked before payment instructions appear or any registration write occurs. Existing schedule-clash and server checkout checks remain in place. Payment references are validated before submission, with the action labelled **Submit payment for review**. Single-event checkout uses **Register for 1 event**; partial successes do not disable the remaining entries merely because their counts happen to match the successes.

The drawer uses the shared dialog focus/scroll handling and renders at the document level above the page navigation. It takes full width on mobile, includes a labelled close action, and keeps bottom controls within the device safe area.

Validation: 42 tests across cart readiness, team-creation/return navigation, existing registration flows, dashboard behaviour, and schedule clashes passed. TypeScript and the production build passed. No real team, registration, or payment records were created during checks.
