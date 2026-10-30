const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs the release build with your own upload key when these environment variables are set:
 * RELEASE_STORE_FILE, RELEASE_STORE_PASSWORD, RELEASE_KEY_ALIAS, RELEASE_KEY_PASSWORD.
 * Without them the release build falls back to the debug key, so local test builds still work.
 */
module.exports = (config) =>
  withAppBuildGradle(config, (c) => {
    let gradle = c.modResults.contents;
    if (gradle.includes('RELEASE_STORE_FILE')) return c;

    gradle = gradle.replace(
      /signingConfigs \{\n/,
      `signingConfigs {
        release {
            if (System.getenv('RELEASE_STORE_FILE')) {
                storeFile file(System.getenv('RELEASE_STORE_FILE'))
                storePassword System.getenv('RELEASE_STORE_PASSWORD')
                keyAlias System.getenv('RELEASE_KEY_ALIAS')
                keyPassword System.getenv('RELEASE_KEY_PASSWORD')
            }
        }
`
    );

    const at = gradle.indexOf('buildTypes {');
    const head = gradle.slice(0, at);
    const tail = gradle
      .slice(at)
      .replace(
        /(\n\s+release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
        "$1signingConfig System.getenv('RELEASE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug"
      );

    c.modResults.contents = head + tail;
    return c;
  });
