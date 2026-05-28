extends CanvasLayer
class_name HUD

@onready var score_label: Label = $ScoreLabel
@onready var char_name_label: Label = $CharName
@onready var game_over: PanelContainer = $GameOver
@onready var score_line: Label = $GameOver/VBox/ScoreLine
@onready var best_line: Label = $GameOver/VBox/BestLine
@onready var restart_btn: Button = $GameOver/VBox/RestartBtn
@onready var char_select: PanelContainer = $CharSelect
@onready var char_select_name: Label = $CharSelect/VBox/HRow/CharNameLabel
@onready var prev_btn: Button = $CharSelect/VBox/HRow/PrevBtn
@onready var next_btn: Button = $CharSelect/VBox/HRow/NextBtn
@onready var start_btn: Button = $CharSelect/VBox/StartBtn

signal restart_pressed
signal char_prev_pressed
signal char_next_pressed
signal start_pressed

func _ready() -> void:
	restart_btn.pressed.connect(func(): restart_pressed.emit())
	prev_btn.pressed.connect(func(): char_prev_pressed.emit())
	next_btn.pressed.connect(func(): char_next_pressed.emit())
	start_btn.pressed.connect(func(): start_pressed.emit())
	game_over.visible = false
	char_select.visible = true
	score_label.visible = false
	char_name_label.visible = false

func update_score(s: int) -> void:
	score_label.text = str(s)

func set_character_name(n: String) -> void:
	char_name_label.text = n + "  (press C)"
	if char_select.visible:
		char_select_name.text = n

func show_game_over(score: int, best: int) -> void:
	score_line.text = "Score: %d" % score
	best_line.text = "Best: %d" % best
	game_over.visible = true

func hide_game_over() -> void:
	game_over.visible = false

func show_char_select() -> void:
	char_select.visible = true
	score_label.visible = false
	char_name_label.visible = false

func hide_char_select() -> void:
	char_select.visible = false
	score_label.visible = true
	char_name_label.visible = true
