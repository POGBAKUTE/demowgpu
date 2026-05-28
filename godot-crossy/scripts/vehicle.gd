extends Node3D
class_name Vehicle

var speed: float = 3.0
var direction: int = 1
var lane_z: float = 0.0

const DESPAWN_X := 12.0

func set_variant(mesh: Mesh, tex: Texture2D) -> void:
	var mi: MeshInstance3D = get_node("Visual/Mesh")
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = tex
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	mi.material_override = mat

func setup(_speed: float, _dir: int, _z: float) -> void:
	speed = _speed
	direction = _dir
	lane_z = _z
	position.z = _z
	# Car OBJ's long axis is Z (front faces +Z). Movement is along X,
	# so rotate 90° so front aligns with direction of travel.
	var v: Node3D = $Visual
	if direction > 0:
		v.rotation.y = PI * 0.5   # face +X
	else:
		v.rotation.y = -PI * 0.5  # face -X

func _process(delta: float) -> void:
	position.x += speed * direction * delta
	if direction > 0 and position.x > DESPAWN_X + 2:
		position.x = -DESPAWN_X - 2
	elif direction < 0 and position.x < -DESPAWN_X - 2:
		position.x = DESPAWN_X + 2
