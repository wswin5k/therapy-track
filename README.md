<p align="center">
<img src="assets/icon.png" alt="App icon — a tablet on a blue screen with checkmark" width="200"/>
</p>

# Therapy Track – simple pills tracker and reminder

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
