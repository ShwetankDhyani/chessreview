import { useEffect, useState } from "react";
import {
  BOARD_VIEW_CHANGE_EVENT,
  readBoardView,
  writeBoardView,
  type BoardView,
} from "../utils/boardView";

/** Shared 2D / OTB-3D preference for review boards. */
export function useBoardView(): [BoardView, (view: BoardView) => void] {
  const [view, setView] = useState<BoardView>(() => readBoardView());

  useEffect(() => {
    const sync = () => setView(readBoardView());
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<BoardView>).detail;
      if (detail === "2d" || detail === "otb3d") setView(detail);
      else sync();
    };
    window.addEventListener("storage", sync);
    window.addEventListener(BOARD_VIEW_CHANGE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(BOARD_VIEW_CHANGE_EVENT, onCustom);
    };
  }, []);

  const set = (next: BoardView) => {
    writeBoardView(next);
    setView(next);
  };

  return [view, set];
}
