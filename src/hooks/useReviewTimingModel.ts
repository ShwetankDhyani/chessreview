import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendLocalTimingSample,
  fetchServerTimingModel,
  localTimingModel,
  mergeTimingModels,
  type LocalTimingSample,
  type ReviewTimingModel,
} from "../utils/reviewTiming";

/** Keeps review timing model fresh from server history + local samples. */
export function useReviewTimingModel() {
  const [timingModel, setTimingModel] = useState<ReviewTimingModel | null>(null);
  const serverModelRef = useRef<ReviewTimingModel | null>(null);

  const applyMerged = useCallback(() => {
    setTimingModel(
      mergeTimingModels(serverModelRef.current, localTimingModel())
    );
  }, []);

  const refresh = useCallback(async () => {
    const server = await fetchServerTimingModel();
    serverModelRef.current = server;
    setTimingModel(mergeTimingModels(server, localTimingModel()));
  }, []);

  useEffect(() => {
    void refresh();
    const onLogged = () => {
      void refresh();
    };
    window.addEventListener("cr_review_logged", onLogged);
    return () => window.removeEventListener("cr_review_logged", onLogged);
  }, [refresh]);

  const noteCompletedReview = useCallback(
    (sample: Omit<LocalTimingSample, "recordedAt">) => {
      appendLocalTimingSample({ ...sample, recordedAt: Date.now() });
      applyMerged();
    },
    [applyMerged]
  );

  return { timingModel, noteCompletedReview, refresh };
}
