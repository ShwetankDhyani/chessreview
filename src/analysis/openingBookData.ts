import { Chess } from "chess.js";

/** Common opening move sequences — positions marked as book through early middlegame. */
const OPENING_SAN_LINES: string[][] = [
  ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4"],
  ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
  ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4"],
  ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4"],
  ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "Nf6"],
  ["e4", "e6", "d4", "d5", "Nc3"],
  ["e4", "e6", "d4", "d5", "exd5", "exd5"],
  ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4"],
  ["e4", "d5", "exd5", "Qxd5", "Nc3"],
  ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5"],
  ["d4", "d5", "c4", "c6", "Nc3", "Nf6", "e3"],
  ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"],
  ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6"],
  ["d4", "f5", "c4", "Nf6", "g3", "e6", "Bg2"],
  ["Nf3", "d5", "d4", "Nf6", "c4", "e6"],
  ["c4", "e5", "Nc3", "Nf6", "g3"],
  ["c4", "Nf6", "Nc3", "e6", "e4"],
  ["g3", "d5", "Bg2", "Nf6", "c4"],
  ["b3", "e5", "Bb2", "Nc6", "e3"],
  ["e4", "e5", "Nf3", "Nf6", "d3"],
];

function addLine(book: Set<string>, moves: string[]) {
  const chess = new Chess();
  book.add(chess.fen());
  for (const san of moves) {
    try {
      const result = chess.move(san);
      if (!result) break;
      book.add(chess.fen());
    } catch {
      break;
    }
  }
}

let cached: ReadonlySet<string> | null = null;

export function getOpeningBook(): ReadonlySet<string> {
  if (cached) return cached;
  const book = new Set<string>();
  for (const line of OPENING_SAN_LINES) addLine(book, line);
  cached = book;
  return book;
}
