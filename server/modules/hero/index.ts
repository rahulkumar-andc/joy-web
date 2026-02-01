// Re-export all hero module components
export * from "./repository";
export * from "./service";
export * from "./routes";
export * from "./ab-testing";
export * from "./scheduler";

// Re-export initialization function with cleaner name
export { initializeHeroSystem as initHeroSystem } from "./service";
export { campaignScheduler } from "./scheduler";
