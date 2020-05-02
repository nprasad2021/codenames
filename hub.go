// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"log"
	"strconv"
	"sync"
)

type Player struct {
	username string
	team     string
	role     string
}

type Room struct {
	clients map[*Client]bool
	players map[string]*Player
	roomState string

	game *Game
}

func (h *Hub) sendClientsGame(room *Room){

	for c, _ := range room.clients {
		if _, ok := h.clients[c]; ok {
			role := ""
			team := ""
			for _, p := range room.players {
				if p.username == c.username {
					role = p.role
					team = p.team
				}
			}
			if role == "" || team == "" {
				log.Fatalf("player does not exist in records")
			}
			msg := room.game.Render(role, team)
			log.Printf("sending message %v", msg)
			c.send <- []byte(msg)
		} else {
			delete(room.clients, c)
		}
	}

}

func (h *Hub) sendClients(room *Room, message string){
	for c, _ := range room.clients {
		if _, ok := h.clients[c]; ok {
			log.Printf("sending message %v", message)
			c.send <- []byte(message)
		} else {
			delete(room.clients, c)
		}
	}
}

func randomWords() []string {
	words := []string{}
	for i := 0; i < 25; i++ {
		words = append(words, "rocker")
	}
	return words
}


func (h *Hub) processMessage(vars map[string]string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	log.Printf("args: %v", vars)

	if vars["type"] == "createRoom" {
		if _, ok := h.rooms[vars["room"]]; ok {
			c.send <- []byte("createRoom:FAILURE:RoomAlreadyExists")
			return
		}
		room := &Room{
			clients: make(map[*Client]bool),
			players: make(map[string]*Player),
			roomState: "PENDING",
			game: MakeGame(h.words.choose(25)),
		}
		player := &Player{
			username: vars["username"],
			team:     RED,
			role:     SPYMASTER,
		}
		room.players[player.username] = player
		room.clients[c] = true
		h.rooms[vars["room"]] = room
		msg := "joinRoom:"
		for _, p := range room.players {
			msg += p.username
			msg += ","
		}
		msg = msg[:len(msg)-1]
		h.sendClients(room, msg)
	} else if vars["type"] == "joinRoom" {
		if _, ok := h.rooms[vars["room"]]; !ok {
			c.send <- []byte("joinRoom:FAILURE:RoomDoesNotExist")
			return
		}
		if h.rooms[vars["room"]].roomState != "PENDING"  {
			c.send <- []byte("joinRoom:FAILURE:RoomClosed")
			return
		}
		room := h.rooms[vars["room"]]
		room.clients[c] = true
		player := &Player{
			username: vars["username"],
			team:     RED,
			role:     SPYMASTER,
		}
		room.players[player.username] = player
		h.rooms[vars["room"]] = room
		log.Printf("players: %v", room.players)
		msg := "joinRoom:"
		for _, p := range room.players {
			msg += p.username
			msg += ","
		}
		msg = msg[:len(msg)-1]
		h.sendClients(room, msg)
	} else if vars["type"] == "roleAssn" {
		log.Printf("vars: %v", vars)
		room := h.rooms[vars["room"]]
		if room.roomState != "PENDING" {
			c.send <- []byte("roleAssn:FAILURE:roleAssnNotProcessed")
			return
		}
		player := &Player{
			username: "",
			team:     "",
			role:     "",
		}
		for _, p := range room.players {
			if p.username == vars["username"] {
				player = p
				break
			}
		}
		if player.username == "" {
			log.Fatalf("player not found")
		}
		player.role = vars["role"]
		player.team = vars["team"]

		msg := "roleAssn:"
		for _, p := range room.players {
			msg += p.username + "," + p.role + "," + p.team + ";"
		}
		msg = msg[:len(msg)-1]
		msg += ":"
		if isPlayersComplete(room.players) {
			msg += "APPROVE"
		} else {
			msg += "CONTINUE"
		}

		h.sendClients(room, msg)
	} else if vars["type"] == "startGame" {
		room := h.rooms[vars["room"]]
		if !isPlayersComplete(room.players) {
			return
		}
		if room.roomState == "GAME"  {
			log.Fatalf("Impossible to start game")
		}
		room.roomState = "game"
		h.sendClientsGame(room)
	} else if vars["type"] == "spyMove" {
		room := h.rooms[vars["room"]]
		num, _ := strconv.ParseInt(vars["num"], 10, 8)
		room.game.Spy(vars["word"], int(num))
		h.sendClientsGame(room)
	} else if vars["type"] == "guessMove" {
		room := h.rooms[vars["room"]]
		num, _ := strconv.ParseInt(vars["cell"], 10, 8)
		room.game.Guess(int(num))
		h.sendClientsGame(room)
	} else if vars["type"] == "pass" {
		room := h.rooms[vars["room"]]
		room.game.transition()
		h.sendClientsGame(room)
	} else if vars["type"] == "newGame" {
		room := h.rooms[vars["room"]]
		room.game = MakeGame(randomWords())
		room.roomState = "PENDING"
		msg := "joinRoom:"
		for _, p := range room.players {
			msg += p.username
			msg += ","
		}
		msg = msg[:len(msg)-1]
		h.sendClients(room, msg)
	}
}



// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	rooms map[string]*Room
	games map[string]*Game

	words *Dict

	mu sync.Mutex
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		rooms: 		make(map[string]*Room),
		words:		MakeDict(),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("number of clients: %v", len(h.clients))
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}