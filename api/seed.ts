import './db.js';
import db from './db.js';
import bcrypt from 'bcryptjs';
import { AssetRepo, VersionRepo } from './repos/AssetRepo.js';
import { UserRepo } from './repos/UserRepo.js';
import { uuid, detectType } from './services/utils.js';
import type { AssetMetadata, AssetType } from '../shared/types.js';

interface SeedAsset {
  name: string;
  type: AssetType;
  tags: string[];
  faces?: number;
  vertices?: number;
  width?: number;
  height?: number;
  fileSize: number;
  format: string;
  versions: number;
  status?: 'active' | 'warning' | 'archived';
}

const seed: SeedAsset[] = [
  {
    name: 'hero_character_highpoly.glb',
    type: 'model',
    tags: ['角色', '主角', '高精度'],
    faces: 350000, vertices: 412000, fileSize: 48 * 1024 * 1024, format: 'glb', versions: 5,
  },
  {
    name: 'sci_fi_building_exterior.glb',
    type: 'model',
    tags: ['建筑', '科幻', '场景'],
    faces: 1_200_000, vertices: 1_450_000, fileSize: 156 * 1024 * 1024, format: 'glb', versions: 3, status: 'warning',
  },
  {
    name: 'environment_forest_pack.obj',
    type: 'model',
    tags: ['自然', '植被', '森林'],
    faces: 820_000, vertices: 920_000, fileSize: 85 * 1024 * 1024, format: 'obj', versions: 2,
  },
  {
    name: 'weapon_rifle_custom.gltf',
    type: 'model',
    tags: ['武器', '枪械', '道具'],
    faces: 45_000, vertices: 54_000, fileSize: 5 * 1024 * 1024, format: 'gltf', versions: 7,
  },
  {
    name: 'vehicle_sports_car.glb',
    type: 'model',
    tags: ['载具', '跑车', '交通'],
    faces: 180_000, vertices: 210_000, fileSize: 22 * 1024 * 1024, format: 'glb', versions: 4,
  },
  {
    name: 'monster_boss_dragon.glb',
    type: 'model',
    tags: ['怪物', 'BOSS', '龙族'],
    faces: 6_800_000, vertices: 8_200_000, fileSize: 210 * 1024 * 1024, format: 'glb', versions: 2, status: 'warning',
  },
  {
    name: 'PBR_metal_rusty_4k.png',
    type: 'texture',
    tags: ['PBR', '金属', '4K'],
    width: 4096, height: 4096, fileSize: 28 * 1024 * 1024, format: 'png', versions: 3,
  },
  {
    name: 'hero_diffuse_8k.png',
    type: 'texture',
    tags: ['角色贴图', '8K', '漫反射'],
    width: 8192, height: 8192, fileSize: 128 * 1024 * 1024, format: 'png', versions: 5, status: 'warning',
  },
  {
    name: 'brick_wall_normal_2k.jpg',
    type: 'texture',
    tags: ['法线', '砖墙', '2K'],
    width: 2048, height: 2048, fileSize: 6 * 1024 * 1024, format: 'jpg', versions: 2,
  },
  {
    name: 'terrain_heightmap_16k.png',
    type: 'texture',
    tags: ['地形', '高度图', '16K'],
    width: 16384, height: 16384, fileSize: 380 * 1024 * 1024, format: 'png', versions: 1, status: 'warning',
  },
  {
    name: 'prop_chair_modern.glb',
    type: 'model',
    tags: ['道具', '家具', '室内'],
    faces: 2_500, vertices: 3_100, fileSize: 480 * 1024, format: 'glb', versions: 2,
  },
  {
    name: 'UI_icons_pack.psd',
    type: 'other',
    tags: ['UI', '图标'],
    fileSize: 120 * 1024 * 1024, format: 'psd', versions: 4,
  },
  {
    name: 'old_obsolete_character.glb',
    type: 'model',
    tags: ['废弃', '旧版'],
    faces: 120_000, vertices: 140_000, fileSize: 18 * 1024 * 1024, format: 'glb', versions: 1, status: 'archived',
  },
  {
    name: 'vintage_texture_collection.tga',
    type: 'texture',
    tags: ['复古', '归档'],
    width: 1024, height: 1024, fileSize: 3 * 1024 * 1024, format: 'tga', versions: 1, status: 'archived',
  },
  {
    name: 'skybox_sunset_hdr.exr',
    type: 'texture',
    tags: ['天空盒', 'HDR', '光照'],
    width: 1024, height: 512, fileSize: 42 * 1024 * 1024, format: 'exr', versions: 2,
  },
];

function run() {
  const adminId = UserRepo.findByUsername('admin')?.id || 'user_admin_001';
  const editorId = UserRepo.findByUsername('editor')?.id || 'user_editor_001';
  const uploaders = [adminId, editorId, adminId, editorId, adminId, editorId];

  for (const s of seed) {
    const existing = db.prepare('SELECT id FROM assets WHERE name = ?').get(s.name);
    if (existing) continue;

    const assetId = uuid('asset');
    const type = s.type || detectType(s.name);
    const isOver =
      (type === 'model' && (s.fileSize > 100 * 1024 * 1024 || (s.faces || 0) > 5_000_000)) ||
      (type === 'texture' && (s.fileSize > 50 * 1024 * 1024 || (s.width || 0) * (s.height || 0) > 8192 * 8192)) ||
      s.fileSize > 100 * 1024 * 1024;

    const baseMeta: AssetMetadata = {
      fileSize: s.fileSize, format: s.format, isOversized: isOver,
      faces: s.faces, vertices: s.vertices, width: s.width, height: s.height,
    };

    const uploader = uploaders[Math.floor(Math.random() * uploaders.length)];
    const firstVersionId = uuid('ver');
    const nowOffset = Math.floor(Math.random() * 90);
    const created = new Date(Date.now() - nowOffset * 24 * 3600 * 1000).toISOString();

    AssetRepo.create({
      id: assetId,
      name: s.name,
      type,
      tags: s.tags,
      thumbnail: '',
      currentVersionId: firstVersionId,
      uploaderId: uploader,
      metadata: baseMeta,
      status: s.status || (isOver ? 'warning' : 'active'),
    });

    const remarks = [
      '初始版本',
      '调整拓扑结构',
      '增加细节层次',
      '修复UV接缝',
      '优化面数，合并顶点',
      '更新贴图通道',
      '甲方反馈修改',
      '最终交付版',
    ];
    let lastMeta = { ...baseMeta };
    let lastVersionId = firstVersionId;
    for (let i = 1; i <= s.versions; i++) {
      const verId = i === 1 ? firstVersionId : uuid('ver');
      const vCreated = new Date(Date.now() - (nowOffset - (i - 1) * 3) * 24 * 3600 * 1000).toISOString();
      if (i > 1) {
        lastMeta = {
          ...lastMeta,
          faces: Math.max(100, Math.round((lastMeta.faces || 0) * (0.9 + Math.random() * 0.3))),
          vertices: Math.max(100, Math.round((lastMeta.vertices || 0) * (0.9 + Math.random() * 0.3))),
          fileSize: Math.max(1024, Math.round(lastMeta.fileSize * (0.85 + Math.random() * 0.4))),
        };
      }
      VersionRepo.create({
        id: verId,
        assetId,
        version: i,
        remark: remarks[Math.min(i - 1, remarks.length - 1)] || `版本 v${i}`,
        filePath: `/simulated/${assetId}/v${i}`,
        metadata: lastMeta,
        createdById: uploader,
      });
      lastVersionId = verId;

      const stmt = db.prepare('UPDATE asset_versions SET created_at = ? WHERE id = ?');
      stmt.run(vCreated, verId);
    }

    db.prepare('UPDATE assets SET current_version_id = ?, created_at = ?, updated_at = ?, archived_at = ? WHERE id = ?')
      .run(
        lastVersionId,
        created,
        new Date().toISOString(),
        s.status === 'archived' ? new Date().toISOString() : null,
        assetId,
      );
  }

  console.log(`[Seed] 初始素材数据已写入: ${seed.length} 条`);
}

run();
