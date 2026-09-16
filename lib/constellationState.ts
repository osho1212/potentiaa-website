/**
 * Shared live screen positions of the 6 Hero constellation nodes and mobile gyroscope tilt state.
 * Used by HeroParticles WebGL simulation and HeroFlowConstellation to synchronize 3D banking,
 * parallax, and synaptic filament bridges.
 */
export interface ConstellationNodePos {
  x: number;
  y: number;
  active: number;
}

export const constellationState: {
  nodes: ConstellationNodePos[];
  tiltX: number;
  tiltY: number;
} = {
  nodes: [
    { x: 0, y: 0, active: 0 },
    { x: 0, y: 0, active: 0 },
    { x: 0, y: 0, active: 0 },
    { x: 0, y: 0, active: 0 },
    { x: 0, y: 0, active: 0 },
  ],
  tiltX: 0,
  tiltY: 0,
};
