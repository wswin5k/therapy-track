<p align="center">
<img src="assets/icon.png" alt="App icon — a tablet on a blue screen with checkmark" width="200"/>
</p>

# Therapy Track – medicine and assessments tracker

* Track your medication use with recurring schedules and one-time entries.
* Receive notifications when it is time to take your medication or complete an assessment.
* View your usage history and export it to a CSV file.


<p align="center">
<img src="fastlane/metadata/android/en-US/images/phoneScreenshots/1.png" alt="Home screenshot" width="200"/>
<img src="fastlane/metadata/android/en-US/images/phoneScreenshots/2.png" alt="Home screenshot" width="200"/>
<img src="fastlane/metadata/android/en-US/images/phoneScreenshots/3.png" alt="Home screenshot" width="200"/>
</p>

## Running the development build

- Install the dependencies:

  ```sh
  npm install
  ```

- Start the development server:

  ```sh
  npm start
  ```

- Build and run iOS and Android development builds:

  ```sh
  npm run ios
  # or
  npm run android
  ```

## Release build for android

Install dependencies

```sh
npm install
```

### Install with adb

```sh
npx expo run:android --variant release
```

### Build apk file

- Prebuild the app

```sh
npx expo prebuild
```

- Build apk

```sh
cd android
./gradlew assembleRelease
```

The apk will be in `app/build/outputs/apk/release/app-release.apk`
