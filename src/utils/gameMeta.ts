export interface GameMeta {
  white: string;
  black: string;
  whiteRating: number | null;
  blackRating: number | null;
  result: "1-0" | "0-1" | "1/2-1/2" | "*" | null;
  termination: string | null;
}

export function extractGameMeta(pgn: string): GameMeta {
  const tag = (t: string) => pgn.match(new RegExp(`\\[${t} "([^"]+)"\\]`))?.[1] ?? null;
  const wr = tag("WhiteElo");
  const br = tag("BlackElo");
  const res = tag("Result") as GameMeta["result"];
  return {
    white: tag("White") ?? "White",
    black: tag("Black") ?? "Black",
    whiteRating: wr ? parseInt(wr, 10) : null,
    blackRating: br ? parseInt(br, 10) : null,
    result: res ?? null,
    termination: tag("Termination"),
  };
}

export function extractClocks(pgn: string): (number | null)[] {
  const re = /\{\s*\[%clk (\d+:)??(\d+):(\d+(?:\.\d+)?)\]\s*\}/g;
  const clocks: (number | null)[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(pgn)) !== null) {
    const h = m[1] ? parseInt(m[1], 10) : 0;
    const min = parseInt(m[2], 10);
    const sec = parseFloat(m[3]);
    clocks.push(h * 3600 + min * 60 + sec);
  }
  return clocks;
}
