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
}

func isPlayersComplete(players []*Player) bool {
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
	if gm.currentRole != GUESSER || gm.currentFreq == 0 || gm.board[cell].clicked == true {
		log.Fatalf("invalid operation")
	}
	gm.board[cell].clicked = true
	gm.currentFreq -= 1
	if gm.currentFreq == 0 {
		gm.transition()
	}

}

func (gm *Game) Spy(word string, num int) bool {
	if gm.currentRole != SPYMASTER {
		log.Fatalf("Invalid Operation")
	}
	gm.currentWord = word
	gm.currentFreq = num
	gm.transition()
	return true
}

func (gm *Game) Render() string {
	render := ""
	for i := 0; i < len(gm.board); i++ {
		cell := gm.board[i]
		render += cell.word + "," + cell.color + ","
		if cell.clicked {
			render += "1;"
		} else {
			render += "0;"
		}

	}
	return render[:len(render)-1]
}

func (gm *Game) transition() {
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
