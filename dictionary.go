package main

import (
	"bufio"
	"flag"
	"log"
	"math/rand"
	"os"
)

type Dict struct {
	words []string
}

func (d *Dict) choose(num int) []string {
	seen := make(map[int]bool)
	var codewords []string
	freq := num
	for freq > 0 {
		rn := rand.Intn(len(d.words))
		if _, ok := seen[rn]; !ok {
			codewords = append(codewords, d.words[rn])
			seen[rn] = true
			freq -= 1
		}
	}
	if len(codewords) != num || len(seen) != num {
		log.Printf("codewords: %v", codewords)
		log.Fatalf("choose() performed incorrectly")
	}
	return codewords


}

func MakeDict() *Dict {
	fptr := flag.String("fpath", "words.txt", "file path to read from")
	flag.Parse()

	f, err := os.Open(*fptr)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err = f.Close(); err != nil {
			log.Fatal(err)
		}
	}()
	var ret []string
	s := bufio.NewScanner(f)
	for s.Scan() {
		ret = append(ret, s.Text())
		//fmt.Println(s.Text())
	}
	err = s.Err()
	if err != nil {
		log.Fatal(err)
	}
	return &Dict{words: ret}
}

