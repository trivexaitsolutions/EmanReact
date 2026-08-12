eas.json is important to build apk aur testing apk
for testing apk paste content from "eas testing.json" to eas.json
for build purpose paste content from "eas buildapk.json" to eas.json
$env:EAS_NO_VCS="1"  
npx expo start --dev-client -c
eas build -p android --profile preview
