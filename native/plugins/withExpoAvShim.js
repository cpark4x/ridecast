/**
 * Expo Config Plugin: withExpoAvShim
 *
 * expo-av@16.0.8 imports ExpoModulesCore/EXEventEmitter.h, but
 * expo-modules-core@55.x removed that header. This plugin injects
 * a compatibility shim into the Podfile post_install block so
 * EAS cloud builds (which regenerate ios/ via expo prebuild) get
 * the shim automatically.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withExpoAvShim(config) {
  return withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf-8");

      const shimCode = `
    # Shim: EXEventEmitter.h removed from ExpoModulesCore but expo-av still imports it
    shim_dir = File.join(installer.sandbox.root, 'Headers', 'Public', 'ExpoModulesCore')
    shim_path = File.join(shim_dir, 'EXEventEmitter.h')
    unless File.exist?(shim_path)
      FileUtils.mkdir_p(shim_dir)
      File.write(shim_path, "// Auto-generated shim\\n#import <Foundation/Foundation.h>\\n@protocol EXEventEmitter <NSObject>\\n- (void)startObserving;\\n- (void)stopObserving;\\n- (NSArray<NSString *> *)supportedEvents;\\n@end\\n")
    end`;

      // Insert shim before the closing 'end' of the post_install block
      podfile = podfile.replace(
        /(post_install\s+do\s+\|installer\|.*?)(^\s+end\s*$)/ms,
        `$1\n${shimCode}\n$2`
      );

      fs.writeFileSync(podfilePath, podfile);
      return modConfig;
    },
  ]);
}

module.exports = withExpoAvShim;