export {};

declare global {
  interface GPUCanvasContext {
    present: () => void;
  }
}
