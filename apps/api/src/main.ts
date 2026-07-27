import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: libera localhost em dev e qualquer subdomínio *.uniteon.app (multi-tenant).
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const ok =
        origins.includes(origin) || /\.uniteon\.app$/.test(new URL(origin).hostname);
      cb(ok ? null : new Error('CORS blocked'), ok);
    },
    credentials: true,
  });

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[uniteon-api] listening on :${port}`);
}

void bootstrap();
