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

export const AnimationRegistry = {
  'crossy-road-lite': CrossyRoadLite,
} as const;

export const AnimationMetadata: Record<string, AnimationMetadataType> = {
  'crossy-road-lite': {
    name: 'Crossy Road Lite',
    route: 'CrossyRoadLite',
    iconName: 'game-controller-outline',
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
