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
	clients []*Client
	players []Player
	roomState string

	game *Game
}

func (h *Hub) sendClients(clients []*Client, message string){
	for _, c := range clients {
		if _, ok := h.clients[c]; ok {
			c.send <- []byte(message)
		}
	}
}


func (h *Hub) processMessage(vars map[string]string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if vars["type"] == "createRoom" {
		room := Room{
			clients: []*Client{},
			players: []Player{},
			roomState: "PENDING",
			game: MakeGame(),
		}
		player := Player{
			username: vars["username"],
			team:     RED,
			role:     SPYMASTER,
		}
		room.players = append(room.players, player)
		h.rooms[vars["room"]] = room
	} else if vars["type"] == "joinRoom" {
		if _, ok := h.rooms[vars["room"]]; !ok || h.rooms[vars["room"]].roomState != "PENDING"  {
			c.send <- []byte("joinRoom:FAILURE")
			return
		}
		room := h.rooms[vars["room"]]
		room.clients = append(room.clients, c)
		player := Player{
			username: vars["username"],
			team:     RED,
			role:     SPYMASTER,
		}
		room.players = append(room.players, player)
		msg := "joinRoom:"
		for _, p := range room.players {
			msg += p.username
			msg += ","
		}
		msg = msg[:len(msg)-1]
		h.sendClients(room.clients, msg)
	} else if vars["type"] == "roleAssn" {
		room := h.rooms[vars["room"]]
		room.roomState = "ROLES"
		player := Player{}
		for _, p := range room.players {
			if p.username == vars["username"] {
				player = p
				break
			}
		}
		player.role = vars["role"]
		player.team = vars["team"]

		msg := "roleAssn:"
		for _, p := range room.players {
			msg += p.username + "," + p.role + "," + p.team + ";"
		}
		msg = msg[:len(msg)-1]
		h.sendClients(room.clients, msg)
	} else if vars["type"] == "startGame" {
		room := h.rooms[vars["room"]]
		room.roomState = "game"

		msg := "boardRender:"
		msg += room.game.Render()
		h.sendClients(room.clients, msg)
	} else if vars["type"] == "spyMove" {
		room := h.rooms[vars["room"]]
		num, _ := strconv.ParseInt(vars["num"], 10, 8)
		room.game.Spy(vars["word"], int(num))
		msg := "transition"
		h.sendClients(room.clients, msg)
	} else if vars["type"] == "guessMove" {
		room := h.rooms[vars["room"]]
		num, _ := strconv.ParseInt(vars["cell"], 10, 8)
		room.game.Guess(int(num))
		msg := "boardRender:"
		msg += room.game.Render()
		h.sendClients(room.clients, msg)
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

	rooms map[string]Room
	games map[string]Game

	mu sync.Mutex
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		rooms: 		make(map[string][]Room),
		games:		make(map[string]Game),
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