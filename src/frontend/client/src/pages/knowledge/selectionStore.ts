import { atom } from "recoil";

/**
 * Selected file ids in the knowledge-space file list.
 *
 * Shared (rather than local to KnowledgeSpaceContent) because the same selection
 * drives both batch actions and the quick-Q&A references rendered by the sibling
 * bottom dock.
 */
export const knowledgeSelectedFilesState = atom<Set<string>>({
    key: "knowledgeSelectedFilesState",
    default: new Set<string>(),
});
