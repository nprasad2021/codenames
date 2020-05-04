// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

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
	http.Handle("/", http.FileServer(http.Dir("web_app/")))
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	err := http.ListenAndServe(":" + port, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
