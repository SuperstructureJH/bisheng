export type KnowledgeSpaceGroupKey = "department" | "created" | "joined";

export interface KnowledgeSpaceLike {
  id: string | number;
  name?: string | null;
}

export interface KnowledgeSpaceGroup<T extends KnowledgeSpaceLike = KnowledgeSpaceLike> {
  key: KnowledgeSpaceGroupKey;
  items: T[];
}

function sortSpacesByName<T extends KnowledgeSpaceLike>(spaces: T[]): T[] {
  return [...spaces].sort((a, b) => {
    const an = (a.name || "").trim();
    const bn = (b.name || "").trim();
    const aIsEn = an.length > 0 && an.charCodeAt(0) < 128;
    const bIsEn = bn.length > 0 && bn.charCodeAt(0) < 128;
    if (aIsEn !== bIsEn) return aIsEn ? -1 : 1;
    return an.localeCompare(bn, aIsEn ? "en" : "zh-Hans-u-co-pinyin", {
      sensitivity: "base",
    });
  });
}

export function groupKnowledgeSpaces<T extends KnowledgeSpaceLike>(
  mine: T[],
  joined: T[],
  department: T[],
): KnowledgeSpaceGroup<T>[] {
  const departmentIds = new Set(department.map((space) => String(space.id)));
  const removeDepartmentDuplicates = (spaces: T[]) =>
    spaces.filter((space) => !departmentIds.has(String(space.id)));

  return [
    { key: "department", items: sortSpacesByName(department) },
    { key: "created", items: sortSpacesByName(removeDepartmentDuplicates(mine)) },
    { key: "joined", items: sortSpacesByName(removeDepartmentDuplicates(joined)) },
  ];
}

export function filterKnowledgeSpaceGroups<T extends KnowledgeSpaceLike>(
  groups: KnowledgeSpaceGroup<T>[],
  keyword: string,
): KnowledgeSpaceGroup<T>[] {
  const normalizedKeyword = keyword.toLowerCase();
  return groups
    .map((group) =>
      keyword
        ? {
          ...group,
          items: group.items.filter((space) =>
            space.name?.toLowerCase().includes(normalizedKeyword),
          ),
        }
        : group,
    )
    .filter((group) => group.items.length > 0);
}
