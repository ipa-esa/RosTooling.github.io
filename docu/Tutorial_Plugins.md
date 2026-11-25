# Tutorial: ROS 2 plugins

![](images/Ros2_logo_mini.png) In this tutorial you model a node that loads its algorithm as a plugin, two planners and two critics that plug into it, and a system that chooses which ones to use. RosTooling generates the plugin classes, the loading code and the launch file, you write a few lines for each plugin, and you run the result. It takes about 45 minutes and needs ROS 2 and a C++ compiler.

Plugins here are the *pluginlib* plugins of ROS 2, as the planners and controllers of Nav2 use them. They are not the Java plugins that extend RosTooling itself, see [Plugins: concepts](PluginConcepts.md) for the difference. The names in this tutorial are invented.

**What you need:** the [VS Code extension](../vscode/overview.md), ROS 2 (Jazzy in the examples), and the previous tutorials for the syntax: [package models](LearnRosModels.md) and [system models](LearnRosSystemModels.md). The page [Plugins: concepts](PluginConcepts.md) explains the parts in detail.

```{note}
**Preview.** Plugin models are not released yet and may still change. They need a RosTooling version that is newer than the current release.
```

## 1. The interfaces of the plugins

A plugin implements a C++ interface. RosTooling does not generate it, because it is the contract between the node and its plugins. Create a ROS 2 package `demo_core` with two headers. The package contains nothing else.

`demo_core/include/demo_core/planner.hpp`:

```cpp
#pragma once
#include <string>

namespace demo_core {
class Planner {
public:
  virtual ~Planner() = default;
  // Returns a description of the plan from start to goal.
  virtual std::string plan(double start, double goal) = 0;
};
}  // namespace demo_core
```

`demo_core/include/demo_core/critic.hpp`:

```cpp
#pragma once

namespace demo_core {
class Critic {
public:
  virtual ~Critic() = default;
  // Returns a cost for a plan length. Lower is better.
  virtual double score(double length) = 0;
};
}  // namespace demo_core
```

`demo_core/package.xml` declares `ament_cmake` as build tool, and `demo_core/CMakeLists.txt` installs the headers:

```cmake
cmake_minimum_required(VERSION 3.8)
project(demo_core)
find_package(ament_cmake REQUIRED)
install(DIRECTORY include/ DESTINATION include/${PROJECT_NAME})
ament_export_include_directories(include/${PROJECT_NAME})
ament_package()
```

## 2. The models

Create a folder for the models and open it in VS Code. The first model tells RosTooling about the two interfaces. In the model they are *plugin bases*:

<!-- check: group=plugintut file=demo_core.ros2 -->
```text
demo_core:
  pluginbases:
    Planner:
      class: "demo_core::Planner"
      header: "demo_core/planner.hpp"
      loader: pluginlib
    Critic:
      class: "demo_core::Critic"
      header: "demo_core/critic.hpp"
      loader: pluginlib
```

The node that uses the plugins has a *slot* for each kind. The slot `planner` takes one planner and uses `StraightLine` when nobody chooses another. The slot `critics` takes any number of critics. Create `demo_planner_server.ros2`:

<!-- check: group=plugintut file=demo_planner_server.ros2 -->
```text
demo_planner_server:
  artifacts:
    planner_server:
      node: planner_server
      pluginslots:
        planner:
          base: demo_core.Planner
          parameter: planner_plugin
          default: demo_planners.StraightLine
        critics:
          base: demo_core.Critic
          parameter: critic_plugins
          multiple: true
```

The package `demo_planners` provides the plugins. An artifact with `plugins:` instead of `node:` is a library of plugins. Create `demo_planners.ros2`:

<!-- check: group=plugintut file=demo_planners.ros2 -->
```text
demo_planners:
  artifacts:
    planners:
      plugins:
        StraightLine:
          implements: demo_core.Planner
        Smooth:
          implements: demo_core.Planner
    critics:
      plugins:
        AlignCritic:
          implements: demo_core.Critic
        GoalCritic:
          implements: demo_core.Critic
```

The Studio shows the plugin package as a list of plugin libraries, each plugin with the base that it implements, and the node with its two slots:

```{image} images/plugins-package.png
:alt: The package demo_planners in RosTooling Studio: two libraries with two plugins each
:width: 100%
```

```{image} images/plugins-node.png
:alt: The node planner_server in RosTooling Studio with its two plugin slots
:width: 100%
```

## 3. The system

The system chooses the plugins for the slots of the node. Create `demo_system.rossystem`:

<!-- check: group=plugintut file=demo_system.rossystem -->
```text
demo_system:
  nodes:
    planner_server:
      from: "demo_planner_server.planner_server"
      slots:
        planner: [demo_planners.Smooth]
        critics: [demo_planners.AlignCritic, demo_planners.GoalCritic]
```

References between packages are written `<package>.<name>`. In the Studio, select the node to see the plugins attached to each slot, and change them there:

```{image} images/plugins-system.png
:alt: The system demo_system in RosTooling Studio: the inspector shows the plugins of each slot
:width: 100%
```

A plugin that does not implement the base of its slot, or a slot that takes one plugin but gets two, is reported in the Studio and in the Problems view, see [Validation](Validation.md).

## 4. Generate the code

Right-click `demo_planners.ros2` and choose **Generate ROS 2 Node Wrappers**, then **C++**. Do the same for `demo_planner_server.ros2`. The code is written to `src-gen/`. For the plugins you get:

```text
src-gen/demo_planners/
├── plugins.xml                          the description that pluginlib reads
├── include/demo_planners/
│   ├── smooth_plugin.hpp                your code, written once
│   ├── smooth_plugin_wrapper.hpp        the ROS 2 side, regenerated every time
│   └── ...                              the same for the other three plugins
└── src/
    ├── smooth_plugin.cpp                registers the plugin with pluginlib
    └── ...
```

For the node, the usual wrapper and runner are generated and, written once, `PlannerServerAlgorithm.hpp` for your logic. The wrapper declares the parameters `planner_plugin` and `critic_plugins`, loads the plugins that they name with a pluginlib class loader when the node starts, and hands them to your logic. See [ROS 2 code generation](Ros2CodeGeneration.md).

Then right-click `demo_system.rossystem` and choose **Generate ROS2 Package**. That writes the package `demo_system` with the launch file.

## 5. Write the logic

**The plugins.** Each `*_plugin.hpp` has a class that derives from the base. Implement its method. For `smooth_plugin.hpp`:

```cpp
class Smooth : public demo_core::Planner {
public:
    Smooth() = default;
    ~Smooth() override = default;

    std::string plan(double start, double goal) override {
        double mid = (start + goal) / 2.0;
        return "smooth curve from " + std::to_string(start) + " over " + std::to_string(mid) +
               " to " + std::to_string(goal);
    }

protected:
    SmoothRosWrapper ros_wrapper_;
};
```

In `straight_line_plugin.hpp` let `plan` return `"straight line from ... to ..."` in the same way. In `align_critic_plugin.hpp` write `double score(double length) override { return 0.1 * length; }`, and in `goal_critic_plugin.hpp` the same with `0.5`.

**The node.** The loaded plugins are available in `PlannerServerAlgorithm.hpp` as `planner_plugin()` and `critics_plugins()`. The plugins are set after the timer factory, so the node uses them in a timer that fires later. Add this to the algorithm class, and replace its `set_timer_factory`:

```cpp
void set_timer_factory(TimerFactory factory) {
    timer_factory_ = factory;
    // The plugins are attached after this call, so evaluate them one second later.
    timer_ = create_timer(1.0, [this]() { evaluate(); });
}

void evaluate() {
    if (!planner_plugin_) {
        log_warn("No planner plugin is loaded");
        return;
    }
    log_info("Plan: " + planner_plugin_->plan(0.0, 10.0));
    for (const auto & critic : critics_plugins_) {
        log_info("Critic cost: " + std::to_string(critic->score(10.0)));
    }
}
```

and add a member `TimerHandle timer_;` next to `timer_factory_`. There is no start-up method for generated logic yet, which is why the timer is created in `set_timer_factory`.

## 6. Build and run

Copy or link the packages `demo_core`, `demo_planners`, `demo_planner_server` and `demo_system` into the `src/` folder of a ROS 2 workspace and build:

```bash
source /opt/ros/jazzy/setup.bash
cd <workspace>
colcon build
source install/setup.bash
ros2 launch demo_system demo_system.launch.py
```

The node loads the plugins that the system chose, and uses them once a second:

```text
[planner_server-1] [INFO] [planner_server]: Plan: smooth curve from 0.000000 over 5.000000 to 10.000000
[planner_server-1] [INFO] [planner_server]: Critic cost: 1.000000
[planner_server-1] [INFO] [planner_server]: Critic cost: 5.000000
```

The planner is `Smooth` and the two costs come from `AlignCritic` (`0.1 × 10`) and `GoalCritic` (`0.5 × 10`). Look at the launch file in `src-gen/demo_system/launch/`: it sets the two slot parameters.

```python
parameters=[{
      "planner_plugin": ParameterValue("demo_planners::Smooth", value_type=str),
      "critic_plugins": ["demo_planners::AlignCritic", "demo_planners::GoalCritic"],}]
```

## 7. Choose other plugins

The plugins are chosen by parameters, so you can change them without building again. Run the node without the system. Without a parameter it loads the `default:` of its slot:

```bash
ros2 run demo_planner_server planner_server
```

```text
[INFO] [planner_server]: Plan: straight line from 0.000000 to 10.000000
```

Choose other plugins on the command line:

```bash
ros2 run demo_planner_server planner_server --ros-args \
  -p planner_plugin:=demo_planners::Smooth \
  -p "critic_plugins:=[demo_planners::GoalCritic]"
```

```text
[INFO] [planner_server]: Slot 'critics': loaded plugin 'demo_planners::GoalCritic'
[INFO] [planner_server]: Plan: smooth curve from 0.000000 over 5.000000 to 10.000000
[INFO] [planner_server]: Critic cost: 5.000000
```

To change the choice for good, change `slots:` in the system model and generate the package again. Your plugin code stays, because it is written once.

## What you learned

- A *plugin base* describes an interface, a *slot* says where a node takes plugins, a *plugin* implements a base, and the system *attaches* plugins to slots.
- RosTooling generates the registration, the loading and the launch parameters. You write only the methods of the plugins and what the node does with them.
- The same node runs with other plugins by changing a parameter.

To let an AI agent create such models, see [Model an existing package with an agent](Tutorial_AgentModelling.md). For plugins of RosTooling itself, see [Plugins: concepts](PluginConcepts.md).
