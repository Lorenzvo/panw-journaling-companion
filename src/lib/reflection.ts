// Public entrypoint for the reflection system.
// Keep this file stable so imports don't change; implementation lives in src/lib/reflection/*.

export type { ReflectionOutput } from "./reflection/types";

export { generateLocalReflection } from "./reflection/local";
export { generateEnhancedReflection } from "./reflection/enhanced";
