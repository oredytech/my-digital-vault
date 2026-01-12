import { useEffect, useRef, useCallback } from "react";

export function useAutoDraft<T>(
  data: T,
  storageKey: string,
  delay: number = 15000 // 15 seconds default
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Safely stringify data
    let dataString: string;
    try {
      dataString = JSON.stringify(data);
    } catch (e) {
      console.warn("useAutoDraft: Failed to stringify data", e);
      return;
    }
    
    // Don't save if data hasn't changed or is empty/null
    if (!dataString || dataString === lastSavedRef.current || dataString === "null" || dataString === "undefined") {
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set new timeout to save
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        try {
          localStorage.setItem(storageKey, dataString);
          lastSavedRef.current = dataString;
        } catch (e) {
          console.warn("useAutoDraft: Failed to save to localStorage", e);
        }
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [data, storageKey, delay]);

  const loadDraft = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && saved !== "null" && saved !== "undefined") {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("useAutoDraft: Failed to load draft", e);
    }
    return null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      lastSavedRef.current = "";
    } catch (e) {
      console.warn("useAutoDraft: Failed to clear draft", e);
    }
  }, [storageKey]);

  return { loadDraft, clearDraft };
}
