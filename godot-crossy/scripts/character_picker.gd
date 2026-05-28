extends Node
class_name CharacterPicker

const CHARACTERS: Array = [
	{"name": "Chicken", "mesh": preload("res://assets/models/characters/chicken/0.obj"), "tex": preload("res://assets/models/characters/chicken/0.png")},
	{"name": "Brent", "mesh": preload("res://assets/models/characters/brent/0.obj"), "tex": preload("res://assets/models/characters/brent/0.png")},
	{"name": "Avocoder", "mesh": preload("res://assets/models/characters/avocoder/avocoder.obj"), "tex": preload("res://assets/models/characters/avocoder/avocoder.png")},
	{"name": "Bacon", "mesh": preload("res://assets/models/characters/bacon/bacon.obj"), "tex": preload("res://assets/models/characters/bacon/bacon.png")},
	{"name": "Juwan", "mesh": preload("res://assets/models/characters/juwan/juwan.obj"), "tex": preload("res://assets/models/characters/juwan/juwan.png")},
	{"name": "Palmer", "mesh": preload("res://assets/models/characters/palmer/palmer.obj"), "tex": preload("res://assets/models/characters/palmer/palmer.png")},
	{"name": "Wheeler", "mesh": preload("res://assets/models/characters/wheeler/wheeler.obj"), "tex": preload("res://assets/models/characters/wheeler/wheeler.png")},
]

var current_index: int = 0

signal character_changed(mesh: Mesh, tex: Texture2D, char_name: String)

func _ready() -> void:
	current_index = randi() % CHARACTERS.size()
	_emit_current()

func cycle_next() -> void:
	current_index = (current_index + 1) % CHARACTERS.size()
	_emit_current()

func cycle_prev() -> void:
	current_index = (current_index - 1 + CHARACTERS.size()) % CHARACTERS.size()
	_emit_current()

func get_current() -> Dictionary:
	return CHARACTERS[current_index]

func _emit_current() -> void:
	var c: Dictionary = CHARACTERS[current_index]
	character_changed.emit(c.mesh, c.tex, c.name)
