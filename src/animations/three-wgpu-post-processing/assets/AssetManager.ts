import { useEffect, useState } from 'react';

import { Asset } from 'expo-asset';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';

const resolveUri = async (source: number | string) => {
  if (typeof source === 'string') return source;
  const asset = Asset.fromModule(source);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  return asset.localUri ?? asset.uri;
};

export const useGLTF = (source: number | string) => {
  const [gltf, setGltf] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const loader = new GLTFLoader();

    const load = async () => {
      try {
        const uri = await resolveUri(source);
        loader.load(
          uri,
          (loaded: any) => {
            if (mounted) setGltf(loaded);
          },
          undefined,
          () => {
            if (mounted) setGltf(null);
          },
        );
      } catch {
        if (mounted) setGltf(null);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [source]);

  return gltf;
};
