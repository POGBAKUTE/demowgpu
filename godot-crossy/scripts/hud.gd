extends CanvasLayer
class_name HUD

@onready var score_label: Label = $ScoreLabel
@onready var game_over: PanelContainer = $GameOver
@onready var score_line: Label = $GameOver/VBox/ScoreLine
@onready var best_line: Label = $GameOver/VBox/BestLine
@onready var restart_btn: Button = $GameOver/VBox/RestartBtn

signal restart_pressed

func _ready() -> void:
	restart_btn.pressed.connect(func(): restart_pressed.emit())
	game_over.visible = false

func update_score(s: int) -> void:
	score_label.text = str(s)

func show_game_over(score: int, best: int) -> void:
	score_line.text = "Score: %d" % score
	best_line.text = "Best: %d" % best
	game_over.visible = true

func hide_game_over() -> void:
	game_over.visible = false
