---
name: studio-screenshots
description: Take screenshots and GIFs of RosTooling Studio for the documentation, by running the extension's real webview in headless Chrome with the real Java model server, outside VS Code. Use when a docs page needs a new or updated image of the Studio, or when the Studio changed and the existing images must be retaken.
---

# Screenshots and GIFs of RosTooling Studio

The tooling is committed in `tools/screenshots/` of this repository. Read its `README.md` first. Nothing has to be installed beyond what the README lists.

## What it is

- `harness.js` serves the Studio on `http://127.0.0.1:$PORT`. It runs the extension's own `RosCustomEditorProvider`, `GlspClientBridge` and built webview, with a stub for the `vscode` module and the real Java server JAR. What you see is the real Studio, not a mock-up.
- `cdp.js` drives headless Google Chrome over `--remote-debugging-pipe`, with no npm packages. `lib.js` has the helpers (open a model, click by text, wait, screenshot, record frames).
- `s*.js` take screenshots, `g*.js` record GIFs with ImageMagick `convert`. `workspace/` has the sample models. `ac_system.orig` is the starting file of the auto-connect GIF.

## Needs

Node 20, Java 21, Google Chrome (`google-chrome`), ImageMagick (`convert`), the extension compiled (`npm run compile` in `RosTooling_Extension/rostooling-languages`, which creates `out/`), and a server JAR in `rostooling-languages/server/` (use the newest `rostooling_extension-*.jar`; for features that are not released yet use the combined JAR that the RosTooling session builds).

## Steps

Use a scratch folder, never the repository, for the working copy: the Studio writes into the models it opens.

```bash
EXT=/home/adm-esa/coresense-ws/src/RosTooling_Extension/rostooling-languages
SCR=<scratchpad>                      # any scratch folder
cp -r tools/screenshots/workspace $SCR/work
EXT_ROOT=$EXT WS_ROOT=$SCR/work ROSMODEL_JAR=$EXT/server/rostooling_extension-2.5.0.jar \
  PORT=8790 GLSP_PORT=5995 nohup node tools/screenshots/harness.js > $SCR/harness.log 2>&1 &
cd tools/screenshots
D=$SCR/work/src/robot_demo OUT=../../vscode/images node s1.js     # screenshots
```

Pages open at `http://127.0.0.1:8790/open?file=<absolute path of a model>`. Images go to `vscode/images/` (extension pages) and `docu/images/` (RosTooling pages). Look at each new image before you commit it. Then check that the text of the page matches what the image shows.

## Things that went wrong before

- **A stale server.** Use a fresh `GLSP_PORT` (or stop the old harness) every time you change the JAR. A harness that is still running keeps the old GLSP server, and the images show old behaviour.
- **Cached text.** The harness re-reads a file when it opens. If a model looks old, check that the harness was started with the right `WS_ROOT`.
- **Stop the harness with its pid**, found with `pgrep -f "^node .*harness.js"`. Do not use `pkill -f` with a pattern that also matches your own shell command.
- **Models must validate** before you shoot them. Run the example checker for the page (`python3 tools/check_examples.py --only <group>`) or `validate_ros_model`.
- **Sizes.** The screenshot scripts set the viewport. Keep it, so that images look alike across pages. GIFs are recorded frame by frame and converted with `convert`; keep them short and under about 1 MB.

## After taking images

Reference them from the page with `{image}` or `![alt](images/name.png)`, run the strict build (`sphinx-build -W --keep-going -b html . _build/html`) and commit the images with the page change.
