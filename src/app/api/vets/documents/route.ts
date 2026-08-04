import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptFile, decryptFile } from '@/lib/crypto';
import { getSessionFromCookies } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  try {
    const session = getSessionFromCookies(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'No autorizado para subir documentos' }, { status: 401 });
    }
    const formData = await request.formData();
    const userId = formData.get('userId') as string;

    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    const docTypes = ['dni', 'title', 'license', 'insurance'];
    const createdDocs = [];

    const uploadsDir = process.env.UPLOADS_DIR || './uploads';
    const userDir = path.join(uploadsDir, 'vets', userId);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    for (const docType of docTypes) {
      const file = formData.get(docType) as File | null;
      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          continue;
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { encrypted, iv, authTag } = encryptFile(buffer);
        const safeFileName = `${docType}_${Date.now()}.enc`;
        const filePath = path.join(userDir, safeFileName);

        fs.writeFileSync(filePath, encrypted);
        const combinedIv = `${iv}:${authTag}`;

        try {
          const doc = await prisma.vetDocument.create({
            data: {
              userId,
              docType,
              fileName: file.name || `${docType}.pdf`,
              filePath,
              fileSize: file.size,
              mimeType: file.type || 'application/octet-stream',
              encryptionIV: combinedIv,
            },
          });
          createdDocs.push(doc);
        } catch (dbError) {
          console.warn(`Fallback: No se pudo guardar ${docType} en BD, guardado en disco`, dbError);
          createdDocs.push({
            id: `doc-${Date.now()}-${docType}`,
            userId,
            docType,
            fileName: file.name,
            filePath,
            fileSize: file.size,
            mimeType: file.type,
          });
        }
      }
    }

    return NextResponse.json({ success: true, documents: createdDocs }, { status: 200 });
  } catch (error) {
    console.error('POST /api/vets/documents Error:', error);
    return NextResponse.json(
      { error: 'Error al subir documentos encriptados' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = getSessionFromCookies(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'No autorizado para consultar documentos' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const docId = searchParams.get('docId');
    const download = searchParams.get('download') === 'true';

    if (docId && download) {
      const doc = await prisma.vetDocument.findUnique({
        where: { id: docId },
      });

      if (!doc || !fs.existsSync(doc.filePath)) {
        return NextResponse.json({ error: 'Documento no encontrado en disco o BD' }, { status: 404 });
      }

      const encryptedBuffer = fs.readFileSync(doc.filePath);
      const parts = doc.encryptionIV.split(':');
      const ivHex = parts[0];
      const authTagHex = parts[1] || '';
      const decrypted = decryptFile(encryptedBuffer, ivHex, authTagHex);
      return new Response(new Uint8Array(decrypted), {
        headers: {
          'Content-Type': doc.mimeType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${doc.fileName}"`,
        },
      });
    }

    if (userId) {
      const docs = await prisma.vetDocument.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, documents: docs });
    }

    return NextResponse.json({ error: 'Se requiere userId o docId' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/vets/documents Error:', error);
    return NextResponse.json(
      { error: 'Error al consultar documentos' },
      { status: 500 }
    );
  }
}
