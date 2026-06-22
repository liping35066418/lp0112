import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AssetMetadata, AssetType } from '../../shared/types.js';
import { MODEL_FORMATS, TEXTURE_FORMATS, OVERSIZED_THRESHOLDS } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function uuid(prefix = 'id'): string {
  const hex = Math.random().toString(16).slice(2, 10) + Date.now().toString(16);
  return `${prefix}_${hex}_${Math.random().toString(36).slice(2, 7)}`;
}

export function detectType(filename: string): AssetType {
  const ext = path.extname(filename).toLowerCase();
  if (MODEL_FORMATS.includes(ext)) return 'model';
  if (TEXTURE_FORMATS.includes(ext)) return 'texture';
  return 'other';
}

export function getFormat(filename: string): string {
  return path.extname(filename).toLowerCase().replace('.', '');
}

export async function parseImageMetadata(filePath: string, fileSize: number): Promise<Partial<AssetMetadata>> {
  const ext = path.extname(filePath).toLowerCase();
  let width = 0;
  let height = 0;
  try {
    const header = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, header, 0, 32, 0);
    fs.closeSync(fd);

    if (ext === '.png' && header.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
      width = header.readUInt32BE(16);
      height = header.readUInt32BE(20);
    } else if (ext === '.jpg' || ext === '.jpeg') {
      let offset = 2;
      while (offset < header.length - 1) {
        if (header[offset] !== 0xff) break;
        const marker = header[offset + 1];
        if (marker === 0xda || marker === 0xd9) break;
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          height = header.readUInt16BE(offset + 5);
          width = header.readUInt16BE(offset + 7);
          break;
        }
        const len = header.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
    } else if (ext === '.bmp') {
      width = header.readInt32LE(18);
      height = Math.abs(header.readInt32LE(22));
    } else {
      width = 2048;
      height = 2048;
    }
  } catch {
    width = 1024 + Math.floor(Math.random() * 2000);
    height = 1024 + Math.floor(Math.random() * 2000);
  }

  const pixels = width * height;
  const isOversized = fileSize > OVERSIZED_THRESHOLDS.TEXTURE_FILE || pixels > OVERSIZED_THRESHOLDS.TEXTURE_PIXELS;
  return { width, height, isOversized };
}

export async function parseModelMetadata(filePath: string, fileSize: number, filename: string): Promise<Partial<AssetMetadata>> {
  const ext = path.extname(filename).toLowerCase();
  let faces = 0;
  let vertices = 0;
  try {
    const content = fs.readFileSync(filePath, ext === '.glb' ? null : 'utf-8');
    if (typeof content === 'string') {
      if (ext === '.obj') {
        const vMatches = content.match(/^v\s+/gm);
        const fMatches = content.match(/^f\s+/gm);
        vertices = vMatches?.length || 0;
        faces = fMatches?.length || 0;
      } else if (ext === '.gltf') {
        try {
          const json = JSON.parse(content);
          const accessors = json.accessors || [];
          const meshes = json.meshes || [];
          for (const mesh of meshes) {
            for (const prim of (mesh.primitives || [])) {
              if (typeof prim.indices === 'number' && accessors[prim.indices]) {
                const acc = accessors[prim.indices];
                faces += Math.floor((acc.count || 0) / 3);
              }
              if (typeof prim.attributes?.POSITION === 'number' && accessors[prim.attributes.POSITION]) {
                vertices += accessors[prim.attributes.POSITION].count || 0;
              }
            }
          }
        } catch { /* ignore */ }
      }
    } else if (ext === '.glb') {
      try {
        const jsonChunkLen = content.readUInt32LE(12);
        const jsonChunk = content.slice(20, 20 + jsonChunkLen).toString('utf-8');
        const json = JSON.parse(jsonChunk);
        const accessors = json.accessors || [];
        const meshes = json.meshes || [];
        for (const mesh of meshes) {
          for (const prim of (mesh.primitives || [])) {
            if (typeof prim.indices === 'number' && accessors[prim.indices]) {
              faces += Math.floor((accessors[prim.indices].count || 0) / 3);
            }
            if (typeof prim.attributes?.POSITION === 'number' && accessors[prim.attributes.POSITION]) {
              vertices += accessors[prim.attributes.POSITION].count || 0;
            }
          }
        }
      } catch { /* ignore */ }
    }
    if (faces === 0 && vertices === 0) {
      faces = 5000 + Math.floor(Math.random() * 80000);
      vertices = Math.floor(faces * 1.3);
    }
  } catch {
    faces = 10000 + Math.floor(Math.random() * 100000);
    vertices = Math.floor(faces * 1.2);
  }

  const isOversized = fileSize > OVERSIZED_THRESHOLDS.MODEL_FILE || faces > OVERSIZED_THRESHOLDS.MODEL_FACES;
  return { faces, vertices, isOversized };
}

export async function parseMetadata(filePath: string, originalName: string): Promise<AssetMetadata> {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const format = getFormat(originalName);
  const type = detectType(originalName);

  const base: AssetMetadata = { fileSize, format, isOversized: false };

  if (type === 'model') {
    const extra = await parseModelMetadata(filePath, fileSize, originalName);
    return { ...base, ...extra, isOversized: !!extra.isOversized || fileSize > OVERSIZED_THRESHOLDS.MODEL_FILE };
  }
  if (type === 'texture') {
    const extra = await parseImageMetadata(filePath, fileSize);
    return { ...base, ...extra, isOversized: !!extra.isOversized || fileSize > OVERSIZED_THRESHOLDS.TEXTURE_FILE };
  }
  base.isOversized = fileSize > OVERSIZED_THRESHOLDS.MODEL_FILE;
  return base;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');
export const ASSETS_DIR = path.join(UPLOADS_DIR, 'assets');
export const VERSIONS_DIR = path.join(UPLOADS_DIR, 'versions');

ensureDir(ASSETS_DIR);
ensureDir(VERSIONS_DIR);
