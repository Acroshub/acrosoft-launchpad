import { createContext, useContext, useState, useCallback } from "react";

type TusRef = { abort: () => void };

export type VideoUploadEntry = {
  progress: number;
  uploading: boolean;
  error: boolean;
  videoId: string;
  ref: TusRef;
};

type Ctx = {
  get: (id: string) => VideoUploadEntry | null;
  register: (id: string, videoId: string, ref: TusRef) => void;
  setProgress: (id: string, p: number) => void;
  complete: (id: string) => void;
  fail: (id: string) => void;
  cancel: (id: string) => void;
  clear: (id: string) => void;
};

const VideoUploadContext = createContext<Ctx | null>(null);

export function VideoUploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<Record<string, VideoUploadEntry>>({});

  const get = useCallback(
    (id: string): VideoUploadEntry | null => uploads[id] ?? null,
    [uploads],
  );

  const register = useCallback((id: string, videoId: string, ref: TusRef) => {
    setUploads(prev => ({ ...prev, [id]: { progress: 0, uploading: true, error: false, videoId, ref } }));
  }, []);

  const setProgress = useCallback((id: string, p: number) => {
    setUploads(prev => prev[id] ? { ...prev, [id]: { ...prev[id], progress: p } } : prev);
  }, []);

  const complete = useCallback((id: string) => {
    setUploads(prev => prev[id] ? { ...prev, [id]: { ...prev[id], uploading: false, error: false, progress: 100 } } : prev);
  }, []);

  const fail = useCallback((id: string) => {
    setUploads(prev => prev[id] ? { ...prev, [id]: { ...prev[id], uploading: false, error: true } } : prev);
  }, []);

  const cancel = useCallback((id: string) => {
    setUploads(prev => {
      const entry = prev[id];
      if (!entry) return prev;
      try { entry.ref.abort(); } catch {}
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clear = useCallback((id: string) => {
    setUploads(prev => { const { [id]: _, ...rest } = prev; return rest; });
  }, []);

  return (
    <VideoUploadContext.Provider value={{ get, register, setProgress, complete, fail, cancel, clear }}>
      {children}
    </VideoUploadContext.Provider>
  );
}

export function useVideoUpload(): Ctx {
  const ctx = useContext(VideoUploadContext);
  if (!ctx) throw new Error("useVideoUpload must be used within VideoUploadProvider");
  return ctx;
}
