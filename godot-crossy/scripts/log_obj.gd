extends Node3D
class_name LogObj

var speed: float = 2.0
var direction: int = 1
var lane_z: float = 0.0
var log_width: int = 2

const DESPAWN_X := 12.0

func set_variant(mesh: Mesh, tex: Texture2D) -> void:
	var mi: MeshInstance3D = get_node("Visual/Mesh")
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = tex
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	mi.material_override = mat

func setup(_speed: float, _dir: int, _z: float, _width: int = 2) -> void:
	speed = _speed
	direction = _dir
	lane_z = _z
	log_width = _width
	position.z = _z
	var v: Node3D = $Visual
	v.rotation.y = 0.0
	v.position.y = -0.15

func _process(delta: float) -> void:
	position.x += speed * direction * delta
	if direction > 0 and position.x > DESPAWN_X + 2:
		position.x = -DESPAWN_X - 2
	elif direction < 0 and position.x < -DESPAWN_X - 2:
		position.x = DESPAWN_X + 2

func contains_x(world_x: float) -> bool:
	var half := log_width * 0.5
	return world_x >= position.x - half and world_x <= position.x + half
