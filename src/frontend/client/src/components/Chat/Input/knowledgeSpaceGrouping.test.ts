import {
  filterKnowledgeSpaceGroups,
  groupKnowledgeSpaces,
} from "./knowledgeSpaceGrouping";

describe("knowledge space dropdown grouping", () => {
  const department = [
    { id: 10, name: "测试部门的知识空间" },
    { id: 11, name: "二级部门的知识空间" },
  ];
  const mine = [
    { id: 20, name: "我的空间" },
    { id: 10, name: "测试部门的知识空间" },
  ];
  const joined = [
    { id: 30, name: "加入的空间" },
    { id: 11, name: "二级部门的知识空间" },
  ];

  it("keeps the fixed department, created, joined order and removes department duplicates", () => {
    const groups = groupKnowledgeSpaces(mine, joined, department);

    expect(groups.map((group) => group.key)).toEqual([
      "department",
      "created",
      "joined",
    ]);
    expect(groups[1].items.map((space) => space.id)).toEqual([20]);
    expect(groups[2].items.map((space) => space.id)).toEqual([30]);
  });

  it("hides empty groups in the default list", () => {
    const groups = groupKnowledgeSpaces(mine, [], []);

    expect(filterKnowledgeSpaceGroups(groups, "").map((group) => group.key)).toEqual([
      "created",
    ]);
  });

  it("filters inside each group and hides groups without search matches", () => {
    const groups = groupKnowledgeSpaces(mine, joined, department);
    const result = filterKnowledgeSpaceGroups(groups, "部门");

    expect(result.map((group) => group.key)).toEqual(["department"]);
    expect(result[0].items.map((space) => space.id)).toHaveLength(2);
    expect(result[0].items.map((space) => space.id)).toEqual(
      expect.arrayContaining([10, 11]),
    );
  });
});
