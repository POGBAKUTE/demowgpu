#!/usr/bin/env node

const { spawn } = require('node:child_process');

const animationSlug = process.env.ANIMATION_SLUG || 'crossy-road-lite';

console.log(`Starting Expo dev server for animation: ${animationSlug}`);
console.log(
  `Open directly after launch: exp://127.0.0.1:8081/--/animations/${animationSlug}`,
);

const child = spawn('npx', ['expo', 'start', '--clear'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_PUBLIC_DEFAULT_ANIMATION_SLUG: animationSlug,
  },
});

child.on('exit', code => {
  process.exit(code ?? 0);
});

