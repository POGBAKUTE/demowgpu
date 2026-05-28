extends Node3D
class_name EnvGen

const VEHICLE_SCENE = preload("res://scenes/Vehicle.tscn")
const LOG_SCENE = preload("res://scenes/Log.tscn")

const VEHICLE_VARIANTS: Array = [
	{"mesh": preload("res://assets/models/vehicles/blue_car/0.obj"), "tex": preload("res://assets/models/vehicles/blue_car/0.png"), "truck": false},
	{"mesh": preload("res://assets/models/vehicles/green_car/0.obj"), "tex": preload("res://assets/models/vehicles/green_car/0.png"), "truck": false},
	{"mesh": preload("res://assets/models/vehicles/orange_car/0.obj"), "tex": preload("res://assets/models/vehicles/orange_car/0.png"), "truck": false},
	{"mesh": preload("res://assets/models/vehicles/purple_car/0.obj"), "tex": preload("res://assets/models/vehicles/purple_car/0.png"), "truck": false},
	{"mesh": preload("res://assets/models/vehicles/taxi/0.obj"), "tex": preload("res://assets/models/vehicles/taxi/0.png"), "truck": false},
	{"mesh": preload("res://assets/models/vehicles/blue_truck/0.obj"), "tex": preload("res://assets/models/vehicles/blue_truck/0.png"), "truck": true},
	{"mesh": preload("res://assets/models/vehicles/red_truck/0.obj"), "tex": preload("res://assets/models/vehicles/red_truck/0.png"), "truck": true},
]

const LOG_VARIANTS: Array = [
	{"mesh": preload("res://assets/models/environment/log/0/0.obj"), "tex": preload("res://assets/models/environment/log/0/0.png")},
	{"mesh": preload("res://assets/models/environment/log/1/0.obj"), "tex": preload("res://assets/models/environment/log/1/0.png")},
	{"mesh": preload("res://assets/models/environment/log/2/0.obj"), "tex": preload("res://assets/models/environment/log/2/0.png")},
	{"mesh": preload("res://assets/models/environment/log/3/0.obj"), "tex": preload("res://assets/models/environment/log/3/0.png")},
]

const TREE_MESHES: Array = [
	preload("res://assets/models/environment/tree/0/0.obj"),
	preload("res://assets/models/environment/tree/1/0.obj"),
	preload("res://assets/models/environment/tree/2/0.obj"),
]
const TREE_TEXS: Array = [
	preload("res://assets/models/environment/tree/0/0.png"),
	preload("res://assets/models/environment/tree/1/0.png"),
	preload("res://assets/models/environment/tree/2/0.png"),
]
const ROAD_MESH = preload("res://assets/models/environment/road/model.obj")
const ROAD_TEX = preload("res://assets/models/environment/road/blank-texture.png")
const RIVER_MESH = preload("res://assets/models/environment/river/0.obj")
const RIVER_TEX = preload("res://assets/models/environment/river/0.png")

const SPAWN_AHEAD := 10
const DESPAWN_BEHIND := 5

var _rows: Dictionary = {}
var _next_z: int = 0
var _player_z: int = 0
var _prev_kind: Row.Kind = Row.Kind.GRASS

func _ready() -> void:
	randomize()
	for z in range(-2, SPAWN_AHEAD + 1):
		_spawn_row(z)
	_next_z = SPAWN_AHEAD + 1

func update_player_z(pz: int) -> void:
	_player_z = pz
	_ensure_rows()
	_cleanup_old_rows()

func _ensure_rows() -> void:
	var target_z := _player_z + SPAWN_AHEAD
	while _next_z <= target_z:
		_spawn_row(_next_z)
		_next_z += 1

func _cleanup_old_rows() -> void:
	var min_z := _player_z - DESPAWN_BEHIND
	var to_remove: Array[int] = []
	for z in _rows.keys():
		if z < min_z:
			to_remove.append(z)
	for z in to_remove:
		_rows[z].queue_free()
		_rows.erase(z)

func _spawn_row(z: int) -> void:
	var kind: Row.Kind
	if z <= 1:
		kind = Row.Kind.GRASS  # Safe starting zone
	else:
		var roll := randi() % 10
		if roll < 4:
			kind = Row.Kind.GRASS
		elif roll < 7:
			kind = Row.Kind.ROAD
		else:
			kind = Row.Kind.RIVER
		# No consecutive river rows
		if kind == Row.Kind.RIVER and _prev_kind == Row.Kind.RIVER:
			kind = Row.Kind.GRASS

	_prev_kind = kind
	var row := Row.new()
	row.setup(kind, z)
	add_child(row)
	_rows[z] = row

	match kind:
		Row.Kind.GRASS:
			_populate_grass(row)
		Row.Kind.ROAD:
			_populate_road(row)
		Row.Kind.RIVER:
			_populate_river(row)

func _populate_grass(row: Row) -> void:
	_add_flat_tile(row, Color(0.35, 0.67, 0.35))
	for x in range(-Row.ROW_HALF, Row.ROW_HALF + 1):
		if randf() < 0.3:
			_place_tree(row, x)

func _populate_road(row: Row) -> void:
	_add_flat_tile(row, Color(0.22, 0.22, 0.25))
	var count := randi_range(1, 3)
	var dir := 1 if randi() % 2 == 0 else -1
	var speed := randf_range(2.5, 5.5)
	var spacing := (Row.ROW_WIDTH - 2) / float(count)
	for i in count:
		# Random variant per car
		var variant: Dictionary = VEHICLE_VARIANTS[randi() % VEHICLE_VARIANTS.size()]
		var v: Vehicle = VEHICLE_SCENE.instantiate()
		v.set_variant(variant.mesh, variant.tex)
		v.setup(speed, dir, 0.0)
		v.position.x = -Row.ROW_HALF + 1 + i * spacing + randf_range(-1, 1)
		row.add_child(v)
		row.movers.append(v)

func _populate_river(row: Row) -> void:
	_add_flat_tile(row, Color(0.22, 0.78, 0.88))
	var count := randi_range(1, 3)
	var dir := 1 if randi() % 2 == 0 else -1
	var speed := randf_range(1.5, 3.5)
	for i in count:
		var variant: Dictionary = LOG_VARIANTS[randi() % LOG_VARIANTS.size()]
		var lg: LogObj = LOG_SCENE.instantiate()
		lg.set_variant(variant.mesh, variant.tex)
		lg.setup(speed, dir, 0.0, 2)
		lg.position.x = float(randi_range(-Row.ROW_HALF + 2, Row.ROW_HALF - 2))
		lg.position.y = 0.05
		row.add_child(lg)
		row.movers.append(lg)

func _add_flat_tile(row: Row, color: Color, y_offset: float = -0.01, size_z: float = 1.0) -> void:
	var mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(Row.ROW_WIDTH, size_z)
	mi.mesh = pm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mi.set_surface_override_material(0, mat)
	mi.position = Vector3(0, y_offset, 0)
	row.add_child(mi)

func _add_mesh_tile(row: Row, mesh: Mesh, tex: Texture2D, fallback: Color) -> void:
	var mi := MeshInstance3D.new()
	mi.position = Vector3(0, -0.5, 0)
	if mesh != null:
		mi.mesh = mesh
		var mat := StandardMaterial3D.new()
		mat.albedo_texture = tex
		mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
		mi.material_override = mat
	else:
		var pm := PlaneMesh.new()
		pm.size = Vector2(Row.ROW_WIDTH, 1.0)
		mi.mesh = pm
		var mat := StandardMaterial3D.new()
		mat.albedo_color = fallback
		mi.set_surface_override_material(0, mat)
	mi.position = Vector3(0, -0.01, 0)
	row.add_child(mi)

func _place_tree(row: Row, x: int) -> void:
	row.blocked_xs.append(x)
	var v := randi() % 3
	var mi := MeshInstance3D.new()
	mi.mesh = TREE_MESHES[v]
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = TREE_TEXS[v]
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	mi.material_override = mat
	mi.position = Vector3(x, 0.0, 0.0)
	mi.scale = Vector3(0.55, 0.55, 0.55)
	row.add_child(mi)


func get_row(z: int) -> Row:
	return _rows.get(z, null)
