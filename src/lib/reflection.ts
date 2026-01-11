// Compatibility wrapper for the reflection system.
// The implementation lives in src/lib/reflection/*.

export type { ReflectionOutput } from "./reflection/types";

export { generateLocalReflection } from "./reflection/local";
export { generateEnhancedReflection } from "./reflection/enhanced";
