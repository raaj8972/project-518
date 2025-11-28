# Browser Extension Error Troubleshooting

## Error Message
```
Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, 
but the message channel closed before a response was received
```

## This is NOT Your Code!
This error is almost always from a **browser extension**, not your website code.

## Quick Test
1. Open your site in **Incognito mode** (Cmd+Shift+N on Mac, Ctrl+Shift+N on Windows)
2. If error disappears = It's a browser extension
3. If error persists = Then check your code

## How to Find Which Extension
1. In Console, click the error location (right side)
2. Look for `chrome-extension://` in the URL
3. Or go to `chrome://extensions/` and disable them one by one

## Common Extensions That Cause This
- Grammarly
- LastPass / Password Managers
- React DevTools
- Redux DevTools
- Ad Blockers
- Translation Extensions
- Dark Mode Extensions

## Solution
**Option 1:** Ignore it (it's not affecting your site)

**Option 2:** Disable the problematic extension

**Option 3:** Filter it out in Console:
- Click "Filter" icon in DevTools Console
- Add: `-chrome-extension://`
- This hides extension errors

## If It's Actually Your Code
Check if you're using:
- `chrome.runtime.sendMessage()` 
- `chrome.runtime.onMessage.addListener()`

If not, **it's definitely from an extension**.
