/**
 * Where the module stack should park, when something other than the header
 * wants it.
 *
 * Written by components/sections/FlowStage and read by components/ModuleStack
 * inside its own frame loop. A plain mutable object for the same reason
 * lib/scrollState is one: both ends run at frame rate, and routing this
 * through React would re-render the tree sixty times a second to move an
 * element React does not position anyway.
 *
 * ONLY THE VISIBLE STAGE MAY WRITE. The page renders every section twice for
 * the scroll loop, so there are two FlowStages and one ModuleStack; the
 * off-screen copy sets `strength` to 0 when it leaves rather than leaving a
 * stale berth behind for the module to chase off-screen.
 */
export interface ModuleBerth {
  /** 0..1 - how much this berth overrides wherever the module would be. */
  strength: number;
  /** Viewport coordinates of the berth's centre. */
  x: number;
  y: number;
  /** Desired on-screen width in px; the module converts it to a scale. */
  size: number;
}

export const moduleBerth: ModuleBerth = { strength: 0, x: 0, y: 0, size: 0 };
