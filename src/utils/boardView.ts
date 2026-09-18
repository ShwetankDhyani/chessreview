import {
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
} from "./safeStorage";

export type BoardView = "2d" | "otb3d";

const STORAGE_KEY = "cr_board_view";
const CHANGE_EVENT = "cr-board-view-change";

export function readBoardView(): BoardView {
  const raw = safeGetItem(STORAGE_KEY);
  if (raw === "otb3d" || raw === "2d") return raw;
  return "2d";
}

export function writeBoardView(view: BoardView): void {
  safeSetItem(STORAGE_KEY, view);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, { detail: view } as CustomEventInit)
    );
  }
}

export function toggleBoardView(current: BoardView): BoardView {
  const next: BoardView = current === "2d" ? "otb3d" : "2d";
  writeBoardView(next);
  return next;
}

export function clearBoardViewPreference(): void {
  safeRemoveItem(STORAGE_KEY);
}

export const BOARD_VIEW_CHANGE_EVENT = CHANGE_EVENT;
