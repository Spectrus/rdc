# RDC Real Home Lab

Standalone demo published under imovel-lab/. It starts at the Entrance Way camera authored by Isaiah Sweeney. Drag to look and use WASD, arrow keys, or the touch buttons to move.

The full scan streams from its existing public SuperSplat CDN: https://d28zzqy0iyovbz.cloudfront.net/3f89bbd3/v1/lod-meta.json . Its scene metadata is byte-identical to the uploaded ZIP. This deployment depends on that external host; it does not duplicate the 513 MB scan in GitHub. Attribution and CC BY 4.0 terms are in SPLAT-LICENSE.txt and on screen.

Limitations: source capture has no ceilings; a conservative outer movement boundary prevents leaving the scene, but internal walls have no collision; doors and furniture are not interactive.

To rebuild: cd source, npm ci, npm run build. Copy the generated dist contents to imovel-lab/, preserving this README, source folder, and SPLAT-LICENSE.txt.
