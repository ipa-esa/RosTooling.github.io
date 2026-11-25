# Editing models

Every RosTooling file opens as text in a normal VS Code editor. The extension adds the language features below. They come from a language server that runs in the background, the same one that checks the models in the diagram, in code generation and for AI agents, so all of them show the same result.

## Languages and files

| File | Language | Describes |
| --- | --- | --- |
| `.ros2` | ROS 2 package | nodes, interfaces, parameters, plugins of a ROS 2 package. See [Package language](../docu/RosModelDescription.md). |
| `.ros1` | ROS 1 package | the same for ROS 1 packages. |
| `.ros` | communication objects | message, service and action types. See [Communication objects](../docu/NewCommunicationObjects.md). |
| `.rossystem` | system | nodes that run together and their connections. See [System language](../docu/RosSystemModelDescription.md). |

## Features

- **Highlighting.** Keywords, names, types, values and `@` blocks have their own colours, and brackets are matched.
- **Completion.** Press `Ctrl+Space` inside a quoted value. After `type: "` the editor lists the message, service and action types of the workspace and the [catalogue](catalogue.md), after `from: "` the nodes as `package.node`, and in a connection the interfaces as `node::interface`. Typing narrows the list. The list has at most 100 entries. VS Code does not show suggestions inside quotes while you type unless you ask for them with `Ctrl+Space`. Outside quotes the editor offers only the next syntax element, such as `node:` or `@`. Packages, artifacts and parameters are not completed.
- **Validation.** Errors and warnings are underlined while you type and listed in the Problems view. Hover over an underline for the message. [Validation and diagnostics](../docu/Validation.md) lists what is checked.
- **Hover text.** Hovering over a node, an interface, a type or a package shows a short description, for example the fields of a message type. Hovering over an underline shows the message of the error or warning.
- **Navigation.** `Ctrl` + click on a reference, such as an interface in a connection of a system, goes to its definition, also across files.

```{image} images/completion.png
:alt: The list of message types after typing part of a type name and pressing Ctrl+Space
:width: 90%
```

```{image} images/hover.png
:alt: The hover text of a node
:width: 50%
```

:::{note}
Completion of types, nodes and interfaces and the hover text need a RosTooling version that is newer than the current release. The server of the current release only offers the next syntax element and shows no hover text for model elements. At release: remove this note.
:::

```{image} images/problems.png
:alt: A reference that cannot be resolved is underlined in the editor and listed in the Problems view
:width: 100%
```

In the picture the connection names an interface `scan_in` that the node does not have. The Problems view gives the message and the position, and a click on it goes to the place.

A reference to an interface of a node in a subsystem is written `<subsystem>::<node>::<interface>`, and the editor resolves it in the same way.

## Types that are not found

When a `type:` refers to a message that RosTooling does not know, the message of the diagnostic suggests two fixes: to add the project of the specifications, or to generate the `.ros` model for the package. See [Catalogue](catalogue.md) for where the types come from.

## Opening a file in the diagram

A file opens as text. To see the same file as a diagram, right-click it and choose **Open in RosTooling Visual Studio**, or use the graph icon in the editor title bar.

```{image} images/explorer-menu-rossystem.png
:alt: The Explorer menu of a .rossystem file, with Open in RosTooling Visual Studio at the top
:width: 60%
```

 Every change in the diagram is written to the text, and a change that you make in the text appears in the diagram, so you can switch between the two at any time. See [RosTooling Studio](studio.md).

## Server and Java

The language server needs Java 21 or later. If the extension cannot find it, it shows an error with a **Download Java** action. Use the setting `rostooling-languages.java.home` to point the extension to a JDK, `rostooling-languages.server.trace` to see the messages between the editor and the server, and the command **RosTooling: Select Language Server JAR…** to use another server build. [Commands, settings and troubleshooting](reference.md) has the details.
