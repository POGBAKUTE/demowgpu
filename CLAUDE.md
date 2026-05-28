# demoWGPU2 — CLAUDE.md

## Projects

### godot-crossy/
Crossy Road clone in Godot 4.6.3 (GDScript, Forward+ Vulkan).

**Run/test:**
- Launch: `mcp__godot__run_project` với path `godot-crossy/`
- Stop: `mcp__godot__stop_project`
- User tự test — KHÔNG auto-test, KHÔNG chụp screenshot thay user

**Key scripts:**
- `scripts/game.gd` — orchestrator: pause, score, camera, collision
- `scripts/player.gd` — hop, AABB auto-ground, input
- `scripts/env_gen.gd` — spawn rows (grass/road/river), vehicles, logs, trees
- `scripts/hud.gd` — HUD signals, D-pad, char select, game over
- `scripts/character_picker.gd` — 7 characters, emits `character_changed`

**OBJ model quirks:**
- Dùng `material_override` (không phải `surface_material_override/0`) vì OBJ nhiều surface
- Auto-ground character: `visual.position.y = -(mesh.get_aabb().position.y * scale_y)`
- Vehicles: `rotation.y = PI/2` (+X) hoặc `-PI/2` (-X)
- Characters: `visual.rotation.y = atan2(dir.x, dir.z)` — KHÔNG dùng `look_at`
- Nodes chưa add_child thì dùng `get_node()` trực tiếp, không dùng `@onready`

**Scene file (.tscn) rules:**
- `[sub_resource ...]` phải đặt TRƯỚC tất cả `[node ...]` — nếu không Godot crash khi load
- HUD CanvasLayer cần `process_mode = 3` (ALWAYS) để buttons hoạt động khi pause
- ColorRect mặc định `mouse_filter = STOP` chặn click — đặt `mouse_filter = 2` (IGNORE)

**Grid/tile alignment:**
- Tất cả row tiles: `PlaneMesh size = Vector2(ROW_WIDTH, 1.0)` — uniform, không overlap
- Grass + road cùng `y = -0.01`; river flat cùng level (không hõm)
- Không dùng OBJ mesh cho ground tiles (có độ dày, nhô lên) — dùng PlaneMesh màu

**Pause logic:**
- `get_tree().paused = true` khi char select / game over
- `get_tree().paused = false` khi PLAY
- HUD process_mode = ALWAYS nên buttons luôn hoạt động

### godot-crossy/assets/
- `models/characters/` — 7 nhân vật OBJ+PNG
- `models/vehicles/` — 7 loại xe OBJ+PNG
- `models/environment/` — log, tree, road, river OBJ+PNG

## Commit convention
Luôn có `Co-Authored-By: Claude ...` trailer. User tự commit một số commit không có trailer này.
