extends Node
class_name ScoreManager

const SAVE_PATH := "user://best_score.dat"

var current_score: int = 0
var best_score: int = 0

signal score_changed(score: int)

func _ready() -> void:
	_load_best()

func set_score(s: int) -> void:
	if s > current_score:
		current_score = s
		if current_score > best_score:
			best_score = current_score
			_save_best()
		score_changed.emit(current_score)

func reset() -> void:
	current_score = 0
	score_changed.emit(0)

func _save_best() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_32(best_score)

func _load_best() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f:
		best_score = f.get_32()
