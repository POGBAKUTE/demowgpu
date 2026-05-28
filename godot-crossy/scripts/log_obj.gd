extends Node3D
class_name LogObj

var speed: float = 2.0
var direction: int = 1
var lane_z: float = 0.0
var log_width: int = 2  # cells wide

const DESPAWN_X := 12.0

func setup(_speed: float, _dir: int, _z: float, _width: int = 2) -> void:
	speed = _speed
	direction = _dir
	lane_z = _z
	log_width = _width
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

# Returns true if the player at world_x is riding this log
func contains_x(world_x: float) -> bool:
	var half := log_width * 0.5
	return world_x >= position.x - half and world_x <= position.x + half
