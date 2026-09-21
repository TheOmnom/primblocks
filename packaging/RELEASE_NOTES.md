PrimBlocks 0.2.9

Pick **one** file. You do not need Git or Node.

| I use… | Click this |
| --- | --- |
| Windows, just make it work | **PrimBlocks-Setup.exe** |
| Windows, no installer | PrimBlocks-windows.zip |
| Mac | PrimBlocks-mac.dmg |
| Linux | PrimBlocks-linux.AppImage |
| I want the code | Source code (zip) at the bottom — that's the programmer one |

**Windows:** double-click the Setup. If it says *Windows protected your PC* → More info → Run anyway. Same warning Firestorm gives the first time.

**Mac:** this build is not signed with an Apple developer cert. Right-click PrimBlocks → Open. Intel and Apple Silicon are both in the dmg.

**Linux:** make it executable (`chmod +x PrimBlocks-linux.AppImage`) then double-click, or run it from a terminal.

Then: **Tutorials** (Basic → Hello, Avatar!) or **Examples → Touch greeter → Copy.** In Second Life: right-click a prim → Build → Content → New Script → paste → Save.

Since 0.2.6:

- Yellow brick next to the title is the File menu (New / Open / Save / Save As / Import LSL). Import rebuilds bricks from a `.lsl` or `.txt`. Save writes a `.primblocks` project — Copy / Download on the right is still the compiled script.
- Tip jar, wearable, land-drop, and worn+placed walkthroughs. Tutorials name the left-list category and the brick as it is printed (Events → **when touched**, not `touch_start`).
- **Tips** in the header. Drop a brick, get a bubble.
- Wiki event set: Combat 2.0 hats and `game_control`. Calls that people fire as statements (`llGiveMoney`, `llSetRegionPos`, …) snap under a hat.
- Mouse wheel zooms. Flyout scrollbar goes away when the menu closes. Cables go around bricks instead of through them.

Walkthrough: packaging/GETTING_STARTED.txt in the repo (also inside the Windows zip).
