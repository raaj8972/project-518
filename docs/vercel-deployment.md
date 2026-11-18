# Vercel Hobby deployment

The frequent cron schedules previously rejected deployment before the build. Hobby cron expressions must run at most once per day: [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Current `vercel.json` schedules (UTC):

| Endpoint | Schedule | India time |
| --- | --- | --- |
| `/api/r2-garbage-collector` | 03:00 daily | 08:30 |
| `/api/heartbeat-schedule` | 00:00 daily | 05:30 |
| `/api/broadcast-schedule` | 06:00 daily | 11:30 |

Vercel Hobby may invoke within the scheduled hour. The heartbeat no longer runs every 15 minutes on Vercel, and the broadcast scheduler no longer runs every minute. Netlify's separately configured schedules are unchanged. No scheduled endpoint was manually invoked during deployment verification.

Deploy through `origin/main` (`raaj8972/project-518`). GitHub reports separate Vercel statuses for `project-518-zhwu` and `project-518`. The ignored local `.vercel/project.json` belongs to a different Vercel account/project; it must not be used for a direct production deploy of this repository.

Regression coverage: `tests/vercel-deploy-config.test.ts` rejects sub-daily cron expressions. Production frontend build, TypeScript and targeted website/intro tests were verified before push.
