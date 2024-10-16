package server

type Command struct {
	Kind CommandKind

	Key, Value string

	CompareValue string

	ResultValue string
	ResultFound bool

	// id is the Raft ID of the server submitting this command.
	Id int
}

type CommandKind int

const (
	CommandInvalid CommandKind = iota
	CommandGet
	CommandPut
)

var commandName = map[CommandKind]string{
	CommandInvalid: "invalid",
	CommandGet:     "get",
	CommandPut:     "put",
}

func (ck CommandKind) String() string {
	return commandName[ck]
}
