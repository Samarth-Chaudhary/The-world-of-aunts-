/**
 * @file scene/textures.ts
 * @description Centralized Three.js texture cache for 3D network models.
 */

import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function loadTexture(url: string): THREE.Texture {
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

export const NETWORK_TEXTURES = {
  router: loadTexture('/assets/router.png'),
  serverBase: loadTexture('/assets/server_base.png'),
  clientHost: loadTexture('/assets/client_host.png?v=shinchan'),
  packet: loadTexture('/assets/packet.png')
};
