import { buildSelectedContentScope } from "./useFolderChat";

describe("buildSelectedContentScope", () => {
    it("splits selected content into file and folder ids", () => {
        expect(
            buildSelectedContentScope([
                { id: "11", name: "文档 A", kind: "file" },
                { id: "22", name: "文件夹 B", kind: "folder" },
                { id: "33", name: "文档 C", kind: "file" },
            ]),
        ).toEqual({
            file_ids: [11, 33],
            folder_ids: [22],
        });
    });

    it("keeps an explicit empty scope when selected items have no backend id", () => {
        expect(
            buildSelectedContentScope([
                { id: "uploading-temp", name: "上传中", kind: "file" },
            ]),
        ).toEqual({
            file_ids: [],
            folder_ids: [],
        });
    });

    it("omits selected-scope fields when nothing is selected", () => {
        expect(buildSelectedContentScope([])).toEqual({});
        expect(buildSelectedContentScope(null)).toEqual({});
    });
});
