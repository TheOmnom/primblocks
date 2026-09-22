export type ExampleId =
  | "greeter"
  | "notecard"
  | "door"
  | "listen"
  | "counter"
  | "dialog"
  | "sensor"
  | "wired"
  | "wired-sensor"
  | "wired-id"
  | "placeable"
  | "tipjar"
  | "wearable"
  | "dual"
  | "tipjar-hud"
  | "split-tips";

export type ExampleLevel = "basic" | "intermediate" | "advanced" | "expert";

export type Example = {
  id: ExampleId;
  title: string;
  blurb: string;
  level: ExampleLevel;
  state: object;
};

function ev(
  type: string,
  x: number,
  y: number,
  inner: object,
  state = "default",
) {
  return {
    type,
    x,
    y,
    fields: { STATE: state },
    inputs: { DO: { block: inner } },
  };
}

function say(text: string, channel = 0, next?: object) {
  const block: Record<string, unknown> = {
    type: "lsl_fn_llSay",
    inputs: {
      MSG: { shadow: { type: "lsl_string", fields: { TEXT: text } } },
      CHANNEL: { shadow: { type: "lsl_integer", fields: { NUM: channel } } },
    },
  };
  if (next) block.next = { block: next };
  return block;
}

function ownerSay(text: string, next?: object) {
  const block: Record<string, unknown> = {
    type: "lsl_fn_llOwnerSay",
    inputs: { MSG: { shadow: { type: "lsl_string", fields: { TEXT: text } } } },
  };
  if (next) block.next = { block: next };
  return block;
}

function hover(text: string, next?: object) {
  const block: Record<string, unknown> = {
    type: "lsl_fn_llSetText",
    inputs: {
      TEXT: { shadow: { type: "lsl_string", fields: { TEXT: text } } },
      COLOR: { shadow: { type: "lsl_color_named", fields: { COL: "<1.000, 1.000, 1.000>" } } },
      ALPHA: { shadow: { type: "lsl_float", fields: { NUM: 1 } } },
    },
  };
  if (next) block.next = { block: next };
  return block;
}

function sayValue(msgBlock: object, channel = 0, next?: object) {
  const block: Record<string, unknown> = {
    type: "lsl_fn_llSay",
    inputs: {
      MSG: { block: msgBlock },
      CHANNEL: { shadow: { type: "lsl_integer", fields: { NUM: channel } } },
    },
  };
  if (next) block.next = { block: next };
  return block;
}

function groupBlock(name: string, inner: object, next?: object) {
  const block: Record<string, unknown> = {
    type: "lsl_group",
    fields: { NAME: name },
    inputs: { DO: { block: inner } },
  };
  if (next) block.next = { block: next };
  return block;
}

function setVar(id: string, name: string, type: string, value: object, next?: object) {
  const block: Record<string, unknown> = {
    type: "lsl_set_var",
    fields: { VAR: { id, name, type } },
    inputs: { VALUE: { block: value } },
  };
  if (next) block.next = { block: next };
  return block;
}

function detectedName() {
  return {
    type: "lsl_fn_llDetectedName",
    inputs: { INDEX: { shadow: { type: "lsl_integer", fields: { NUM: 0 } } } },
  };
}

function detectedKey() {
  return {
    type: "lsl_fn_llDetectedKey",
    inputs: { INDEX: { shadow: { type: "lsl_integer", fields: { NUM: 0 } } } },
  };
}

function regionSayTo(target: object, text: string, channel = 0, next?: object) {
  const block: Record<string, unknown> = {
    type: "lsl_fn_llRegionSayTo",
    inputs: {
      MSG: { shadow: { type: "lsl_string", fields: { TEXT: text } } },
      TARGET: { block: target },
      CHANNEL: { shadow: { type: "lsl_integer", fields: { NUM: channel } } },
    },
  };
  if (next) block.next = { block: next };
  return block;
}

function wrap(blocks: object[], variables?: { name: string; type: string; id: string }[]) {
  const state: Record<string, unknown> = { blocks: { languageVersion: 0, blocks } };
  if (variables) state.variables = variables;
  return state;
}

function getVar(id: string, name: string, type: string) {
  return { type: "lsl_get_var", fields: { VAR: { id, name, type } } };
}

function ncAssign(varId: string, name: string, type: string, next?: object) {
  const block: Record<string, unknown> = {
    type: "lsl_nc_assign",
    fields: { VAR: { id: varId, name, type } },
  };
  if (next) block.next = { block: next };
  return block;
}

function ncIfKey(key: string, inner: object, next?: object) {
  const block: Record<string, unknown> = {
    type: "lsl_nc_if_key",
    fields: { KEY: key },
    inputs: { DO: { block: inner } },
  };
  if (next) block.next = { block: next };
  return block;
}

function nexted(block: Record<string, unknown>, next?: object) {
  if (next) block.next = { block: next };
  return block;
}

function resetScript(next?: object) {
  return nexted({ type: "lsl_fn_llResetScript" }, next);
}

function param(name: string) {
  return { type: "lsl_param", fields: { NAME: name } };
}

function clickPay(next?: object) {
  return nexted(
    {
      type: "lsl_fn_llSetClickAction",
      inputs: {
        ACTION: { shadow: { type: "lsl_const_click", fields: { VAL: "CLICK_ACTION_PAY" } } },
      },
    },
    next,
  );
}

function payPrice(hide: boolean, next?: object) {
  return nexted(
    {
      type: "lsl_fn_llSetPayPrice",
      inputs: {
        PRICE: {
          shadow: { type: "lsl_const_pay", fields: { VAL: hide ? "PAY_HIDE" : "PAY_DEFAULT" } },
        },
        QUICK: {
          block: {
            type: "lsl_list",
            inputs: {
              A: { shadow: { type: "lsl_integer", fields: { NUM: 1 } } },
              B: { shadow: { type: "lsl_integer", fields: { NUM: 5 } } },
              C: { shadow: { type: "lsl_integer", fields: { NUM: 10 } } },
              D: { shadow: { type: "lsl_integer", fields: { NUM: 20 } } },
            },
          },
        },
      },
    },
    next,
  );
}

function compare(op: string, a: object, b: object) {
  return {
    type: "lsl_compare",
    fields: { OP: op },
    inputs: { A: { block: a }, B: b },
  };
}

function ifelse(cond: object, thenBlock: object, elseBlock: object, next?: object) {
  return nexted(
    {
      type: "lsl_ifelse",
      inputs: {
        COND: { block: cond },
        DO: { block: thenBlock },
        ELSE: { block: elseBlock },
      },
    },
    next,
  );
}

function changeTotalByAmount(next?: object) {
  return nexted(
    {
      type: "lsl_change_var",
      fields: { VAR: { id: "var_total", name: "total", type: "integer" } },
      inputs: { DELTA: { block: param("amount") } },
    },
    next,
  );
}

function hoverTotal(next?: object) {
  return nexted(
    {
      type: "lsl_fn_llSetText",
      inputs: {
        TEXT: {
          block: {
            type: "lsl_cast",
            fields: { TYPE: "string" },
            inputs: { VAL: { block: getVar("var_total", "total", "integer") } },
          },
        },
        COLOR: { shadow: { type: "lsl_color_named", fields: { COL: "<1.000, 0.900, 0.000>" } } },
        ALPHA: { shadow: { type: "lsl_float", fields: { NUM: 1 } } },
      },
    },
    next,
  );
}

function attachedNow() {
  return compare("!=", { type: "lsl_fn_llGetAttached" }, { shadow: { type: "lsl_integer", fields: { NUM: 0 } } });
}

export const EXAMPLES: Example[] = [
  {
    id: "greeter",
    title: "Touch greeter",
    blurb: "Classic hello. Touch says hello on channel 0 and owner-says Touched.",
    level: "basic",
    state: wrap([
      ev(
        "lsl_event_touch_start",
        40,
        40,
        say(
          "Hello, Avatar!",
          0,
          ownerSay("Touched."),
        ),
      ),
    ]),
  },
  {
    id: "notecard",
    title: "Notecard greeter",
    blurb: "Reads a config notecard in the same prim (inventory check, dataserver, EOF, NAK, reload on CHANGED_INVENTORY). Touch says the greeting once the card is ready. Pair with the Notecard panel.",
    level: "advanced",
    state: wrap(
      [
        {
          type: "lsl_notecard_read",
          x: 40,
          y: 20,
          fields: { NAME: "config", STATE: "default", RELOAD: true },
          inputs: {
            DO: {
              block: ncIfKey(
                "greeting",
                ncAssign("var_greeting", "greeting", "string"),
                ncIfKey("channel", ncAssign("var_channel", "channel", "integer")),
              ),
            },
            DONE: {
              block: ownerSay("Config loaded.", {
                type: "lsl_fn_llSetText",
                inputs: {
                  TEXT: { block: getVar("var_greeting", "greeting", "string") },
                  COLOR: { shadow: { type: "lsl_color_named", fields: { COL: "<1.000, 1.000, 1.000>" } } },
                  ALPHA: { shadow: { type: "lsl_float", fields: { NUM: 1 } } },
                },
              }),
            },
            MISSING: {
              block: ownerSay('Drop a notecard named "config" into this prim.'),
            },
          },
        },
        ev(
          "lsl_event_touch_start",
          40,
          420,
          {
            type: "lsl_ifelse",
            inputs: {
              COND: { block: { type: "lsl_nc_ready", fields: { NAME: "config" } } },
              DO: {
                block: {
                  type: "lsl_fn_llSay",
                  inputs: {
                    MSG: { block: getVar("var_greeting", "greeting", "string") },
                    CHANNEL: { block: getVar("var_channel", "channel", "integer") },
                  },
                },
              },
              ELSE: { block: say("Still reading the notecard…", 0) },
            },
          },
        ),
      ],
      [
        { name: "greeting", type: "string", id: "var_greeting" },
        { name: "channel", type: "integer", id: "var_channel" },
      ],
    ),
  },
  {
    id: "door",
    title: "Two-state door",
    blurb: "default is closed. Touch switches to open (90° yaw) and back. Hover text on each state_entry.",
    level: "intermediate",
    state: wrap([
      ev(
        "lsl_event_state_entry",
        40,
        30,
        hover("Closed — touch", {
          type: "lsl_fn_llSetRot",
          inputs: {
            ROT: {
              block: {
                type: "lsl_euler_rot",
                inputs: {
                  DEG: {
                    shadow: {
                      type: "lsl_vector",
                      inputs: {
                        X: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                        Y: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                        Z: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ),
      ev(
        "lsl_event_touch_start",
        420,
        30,
        { type: "lsl_state_change", fields: { NAME: "open" } },
      ),
      ev(
        "lsl_event_state_entry",
        40,
        280,
        hover("Open — touch", {
          type: "lsl_fn_llSetRot",
          inputs: {
            ROT: {
              block: {
                type: "lsl_euler_rot",
                inputs: {
                  DEG: {
                    shadow: {
                      type: "lsl_vector",
                      inputs: {
                        X: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                        Y: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                        Z: { shadow: { type: "lsl_float", fields: { NUM: 90 } } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        "open",
      ),
      ev(
        "lsl_event_touch_start",
        420,
        280,
        { type: "lsl_state_change", fields: { NAME: "default" } },
        "open",
      ),
    ]),
  },
  {
    id: "listen",
    title: "Owner commands",
    blurb: "Listens on channel 1 for the owner. spin / stop uses llTargetOmega. Listens die on state change — this one lives in default.",
    level: "intermediate",
    state: wrap([
      ev(
        "lsl_event_state_entry",
        40,
        30,
        {
          type: "lsl_fn_llListen",
          inputs: {
            CHANNEL: { shadow: { type: "lsl_integer", fields: { NUM: 1 } } },
            NAME: { shadow: { type: "lsl_string", fields: { TEXT: "" } } },
            ID: { block: { type: "lsl_fn_llGetOwner" } },
            FILTER: { shadow: { type: "lsl_string", fields: { TEXT: "" } } },
          },
          next: { block: ownerSay("Say /1 spin or /1 stop") },
        },
      ),
      ev(
        "lsl_event_listen",
        40,
        240,
        {
          type: "lsl_ifelse",
          inputs: {
            COND: {
              block: {
                type: "lsl_compare",
                fields: { OP: "==" },
                inputs: {
                  A: { block: { type: "lsl_param", fields: { NAME: "message" } } },
                  B: { shadow: { type: "lsl_string", fields: { TEXT: "spin" } } },
                },
              },
            },
            DO: {
              block: {
                type: "lsl_fn_llTargetOmega",
                inputs: {
                  AXIS: {
                    shadow: {
                      type: "lsl_vector",
                      inputs: {
                        X: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                        Y: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                        Z: { shadow: { type: "lsl_float", fields: { NUM: 1 } } },
                      },
                    },
                  },
                  RATE: { shadow: { type: "lsl_float", fields: { NUM: 1 } } },
                  GAIN: { shadow: { type: "lsl_float", fields: { NUM: 1 } } },
                },
              },
            },
            ELSE: {
              block: {
                type: "lsl_if",
                inputs: {
                  COND: {
                    block: {
                      type: "lsl_compare",
                      fields: { OP: "==" },
                      inputs: {
                        A: { block: { type: "lsl_param", fields: { NAME: "message" } } },
                        B: { shadow: { type: "lsl_string", fields: { TEXT: "stop" } } },
                      },
                    },
                  },
                  DO: {
                    block: {
                      type: "lsl_fn_llTargetOmega",
                      inputs: {
                        AXIS: {
                          shadow: {
                            type: "lsl_vector",
                            inputs: {
                              X: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                              Y: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                              Z: { shadow: { type: "lsl_float", fields: { NUM: 1 } } },
                            },
                          },
                        },
                        RATE: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                        GAIN: { shadow: { type: "lsl_float", fields: { NUM: 0 } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ),
    ]),
  },
  {
    id: "counter",
    title: "Timer counter",
    blurb: "Hover text counts seconds. Uses a global integer, llSetTimerEvent, and (string) cast — LSL will not concat an integer onto a string otherwise.",
    level: "intermediate",
    state: wrap(
      [
      ev(
        "lsl_event_state_entry",
        40,
        30,
        {
          type: "lsl_fn_llSetTimerEvent",
          inputs: { SEC: { shadow: { type: "lsl_float", fields: { NUM: 1 } } } },
          next: { block: hover("0") },
        },
      ),
      ev(
        "lsl_event_timer",
        40,
        240,
        {
          type: "lsl_change_var",
          fields: { VAR: { id: "var_count" } },
          inputs: { DELTA: { shadow: { type: "lsl_integer", fields: { NUM: 1 } } } },
          next: {
            block: {
              type: "lsl_fn_llSetText",
              inputs: {
                TEXT: {
                  block: {
                    type: "lsl_cast",
                    fields: { TYPE: "string" },
                    inputs: {
                      VAL: {
                        block: {
                          type: "lsl_get_var",
                          fields: { VAR: { id: "var_count" } },
                        },
                      },
                    },
                  },
                },
                COLOR: { shadow: { type: "lsl_color_named", fields: { COL: "<1.000, 1.000, 1.000>" } } },
                ALPHA: { shadow: { type: "lsl_float", fields: { NUM: 1 } } },
              },
            },
          },
        },
      ),
    ],
      [{ name: "count", type: "integer", id: "var_count" }],
    ),
  },
  {
    id: "dialog",
    title: "Color dialog",
    blurb: "Touch opens a 3-button dialog on channel −42. listen sets prim color from the button label.",
    level: "intermediate",
    state: wrap([
      ev(
        "lsl_event_state_entry",
        40,
        20,
        {
          type: "lsl_fn_llListen",
          inputs: {
            CHANNEL: { shadow: { type: "lsl_integer", fields: { NUM: -42 } } },
            NAME: { shadow: { type: "lsl_string", fields: { TEXT: "" } } },
            ID: { shadow: { type: "lsl_const_nullkey" } },
            FILTER: { shadow: { type: "lsl_string", fields: { TEXT: "" } } },
          },
        },
      ),
      ev(
        "lsl_event_touch_start",
        40,
        180,
        {
          type: "lsl_fn_llDialog",
          inputs: {
            AVATAR: {
              block: {
                type: "lsl_fn_llDetectedKey",
                inputs: { INDEX: { shadow: { type: "lsl_integer", fields: { NUM: 0 } } } },
              },
            },
            PROMPT: { shadow: { type: "lsl_string", fields: { TEXT: "Pick a color" } } },
            BUTTONS: {
              block: {
                type: "lsl_list",
                inputs: {
                  A: { shadow: { type: "lsl_string", fields: { TEXT: "Red" } } },
                  B: { shadow: { type: "lsl_string", fields: { TEXT: "Green" } } },
                  C: { shadow: { type: "lsl_string", fields: { TEXT: "Blue" } } },
                },
              },
            },
            CHANNEL: { shadow: { type: "lsl_integer", fields: { NUM: -42 } } },
          },
        },
      ),
      ev(
        "lsl_event_listen",
        40,
        420,
        {
          type: "lsl_ifelse",
          inputs: {
            COND: {
              block: {
                type: "lsl_compare",
                fields: { OP: "==" },
                inputs: {
                  A: { block: { type: "lsl_param", fields: { NAME: "message" } } },
                  B: { shadow: { type: "lsl_string", fields: { TEXT: "Red" } } },
                },
              },
            },
            DO: {
              block: {
                type: "lsl_fn_llSetColor",
                inputs: {
                  COLOR: { shadow: { type: "lsl_color_named", fields: { COL: "<1.000, 0.000, 0.000>" } } },
                  FACE: { shadow: { type: "lsl_const_face", fields: { VAL: "ALL_SIDES" } } },
                },
              },
            },
            ELSE: {
              block: {
                type: "lsl_ifelse",
                inputs: {
                  COND: {
                    block: {
                      type: "lsl_compare",
                      fields: { OP: "==" },
                      inputs: {
                        A: { block: { type: "lsl_param", fields: { NAME: "message" } } },
                        B: { shadow: { type: "lsl_string", fields: { TEXT: "Green" } } },
                      },
                    },
                  },
                  DO: {
                    block: {
                      type: "lsl_fn_llSetColor",
                      inputs: {
                        COLOR: { shadow: { type: "lsl_color_named", fields: { COL: "<0.000, 1.000, 0.000>" } } },
                        FACE: { shadow: { type: "lsl_const_face", fields: { VAL: "ALL_SIDES" } } },
                      },
                    },
                  },
                  ELSE: {
                    block: {
                      type: "lsl_fn_llSetColor",
                      inputs: {
                        COLOR: { shadow: { type: "lsl_color_named", fields: { COL: "<0.000, 0.350, 1.000>" } } },
                        FACE: { shadow: { type: "lsl_const_face", fields: { VAL: "ALL_SIDES" } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ),
    ]),
  },
  {
    id: "sensor",
    title: "Nearby greeter",
    blurb: "Repeating agent sensor, 8 m, full sphere. Says hello to the nearest avatar every sweep.",
    level: "advanced",
    state: wrap([
      ev(
        "lsl_event_state_entry",
        40,
        40,
        {
          type: "lsl_fn_llSensorRepeat",
          inputs: {
            NAME: { shadow: { type: "lsl_string", fields: { TEXT: "" } } },
            ID: { shadow: { type: "lsl_const_nullkey" } },
            TYPE: { shadow: { type: "lsl_const_sensor", fields: { VAL: "AGENT" } } },
            RANGE: { shadow: { type: "lsl_float", fields: { NUM: 8 } } },
            ARC: { shadow: { type: "lsl_const_math", fields: { VAL: "PI" } } },
            RATE: { shadow: { type: "lsl_float", fields: { NUM: 5 } } },
          },
        },
      ),
      ev(
        "lsl_event_sensor",
        40,
        260,
        say("Hello there", 0),
      ),
    ]),
  },
  {
    id: "wired",
    title: "Detect then greet",
    blurb: "detect writes the toucher’s name into who; greet says it. Set and get of the same name draws the noodle.",
    level: "intermediate",
    state: wrap(
      [
        ev(
          "lsl_event_touch_start",
          40,
          40,
          groupBlock(
            "detect",
            setVar("var_who", "who", "string", detectedName()),
            groupBlock("greet", sayValue(getVar("var_who", "who", "string"))),
          ),
        ),
      ],
      [{ name: "who", type: "string", id: "var_who" }],
    ),
  },
  {
    id: "wired-sensor",
    title: "Sensor then greet",
    blurb: "Repeating agent sensor. One group writes the nearest name into who; the other says it.",
    level: "advanced",
    state: wrap(
      [
        ev(
          "lsl_event_state_entry",
          40,
          20,
          {
            type: "lsl_fn_llSensorRepeat",
            inputs: {
              NAME: { shadow: { type: "lsl_string", fields: { TEXT: "" } } },
              ID: { shadow: { type: "lsl_const_nullkey" } },
              TYPE: { shadow: { type: "lsl_const_sensor", fields: { VAL: "AGENT" } } },
              RANGE: { shadow: { type: "lsl_float", fields: { NUM: 8 } } },
              ARC: { shadow: { type: "lsl_const_math", fields: { VAL: "PI" } } },
              RATE: { shadow: { type: "lsl_float", fields: { NUM: 5 } } },
            },
          },
        ),
        ev(
          "lsl_event_sensor",
          40,
          240,
          groupBlock(
            "sense",
            setVar("var_who", "who", "string", detectedName()),
            groupBlock(
              "greet",
              sayValue(getVar("var_who", "who", "string"), 0, ownerSay("Sensor tick.")),
            ),
          ),
        ),
      ],
      [{ name: "who", type: "string", id: "var_who" }],
    ),
  },
  {
    id: "wired-id",
    title: "Name and key",
    blurb: "detect writes who (name) and id (key). greet says the name in public and region-says a private hello to the key.",
    level: "expert",
    state: wrap(
      [
        ev(
          "lsl_event_touch_start",
          40,
          40,
          groupBlock(
            "detect",
            setVar(
              "var_who",
              "who",
              "string",
              detectedName(),
              setVar("var_id", "id", "key", detectedKey()),
            ),
            groupBlock(
              "greet",
              sayValue(
                getVar("var_who", "who", "string"),
                0,
                regionSayTo(getVar("var_id", "id", "key"), "private hello"),
              ),
            ),
          ),
        ),
      ],
      [
        { name: "who", type: "string", id: "var_who" },
        { name: "id", type: "key", id: "var_id" },
      ],
    ),
  },
  {
    id: "placeable",
    title: "Land drop greeter",
    blurb: "on_rez resets, hover on state_entry, touch greets. Drop it on the ground.",
    level: "basic",
    state: wrap([
      ev("lsl_event_on_rez", 40, 20, resetScript()),
      ev("lsl_event_state_entry", 40, 180, hover("Touch me")),
      ev("lsl_event_touch_start", 40, 360, say("Hello, Avatar!", 0, ownerSay("Touched."))),
    ]),
  },
  {
    id: "tipjar",
    title: "Tip jar",
    blurb: "Pay pie (1/5/10/20), money event adds to total, hover updates. L$ goes to the owner — no debit.",
    level: "intermediate",
    state: wrap(
      [
        ev(
          "lsl_event_state_entry",
          40,
          20,
          clickPay(payPrice(false, hover("Tip jar — L$0"))),
        ),
        ev(
          "lsl_event_money",
          40,
          280,
          changeTotalByAmount(say("Thanks!", 0, hoverTotal())),
        ),
      ],
      [{ name: "total", type: "integer", id: "var_total" }],
    ),
  },
  {
    id: "wearable",
    title: "Wearable HUD",
    blurb: "attach owner-says HUD on / Detached. on_rez resets. Worn things stay off Nearby.",
    level: "intermediate",
    state: wrap([
      ev(
        "lsl_event_attach",
        40,
        20,
        ifelse(
          compare("!=", param("id"), { shadow: { type: "lsl_const_nullkey" } }),
          ownerSay("HUD on"),
          ownerSay("Detached"),
        ),
      ),
      ev("lsl_event_on_rez", 40, 280, resetScript()),
    ]),
  },
  {
    id: "dual",
    title: "Worn or placed",
    blurb: "llGetAttached branches setup and touch. HUD stays private; on land it greets.",
    level: "advanced",
    state: wrap([
      ev("lsl_event_on_rez", 40, 20, resetScript()),
      ev(
        "lsl_event_state_entry",
        40,
        180,
        ifelse(attachedNow(), ownerSay("Ready (worn)", hover("")), hover("Touch me")),
      ),
      ev(
        "lsl_event_touch_start",
        40,
        420,
        ifelse(attachedNow(), ownerSay("Private HUD tap"), say("Hello, Avatar!")),
      ),
    ]),
  },
  {
    id: "tipjar-hud",
    title: "Traveling tip jar",
    blurb: "Pay pie on land, PAY_HIDE when worn. CHANGED_OWNER resets the total.",
    level: "expert",
    state: wrap(
      [
        ev("lsl_event_on_rez", 420, 20, resetScript()),
        ev(
          "lsl_event_state_entry",
          40,
          20,
          clickPay(payPrice(false, hover("Tip jar — L$0"))),
        ),
        ev(
          "lsl_event_attach",
          40,
          280,
          ifelse(
            compare("!=", param("id"), { shadow: { type: "lsl_const_nullkey" } }),
            payPrice(true, hover("")),
            clickPay(payPrice(false, hover("Tip jar — L$0"))),
          ),
        ),
        ev(
          "lsl_event_money",
          40,
          520,
          changeTotalByAmount(say("Thanks!", 0, hoverTotal())),
        ),
        ev(
          "lsl_event_changed",
          420,
          180,
          {
            type: "lsl_if",
            inputs: {
              COND: {
                block: {
                  type: "lsl_bitwise",
                  fields: { OP: "&" },
                  inputs: {
                    A: { block: param("change") },
                    B: { shadow: { type: "lsl_const_changed", fields: { VAL: "CHANGED_OWNER" } } },
                  },
                },
              },
              DO: { block: resetScript() },
            },
          },
        ),
      ],
      [{ name: "total", type: "integer", id: "var_total" }],
    ),
  },
  {
    id: "split-tips",
    title: "Split tips",
    blurb: "PERMISSION_DEBIT, then llGiveMoney half the amount to a partner key. Odd L$ stay with the owner.",
    level: "expert",
    state: wrap(
      [
        ev(
          "lsl_event_state_entry",
          40,
          20,
          {
            type: "lsl_fn_llRequestPermissions",
            inputs: {
              AGENT: { block: { type: "lsl_fn_llGetOwner" } },
              PERM: { shadow: { type: "lsl_const_perm", fields: { VAL: "PERMISSION_DEBIT" } } },
            },
            next: { block: clickPay(payPrice(false, hover("Tip jar — L$0"))) },
          },
        ),
        ev(
          "lsl_event_run_time_permissions",
          40,
          280,
          ifelse(
            {
              type: "lsl_bitwise",
              fields: { OP: "&" },
              inputs: {
                A: { block: param("perm") },
                B: { shadow: { type: "lsl_const_perm", fields: { VAL: "PERMISSION_DEBIT" } } },
              },
            },
            ownerSay("Debit granted — splits will fire."),
            ownerSay("No debit — splits will not fire."),
          ),
        ),
        ev(
          "lsl_event_money",
          40,
          520,
          changeTotalByAmount(
            say(
              "Thanks!",
              0,
              {
                type: "lsl_if",
                inputs: {
                  COND: {
                    block: compare(
                      "!=",
                      getVar("var_partner", "partner", "key"),
                      { shadow: { type: "lsl_const_nullkey" } },
                    ),
                  },
                  DO: {
                    block: {
                      type: "lsl_fn_llGiveMoney",
                      inputs: {
                        DEST: { block: getVar("var_partner", "partner", "key") },
                        AMOUNT: {
                          block: {
                            type: "lsl_arithmetic",
                            fields: { OP: "/" },
                            inputs: {
                              A: { block: param("amount") },
                              B: { shadow: { type: "lsl_integer", fields: { NUM: 2 } } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                next: { block: hoverTotal() },
              },
            ),
          ),
        ),
      ],
      [
        { name: "total", type: "integer", id: "var_total" },
        { name: "partner", type: "key", id: "var_partner" },
      ],
    ),
  },
];

export function exampleById(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
