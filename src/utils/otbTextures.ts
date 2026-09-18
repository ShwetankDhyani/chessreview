import * as THREE from "three";

export type OtbPbrMaps = {
  lightDiff: THREE.Texture;
  lightNor: THREE.Texture;
  lightRough: THREE.Texture;
  darkDiff: THREE.Texture;
  darkNor: THREE.Texture;
  darkRough: THREE.Texture;
};

function prep(tex: THREE.Texture, srgb: boolean, repeat = 2.4): THREE.Texture {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

let cache: Promise<OtbPbrMaps> | null = null;

/**
 * Load Poly Haven CC0 wood PBR maps from `/public/otb`
 * (white maple for light pieces/frame, rosewood for dark pieces).
 */
export function loadOtbTextures(): Promise<OtbPbrMaps> {
  if (cache) return cache;
  cache = (async () => {
    const loader = new THREE.TextureLoader();
    const load = (url: string) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });

    const [lightDiff, lightNor, lightRough, darkDiff, darkNor, darkRough] =
      await Promise.all([
        load("/otb/wood_light_diff.jpg"),
        load("/otb/wood_light_nor.jpg"),
        load("/otb/wood_light_rough.jpg"),
        load("/otb/wood_dark_diff.jpg"),
        load("/otb/wood_dark_nor.jpg"),
        load("/otb/wood_dark_rough.jpg"),
      ]);

    return {
      lightDiff: prep(lightDiff, true, 2.6),
      lightNor: prep(lightNor, false, 2.6),
      lightRough: prep(lightRough, false, 2.6),
      darkDiff: prep(darkDiff, true, 2.2),
      darkNor: prep(darkNor, false, 2.2),
      darkRough: prep(darkRough, false, 2.2),
    };
  })();
  return cache;
}
