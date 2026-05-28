extends Node3D
class_name Row

const ROW_WIDTH := 16
const ROW_HALF := 8

enum Kind { GRASS, ROAD, RIVER }

@export var kind: Kind = Kind.GRASS
var z_index: int = 0
var blocked_xs: Array[int] = []

# Vehicles or logs active on this row
var movers: Array[Node3D] = []

func setup(_kind: Kind, _z: int) -> void:
	kind = _kind
	z_index = _z
	position = Vector3(0, 0, _z)

func get_blocked_xs() -> Array[int]:
	return blocked_xs

func is_blocked(x: int) -> bool:
	return blocked_xs.has(x)
