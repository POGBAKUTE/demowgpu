extends Node
class_name AudioManager

const HOP_SOUNDS: Array = [
	preload("res://assets/audio/buck1.wav"),
	preload("res://assets/audio/buck2.wav"),
	preload("res://assets/audio/buck3.wav"),
	preload("res://assets/audio/buck4.wav"),
	preload("res://assets/audio/buck5.wav"),
]
const DEATH_CAR = preload("res://assets/audio/carsquish3.wav")
const DEATH_WATER = preload("res://assets/audio/water.wav")

var _hop_idx: int = 0
var _players: Array[AudioStreamPlayer] = []

func _ready() -> void:
	for i in 4:
		var p := AudioStreamPlayer.new()
		p.volume_db = -6.0
		add_child(p)
		_players.append(p)
	_hop_idx = 0

func play_hop() -> void:
	var sound: AudioStream = HOP_SOUNDS[_hop_idx % HOP_SOUNDS.size()]
	_hop_idx += 1
	_play_oneshot(sound)

func play_death(cause: String) -> void:
	if cause == "car":
		_play_oneshot(DEATH_CAR)
	else:
		_play_oneshot(DEATH_WATER)

func _play_oneshot(stream: AudioStream) -> void:
	for p in _players:
		if not p.playing:
			p.stream = stream
			p.play()
			return
	# All busy — reuse first
	_players[0].stream = stream
	_players[0].play()
