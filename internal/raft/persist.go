// PERSISTENCE
// ALSO from figure 2 of paper
// Persister is a place for this server to
// save its persistent State, and also initially holds the most
// recent saved State, if any.
// restore From Storage restores the persistent state of this Rf from storage.
package raft

import (
	"bytes"
	"encoding/gob"
	"log"
)

func (rf *Raft) restoreFromStorage() {
	if termData, found := rf.storage.Get("currentTerm"); found {
		d := gob.NewDecoder(bytes.NewBuffer(termData))
		if err := d.Decode(&rf.currentTerm); err != nil {
			log.Fatal(err)
		}
	} else {
		log.Fatal("currentTerm not found in storage")
	}
	if votedData, found := rf.storage.Get("votedFor"); found {
		d := gob.NewDecoder(bytes.NewBuffer(votedData))
		if err := d.Decode(&rf.votedFor); err != nil {
			log.Fatal(err)
		}
	} else {
		log.Fatal("votedFor not found in storage")
	}
	if logData, found := rf.storage.Get("log"); found {
		d := gob.NewDecoder(bytes.NewBuffer(logData))
		if err := d.Decode(&rf.log); err != nil {
			log.Fatal(err)
		}
	} else {
		log.Fatal("log not found in storage")
	}
}

// persistToStorage saves all of Rf's persistent state in rf.storage.
func (rf *Raft) persistToStorage() {
	var termData bytes.Buffer
	if err := gob.NewEncoder(&termData).Encode(rf.currentTerm); err != nil {
		log.Fatal(err)
	}
	rf.storage.Set("currentTerm", termData.Bytes())

	var votedData bytes.Buffer
	if err := gob.NewEncoder(&votedData).Encode(rf.votedFor); err != nil {
		log.Fatal(err)
	}
	rf.storage.Set("votedFor", votedData.Bytes())

	var logData bytes.Buffer
	if err := gob.NewEncoder(&logData).Encode(rf.log); err != nil {
		log.Fatal(err)
	}
	rf.storage.Set("log", logData.Bytes())
}
