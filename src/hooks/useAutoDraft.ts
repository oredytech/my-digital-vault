import { useEffect, useRef } from "react";

export function useAutoDraft<T>(
  data: T,
  storageKey: string,
  delay: number = 15000 // 15 seconds default
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    const dataString = JSON.stringify(data);
    
    // Don't save if data hasn't changed
    if (dataString === lastSavedRef.current) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to save
    timeoutRef.current = setTimeout(() => {
      localStorage.setItem(storageKey, dataString);
      lastSavedRef.current = dataString;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, storageKey, delay]);

  const loadDraft = (): T | null => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  const clearDraft = () => {
    localStorage.removeItem(storageKey);
    lastSavedRef.current = "";
  };

  return { loadDraft, clearDraft };
}
