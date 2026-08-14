export const loop = function() {
  // Example main loop for Screeps. Replace with AI-driven logic.
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    // simple logging to verify deployment
    console.log(`Tick ${Game.time}: creep ${name} at ${creep.pos.x},${creep.pos.y}`);
  }
};

// Expose global loop required by some loaders
declare global {
  interface Global { loop: () => void }
}

global.loop = loop;
