extends Node3D

@onready var player: Player = $Player
@onready var camera: Camera3D = $Camera3D
@onready var env_gen: EnvGen = $EnvGen

const CAMERA_OFFSET := Vector3(0, 8, -10)
const PLAYER_MIN_X := -Row.ROW_HALF
const PLAYER_MAX_X := Row.ROW_HALF

func _ready() -> void:
	print("[game] _ready, player=", player)
	player.moved.connect(_on_player_moved)
	player.died.connect(_on_player_died)
	player.can_move_to = _can_move_to
	_update_camera(true)

func _can_move_to(pos: Vector3i) -> bool:
	var row := env_gen.get_row(pos.z)
	if row == null:
		return true
	if row.kind == Row.Kind.GRASS and row.is_blocked(pos.x):
		return false
	return true

func _on_player_moved(pos: Vector3i) -> void:
	env_gen.update_player_z(pos.z)
	_check_row(pos)
	_update_camera(false)

func _on_player_died(cause: String) -> void:
	print("[game] player died: ", cause)

func _process(delta: float) -> void:
	_update_camera(false)
	if not player.dead:
		_check_river_carry(delta)
		_check_vehicle_hit()

func _check_row(pos: Vector3i) -> void:
	var row := env_gen.get_row(pos.z)
	if row == null:
		return
	# Block movement into trees
	if row.kind == Row.Kind.GRASS and row.is_blocked(pos.x):
		# Revert — push player back (hop already moved them, so nudge back)
		# We detect after the fact: just kill for now, better to pre-check
		pass
	# Fell in river with no log
	if row.kind == Row.Kind.RIVER:
		var on_log := _find_log_at(row, player.global_position.x)
		if on_log == null:
			player.die("river")

func _check_river_carry(delta: float) -> void:
	var row := env_gen.get_row(player.grid_pos.z)
	if row == null or row.kind != Row.Kind.RIVER:
		return
	var lg := _find_log_at(row, player.global_position.x)
	if lg != null:
		# Carry player with log
		player.position.x += lg.speed * lg.direction * delta
		player.grid_pos.x = roundi(player.position.x)
		if player.position.x < -Row.ROW_HALF - 1 or player.position.x > Row.ROW_HALF + 1:
			player.die("river")
	else:
		player.die("river")

func _check_vehicle_hit() -> void:
	var row := env_gen.get_row(player.grid_pos.z)
	if row == null or row.kind != Row.Kind.ROAD:
		return
	for mover in row.movers:
		if not is_instance_valid(mover):
			continue
		var dist: float = abs(mover.global_position.x - player.global_position.x)
		if dist < 0.6:
			player.die("car")
			return

func _find_log_at(row: Row, world_x: float) -> LogObj:
	for mover in row.movers:
		if not is_instance_valid(mover):
			continue
		if mover is LogObj and mover.contains_x(world_x):
			return mover
	return null

func _update_camera(instant: bool) -> void:
	var target := player.global_position + CAMERA_OFFSET
	if instant:
		camera.global_position = target
	else:
		camera.global_position = camera.global_position.lerp(target, 0.1)
	camera.look_at(player.global_position + Vector3(0, 0, 2), Vector3.UP)
