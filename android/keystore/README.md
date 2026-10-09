# Signing key for the downloadable APK

`sideload-debug.keystore` signs the debug APK that CI attaches to GitHub Releases. Every release
uses the same key, so a new version installs over the old one and keeps the phone's data
(Android refuses an update signed with a different key: "App not installed").

It's a debug key with the standard debug password (`android`, alias `androiddebugkey`) — fine for
sideloading, not for Google Play. CI uses the `ANDROID_KEYSTORE_BASE64` repository secret instead
when it's set (base64 of your own keystore, with the same alias and passwords).
