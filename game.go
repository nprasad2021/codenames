package main

const (
	RED = 0
	BLUE = 1
	ASSASSIN = 2
	NEUTRAL = 3
)

type Cell struct {
	word string
	color int
	clicked bool
}

type Game struct {
	board [][]Cell
	players map[int]string
}


func Make(words []string){
	game := &Game{}
	game.board = [][]Cell{}

	for i := 0; i < 5; i++ {
		for j := 0; j < 5; j++ {
			c := &Cell{}
			c.word = words[i*5+j]

		}
	}
}