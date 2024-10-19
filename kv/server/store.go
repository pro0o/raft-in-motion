// Basic in-memory datastore backing the KV service.
package server

import "sync"

// a simple, concurrency-safe key-value store used as a backend
// for kvservice.
type DataStore struct {
	sync.Mutex
	data map[string]string
}

func NewDataStore() *DataStore {
	return &DataStore{
		data: make(map[string]string),
	}
}

func (ds *DataStore) Get(key string) (string, bool) {
	ds.Lock()
	defer ds.Unlock()

	value, ok := ds.data[key]
	return value, ok
}

func (ds *DataStore) Put(key, value string) (string, bool) {
	ds.Lock()
	defer ds.Unlock()

	v, ok := ds.data[key]
	ds.data[key] = value
	return v, ok
}
