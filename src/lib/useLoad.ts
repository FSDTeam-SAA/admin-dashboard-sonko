import { useCallback, useEffect, useState } from "react";

/** Loads data for a page, with a reload after each action. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    load()
      .then((result) => {
        if (!live) return;
        setData(result);
        setError(null);
      })
      .catch((caught) => {
        if (live) setError(caught instanceof Error ? caught.message : "Could not load this page.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload };
}
