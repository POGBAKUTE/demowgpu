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

# Injected by game.gd — returns true if the target cell is walkable
var can_move_to: Callable = func(_pos: Vector3i) -> bool: return true

@onready var visual: Node3D = $Visual

func _ready() -> void:
	position = Vector3(grid_pos)

func _unhandled_input(event: InputEvent) -> void:
	if dead or is_hopping:
		return
	var dir := Vector3i.ZERO
	if event.is_action_pressed("move_up"):
		dir = Vector3i(0, 0, 1)
	elif event.is_action_pressed("move_down"):
		dir = Vector3i(0, 0, -1)
	elif event.is_action_pressed("move_left"):
		dir = Vector3i(-1, 0, 0)
	elif event.is_action_pressed("move_right"):
		dir = Vector3i(1, 0, 0)
	if dir != Vector3i.ZERO:
		_try_hop(dir)

func _try_hop(dir: Vector3i) -> void:
	var target := grid_pos + dir
	# Clamp horizontal
	if target.x < GRID_MIN_X or target.x > GRID_MAX_X:
		return
	# Don't go backwards below start
	if target.z < 0:
		return
	# Check passability (trees, walls)
	if not can_move_to.call(target):
		return
	hop(dir)

func hop(dir: Vector3i) -> void:
	is_hopping = true
	var target := grid_pos + dir
	if dir.x != 0 or dir.z != 0:
		var dir_v := Vector3(dir)
		visual.look_at(global_position + dir_v, Vector3.UP)

	var target_v := Vector3(target)
	var t := create_tween()
	t.set_parallel(true)
	t.tween_property(self, "position:x", target_v.x, HOP_TIME)
	t.tween_property(self, "position:z", target_v.z, HOP_TIME)

	var ty := create_tween()
	ty.tween_property(self, "position:y", HOP_HEIGHT, HOP_TIME * 0.5)
	ty.tween_property(self, "position:y", 0.0, HOP_TIME * 0.5)

	await t.finished
	grid_pos = target
	is_hopping = false
	moved.emit(grid_pos)

func die(cause: String) -> void:
	if dead:
		return
	dead = true
	died.emit(cause)
