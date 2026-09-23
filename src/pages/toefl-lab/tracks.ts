import { getAudioUrl } from "./lab-client";
import { setDone } from "./progress";
import type { Track } from "./player";
import type { AudioItem } from "./types";

/**
 * Track del audio modelo de un ítem. Al terminar de sonar completo lo marca como
 * completado (checklist automático); `then` es un paso extra opcional (simulacro).
 */
export function modelTrack(item: AudioItem, then?: () => void): Track {
  return {
    key: `audio:${item.id}`,
    title: item.label,
    subtitle: item.ref,
    durationHint: item.duration,
    getUrl: () => getAudioUrl(item.id),
    onEnded: () => {
      setDone(item.id, true);
      then?.();
    },
  };
}
