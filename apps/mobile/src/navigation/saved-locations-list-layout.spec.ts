import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("saved locations list layout", () => {
  it("does not nest FlatList inside the scrolling PageContent wrapper", () => {
    const source = readFileSync(
      join(__dirname, "../app/(tabs)/mine.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(
      /<PageContent\b(?:(?!<\/PageContent>)[\s\S])*<FlatList\b/,
    );
  });
});
