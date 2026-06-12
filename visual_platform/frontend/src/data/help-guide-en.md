# CAIAO Visual - User Guide

CAIAO Visual is a visual workflow editor for building, managing, and running AI data processing pipelines. Featuring a node-based programming paradigm, it allows you to quickly construct complex data processing flows through drag-and-drop and wiring.

---

## Core Concepts

### Nodes
Nodes are the fundamental building blocks of a pipeline. Each node represents an independent functional unit:

- **Server Node**: Executes specific data processing tasks; can be configured with Tools and Servers
- **Input Server Node**: Provides initial input data for the pipeline
- **Output Server Node**: Collects and displays the pipeline's final output
- **Merge Server Node**: Merges data streams from multiple upstream nodes
- **Pipeline Node**: General-purpose node with configurable tools and services
- **Note**: Text annotations on the canvas for labeling and documentation

### Edges / Wires
Wires define the data flow direction between nodes. Data flows from a node's right output handle to the left input handle of a downstream node.

- Drag from a node's **circular handle** to create a new connection
- **Right-click a wire** to hide/show or delete it
- **Middle-click a wire** to quickly delete it
- Supports **Blind Wire** mode to hide unnecessary connections

### Groups
Cluster related nodes together with a colored bounding box:

- **Select multiple nodes → right-click → Group** to create a group
- **Drag the group title** to move all nodes inside the group together
- **Double-click the group title** to rename the group

---

## Mouse Operations

| Action | Method |
|------|------|
| **Select a node** | Left-click the node |
| **Multi-select nodes** | Hold Shift + left-click, or drag-select |
| **Move a node** | Left-click and drag the node |
| **Pan the view** | Middle-click and drag the canvas, or hold Space + left-click drag |
| **Zoom the view** | Scroll wheel |
| **Create a wire** | Drag from a node's handle to another node's handle |
| **Box-select** | Hold left-click and drag on empty canvas (partial selection mode) |
| **Right-click a node** | Open the node context menu |
| **Right-click the canvas** | Open the canvas context menu |
| **Double-click the canvas** | Dismiss all menus |
| **Double-click a node** | Open the node properties panel |

---

## Keyboard Shortcuts

### View Controls
| Shortcut | Action |
|--------|------|
| `Home` | Reset view — fit all nodes |
| `Ctrl+F` | Zoom to selected nodes |
| `Ctrl+1 / 2 / 3` | Restore a saved viewport bookmark |
| `Ctrl+Shift+1 / 2 / 3` | Save current viewport as a bookmark |

### Selection
| Shortcut | Action |
|--------|------|
| `Ctrl+A` | Select all nodes and edges |
| `Ctrl+Shift+I` | Invert selection |
| `Ctrl+D` | Deselect all |
| `Esc` | Deselect all |

### Editing
| Shortcut | Action |
|--------|------|
| `Ctrl+C` | Copy selected nodes |
| `Ctrl+V` | Paste copied nodes |
| `Delete / Backspace` | Delete selected nodes |
| `F2` | Rename the selected node |
| `Ctrl+M` | Show all hidden wires |

### Panels
| Shortcut | Action |
|--------|------|
| `Cmd+B` (Mac) / `Ctrl+B` (Win) | Toggle left sidebar |
| `Cmd+I` (Mac) / `Ctrl+I` (Win) | Toggle right sidebar |
| `Cmd+J` (Mac) / `Ctrl+J` (Win) | Toggle bottom panel |
| `Shift+Cmd+J` / `Shift+Ctrl+J` | Open Settings |

### Save
| Shortcut | Action |
|--------|------|
| `Ctrl+S` | Save current workflow |

---

## Node Context Menu

Right-click a node to access the following:

### Edit
- **Duplicate**: Clone the node
- **Rename**: Change the node's display name
- **Nickname**: Set an alias for nodes
- **Set Color**: Customize the node's border color
- **Copy Config**: Copy node configuration to clipboard

### Group
- **Group**: Combine selected nodes into a group
- **Ungroup**: Remove grouping
- **Select All in Group**: Select every node in the same group

### Align — multi-select only
- Align Left / Center / Right (horizontal alignment)
- Align Top / Middle / Bottom (vertical alignment)

### View
- **Properties**: Open the node properties panel (same as double-click)
- **Find References**: Highlight all upstream and downstream connected nodes
- **Zoom to Fit**: Fit all nodes in view
- **Export Result**: Export node execution result (available after run)

### Control
- **Disable/Enable**: Toggle node execution
- **Lock/Unlock**: Lock the node's position
- **Show/Hide Profiler**: Toggle execution time display
- **Set/Remove Breakpoint**: Set or remove a breakpoint

---

## Canvas Context Menu

Right-click empty canvas area to access:

- **Select All / Invert / Deselect**: Global selection operations
- **Group Selection**: Group the currently selected nodes
- **Add Note**: Add a sticky note at the clicked position
- **Toggle Snap to Grid**: Toggle grid snapping mode
- **Show All Wires**: Reveal all hidden wires

---

## Workflows (Flows)

### Creating & Managing
- The **CAIAO FLOWS** panel in the left sidebar lists all workflows
- Click **+** to create a new workflow
- Click a workflow name to open it in a tab
- A **\*** next to the workflow name indicates unsaved changes
- Click the 💾 button to save the workflow

### Auto-Save
- After modifying node positions or connections, the system auto-saves (1-second delay)

---

## Component Panel (Right Sidebar)

The right sidebar lists all available server components, grouped by category:

- **Search**: Type keywords in the search box to filter components
- **Collapse/Expand**: Click a category header to toggle visibility
- **Add Component**: Hover over a component and click **+** to add it to the canvas
- **Switch Category**: Move a component to a different category

---

## Advanced Tips

1. **Efficient Wiring**: Add components from the left panel first, then drag wires from upstream to downstream
2. **Use Groups**: Group logically related nodes for easier movement and management
3. **Sticky Notes**: Add notes at key positions to document your workflow
4. **Bookmark Navigation**: Use viewport bookmarks to quickly jump between areas in complex workflows
5. **Lock Nodes**: Lock completed nodes to prevent accidental changes
6. **Show All Wires**: Use `Ctrl+M` when you need to see the complete connection graph

---

## Running a Data Pipeline

Execute nodes in the pipeline to process data:

1. Configure input parameters for all nodes
2. Data flows from the **Input Server** through each processing node
3. Intermediate nodes pass results to downstream nodes after completion
4. Final results are collected at the **Output Server**
5. Click **View Output** on a node to see detailed results

---

## Status Indicators

The status dot in the top-right of each node shows the current execution state:

- ● **Gray** — Idle
- ● **Blue blinking** — In Progress
- ● **Green** — Complete
- ● **Red** — Error

---

## Visual Cues

- **Orange border**: Node is Disabled
- **Blue lock icon**: Node is Locked
- **Red [bp] marker**: Node has a Breakpoint set
- **Custom color**: Set a unique border color for a node via the context menu
- **Group colors**: Different groups are automatically assigned distinct colors for easy identification
