/**
 * Changement d'état d'un écran : une autre capture du même écran (même taille) apparaît en fondu court
 * par-dessus, dans le repère de la capture. Pour un résultat d'action (clic, sélection…), pas une
 * transition de scène.
 */
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { Capture } from '../lib/geometrie';

export function Etat({ capture, de, fondu = 6 }: { capture: Capture; de: number; fondu?: number }) {
  const frame = useCurrentFrame();
  if (frame < de) return null;
  return (
    <Img
      src={staticFile(capture.image)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: capture.largeur,
        height: capture.hauteur,
        maxWidth: 'none',
        opacity: interpolate(frame, [de, de + fondu], [0, 1], { extrapolateRight: 'clamp' }),
      }}
    />
  );
}

/**
 * Zones qui se remplissent : chaque zone de la capture `rempli` apparaît à son tour (fondu et léger
 * glissement), par-dessus l'écran vide. Pour des champs qui se remplissent tout seuls.
 */
export function Zones({ rempli, zones, fondu = 8 }: { rempli: Capture; zones: Array<{ cadre: { x: number; y: number; width: number; height: number }; de: number }>; fondu?: number }) {
  const frame = useCurrentFrame();
  return (
    <>
      {zones.map(({ cadre, de }, i) => {
        if (frame < de) return null;
        const t = interpolate(frame, [de, de + fondu], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{ position: 'absolute', left: cadre.x, top: cadre.y, width: cadre.width, height: cadre.height, overflow: 'hidden', opacity: t }}>
            <Img
              src={staticFile(rempli.image)}
              style={{ position: 'absolute', left: -cadre.x, top: -cadre.y + (1 - t) * 6, width: rempli.largeur, height: rempli.hauteur, maxWidth: 'none' }}
            />
          </div>
        );
      })}
    </>
  );
}
