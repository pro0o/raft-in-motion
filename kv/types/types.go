package types

// put
type PutRequest struct {
	Key   string
	Value string
}

type Response interface {
	Status() ResponseStatus
}

type PutResponse struct {
	RespStatus ResponseStatus
	KeyFound   bool
	PrevValue  string
}

func (pr *PutResponse) Status() ResponseStatus {
	return pr.RespStatus
}

// get
type GetRequest struct {
	Key string
}

type GetResponse struct {
	RespStatus ResponseStatus
	KeyFound   bool
	Value      string
}

func (gr *GetResponse) Status() ResponseStatus {
	return gr.RespStatus
}

// application layer(kv store) -> raft
type ResponseStatus int

const (
	StatusInvalid ResponseStatus = iota
	StatusOK
	StatusNotLeader
	StatusFailedCommit
)

var responseName = map[ResponseStatus]string{
	StatusInvalid:      "invalid",
	StatusOK:           "OK",
	StatusNotLeader:    "NotLeader",
	StatusFailedCommit: "FailedCommit",
}

func (rs ResponseStatus) String() string {
	return responseName[rs]
}
