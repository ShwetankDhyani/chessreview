import type { VercelRequest } from "@vercel/node";

export interface GeoFromRequest {
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  clientIp: string | null;
}

function header(req: VercelRequest, name: string): string | null {
  const v = req.headers[name];
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function parseCoord(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/** Vercel sets geo from the visitor IP — no browser location permission. */
export function geoFromRequest(req: VercelRequest): GeoFromRequest {
  const forwarded = header(req, "x-forwarded-for");
  const clientIp = forwarded?.split(",")[0]?.trim() ?? header(req, "x-real-ip");

  return {
    countryCode: header(req, "x-vercel-ip-country"),
    region: header(req, "x-vercel-ip-country-region"),
    city: header(req, "x-vercel-ip-city"),
    latitude: parseCoord(header(req, "x-vercel-ip-latitude")),
    longitude: parseCoord(header(req, "x-vercel-ip-longitude")),
    clientIp,
  };
}
