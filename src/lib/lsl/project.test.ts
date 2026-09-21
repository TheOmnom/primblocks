import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyNotecard } from "./notecard.ts";
import {
  interpretFile,
  packProject,
  parseProject,
  PROJECT_KIND,
  projectFileName,
  stringifyProject,
} from "./project.ts";

describe("primblocks project files", () => {
  it("round-trips a project", () => {
    const packed = packProject("Touch greeter", { blocks: { languageVersion: 0, blocks: [] } }, emptyNotecard());
    const text = stringifyProject(packed);
    const back = parseProject(text);
    assert.ok(back);
    assert.equal(back.kind, PROJECT_KIND);
    assert.equal(back.scriptName, "Touch greeter");
    assert.equal(projectFileName("Touch greeter"), "Touch_greeter.primblocks");
  });

  it("rejects random json", () => {
    assert.equal(parseProject('{"hello":1}'), null);
    const opened = interpretFile('{"hello":1}', "x.json");
    assert.equal(opened.kind, "error");
  });

  it("spots LSL vs a project", () => {
    const lsl = interpretFile("default\n{\n    state_entry()\n    {\n    }\n}\n", "hi.lsl");
    assert.equal(lsl.kind, "lsl");
    if (lsl.kind === "lsl") assert.equal(lsl.scriptName, "hi");

    const packed = packProject("Door", { blocks: { languageVersion: 0, blocks: [] } }, emptyNotecard());
    const opened = interpretFile(stringifyProject(packed), "Door.primblocks");
    assert.equal(opened.kind, "project");
  });
});
