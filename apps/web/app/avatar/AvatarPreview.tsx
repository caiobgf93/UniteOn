'use client';

import { useEffect, useRef } from 'react';
import type { AvatarConfig } from '@uniteon/shared';

/**
 * Canvas pequeno com o avatar parado (idle, olhando pra baixo) — usado como
 * preview ao vivo na tela de criação/edição (Passo 5). Reaproveita o mesmo
 * compositor (`AvatarSprite`) usado no `OfficeCanvas`, só que sem mundo/mapa.
 */
export function AvatarPreview({ config, baseUrl = '/assets/' }: { config: AvatarConfig; baseUrl?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let cleanup = () => {};

    (async () => {
      const PIXI = await import('pixi.js');
      const { AvatarSprite } = await import('@uniteon/game');
      if (destroyed || !hostRef.current) return;

      const app = new PIXI.Application();
      await app.init({ width: 220, height: 260, backgroundAlpha: 0, antialias: false });
      if (destroyed) {
        app.destroy(true);
        return;
      }
      app.stage.eventMode = 'none';
      hostRef.current.appendChild(app.canvas);

      const avatar = await AvatarSprite.create(config, baseUrl);
      if (destroyed) {
        avatar.destroy();
        app.destroy(true);
        return;
      }
      avatar.view.x = app.screen.width / 2;
      avatar.view.y = app.screen.height - 40;
      avatar.view.scale.set(2.4);
      app.stage.addChild(avatar.view);

      const tick = () => avatar.update(app.ticker.deltaMS);
      app.ticker.add(tick);

      cleanup = () => {
        app.ticker.remove(tick);
        avatar.destroy();
        app.destroy(true);
      };
    })();

    return () => {
      destroyed = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config), baseUrl]);

  return <div ref={hostRef} style={{ width: 220, height: 260 }} />;
}
