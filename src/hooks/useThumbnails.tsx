import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ImageFile, Invokes, Progress } from '../components/ui/AppProperties';

export function useThumbnails(
  imageList: Array<ImageFile>,
  thumbnails: Record<string, string>,
  setThumbnails: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Progress>({ completed: 0, total: 0 });
  const processedImageListKey = useRef<string | null>(null);
  const progressRef = useRef<Progress>({ completed: 0, total: 0 });
  const settleTimerRef = useRef<number | null>(null);
  const activeImagePathsRef = useRef<string[]>([]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const activeImagePaths = activeImagePathsRef.current;
    if (activeImagePaths.length === 0) {
      return;
    }

    const availableCount = activeImagePaths.reduce((count, path) => count + (thumbnails[path] ? 1 : 0), 0);

    setProgress((prev) => {
      const nextCompleted = Math.max(prev.completed ?? prev.current ?? 0, availableCount);
      if ((prev.completed ?? prev.current ?? 0) === nextCompleted) {
        return prev;
      }

      return {
        ...prev,
        completed: nextCompleted,
      };
    });

    if (activeImagePaths.length > 0 && availableCount >= activeImagePaths.length) {
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      setLoading(false);
    }
  }, [thumbnails]);

  useEffect(() => {
    const newKey =
      imageList && imageList.length > 0 ? JSON.stringify(imageList.map((img: ImageFile) => img.path).sort()) : '';

    if (newKey === processedImageListKey.current) {
      return;
    }

    processedImageListKey.current = newKey;

    if (!imageList || imageList.length === 0) {
      setThumbnails({});
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      setLoading(false);
      setProgress({ completed: 0, total: 0 });
      return;
    }

    const imagePaths = imageList.map((img: ImageFile) => img.path);
    activeImagePathsRef.current = imagePaths;
    const availableCount = imagePaths.reduce((count, path) => count + (thumbnails[path] ? 1 : 0), 0);

    setThumbnails((prevThumbnails: Record<string, string>) => {
      const newPathSet = new Set(imagePaths);
      const nextThumbnails = { ...prevThumbnails };
      let hasChanges = false;

      Object.keys(nextThumbnails).forEach((path) => {
        if (!newPathSet.has(path)) {
          delete nextThumbnails[path];
          hasChanges = true;
        }
      });

      return hasChanges || Object.keys(nextThumbnails).length !== imagePaths.length 
        ? nextThumbnails 
        : prevThumbnails;
    });

    let unlistenComplete: any;
    let unlistenProgress: any;

    const setupListenersAndInvoke = async () => {
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      setLoading(availableCount < imagePaths.length);
      setProgress({ completed: availableCount, total: imagePaths.length });

      if (availableCount >= imagePaths.length) {
        return;
      }

      unlistenProgress = await listen('thumbnail-progress', (event: any) => {
        const { completed, total } = event.payload;
        setProgress((prev) => ({
          completed: Math.max(completed, prev.completed ?? prev.current ?? 0),
          total,
        }));

        if (total > 0 && completed >= total) {
          if (settleTimerRef.current) {
            window.clearTimeout(settleTimerRef.current);
          }
          settleTimerRef.current = window.setTimeout(() => {
            setLoading(false);
            settleTimerRef.current = null;
          }, 450);
        }
      });

      unlistenComplete = await listen('thumbnail-generation-complete', () => {
        const latestProgress = progressRef.current;
        const completed = latestProgress.completed ?? latestProgress.current ?? 0;
        const total = latestProgress.total ?? 0;

        if (total === 0 || completed >= total) {
          if (settleTimerRef.current) {
            window.clearTimeout(settleTimerRef.current);
          }
          settleTimerRef.current = window.setTimeout(() => {
            setLoading(false);
            settleTimerRef.current = null;
          }, 450);
        }
      });

      try {
        await invoke(Invokes.GenerateThumbnailsProgressive, { paths: imagePaths });
      } catch (error) {
        console.error('Failed to invoke thumbnail generation:', error);
        setLoading(false);
      }
    };

    setupListenersAndInvoke();

    return () => {
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      if (unlistenComplete) {
        unlistenComplete();
      }
      if (unlistenProgress) {
        unlistenProgress();
      }
    };
  }, [imageList, setThumbnails]);

  return { loading, progress };
}
