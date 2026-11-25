# Agent skills

A skill is a set of instructions that an AI agent loads when a task needs it. The extension delivers six skills. Together they let an agent write correct RosTooling models, build the code of a system and draw it, without you explaining the languages first. The [MCP tools](mcp-and-agents.md#the-tools) are what the agent uses to change the files. The skills tell it when and how.

You do not choose a tool. You describe what you want, and the agent picks the skill that fits. In Claude Code every skill is also a slash command, such as `/ros-model`.

## Install the skills

Run **RosTooling: Install AI Agent Skills & MCP** from the Command Palette and choose the agent, see [Setting up an agent](mcp-and-agents.md#setting-up-an-agent). The skills are copied to the place where the agent looks for them:

| Agent | Where the skills go |
| --- | --- |
| Claude Code | `.claude/skills/` and `.claude/commands/` (for the slash commands) |
| Antigravity, Codex CLI, Gemini CLI | `.agents/skills/` (Antigravity: `~/.gemini/config/skills/` for all workspaces) |
| Cursor | `.cursor/rules/` |

For the current workspace the folders are in the workspace, for all workspaces they are in your home folder. When the extension is updated, install again to get the new skills.

## The skills

| Skill | Ask it to | You get |
| --- | --- | --- |
| [`ros-model`](#ros-model) | Model a package, a node or a system | `.ros`, `.ros2` and `.rossystem` files that pass validation |
| [`ros-modeler`](#ros-modeler) | (Used with `ros-model`) | Fewer silent mistakes in the files |
| [`ros-node-developer`](#ros-node-developer) | Implement the behaviour of one node | The logic of the node, in the files that generation never overwrites |
| [`ros-system-builder`](#ros-system-builder) | Build a whole system | All custom nodes implemented in parallel, the launch package generated, the build checked |
| [`ros-plot`](#ros-plot) | Show a system | One HTML file with the system as an interactive graph |
| [`update-ros-catalog`](#update-ros-catalog) | Refresh the list of well-known ROS packages | An updated reference table the agent can suggest packages from |

### ros-model

The skill for everything that is a model. Use it to

- **create models from scratch**: a package with its nodes, publishers, subscribers, services, actions and parameters, message types, and a system that connects nodes,
- **create models from existing code**: give it the path of a ROS 2 package. It first runs the extractors that come with the extension. They read every publisher, subscriber, service, action and parameter whose name and type are written literally in the source. What the extractors cannot read, for example a topic name that is computed, is marked in the draft, and the agent resolves it from the code or asks you. See [Model an existing package with an agent](../docu/Tutorial_AgentModelling.md),
- **fix or review** an existing model against the rules of the languages,
- **suggest packages** that fit a project, from the catalogue and the list of well-known packages. It never invents a package name.

The skill knows the syntax of the three languages and the rules that are easy to break, such as quoting, the order of members, the form of `from:` and the direction of connections. It writes the files with the MCP tools and validates them with `validate_ros_model`.

Examples of what to say:

> Model the ROS 2 package in `src/scan_filter`.

> Create a system `patrol` with the nodes `nav2_amcl.amcl` and `my_planner.planner`, and connect what fits.

In Claude Code: `/ros-model src/scan_filter`.

### ros-modeler

A checklist of the twelve rules that most often corrupt a model silently: wrong quoting, wrong order of members, a boolean or a double that is typed as the wrong type, nesting that is not allowed. The agent reads it before it writes or edits a model, in addition to `ros-model`. You do not call it yourself.

### ros-node-developer

Implements the behaviour of a node from its `.ros2` model, so that you write no middleware. The skill follows the split of the [generated code](../docu/Ros2CodeGeneration.md): the wrappers with publishers, subscribers, parameters and QoS are generated and never edited, and the agent writes only the logic file that generation creates once and then leaves alone (`*_logic.py`, or `*Algorithm.hpp` and `*Algorithm.cpp` in C++). Its steps are to review the model, generate the wrappers, implement the logic, and build.

> Implement the node `scan_filter` so that it removes ranges outside `min_range` and `max_range` before it publishes.

### ros-system-builder

For a system of several nodes. The agent reads the `.rossystem` file and sorts the nodes into off-the-shelf nodes, such as Nav2 or turtlesim, which need no code, and custom nodes of your project. It starts one sub-agent per custom node, each using `ros-node-developer`, so that one conversation does not have to hold the whole system. When they are done it generates the launch package with `generate_rossystem_code` and checks that everything builds.

> Build the system in `patrol.rossystem`.

This skill needs an agent that can start sub-agents.

### ros-plot

Draws one or more `.rossystem` files as a single HTML file that opens in the browser without a network. It has four levels of detail, from the declared connections to the full interfaces and parameters. Boxes can be dragged, a click on a box shows only its connections. With several files the page has a tab for each. The picture only shows what the files declare. It never adds a connection.

> Plot `patrol.rossystem`.

The agent tells you where the HTML file is and does not open it, unless you ask. The script needs `python3`. For a picture inside VS Code, use [RosTooling Studio](studio.md) instead.

### update-ros-catalog

Refreshes the table of well-known ROS 2 packages in `references/popular-ros-packages.md`, from metrics.ros.org and two curated lists, plus addresses that you add. The agent uses the table to suggest packages. It is not a source for `from:` and `type:` references, which are always resolved against the catalogue of the extension. The agent needs access to the web for this skill and reports when a source could not be read.

## Checks after every change

For the agents that support hooks, the installation also adds a hook. After the agent writes or edits a `.ros`, `.ros2` or `.rossystem` file, a linter checks it and reports problems back to the agent, which then corrects them. The validation of the language server, as in [Validation](../docu/Validation.md), remains the authority.

## What the skills cannot do

- They do not write ROS 2 code, launch files or `package.xml` by hand. Those come from the [generators](../docu/Ros2CodeGeneration.md).
- They do not model ROS 1 packages.
- A model made from code is a draft that you review. The agent can read only what the code states.
