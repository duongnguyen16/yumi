import { workflowListLayout, workflowRowLayout } from "./workflow-list";

describe("workflow list layout", () => {
  it("uses full-width rows with compact workflow metadata", () => {
    expect(workflowListLayout).toEqual({ gap: 0, padding: 0, paddingBottom: 32 });
    expect(workflowRowLayout).toEqual({ iconSize: 40, minHeight: 76, paddingHorizontal: 8 });
  });
});
