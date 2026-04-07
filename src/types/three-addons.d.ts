declare module 'three/tsl' {
  export const color: (...args: any[]) => any;
  export const pass: (...args: any[]) => any;
  export const float: (...args: any[]) => any;
  export const vec3: (...args: any[]) => any;
  export const viewportSharedTexture: (...args: any[]) => any;
  export const checker: (...args: any[]) => any;
  export const uv: (...args: any[]) => any;
  export const time: any;
  export const oscSine: any;
  export const output: any;
  export const posterize: (...args: any[]) => any;
  export const hue: (...args: any[]) => any;
  export const grayscale: (...args: any[]) => any;
  export const saturation: (...args: any[]) => any;
  export const blendOverlay: (...args: any[]) => any;
  export const viewportUV: any;
  export const viewportSafeUV: (...args: any[]) => any;
  export const screenUV: any;
}

declare module 'three/addons/tsl/display/BloomNode' {
  export const bloom: (...args: any[]) => any;
}

declare module 'three/addons/loaders/GLTFLoader' {
  export class GLTFLoader {
    load(
      url: string,
      onLoad: (gltf: any) => void,
      onProgress?: (event: any) => void,
      onError?: (error: any) => void,
    ): void;
  }
}
