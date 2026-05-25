dev-generate-keystore:
	docker compose run --rm expo keytool -genkey -v \
	-keystore android/app/debug.keystore \
	-storepass android \
	-alias androiddebugkey \
	-keypass android \
	-keyalg RSA \
	-keysize 2048 \
	-validity 10000 \
	-dname "CN=Android Debug,O=Android,C=US"

dev-build:
	docker compose run --rm expo bash -c "npx expo prebuild --platform android && cd android && ./gradlew assembleDebug"

dev-install:
	adb install android/app/build/outputs/apk/debug/app-debug.apk

dev-port-forward:
	adb reverse tcp:8081 tcp:8081

release-build:
	docker compose run --rm expo bash -c "npx expo prebuild --platform android && cd android && ./gradlew assembleRelease"

release-install:
	adb install android/app/build/outputs/apk/release/app-release.apk

npm-update:
	docker compose run --rm expo npm update --save
