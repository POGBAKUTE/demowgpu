extends Node3D

@onready var player: Player = $Player
@onready var camera: Camera3D = $Camera3D
@onready var env_gen: EnvGen = $EnvGen
@onready var hud: HUD = $HUD
@onready var audio: AudioManager = $AudioManager
@onready var score_mgr: ScoreManager = $ScoreManager
@onready var char_picker: CharacterPicker = $CharacterPicker

const CAMERA_OFFSET := Vector3(0, 8, -10)

var started: bool = false

func _ready() -> void:
	score_mgr.score_changed.connect(hud.update_score)
	hud.restart_pressed.connect(_restart)
	hud.char_prev_pressed.connect(char_picker.cycle_prev)
	hud.char_next_pressed.connect(char_picker.cycle_next)
	hud.start_pressed.connect(_start_game)
	hud.hop_dir.connect(func(d: Vector3i): player.try_hop(d))
	player.moved.connect(_on_player_moved)
	player.died.connect(_on_player_died)
	player.can_move_to = _can_move_to
	char_picker.character_changed.connect(_on_character_changed)
	get_tree().paused = true
	_update_camera(true)

func _start_game() -> void:
	hud.hide_char_select()
	get_tree().paused = false
	started = true

func _on_character_changed(mesh: Mesh, tex: Texture2D, char_name: String) -> void:
	player.set_character(mesh, tex)
	hud.set_character_name(char_name)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_C:
			char_picker.cycle_next()

func _on_player_moved(pos: Vector3i) -> void:
	env_gen.update_player_z(pos.z)
	score_mgr.set_score(pos.z)
	audio.play_hop()
	_check_row(pos)
	_update_camera(false)

func _on_player_died(cause: String) -> void:
	audio.play_death(cause)
	await get_tree().create_timer(0.6).timeout
	hud.show_game_over(score_mgr.current_score, score_mgr.best_score)

func _restart() -> void:
	hud.hide_game_over()
	score_mgr.reset()
	# Reset env
	for child in env_gen.get_children():
		child.queue_free()
	env_gen._rows.clear()
	env_gen._next_z = 0
	env_gen._player_z = 0
	env_gen._ready()
	# Reset player
	player.reset_to(Vector3i.ZERO)
	_update_camera(true)

func _can_move_to(pos: Vector3i) -> bool:
	var row := env_gen.get_row(pos.z)
	if row == null:
		return true
	if row.kind == Row.Kind.GRASS and row.is_blocked(pos.x):
		return false
	return true

func _process(_delta: float) -> void:
	_update_camera(false)
	if not player.dead:
		_check_river_carry(_delta)
		_check_vehicle_hit()

func _check_row(pos: Vector3i) -> void:
	var row := env_gen.get_row(pos.z)
	if row == null:
		return
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
