extends Node3D
class_name Player

const HOP_TIME := 0.18
const HOP_HEIGHT := 0.5
const GRID_MIN_X := -8
const GRID_MAX_X := 8

signal moved(new_pos: Vector3i)
signal died(cause: String)

var is_hopping := false
var grid_pos := Vector3i.ZERO
var dead := false

var can_move_to: Callable = func(_pos: Vector3i) -> bool: return true

@onready var visual: Node3D = $Visual

func _ready() -> void:
	position = Vector3(grid_pos)

func set_character(mesh: Mesh, tex: Texture2D) -> void:
	var mi: MeshInstance3D = get_node("Visual/Mesh")
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = tex
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	mi.material_override = mat
	# Auto-ground: move visual so bottom of mesh is at y=0
	var aabb := mesh.get_aabb()
	var scale_y := mi.transform.basis.y.length()
	visual.position.y = -(aabb.position.y * scale_y)

func _unhandled_input(event: InputEvent) -> void:
	if dead or is_hopping:
		return
	var dir := Vector3i.ZERO
	if event.is_action_pressed("move_up"):
		dir = Vector3i(0, 0, 1)
	elif event.is_action_pressed("move_down"):
		dir = Vector3i(0, 0, -1)
	elif event.is_action_pressed("move_left"):
		dir = Vector3i(1, 0, 0)
	elif event.is_action_pressed("move_right"):
		dir = Vector3i(-1, 0, 0)
	if dir != Vector3i.ZERO:
		_try_hop(dir)

func try_hop(dir: Vector3i) -> void:
	if dead or is_hopping:
		return
	_try_hop(dir)

func _try_hop(dir: Vector3i) -> void:
	var target := grid_pos + dir
	if target.x < GRID_MIN_X or target.x > GRID_MAX_X:
		return
	if target.z < 0:
		return
	if not can_move_to.call(target):
		return
	hop(dir)

func hop(dir: Vector3i) -> void:
	is_hopping = true
	var target := grid_pos + dir
	# OBJ characters have their "front" on +Z, so use atan2 directly
	# (look_at would flip them 180° since look_at points -Z at target).
	visual.rotation.y = atan2(float(dir.x), float(dir.z))

	var target_v := Vector3(target)
	var t := create_tween()
	t.set_parallel(true)
	t.tween_property(self, "position:x", target_v.x, HOP_TIME)
	t.tween_property(self, "position:z", target_v.z, HOP_TIME)

	# Squash & stretch
	var ty := create_tween()
	ty.set_parallel(true)
	ty.tween_property(visual, "scale", Vector3(0.8, 1.3, 0.8), HOP_TIME * 0.4)
	ty.chain().tween_property(visual, "scale", Vector3(1.1, 0.85, 1.1), HOP_TIME * 0.3)
	ty.chain().tween_property(visual, "scale", Vector3(1.0, 1.0, 1.0), HOP_TIME * 0.3)

	var ty2 := create_tween()
	ty2.tween_property(self, "position:y", HOP_HEIGHT, HOP_TIME * 0.5)
	ty2.tween_property(self, "position:y", 0.0, HOP_TIME * 0.5)

	await t.finished
	grid_pos = target
	is_hopping = false
	moved.emit(grid_pos)

func die(cause: String) -> void:
	if dead:
		return
	dead = true
	# Death squash
	var t := create_tween()
	t.tween_property(visual, "scale", Vector3(1.5, 0.1, 1.5), 0.2)
	died.emit(cause)

func reset_to(pos: Vector3i) -> void:
	dead = false
	is_hopping = false
	grid_pos = pos
	position = Vector3(pos)
	visual.scale = Vector3.ONE
