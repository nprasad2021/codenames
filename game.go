package main

import (
	"log"
	"math/rand"
)

const (
	RED     = "RED"
	BLUE    = "BLUE"
	DEAD    = "DEAD"
	NEUTRAL = "NEUTRAL"
	WHITE = "WHITE"

	SPYMASTER = "SPYMASTER"
	GUESSER   = "GUESSER"
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

	numTurns int

	done bool
	victor string
}

func isPlayersComplete(players map[string]*Player) bool {
	cs := []string{RED + SPYMASTER, BLUE + SPYMASTER, RED + GUESSER, BLUE + GUESSER}
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
			return false
		}
	}
	return true

}

// word;color;clicked;
func (gm *Game) Guess(cell int) {
	if gm.done {
		return
	}
	if gm.currentRole != GUESSER || gm.currentFreq == 0 || gm.board[cell].clicked == true {
		log.Fatalf("invalid operation")
	}
	gm.board[cell].clicked = true

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

}

func (gm *Game) Spy(word string, num int) {
	if gm.done {
		return
	}
	if gm.currentRole != SPYMASTER {
		log.Fatalf("Invalid Operation")
	}
	gm.currentWord = word
	gm.currentFreq = num + 1
	gm.transition()
}

func (gm *Game) Victory() (bool, string){
	numRed := 0
	numBlue := 0
	for _, cell := range gm.board {
		if cell.clicked {
			if cell.color == BLUE {
				numBlue += 1
			} else if cell.color == RED {
				numRed += 1
			}
		}
	}
	if numRed == 9 {
		return true, RED
	} else if numBlue == 8 {
		return true, BLUE
	}
	return false, NEUTRAL

}

func (gm *Game) Render(role string, team string) string {
	render := ""
	if gm.done {
		render = "victory:"
		role = SPYMASTER
	} else if gm.numTurns == 0 {
		render = "initGame:"
	} else if gm.currentRole == SPYMASTER {
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
	if gm.currentRole == GUESSER {
		render += ":" + gm.currentWord + "," + string(gm.currentFreq)
	}
	if gm.done {
		render += ":" + gm.victor
	}
	return render
}

func (gm *Game) transition() {
	gm.numTurns += 1
	if gm.currentRole == SPYMASTER {
		gm.currentRole = GUESSER
	} else {
		gm.currentRole = SPYMASTER
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
	game.currentRole = SPYMASTER
	game.numTurns = 0
	game.done = false
	game.victor = ""
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
