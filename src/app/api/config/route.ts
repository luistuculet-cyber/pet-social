import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Configuración por defecto de AVO
const defaultConfig = {
  coverageRadiusKm: 15,
  maxEmergencyResponseMins: 25,
  autoAssignNearestVet: true,
  requireTriageBeforeDispatch: true,
  triageMildAction: 'video',
  triageSevereAction: 'domicilio',
  videoConsultationPrice: 18000,
  homeEmergencyPrice: 38000,
  cfgPriceVideo: 18000,
  cfgPriceHome: 38000,
  nightSurchargePercent: 20,
  holidaySurchargePercent: 35,
  paywayEnabled: true,
  modoEnabled: true,
  mercadopagoEnabled: true,
};

interface SystemConfigDelegate {
  findMany(): Promise<Array<{ configKey: string; configValue: string }>>;
  upsert(args: unknown): Promise<unknown>;
}

export async function GET() {
  try {
    // Intentar leer de la base de datos si existe la tabla SystemConfig
    if (process.env.DATABASE_URL) {
      try {
        const delegate = (prisma as unknown as Record<string, SystemConfigDelegate>)["systemConfig"];
        if (delegate) {
          const dbConfigs = await delegate.findMany();
          if (dbConfigs && dbConfigs.length > 0) {
            const configObj: Record<string, unknown> = { ...defaultConfig };
            dbConfigs.forEach((item: { configKey: string; configValue: string }) => {
              try {
                configObj[item.configKey] = JSON.parse(item.configValue);
              } catch (e) {
                console.error('Error parseando configValue para clave ' + item.configKey + ':', e);
                configObj[item.configKey] = item.configValue;
              }
            });
            const videoPrice = Number(configObj.cfgPriceVideo ?? configObj.videoConsultationPrice ?? 18000);
            const homePrice = Number(configObj.cfgPriceHome ?? configObj.homeEmergencyPrice ?? 38000);
            return NextResponse.json({
              ...configObj,
              cfgPriceVideo: videoPrice,
              videoConsultationPrice: videoPrice,
              cfgPriceHome: homePrice,
              homeEmergencyPrice: homePrice,
            });
          }
        }
      } catch (e) {
        console.error('Error consultando SystemConfig en BD (puede que no exista la tabla):', e);
      }
    }
    return NextResponse.json(defaultConfig);
  } catch (error) {
    console.error('GET /api/config Error:', error);
    return NextResponse.json(defaultConfig);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload: Record<string, unknown> = { ...body };
    if (body.cfgPriceVideo !== undefined || body.videoConsultationPrice !== undefined) {
      const vPrice = Number(body.cfgPriceVideo ?? body.videoConsultationPrice);
      payload.cfgPriceVideo = vPrice;
      payload.videoConsultationPrice = vPrice;
    }
    if (body.cfgPriceHome !== undefined || body.homeEmergencyPrice !== undefined) {
      const hPrice = Number(body.cfgPriceHome ?? body.homeEmergencyPrice);
      payload.cfgPriceHome = hPrice;
      payload.homeEmergencyPrice = hPrice;
    }

    if (process.env.DATABASE_URL) {
      try {
        const delegate = (prisma as unknown as Record<string, SystemConfigDelegate>)["systemConfig"];
        if (delegate) {
          const keys = Object.keys(payload);
          for (const key of keys) {
            const valStr = JSON.stringify(payload[key]);
            await delegate.upsert({
              where: { configKey: key },
              update: { configValue: valStr },
              create: { configKey: key, configValue: valStr },
            });
          }
        }
      } catch (err) {
        console.warn('Could not save to database, returning saved state:', err);
      }
    }

    return NextResponse.json({ success: true, config: payload });
  } catch (error) {
    console.error('POST /api/config Error:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
