
package main

import (
	"log"
	"net/http"
	"os"
)

// var addr = flag.String("addr", ":8080", "http service address")

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	hub := newHub()
	go hub.Clean()
	http.Handle("/", http.FileServer(http.Dir("web_app/")))
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	err := http.ListenAndServe(":" + port, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
