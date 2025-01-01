// kv/client/client.go
package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"main/client"
	"main/kv/types"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog/log"
)

const DebugClient = 1

// KVClient represents a client that interacts with a key-value service cluster.
// It tracks the list of service addresses and keeps an assumption of the current leader.
type KVClient struct {
	addrs         []string // List of service addresses (host:port format)
	assumedLeader int      // Index of the assumed leader in the cluster (starts at 0 by default)
	clientID      int32    // Unique identifier for the client, incremented for each new client instance
	client        *client.Client
}

// New creates a new KVClient instance. It accepts a list of service addresses (serviceAddrs),
// which is the set of servers in the key-value service cluster that the client will
// communicate with.
func New(serviceAddrs []string, c *client.Client) *KVClient {
	return &KVClient{
		addrs:         serviceAddrs,
		assumedLeader: 0,
		clientID:      clientCount.Add(1), // Atomically increment the client count
		client:        c,
	}
}

// clientCount is a counter for creating unique client IDs, used mainly for debugging.
var clientCount atomic.Int32

// Put sends a request to store a key-value pair on the service.
// It returns the previous value, a boolean indicating if the key was found, and an error if any.
func (c *KVClient) Put(ctx context.Context, key string, value string) (string, bool, error) {
	putReq := types.PutRequest{
		Key:   key,
		Value: value,
	}
	var putResp types.PutResponse
	err := c.send(ctx, "put", putReq, &putResp)
	return putResp.PrevValue, putResp.KeyFound, err
}

// Get sends a request to retrieve the value associated with the provided key.
// It returns the value, a boolean indicating if the key was found, and an error if any.
func (c *KVClient) Get(ctx context.Context, key string) (string, bool, error) {
	getReq := types.GetRequest{
		Key: key,
	}
	var getResp types.GetResponse
	err := c.send(ctx, "get", getReq, &getResp)
	return getResp.Value, getResp.KeyFound, err
}

// send handles communication with the key-value service, sending a request to the assumed leader.
// It retries with different service addresses if the current leader assumption is incorrect.
// The `route` argument is the API endpoint (like "put" or "get"), `req` is the request data,
// and `resp` is where the response is unmarshalled into.
func (c *KVClient) send(ctx context.Context, route string, req any, resp types.Response) error {
FindLeader:
	for {
		// Create a context with a short timeout for each retry, while observing the parent context.
		retryCtx, retryCtxCancel := context.WithTimeout(ctx, 50*time.Millisecond)
		path := fmt.Sprintf("http://%s/%s/", c.addrs[c.assumedLeader], route)

		c.clientlog("SendingRequest", map[string]interface{}{
			"path":    path,
			"request": req,
		})

		if err := sendJSONRequest(retryCtx, path, req, resp); err != nil {
			if contextDone(ctx) {
				c.clientlog("Parent context canceled or deadline exceeded", nil)
				retryCtxCancel()
				return err
			} else if contextDeadlineExceeded(retryCtx) {
				c.clientlog("Timed out contacting server", map[string]interface{}{
					"path": path,
				})
				c.assumedLeader = (c.assumedLeader + 1) % len(c.addrs)
				retryCtxCancel()
				continue FindLeader
			}
			retryCtxCancel()
			return err
		}

		// c.clientlog("ReceivedResponse", map[string]interface{}{
		// 	"response": resp,
		// })

		switch resp.Status() {
		case types.StatusNotLeader:
			c.clientlog("ResponseNotLeader", map[string]interface{}{
				"attemptedServer": c.addrs[c.assumedLeader],
			})
			time.Sleep(300 * time.Millisecond) // small backoff
			c.assumedLeader = (c.assumedLeader + 1) % len(c.addrs)
			retryCtxCancel()
			continue FindLeader
		case types.StatusOK:
			c.clientlog("FoundLeader", map[string]interface{}{
				"path":   path,
				"server": c.addrs[c.assumedLeader],
			})
			retryCtxCancel()
			return nil
		case types.StatusFailedCommit:
			retryCtxCancel()
			return fmt.Errorf("commit failed; please retry")
		default:
			panic("unreachable")
		}
	}
}

// clientlog writes minimal logs if DebugClient > 0.
func (cl *KVClient) clientlog(event string, details map[string]interface{}) {
	if DebugClient > 0 {
		logEntry := map[string]interface{}{
			"clientID":  cl.clientID,
			"event":     event,
			"timestamp": time.Now().UnixNano(),
		}

		for key, value := range details {
			logEntry[key] = value
		}

		jsonLog, err := json.Marshal(logEntry)
		if err != nil {
			log.Error().Err(err).Msg("Failed to marshal log entry to JSON")
			return
		}

		cl.client.AddLog("Client", int(cl.clientID), string(jsonLog))
	}
}

// sendJSONRequest sends an HTTP POST request with the request data (in JSON format)
// and decodes the response into respData. It uses the provided context to support
// request cancellation and timeouts.
func sendJSONRequest(ctx context.Context, path string, reqData any, respData any) error {
	body := new(bytes.Buffer)
	enc := json.NewEncoder(body)
	if err := enc.Encode(reqData); err != nil {
		return fmt.Errorf("JSON-encoding request data: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, path, body)
	if err != nil {
		return fmt.Errorf("creating HTTP request: %w", err)
	}
	req.Header.Add("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	dec := json.NewDecoder(resp.Body)
	if err := dec.Decode(respData); err != nil {
		return fmt.Errorf("JSON-decoding response data: %w", err)
	}
	return nil
}

// contextDone checks if the given context is done for any reason (canceled or deadline exceeded).
// It returns true if the context is done, false otherwise.
func contextDone(ctx context.Context) bool {
	select {
	case <-ctx.Done():
		return true
	default:
		return false
	}
}

// contextDeadlineExceeded checks if the given context's deadline has been exceeded.
// It returns true if the deadline was exceeded, false otherwise.
func contextDeadlineExceeded(ctx context.Context) bool {
	select {
	case <-ctx.Done():
		return ctx.Err() == context.DeadlineExceeded
	default:
		return false
	}
}
