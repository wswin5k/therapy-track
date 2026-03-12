const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withNotifeeResolution(config) {
    return withProjectBuildGradle(config, async (config) => {
        const buildGradle = config.modResults.contents;
        const addition = `
allprojects {
    repositories {
        exclusiveContent {
            filter {
                includeGroup "app.notifee"
            }
            forRepository {
                maven {
                    url "$rootDir/../node_modules/@notifee/react-native/android/libs"
                }
            }
        }
    }
}
`;
        if (!buildGradle.includes('includeGroup "app.notifee"')) {
            config.modResults.contents = buildGradle + addition;
        }
        return config;
    });
};
