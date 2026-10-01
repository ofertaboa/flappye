/** Atualizado automaticamente — api/build-version.php */
export const ASSET_VERSION = '1784820202';

export function getAssetVersion() {
  if (typeof window !== 'undefined' && window.__FLAPPY_BUILD) {
    return String(window.__FLAPPY_BUILD);
  }
  return ASSET_VERSION;
}
