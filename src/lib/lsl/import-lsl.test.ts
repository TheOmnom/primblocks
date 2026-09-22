import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { importLsl, topTypes } from "./import-lsl.ts";
import { parseLsl } from "./parse-lsl.ts";

const GREETER = `
default
{
    touch_start(integer num_detected)
    {
        llSay(0, "Hello, Avatar!");
        llOwnerSay("Touched.");
    }
}
`;

describe("parse LSL", () => {
  it("reads a default state and a touch_start", () => {
    const ast = parseLsl(GREETER);
    assert.equal(ast.states[0]?.name, "default");
    assert.equal(ast.states[0]?.events[0]?.name, "touch_start");
    assert.equal(ast.states[0]?.events[0]?.body.length, 2);
  });

  it("reads globals, if/else, and a second state", () => {
    const ast = parseLsl(`
integer open = 0;

default
{
    touch_start(integer num_detected)
    {
        if (open)
        {
            state shut;
        }
        else
        {
            open = 1;
        }
    }
}

state shut
{
    state_entry()
    {
        llSetTimerEvent(1.0);
    }
}
`);
    assert.equal(ast.globals[0]?.name, "open");
    assert.equal(ast.states.length, 2);
    assert.equal(ast.states[1]?.name, "shut");
    const first = ast.states[0]?.events[0]?.body[0];
    assert.equal(first?.k, "if");
  });
});

describe("import LSL → bricks", () => {
  it("rebuilds the greeter hats", () => {
    const result = importLsl(GREETER);
    assert.deepEqual(topTypes(result.state), ["lsl_event_touch_start"]);
    const hat = (result.state as { blocks: { blocks: Record<string, unknown>[] } }).blocks.blocks[0];
    const doBlock = (hat.inputs as { DO: { block: { type: string; next?: { block: { type: string } } } } }).DO.block;
    assert.equal(doBlock.type, "lsl_fn_llSay");
    assert.equal(doBlock.next?.block.type, "lsl_fn_llOwnerSay");
  });

  it("turns cbl_ assigns into set/get and += into change-by", () => {
    const result = importLsl(`
string cbl_who = "";
integer total = 0;

default
{
    touch_start(integer num_detected)
    {
        cbl_who = llDetectedName(0);
        total += 1;
        llSay(0, cbl_who);
    }
}
`);
    const hat = (result.state as { blocks: { blocks: Record<string, unknown>[] } }).blocks.blocks[0];
    const first = (hat.inputs as { DO: { block: Record<string, unknown> } }).DO.block;
    assert.equal(first.type, "lsl_set_var");
    const second = (first.next as { block: Record<string, unknown> }).block;
    assert.equal(second.type, "lsl_change_var");
    const vars = (result.state as { variables: { name: string; type: string }[] }).variables;
    assert.ok(vars.some((v) => v.name === "total" && v.type === "integer"));
    assert.ok(vars.some((v) => v.name === "who" && v.type === "string"));
    assert.ok(!vars.some((v) => v.name.startsWith("cbl_")));
  });

  it("keeps leftover calls as raw so nothing is dropped", () => {
    const result = importLsl(`
default
{
    state_entry()
    {
        jump skip;
        @skip;
    }
}
`);
    const hat = (result.state as { blocks: { blocks: Record<string, unknown>[] } }).blocks.blocks[0];
    const first = (hat.inputs as { DO: { block: { type: string } } }).DO.block;
    assert.equal(first.type, "lsl_raw_stmt");
  });

  it("does not treat a vector closer as greater-than", () => {
    const result = importLsl(`
default
{
    state_entry()
    {
        llSetText("hi", <1.0, 0.9, 0.0>, 1.0);
    }
}
`);
    const hat = (result.state as { blocks: { blocks: Record<string, unknown>[] } }).blocks.blocks[0];
    const call = (hat.inputs as { DO: { block: { type: string; next?: unknown } } }).DO.block;
    assert.equal(call.type, "lsl_fn_llSetText");
    assert.equal(call.next, undefined);
  });

  it("skips the empty default placeholder", () => {
    const result = importLsl(`
default
{
    state_entry()
    {
        // default must exist and come first. Snap an event brick here.
    }
}
`);
    assert.equal(topTypes(result.state).length, 0);
  });
});
