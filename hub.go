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
	players []*Player
	roomState string

	game *Game
}

func (h *Hub) sendClientsGame(room *Room, messagePrefix string){

	for _, c := range room.clients {
		if _, ok := h.clients[c]; ok {
			role := ""
			for _, p := range room.players {
				if p.username == c.username {
					role = p.role
				}
			}
			if role == "" {
				log.Fatalf("player does not exist in records")
			}
			msg := messagePrefix + room.game.Render(role)
			log.Printf("sending message %v", msg)
			c.send <- []byte(msg)
		}
	}
}

func (h *Hub) sendClients(clients []*Client, message string){
	for _, c := range clients {
		if _, ok := h.clients[c]; ok {
			log.Printf("sending message %v", message)
			c.send <- []byte(message)
		}
	}
}

func randomWords() []string {
	words := []string{}
	for i := 0; i < 25; i++ {
		words = append(words, string(i))
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
			clients: []*Client{},
			players: []*Player{},
			roomState: "PENDING",
			game: MakeGame(randomWords()),
		}
		player := &Player{
			username: vars["username"],
			team:     RED,
			role:     SPYMASTER,
		}
		room.players = append(room.players, player)
		room.clients = append(room.clients, c)
		h.rooms[vars["room"]] = room
		msg := "joinRoom:"
		for _, p := range room.players {
			msg += p.username
			msg += ","
		}
		msg = msg[:len(msg)-1]
		h.sendClients(room.clients, msg)
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
		room.clients = append(room.clients, c)
		player := &Player{
			username: vars["username"],
			team:     RED,
			role:     SPYMASTER,
		}
		room.players = append(room.players, player)
		h.rooms[vars["room"]] = room
		log.Printf("players: %v", room.players)
		msg := "joinRoom:"
		for _, p := range room.players {
			msg += p.username
			msg += ","
		}
		msg = msg[:len(msg)-1]
		h.sendClients(room.clients, msg)
	} else if vars["type"] == "roleAssn" {
		log.Printf("vars: %v", vars)
		room := h.rooms[vars["room"]]
		if room.roomState != "ROLES" && room.roomState != "PENDING" {
			c.send <- []byte("roleAssn:FAILURE:roleAssnNotProcessed")
			return
		}
		room.roomState = "ROLES"
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

		h.sendClients(room.clients, msg)
	} else if vars["type"] == "startGame" {
		room := h.rooms[vars["room"]]
		if room.roomState != "ROLES" {
			log.Fatalf("Impossible to start game")
		}
		room.roomState = "game"
		msg := "initGame:"
		h.sendClientsGame(room, msg)
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
		msg += room.game.Render("GUESSER")
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

	rooms map[string]*Room
	games map[string]*Game

	mu sync.Mutex
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		rooms: 		make(map[string]*Room),
		games:		make(map[string]*Game),
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