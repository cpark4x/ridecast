/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * CarPlay integration module.
 *
 * Uses @g4rb4g3/react-native-carplay when available.
 * Falls back to a no-op stub if the native module isn't linked
 * (e.g., Expo Go, Jest, CI builds without Xcode).
 *
 * We use require() instead of import() throughout so that:
 *   a) jest.mock / moduleNameMapper can intercept all resolutions reliably
 *   b) the Expo Babel transform doesn't emit `yield import()` which trips
 *      Jest 30's "outside scope" guard on __ExpoImportMetaRegistry.
 *
 * CarPlay templates:
 *   - Now Playing  – automatic via RNTP media session
 *   - Library      – CPListTemplate of the 20 most-recent ready episodes
 */

let carplayAvailable = false;

export async function initializeCarPlay(): Promise<void> {
  try {
    const { CarPlay } = require("@g4rb4g3/react-native-carplay") as {
      CarPlay: {
        emitter: { addListener: (event: string, handler: () => void) => void };
        setRootTemplate: (t: unknown) => void;
      };
    };

    CarPlay.emitter.addListener("didConnect", () => {
      console.log("[CarPlay] Connected");
      carplayAvailable = true;
      void setupCarPlayTemplates();
    });

    CarPlay.emitter.addListener("didDisconnect", () => {
      console.log("[CarPlay] Disconnected");
      carplayAvailable = false;
    });
  } catch {
    console.log(
      "[CarPlay] Native module not available — running without CarPlay",
    );
  }
}

async function setupCarPlayTemplates(): Promise<void> {
  try {
    const { CarPlay, CPListTemplate, CPListItem } = require(
      "@g4rb4g3/react-native-carplay",
    ) as {
      CarPlay: { setRootTemplate: (t: unknown) => void };
      CPListTemplate: new (cfg: {
        sections: { header: string; items: unknown[] }[];
        title: string;
      }) => unknown;
      CPListItem: new (cfg: {
        text: string;
        detailText?: string;
        onPress: () => Promise<void>;
      }) => unknown;
    };

    const db = require("./db") as typeof import("./db");
    const { libraryItemToPlayable } = require("./libraryHelpers") as typeof import("./libraryHelpers");

    const episodes = await db.getAllEpisodes();

    const libraryItems = episodes
      .slice(0, 20)
      .filter((ep) => ep.versions.some((v) => v.status === "ready"))
      .map((ep) => {
        const version = ep.versions.find((v) => v.status === "ready");
        return new CPListItem({
          text: ep.title,
          detailText: ep.author ?? undefined,
          onPress: async () => {
            if (!version?.audioId) return;
            const playable = libraryItemToPlayable(ep);
            if (!playable) return;

            const TrackPlayer = require("react-native-track-player")
              .default as typeof import("react-native-track-player").default;
            const { resolveAudioUrl } = require("./downloads") as typeof import("./downloads");

            const url = await resolveAudioUrl(
              version.audioId,
              version.audioUrl ?? "",
            );
            await TrackPlayer.reset();
            await TrackPlayer.add({
              id: playable.id,
              url,
              title: playable.title,
              artist: playable.author ?? "Ridecast",
              duration: playable.duration,
            });
            await TrackPlayer.play();
          },
        });
      });

    const libraryTemplate = new CPListTemplate({
      sections: [{ header: "Library", items: libraryItems }],
      title: "Ridecast",
    });

    CarPlay.setRootTemplate(libraryTemplate);
  } catch (err) {
    console.warn("[CarPlay] Failed to set up templates:", err);
  }
}

export function isCarPlayAvailable(): boolean {
  return carplayAvailable;
}
