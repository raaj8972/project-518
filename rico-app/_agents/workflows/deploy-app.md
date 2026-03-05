---
description: how to build and deploy the mobile app using EAS (Direct Download / No Store)
---

### 🚀 Direct App Distribution (Fee-Free)
If you want to avoid paying App Store/Google Play store fees, you can distribute an **Android APK** directly via a QR code or download link.

> [!IMPORTANT]
> **iOS Limitation**: Apple requires a paid developer account ($99/year) even for private distribution. Direct download (sideloading) for iOS is extremely limited and not recommended for public use.

---

### Step 1: Install EAS CLI
Run this to ensure the build tools are available (it's best to use `npx` to avoid "command not found" errors):
```bash
# No installation required if you use npx in the next steps
```

### Step 2: Build for Android (Direct APK)
This command will generate a link and a **QR Code** that users can scan to download the app directly to their Android phone.
```bash
cd rico-app && npx eas-cli build --platform android --profile preview
```
1. Scan the QR code shown in your terminal after the build finishes.
2. Download and install the `.apk` file.
3. (Optional) Copy the URL provided by EAS and share it via WhatsApp or include it on your website as a link/QR code.

### Step 3: Distribution Options
- **QR Code**: Generate a QR code for the download URL using any online generator.
- **Website**: Place a button on your website saying "Download for Android" linked to the EAS output file.
- **WhatsApp**: Send the download link directly to your users.

### Troubleshooting "Command Not Found"
If you get a `zsh: command not found: eas` error, ALWAYS prefix your commands with `npx eas-cli`.
Example: `npx eas-cli login`, `npx eas-cli build`, etc.
