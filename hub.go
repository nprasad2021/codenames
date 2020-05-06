package main

import (
	"log"
	"strconv"
	"sync"
	"time"
)

type Player struct {
	username string
	team     string
	role     string

	creator bool
}

type Room struct {
	clients map[*Client]bool
	players map[string]*Player
	roomState string

	creator *Player
	game *Game
	timer time.Duration
}

const (
	FAILURE = "FAILURE"
	SUCCESS = "SUCCESS"

	rejoinGAME = "rejoinGAME"
)

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
			close(c.send)
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
			close(c.send)
		}
	}
}

func (h *Hub) createRoom(vars map[string]string, c*Client) bool{
	roomCode := randomString(4)
	ok := true
	for ok == true {
		roomCode = randomString(4)
		_, ok = h.rooms[roomCode]
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
		role:     CODEMASTER,
		creator:  true,
	}
	room.players[player.username] = player
	room.creator = player
	room.clients[c] = true
	vars["room"] = roomCode
	h.rooms[vars["room"]] = room
	return true
}
func (h *Hub) joinRoom(vars map[string]string, c*Client) string {
	if _, ok := h.rooms[vars["room"]]; !ok {
		c.send <- []byte("createRoom:FAILURE:Room does not exist")
		return FAILURE
	}
	room := h.rooms[vars["room"]]
	if room.roomState != "PENDING"  {
		if _, ok := room.players[vars["username"]]; !ok {
			c.send <- []byte("createRoom:FAILURE:Room is Closed")
			return FAILURE
		}
		room.clients[c] = true
		msg := "reassign:"
		msg += room.players[vars["username"]].team + ":" + room.players[vars["username"]].role
		c.send <- []byte(msg)
		return rejoinGAME
	}

	room.clients[c] = true
	player := &Player{
		username: vars["username"],
		team:     RED,
		role:     CODEMASTER,
		creator:  false,
	}
	room.players[player.username] = player
	return SUCCESS
}

func (h *Hub) roleAssn(vars map[string]string) {
	log.Printf("vars: %v", vars)
	room := h.rooms[vars["room"]]
	if room.roomState != "PENDING" {
		return
	}
	player, ok := room.players[vars["username"]]
	if !ok {
		log.Fatalf("Player %v does not exist", vars["username"])
	}
	if val, ok := vars["role"]; ok {
		player.role = val
	}
	if val, ok := vars["team"]; ok {
		player.team = val
	}

	msg := "roleAssn:" + vars["room"] + ":"
	for _, p := range room.players {
		msg += p.username + "," + p.role + "," + p.team + ";"
	}
	msg = msg[:len(msg)-1]
	if ok, err := isPlayersComplete(room.players); ok {
		msg += ":APPROVE," + room.creator.username
	} else {
		msg += ":CONTINUE," + err
	}
	h.sendClients(room, msg)
}

func (h *Hub) startGame(vars map[string]string) {
	room := h.rooms[vars["room"]]
	if ok, _ := isPlayersComplete(room.players); !ok {
		return
	}
	if room.roomState == "GAME"  {
		return
	}
	room.roomState = "GAME"
	h.sendClientsGame(room)
}


func (h *Hub) processMessage(vars map[string]string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	log.Printf("args: %v", vars)

	if vars["type"] == "createRoom" {
		if h.createRoom(vars, c) {
			h.roleAssn(vars)
		}
	} else if vars["type"] == "joinRoom" {
		rType := h.joinRoom(vars, c)
		if rType == SUCCESS {
			h.roleAssn(vars)
		} else if rType == rejoinGAME {
			room := h.rooms[vars["room"]]
			h.sendClientsGame(room)
		}
	} else if vars["type"] == "roleAssn" {
		h.roleAssn(vars)
	} else if vars["type"] == "startGame" {
		h.startGame(vars)
	} else if vars["type"] == "spyMove" {
		room := h.rooms[vars["room"]]
		num, _ := strconv.ParseInt(vars["num"], 10, 8)
		log.Printf("%v, %v", vars["word"], num)
		if room.game.Spy(vars["word"], int(num)) {
			h.sendClientsGame(room)
		}

	} else if vars["type"] == "guessMove" {
		room := h.rooms[vars["room"]]
		num, _ := strconv.ParseInt(vars["cell"], 10, 8)
		if room.game.Guess(int(num)) {
			h.sendClientsGame(room)
		}

	} else if vars["type"] == "pass" {
		room := h.rooms[vars["room"]]
		room.game.transition()
		h.sendClientsGame(room)
	} else if vars["type"] == "newGame" {
		room := h.rooms[vars["room"]]
		if room.roomState != "GAME" {
			return
		}
		room.game = MakeGame(h.words.choose(25))
		room.roomState = "PENDING"
		h.roleAssn(vars);
	} else if vars["type"] == "text" {
		room := h.rooms[vars["room"]]
		msg := "text:" + vars["username"] + ":" + vars["msg"]
		h.sendClients(room, msg)
	}
}

func (h *Hub) Clean() {
	for {
		time.Sleep(20*time.Minute)
		h.mu.Lock()
		for roomName, room := range h.rooms {
			if len(room.clients) == 0 {
				delete(h.rooms, roomName)
			}
		}
		h.mu.Unlock()
	}
}



// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	rooms map[string]*Room
	words *Dict
	mu sync.Mutex
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms: 		make(map[string]*Room),
		words:		MakeDict(),
	}
}