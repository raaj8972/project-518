# Participant email setup

The code supports configurable SMTP and Resend. Server secrets stay in the hosting environment. Open **Registrations & auditions → More → Report & registration settings → Check email providers** to check authentication and domain readiness without sending email.

## Current checks (26 November 2026)

- The locally configured `smtp.gmail.com:465` server rejected authentication with SMTP 535 / EAUTH. Replace `SMTP_USER` / `SMTP_PASS` with the correct mailbox credentials or app password for the configured host. The code now respects `SMTP_HOST`, `SMTP_PORT` and `SMTP_SECURE`; it no longer forces Hostinger.
- The Resend API key is accepted, but the `ricorrenza.fun` sending domain reports `failed`. Its DNS currently returns NXDOMAIN, and all three provider records below are absent. Restore an active DNS zone for the domain, then publish these records and verify it in Resend.
- The configured sender is a Gmail address. Set `RESEND_FROM_EMAIL` to a mailbox on the verified domain (for example `updates@ricorrenza.fun`). The application no longer silently switches to Resend’s testing sender.
- `.env.netlify` contains no usable SMTP credentials and the Netlify CLI is not linked to a site. These findings verify local configuration and the connected provider account; they do not verify the deployed hosting environment.

## Server environment

```dotenv
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
EMAIL_SENDER=
RESEND_API_KEY=
RESEND_FROM_EMAIL=updates@ricorrenza.fun
```

Use the SMTP host for your actual mailbox. Port 587 with `SMTP_SECURE=false` uses required STARTTLS. For Gmail, use `smtp.gmail.com` and the account’s app password when required. `EMAIL_SENDER` must be an address the SMTP mailbox is allowed to send as. `RESEND_FROM_EMAIL` is separate so the two providers can use different approved sender addresses.

## Required Resend DNS records

These records come from the connected Resend domain configuration. They are public DNS values, not API keys. Hosts are relative to the `ricorrenza.fun` zone.

| Type | Host | Value | Priority |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD4qHVYCsMWvsyyH6jRWZ61HaY49mg+BXwTPaATEc016/rVSyuEiSPSpm7e+7DlBZCwWHuLAqtuYKtFrrYP31uFLjfuuVnkR2pcVvyzS1jUp3WSk/OVO+KukO2lix+A8iz1OsUyXsjDa5hNITws+uFXFzTI+p9wcDwXokhs62YXkwIDAQAB` | — |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |

After the DNS/provider account is corrected, rerun **Check email providers**. SMTP verification checks connection and login; Resend verification checks API access and the sender domain. Inbox acceptance can only be confirmed with an explicitly requested test delivery.
