import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleScript } from "./assemble.ts";
import {
  NOTECARD_LINE_BYTES,
  inspectNotecard,
  parseNotecard,
  serializeNotecard,
  emptyNotecard,
  greeterNotecard,
  newRow,
  ncGlobalNames,
} from "./notecard.ts";
import {
  applyReadersToStates,
  prependInHandler,
  readerDataserverInner,
  readerGlobals,
  readerStartFunction,
} from "./notecard-gen.ts";

describe("notecard format", () => {
  it("round-trips settings, comments, and raw lines", () => {
    const doc = {
      name: "config",
      rows: [
        newRow("comment", "", "drop in prim"),
        newRow("blank"),
        newRow("setting", "greeting", "Hello, Avatar!"),
        newRow("setting", "channel", "0"),
        newRow("raw", "", "ffffffff-ffff-ffff-ffff-ffffffffffff"),
      ],
    };
    const text = serializeNotecard(doc);
    assert.match(text, /^# drop in prim\n\ngreeting = Hello, Avatar!\nchannel = 0\nffffffff-/m);
    const back = parseNotecard("config", text);
    assert.equal(back.rows[2].kind, "setting");
    assert.equal(back.rows[2].key, "greeting");
    assert.equal(back.rows[2].value, "Hello, Avatar!");
    assert.equal(back.rows[4].kind, "raw");
  });

  it("parses // comments and key=value without spaces", () => {
    const back = parseNotecard(
      "config",
      "// keep\ngreeting=Hi\n",
    );
    assert.equal(back.rows[0].kind, "comment");
    assert.equal(back.rows[1].kind, "setting");
    assert.equal(back.rows[1].key, "greeting");
    assert.equal(back.rows[1].value, "Hi");
  });

  it("flags lines over the 255-byte cap", () => {
    const doc = {
      name: "config",
      rows: [newRow("setting", "greeting", "x".repeat(300))],
    };
    const { issues } = inspectNotecard(doc);
    assert.ok(issues.some((i) => i.severity === "error" && i.bytes > NOTECARD_LINE_BYTES));
  });

  it("warns on duplicate keys", () => {
    const doc = {
      name: "config",
      rows: [newRow("setting", "greeting", "a"), newRow("setting", "greeting", "b")],
    };
    const { issues } = inspectNotecard(doc);
    assert.ok(issues.some((i) => /Duplicate/.test(i.message)));
  });

  it("empty notecard is legal to start from", () => {
    const doc = emptyNotecard();
    assert.equal(doc.name, "config");
    assert.ok(serializeNotecard(doc).includes("#"));
  });

  it("greeter preset has greeting and channel", () => {
    const doc = greeterNotecard();
    const keys = doc.rows.filter((r) => r.kind === "setting").map((r) => r.key);
    assert.deepEqual(keys, ["greeting", "channel"]);
    assert.equal(doc.name, "config");
  });
});

describe("notecard LSL", () => {
  it("start function checks INVENTORY_NOTECARD and kicks line 0", () => {
    const src = readerStartFunction({
      name: "config",
      state: "default",
      reload: true,
      doBody: "",
      doneBody: "",
      missingBody: "",
    });
    const n = ncGlobalNames("config");
    assert.match(src, new RegExp(`${n.startFn}\\(\\)`));
    assert.match(src, /llGetInventoryType/);
    assert.match(src, /INVENTORY_NOTECARD/);
    assert.match(src, /llGetNotecardLine/);
    assert.doesNotMatch(src, /\bvoid\b/);
  });

  it("dataserver inner handles NAK, EOF, comments, then next line", () => {
    const src = readerDataserverInner({
      name: "config",
      state: "default",
      reload: true,
      doBody: 'if (_nc_key == "greeting") greeting = _nc_val;\n',
      doneBody: 'llOwnerSay("loaded");\n',
      missingBody: "",
    });
    assert.match(src, /data == NAK/);
    assert.match(src, /data == EOF/);
    assert.match(src, /llGetSubString\(_nc_raw, 0, 0\) != "#"/);
    assert.match(src, /greeting = _nc_val/);
    assert.match(src, /nc_line_config \+= 1/);
  });

  it("merges into existing state_entry instead of duplicating it", () => {
    const states = applyReadersToStates(
      {
        default: [
          'state_entry()\n{\n    llSay(0, "hi");\n}\n',
          "touch_start(integer num_detected)\n{\n    llOwnerSay((string)num_detected);\n}\n",
        ],
      },
      [
        {
          name: "config",
          state: "default",
          reload: true,
          doBody: "",
          doneBody: "",
          missingBody: "",
        },
      ],
    );
    const joined = states.default.join("\n");
    const entries = joined.match(/state_entry\s*\(/g) ?? [];
    assert.equal(entries.length, 1);
    assert.match(joined, /nc_start_config\(\);/);
    assert.match(joined, /llSay\(0, "hi"\)/);
    assert.match(joined, /dataserver\(key queryid, string data\)/);
    assert.match(joined, /change & CHANGED_INVENTORY/);
  });

  it("prependInHandler keeps braces balanced", () => {
    const out = prependInHandler("state_entry()\n{\n    llResetTime();\n}\n", "nc_start_config();\n");
    assert.match(out, /nc_start_config\(\);/);
    assert.match(out, /llResetTime\(\);/);
    const opens = (out.match(/{/g) ?? []).length;
    const closes = (out.match(/}/g) ?? []).length;
    assert.equal(opens, closes);
  });

  it("emits a paste-ready greeter: inventory check, NAK, EOF, CHANGED_INVENTORY", () => {
    const spec = {
      name: "config",
      state: "default",
      reload: true,
      doBody: 'if (_nc_key == "greeting")\n{\n    greeting = _nc_val;\n}\n',
      doneBody: 'llOwnerSay("Config loaded.");\n',
      missingBody: 'llOwnerSay("Drop a notecard named \\"config\\" into this prim.");\n',
    };
    const src = assembleScript({
      globals: ["string greeting = \"\";", "integer channel = 0;", ...readerGlobals(spec)],
      functions: [readerStartFunction(spec)],
      states: applyReadersToStates(
        {
          default: [
            "touch_start(integer num_detected)\n{\n    if (nc_ready_config)\n    {\n        llSay(channel, greeting);\n    }\n}\n",
          ],
        },
        [spec],
      ),
      notes: ['Pair with notecard named "config" in this prim. Format: key = value. # comments. 255 bytes/line.'],
    });
    assert.match(src, /llGetInventoryType\(nc_name_config\) != INVENTORY_NOTECARD/);
    assert.match(src, /data == NAK/);
    assert.match(src, /data == EOF/);
    assert.match(src, /CHANGED_INVENTORY/);
    assert.match(src, /nc_start_config\(\);/);
    assert.match(src, /touch_start\(integer num_detected\)/);
    assert.match(src, /greeting = _nc_val/);
    assert.equal((src.match(/state_entry\s*\(/g) ?? []).length, 1);
    assert.equal((src.match(/dataserver\s*\(/g) ?? []).length, 1);
    assert.doesNotMatch(src, /\bvoid\b/);
    const opens = (src.match(/{/g) ?? []).length;
    const closes = (src.match(/}/g) ?? []).length;
    assert.equal(opens, closes);
  });
});
