import { useEffect, useState } from "react";
import { loadOpeningEco, type OpeningEcoEntry } from "../utils/openingEcoLookup";

/** Load the lichess ECO opening database once (lazy chunk). */
export function useOpeningEco(): OpeningEcoEntry[] | null {
  const [entries, setEntries] = useState<OpeningEcoEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadOpeningEco()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return entries;
}
