// Re-export all hero module components
export * from "./repository";
export * from "./service";
export * from "./routes";

// Re-export initialization function with cleaner name
export { initializeHeroSystem as initHeroSystem } from "./service";

