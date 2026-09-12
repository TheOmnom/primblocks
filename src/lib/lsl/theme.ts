import * as Blockly from "blockly/core";

export const primTheme = Blockly.Theme.defineTheme("primblocks", {
  name: "primblocks",
  base: Blockly.Themes.Zelos,
  componentStyles: {
    workspaceBackgroundColour: "#16181f",
    toolboxBackgroundColour: "#101218",
    toolboxForegroundColour: "#e8e6e1",
    flyoutBackgroundColour: "#1c1f28",
    flyoutForegroundColour: "#e8e6e1",
    flyoutOpacity: 0.98,
    scrollbarColour: "#3a3d4a",
    insertionMarkerColour: "#4aa89c",
    insertionMarkerOpacity: 0.45,
    scrollbarOpacity: 0.4,
    cursorColour: "#4aa89c",
    markerColour: "#4aa89c",
  },
  fontStyle: {
    family: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
    weight: "500",
    size: 12,
  },
});
