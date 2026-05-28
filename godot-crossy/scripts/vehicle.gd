extends Node3D
class_name Vehicle

var speed: float = 3.0
var direction: int = 1  # +1 = positive X, -1 = negative X
var lane_z: float = 0.0

const DESPAWN_X := 12.0

func setup(_speed: float, _dir: int, _z: float) -> void:
	speed = _speed
	direction = _dir
	lane_z = _z
	position.z = _z
	if direction < 0:
		rotation.y = PI

func _process(delta: float) -> void:
	position.x += speed * direction * delta
	if direction > 0 and position.x > DESPAWN_X + 2:
		position.x = -DESPAWN_X - 2
	elif direction < 0 and position.x < -DESPAWN_X - 2:
		position.x = DESPAWN_X + 2

func get_grid_x() -> int:
	return roundi(position.x)
