import { describe, it, expect } from "vitest";
import { deleteSymbol } from "./kv";
import { DEFAULT_SYMBOL } from "./symbols";

describe("deleteSymbol guard", () => {
  it("rejects deletion of DEFAULT_SYMBOL", async () => {
    await expect(deleteSymbol(DEFAULT_SYMBOL)).rejects.toThrow(
      /기본 종목/,
    );
  });
});
