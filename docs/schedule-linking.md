# Schedule and event linking

A schedule entry represents a time and venue in the public festival programme. It may link to an event catalog record through `schedule_events.event_id`, which is a **text** foreign key. Preserve the entire ID when reading and saving it; do not parse it as an integer.

In Admin → Schedule, choose a day, add or edit an entry and select **Link an event**. Selection fills its title, timing, venue and category. These fields can then be adapted for a particular round. Saving changes the schedule entry. Edit the Events page to change the catalog's own date, registration settings or rules. Selecting a catalog event clears a legacy guest-artist link to avoid two linked sources. Existing unedited guest-artist references are retained.

The public timeline uses the **schedule day's date and the entry's time/duration** to show live, upcoming or ended status in IST. Registration availability does not force a programme item to appear live. A complete date with a year is required for live timing; dates such as “December 19” are flagged in the admin planner until confirmed.

Linked, visible events open their catalog details. The registration action appears only while registration is available according to the event's current settings. Hidden or missing linked events do not get a public catalog link. Standalone activities remain visible as programme entries.

Deleting a schedule day removes its entries through the database foreign-key cascade. Deleting a catalog event sets related schedule `event_id` references to null, retaining the programme. Neither unlinking nor removing a schedule entry deletes the catalog event.

The shared presentation functions are in `src/utils/schedulePresentation.ts`. Planner normalization, payload validation and import matching are in `src/components/admin/schedule/scheduleEditor.ts`. See `docs/design/schedule-admin-workspace.md` for the workspace and live database audit.
