/**
 * Shared live screen positions of the 6 Hero constellation nodes.
 * Used by HeroParticles WebGL simulation to render connected ~ disconnected
 * energy filaments and synaptic bridges between the orbiting glass nodes.
 */
export interface ConstellationNodePos {
  x: number;
  y: number;
  active: number;
}

export const constellationState: {
  nodes: ConstellationNodePos[];
} = {
  nodes: [
    { x: 0, y: 0, active: 0 },
    { x: 0, y: 0, active: 0 },
    { x: 0, y: 0, active: 0 },
    { x: 0, y: 0, active: 0 },
    { x: 0, y: 0, active: 0 },
    { x: 0, y: 0, active: 0 },
  ],
};
