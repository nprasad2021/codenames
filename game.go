package main

import (
	"log"
	"math/rand"
	"strconv"
	"sync"
)

const (
	RED     = "RED"
	BLUE    = "BLUE"
	DEAD    = "DEAD"
	NEUTRAL = "NEUTRAL"
	WHITE = "WHITE"

	CODEMASTER = "CODEMASTER"
	GUESSER    = "GUESSER"
)

var COLORS = []string{RED, BLUE, NEUTRAL, DEAD}

type Cell struct {
	word    string
	color   string
	clicked bool
}

type Game struct {
	board []*Cell

	currentColor string
	currentRole  string

	currentWord string
	currentFreq int
	useTime bool
	timeGuess int
	timeCode int


	numTurns int

	done bool
	victor string

	numRedClicked int
	numBlueClicked int

	mu sync.Mutex
}

func isPlayersComplete(players map[string]*Player) (bool, string) {
	if len(players) < 4 {
		return false, "Waiting for at least four players to join..."
	}
	cs := []string{RED + CODEMASTER, BLUE + CODEMASTER, RED + GUESSER, BLUE + GUESSER}
	combos := make(map[string]bool)
	for _, p := range cs {
		combos[p] = false
	}

	for _, p := range players {
		trole := p.team + p.role
		combos[trole] = true
	}
	for _, v := range combos {
		if v == false {
			return false, "Waiting until all 4 role-team combinations have been assigned..."
		}
	}
	return true, ""

}

// word;color;clicked;
func (gm *Game) Guess(cell int) bool {
	if gm.done {
		return true
	}
	if gm.currentRole != GUESSER || gm.currentFreq == 0 || gm.board[cell].clicked == true {
		return false
	}
	gm.board[cell].clicked = true
	if gm.board[cell].color == BLUE {
		gm.numBlueClicked += 1
	} else if gm.board[cell].color == RED {
		gm.numRedClicked += 1
	}
	gm.currentFreq -= 1
	if gm.currentFreq == 0 || gm.board[cell].color != gm.currentColor {
		gm.transition()
	}
	if gm.board[cell].color == DEAD {
		gm.done = true
		gm.victor = gm.currentColor
	} else if ok, victor := gm.Victory(); ok {
		gm.done = true
		gm.victor = victor
	}
	return true

}

func (gm *Game) Spy(word string, num int) bool{
	if gm.done {
		return true
	}
	if gm.currentRole != CODEMASTER {
		return false
	}
	gm.currentWord = word
	gm.currentFreq = num + 1
	gm.transition()
	return true
}

func (gm *Game) Victory() (bool, string){

	if gm.numRedClicked == 9 {
		return true, RED
	} else if gm.numBlueClicked == 8 {
		return true, BLUE
	}
	return false, NEUTRAL

}

func (gm *Game) Render(role string, team string) string {
	render := ""
	if gm.done {
		render = "victory:"
		role = CODEMASTER
	} else if gm.numTurns == 0 {
		render = "initGame:"
	} else if gm.currentRole == CODEMASTER {
		render = "spySetup:"
	} else {
		render = "guessSetup:"
	}
	for i := 0; i < len(gm.board); i++ {
		cell := gm.board[i]
		textColor := cell.color
		backgroundColor := cell.color

		if cell.clicked {
			textColor = WHITE
		} else {
			backgroundColor = WHITE
			if role == GUESSER {
				textColor = DEAD
			}
		}
		render += cell.word + "," + textColor + "," + backgroundColor + ";"
	}
	render = render[:len(render)-1]
	if role == gm.currentRole && team == gm.currentColor && !gm.done {
		render += ":1"
	} else {
		render += ":0"
	}
	render += ":" + gm.currentRole + "," + gm.currentColor
	render += ":" + strconv.Itoa(gm.numRedClicked) + "," + strconv.Itoa(gm.numBlueClicked)
	if gm.done {
		render += ":" + gm.victor
	} else {
		render += ":none"
	}
	if gm.currentRole == GUESSER {
		render += ":" + gm.currentWord + "," + strconv.Itoa(gm.currentFreq - 1)
	}

	return render
}

func (gm *Game) interruptChannel(accept chan bool) {

}

func (gm *Game) transition() {
	gm.numTurns += 1
	if gm.currentRole == CODEMASTER {
		gm.currentRole = GUESSER
	} else {
		gm.currentRole = CODEMASTER
		if gm.currentColor == RED {
			gm.currentColor = BLUE
		} else {
			gm.currentColor = RED
		}
	}

}

func getColor(numLeft []int) int {
	sum := 0
	for _, num := range numLeft {
		sum += num
	}
	sel := rand.Intn(sum)
	sofar := 0
	for i, num := range numLeft {
		sofar += num
		if sel < sofar {
			return i
		}
	}
	return -1
}

func MakeGame(words []string) *Game {
	if len(words) != 25 {
		log.Fatalf("Expect 25 words")
	}
	game := &Game{}
	game.board = []*Cell{}
	game.currentColor = RED
	game.currentRole = CODEMASTER
	game.numTurns = 0
	game.done = false
	game.victor = ""
	game.numRedClicked = 0
	game.numBlueClicked = 0

	numLeft := []int{9, 8, 7, 1}

	for i := 0; i < len(words); i++ {
		c := &Cell{}
		c.word = words[i]
		c.clicked = false

		index := getColor(numLeft)
		numLeft[index] -= 1
		c.color = COLORS[index]
		game.board = append(game.board, c)

	}
	return game
}
