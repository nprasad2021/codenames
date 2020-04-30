package main

import (
	"fmt"
	"net/http"
)

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

func main() {
	// The "HandleFunc" method accepts a path and a function as arguments
	// (Yes, we can pass functions as arguments, and even trat them like variables in Go)
	// However, the handler function has to have the appropriate signature (as described by the "handler" function below)
	http.HandleFunc("/", handler)

	// After defining our server, we finally "listen and serve" on port 8080
	// The second argument is the handler, which we will come to later on, but for now it is left as nil,
	// and the handler defined above (in "HandleFunc") is used
	http.ListenAndServe(":8080", nil)
}

// "handler" is our handler function. It has to follow the function signature of a ResponseWriter and Request type
// as the arguments.
func handler(w http.ResponseWriter, r *http.Request) {
	// For this case, we will always pipe "Hello World" into the response writer
	fmt.Fprintf(w, "Hello World!")
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