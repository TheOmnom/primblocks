import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cableIdent, lslTypeFromCheck } from "./cables.ts";

describe("cables", () => {
  it("prefixes a legal LSL ident", () => {
    assert.equal(cableIdent("greeting"), "cbl_greeting");
    assert.equal(cableIdent("  Touch Count "), "cbl_Touch_Count");
    assert.equal(cableIdent("if"), "cbl_if");
    assert.equal(cableIdent(""), "cbl_wire");
  });

  it("maps Blockly checks to LSL types", () => {
    assert.equal(lslTypeFromCheck("Integer"), "integer");
    assert.equal(lslTypeFromCheck("Boolean"), "integer");
    assert.equal(lslTypeFromCheck("Number"), "float");
    assert.equal(lslTypeFromCheck(["String", "Key"]), "string");
    assert.equal(lslTypeFromCheck("Vector"), "vector");
    assert.equal(lslTypeFromCheck(null), "string");
  });
});
