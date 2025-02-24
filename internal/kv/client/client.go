package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/pro0o/raft-in-motion/internal/client"
	"github.com/pro0o/raft-in-motion/internal/kv/types"

	"github.com/rs/zerolog/log"
)

const DebugClient = 1

type KVClient struct {
	addrs         []string // List of service addresses (host:port format)
	assumedLeader int      // Index of the assumed leader in the cluster
	clientID      int32    // Unique identifier for the client
	client        *client.Client
}

func New(serviceAddrs []string, c *client.Client) *KVClient {
	return &KVClient{
		addrs:         serviceAddrs,
		assumedLeader: 0,
		clientID:      clientCount.Add(1),
		client:        c,
	}
}

var clientCount atomic.Int32

func (c *KVClient) Put(ctx context.Context, key string, value string) (string, bool, error) {
	putReq := types.PutRequest{
		Key:   key,
		Value: value,
	}
	var putResp types.PutResponse

	log.Info().
		Int32("clientID", c.clientID).
		Str("key", key).
		Str("value", value).
		Msg("putRequestInitiated")

	err := c.send(ctx, "put", putReq, &putResp)

	if err == nil {
		log.Info().
			Int32("clientID", c.clientID).
			Str("key", key).
			Str("value", value).
			Msg("putRequestCompleted")
	} else {
		log.Info().
			Int32("clientID", c.clientID).
			Str("key", key).
			Str("value", value).
			Msg("putRequestFailed")
	}

	return putResp.PrevValue, putResp.KeyFound, err
}

func (c *KVClient) Get(ctx context.Context, key string) (string, bool, error) {
	getReq := types.GetRequest{
		Key: key,
	}
	var getResp types.GetResponse

	log.Info().
		Int32("clientID", c.clientID).
		Str("key", key).
		Msg("etRequestInitiated")

	err := c.send(ctx, "get", getReq, &getResp)

	if err == nil {
		log.Info().
			Int32("clientID", c.clientID).
			Str("key", key).
			Msg("getRequestCompleted")
	} else {
		log.Info().
			Int32("clientID", c.clientID).
			Str("key", key).
			Msg("getRequestFailed")
	}

	return getResp.Value, getResp.KeyFound, err
}

func (c *KVClient) send(ctx context.Context, route string, req any, resp types.Response) error {
FindLeader:
	for {
		retryCtx, retryCtxCancel := context.WithTimeout(ctx, 50*time.Millisecond)
		path := fmt.Sprintf("http://%s/%s/", c.addrs[c.assumedLeader], route)

		if err := sendJSONRequest(retryCtx, path, req, resp); err != nil {
			if contextDone(ctx) {
				retryCtxCancel()
				return nil
			} else if contextDeadlineExceeded(retryCtx) {
				c.assumedLeader = (c.assumedLeader + 1) % len(c.addrs)
				retryCtxCancel()
				continue FindLeader
			}
			retryCtxCancel()
			return nil
		}

		switch resp.Status() {
		case types.StatusNotLeader:
			log.Info().
				Int32("clientID", c.clientID).
				Str("server", c.addrs[c.assumedLeader]).
				Msg("responseNotLeader")
			time.Sleep(300 * time.Millisecond) // small backoff
			c.assumedLeader = (c.assumedLeader + 1) % len(c.addrs)
			retryCtxCancel()
			continue FindLeader
		case types.StatusOK:
			log.Info().
				Int32("clientID", c.clientID).
				Str("server", c.addrs[c.assumedLeader]).
				Msg("foundLeader")
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

func contextDone(ctx context.Context) bool {
	select {
	case <-ctx.Done():
		return true
	default:
		return false
	}
}

func contextDeadlineExceeded(ctx context.Context) bool {
	select {
	case <-ctx.Done():
		return ctx.Err() == context.DeadlineExceeded
	default:
		return false
	}
}
