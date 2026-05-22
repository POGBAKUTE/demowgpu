export type IconFamily = 'Ionicons';

export interface AnimationMetadataType extends Record<string, unknown> {
  name: string;
  route: string;
  iconName: string;
  alert?: boolean;
  iconColor?: string;
  hideDrawerIcon?: boolean;
}

export interface IconMetadata {
  iconName: string;
}

import { CrossyRoadLite } from './crossy-road-lite';
import { ThreeWGPUBackdrop } from './three-wgpu-backdrop';
import { ThreeWGPUBox } from './three-wgpu-box';
import { ThreeWGPUBoxClone } from './three-wgpu-box-clone';
import { ThreeWGPUHelmet } from './three-wgpu-helmet';
import { ThreeWGPUMiniGame } from './three-wgpu-mini-game';
import { ThreeWGPUPhysics } from './three-wgpu-physics';
import { ThreeWGPUPostProcessing } from './three-wgpu-post-processing';

export const AnimationRegistry = {
  'crossy-road-lite': CrossyRoadLite,
  'three-wgpu-box': ThreeWGPUBox,
  'three-wgpu-backdrop': ThreeWGPUBackdrop,
  'three-wgpu-box-clone': ThreeWGPUBoxClone,
  'three-wgpu-mini-game': ThreeWGPUMiniGame,
  'three-wgpu-helmet': ThreeWGPUHelmet,
  'three-wgpu-post-processing': ThreeWGPUPostProcessing,
  'three-wgpu-physics': ThreeWGPUPhysics,
} as const;

export const AnimationMetadata: Record<string, AnimationMetadataType> = {
  'crossy-road-lite': {
    name: 'Crossy Road Lite',
    route: 'CrossyRoadLite',
    iconName: 'game-controller-outline',
  },
  'three-wgpu-box': {
    name: 'Three WGPU Box',
    route: 'ThreeWGPUBox',
    iconName: 'cube-outline',
  },
  'three-wgpu-backdrop': {
    name: 'Three WGPU Backdrop',
    route: 'ThreeWGPUBackdrop',
    iconName: 'color-wand-outline',
  },
  'three-wgpu-box-clone': {
    name: 'Three WGPU Box Clone',
    route: 'ThreeWGPUBoxClone',
    iconName: 'copy-outline',
  },
  'three-wgpu-mini-game': {
    name: 'Three WGPU Mini Game',
    route: 'ThreeWGPUMiniGame',
    iconName: 'game-controller-outline',
  },
  'three-wgpu-helmet': {
    name: 'Three WGPU Helmet',
    route: 'ThreeWGPUHelmet',
    iconName: 'shield-outline',
  },
  'three-wgpu-post-processing': {
    name: 'Three WGPU Post Processing',
    route: 'ThreeWGPUPostProcessing',
    iconName: 'sparkles-outline',
  },
  'three-wgpu-physics': {
    name: 'Three WGPU Physics (Rapier)',
    route: 'ThreeWGPUPhysics',
    iconName: 'cube-outline',
  },
} as const;

export type AnimationSlug = keyof typeof AnimationRegistry;
export type AnimationComponent = (typeof AnimationRegistry)[AnimationSlug];
export type AnimationMeta = (typeof AnimationMetadata)[AnimationSlug];

export const getAnimationComponent = (
  slug: string,
): AnimationComponent | undefined => {
  return AnimationRegistry[slug as AnimationSlug];
};

export const getAnimationMetadata = (
  slug: string,
): AnimationMeta | undefined => {
  return AnimationMetadata[slug as AnimationSlug];
};

export const getAllAnimations = () => {
  return Object.keys(AnimationRegistry)
    .map(slug => ({
      slug,
      component: AnimationRegistry[slug as AnimationSlug],
      metadata: AnimationMetadata[slug as AnimationSlug],
    }))
    .filter(animation => {
      if (animation.metadata === undefined) {
        console.warn('Missing metadata for animation:', animation.slug);
      }
      return animation.metadata !== undefined;
    });
};
