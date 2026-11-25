# Model an existing package with an agent

![](images/Ros2_logo_mini.png) This tutorial needs no ROS installation to create the models. To build and run the result later you need ROS 2.

Most ROS code was written without a model. Instead of writing the model by hand, you can ask an AI agent to read the code and create it. The agent uses the [skills](../vscode/agent-skills.md) of the extension, which know the languages, and the [MCP tools](../vscode/mcp-and-agents.md), which write and check the files. In this tutorial you model a small Python package, add a second node that is not written yet, connect both in a system, and generate the code.

```{note}
This replaces the earlier tutorial about static code analysis with HAROS in a Docker container. That extractor does not work for current distributions and its page is [archived](old/StaticCodeAnalyis.md).
```

**What you need:** the [VS Code extension](../vscode/overview.md), and an AI agent from the list that the extension sets up: Claude Code, Antigravity, Codex CLI, Cursor or Gemini CLI. The skills and the tools are the same for all of them, and the tutorial works with each. Python 3 is needed by the extractors. For C++ packages they also need `pip install tree_sitter tree_sitter_cpp`; without it C++ packages are skipped and the agent reads them itself.

## 1. Set up the agent

Open an empty folder in VS Code. Run **RosTooling: Install AI Agent Skills & MCP** from the Command Palette, choose your agent and **current workspace**. This installs the skills and the MCP configuration, see [Agent skills](../vscode/agent-skills.md#install-the-skills). Start your agent in the folder, in its terminal or its panel in the editor. If the agent was running during the installation, restart it so that it loads the skills and the MCP server.

## 2. The package to model

Create `src/scan_filter/scan_filter/scan_filter_node.py`. This is a plain ROS 2 node with a subscriber, a publisher, a service and three parameters.

```python
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from std_srvs.srv import Trigger


class ScanFilter(Node):
    def __init__(self):
        super().__init__('scan_filter')
        self.declare_parameter('min_range', 0.2)
        self.declare_parameter('max_range', 10.0)
        self.declare_parameter('frame_id', 'laser')
        self.pub = self.create_publisher(LaserScan, 'scan_filtered', 10)
        self.sub = self.create_subscription(LaserScan, 'scan', self.on_scan, 10)
        self.srv = self.create_service(Trigger, 'reset_filter', self.on_reset)

    def on_scan(self, msg):
        self.pub.publish(msg)

    def on_reset(self, request, response):
        response.success = True
        return response


def main():
    rclpy.init()
    rclpy.spin(ScanFilter())
```

The package also needs a `package.xml` that declares the name `scan_filter` and the build type `ament_python`, and a `setup.py` with the entry point. The agent reads them to find the name of the package.

## 3. Ask for the model

Tell the agent what you want, in your own words:

> Model the ROS 2 package in `src/scan_filter`.

The agent finds the right skill from your request. You can also name it: "Use the `ros-model` skill to model the package in `src/scan_filter`." Some agents offer the skill as a command as well, for example `/ros-model src/scan_filter` in Claude Code.

The agent first runs the extractor of the skill on the package. The extractor reads every publisher, subscriber, service, action and parameter whose name and type are written literally in the code, and writes a draft. Then the agent validates the file with `validate_ros_model`. You find `rosnodes/scan_filter.ros2`:

<!-- check: group=agent file=scan_filter.ros2 -->
```text
scan_filter:
  artifacts:
    scan_filter_node:
      node: scan_filter
      publishers:
        'scan_filtered':
          type: 'sensor_msgs/msg/LaserScan'
      subscribers:
        'scan':
          type: 'sensor_msgs/msg/LaserScan'
      serviceservers:
        'reset_filter':
          type: 'std_srvs/srv/Trigger'
      parameters:
        'frame_id':
          type: String
          default: "laser"
        'max_range':
          type: Double
          default: 10.0
        'min_range':
          type: Double
          default: 0.2
```

The file starts with comments that say how many items the extractor could not read. Here it is none, because every call in the code is literal. If the code builds a topic name from a variable, the draft lists it as a flag instead of guessing. The agent then looks for the value in the code, or asks you.

Open the file in [RosTooling Studio](../vscode/studio.md) to see the node with its ports and parameters, and check that it is what you expect.

```{image} images/agent-scan-filter.png
:alt: The model scan_filter in RosTooling Studio: one subscriber, one publisher and one service server
:width: 100%
```
 The model is a draft that you review: the agent only knows what the code states.

## 4. Add a node that does not exist yet

Not every node has code. Describe it:

> Add a package model `lidar_driver` with a node `lidar_node` that publishes `scan` of type `sensor_msgs/msg/LaserScan`.

The agent uses the tools `ros2_add_artifact` and `ros2_add_interface`, which write the file in the right form, and creates `rosnodes/lidar_driver.ros2`:

<!-- check: group=agent file=lidar_driver.ros2 -->
```text
lidar_driver:
  artifacts:
    lidar_node:
      node: lidar_node
      publishers:
        scan:
          type: "sensor_msgs/msg/LaserScan"
```

## 5. Connect them in a system

> Create the system `scan_system` with the nodes `lidar_driver.lidar_node` and `scan_filter.scan_filter`, and connect what fits.

The agent adds both nodes with `ros_add_node`, asks for the candidate connections with `ros_auto_connect`, applies the ones that fit and validates. The publisher `scan` of the driver and the subscriber `scan` of the filter have the same name and type, so they are connected. The result, `scan_system.rossystem`:

<!-- check: group=agent file=scan_system.rossystem -->
```text
scan_system:
  nodes:
    lidar:
      from: "lidar_driver.lidar_node"
      interfaces:
        - scan: pub-> "lidar_node::scan"
    filter:
      from: "scan_filter.scan_filter"
      interfaces:
        - scan: sub-> "scan_filter_node::scan"
  connections:
    - [ "lidar::scan" , "filter::scan" ]
```

Open it in the Studio. The same connection is drawn as a wire between the two nodes, and the pill shows **Valid**.

```{image} images/agent-scan-system.png
:alt: The system scan_system in RosTooling Studio: lidar connected to filter
:width: 100%
```
 If the agent proposes a connection that you do not want, say so, or remove the wire in the Studio. See [Auto-connect](../vscode/auto-connect.md) for how candidates are ranked.

```{note}
In `from:`, the part after the dot is the name of the **node** in the package model, not the name of the artifact. For `scan_filter` the artifact is `scan_filter_node` and the node is `scan_filter`. The agent knows this rule. If you edit by hand, see [Systems](RosSystemModelDescription.md).
```

## 6. Generate and build

> Generate the code for `scan_system` and for the `scan_filter` package, in Python.

The agent calls `generate_ros2_wrappers` for the package and `generate_rossystem_code` for the system. They write to `src-gen/`: the wrappers and the logic file `scan_filter_logic.py` of the node, and the package `scan_system` with its launch file. See [Code generation](Ros2CodeGeneration.md) and [System generation](CodeGeneration.md).

To let the agent write the behaviour, continue with the skill `ros-node-developer`:

> Implement the node `scan_filter` so that it drops ranges outside `min_range` and `max_range` before it publishes, then build.

It writes only into `scan_filter_logic.py`, which generation never overwrites, and builds with `colcon build`. For a system with many custom nodes use `ros-system-builder`, see [Agent skills](../vscode/agent-skills.md).

## What you learned

- The agent creates models from code with the extractor of the skill, and only from what the code states.
- The same MCP tools that you can use in the Studio write the files, so the result is always a valid model.
- You review the models, in the Studio or as text, before generating code.

## Limits

- An agent is not deterministic. Two runs can differ in names that the code does not state. Review what it wrote.
- The extractor reads Python and C++ code, and only names that are literal. Names that are computed at run time must be resolved by the agent, or by you.
- For a node that is running, you can also create its model from the running system, see [Extract component models using introspection at runtime](ros2model.md).
