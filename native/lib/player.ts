import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
} from "react-native-track-player";
import { saveLocalPlayback } from "./db";
import { savePlaybackState as saveServerPlayback } from "./api";

export async function setupPlayer(): Promise<boolean> {
  let isSetup = false;
  try {
    await TrackPlayer.getActiveTrack();
    isSetup = true;
  } catch {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      forwardJumpInterval: 15,
      backwardJumpInterval: 5,
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
    });
    await TrackPlayer.setRepeatMode(RepeatMode.Off);
    isSetup = true;
  }
  return isSetup;
}

// Playback service — required by RNTP, handles remote control events
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    TrackPlayer.skipToNext(),
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious(),
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) =>
    TrackPlayer.seekTo(event.position),
  );
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(position + event.interval);
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, position - event.interval));
  });
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    // Capture position + track BEFORE pausing — seekTo(0) would race against
    // usePlayer's 500ms polling and prevent completion from ever being detected.
    const [prog, track] = await Promise.all([
      TrackPlayer.getProgress(),
      TrackPlayer.getActiveTrack(),
    ]);
    await TrackPlayer.pause();

    // Save completion directly here — don't rely solely on usePlayer's polling
    // which can lose the race against position resets.
    if (track?.id) {
      const payload = {
        audioId:   track.id as string,
        position:  prog.position,
        speed:     1.0,
        completed: true,
      };
      void saveLocalPlayback(payload);
      saveServerPlayback(payload).catch(() => { /* fire and forget */ });
    }
  });
}

/**
 * Returns true when playback position is within 1 second of the track's end.
 * Used to determine when to mark an episode as "completed".
 */
export function isPlaybackCompleted(position: number, duration: number): boolean {
  return duration > 0 && position >= duration - 1;
}
