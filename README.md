<a href="https://raft-in-motion.vercel.app">
  <img src="./frontend/public/assets/banner.png" alt="raft-in-motion" />
</a>

## Intro...

This simulation is purely based on the [Raft paper](https://raft.github.io/raft.pdf).  
I started off this project just testing out and simualting the Raft consensus algorithm in Go, and it was working decently. But then thought, why not **visualize** the whole process of the consensus? So, here's the simulation with visualization.

Feel free to explore the Go-only simulation in the `raft-test` branch, its not well optimized though.

---

## Features so far 

- [x] Spawn servers and hold consensus.
- [x] Timely ping-pong through RPC.
- [x] Simple KV client & server on app layer.
- [x] Kill & respawn leaders and followers.
- [x] Update Log entries via leader heartbeats.
- [x] ws conn between client-side & ws-server.
- [x] Logs visualization.
- [ ] Reliable persistent storage.
- [ ] Still some test cases fails, fix them.
- [ ] Sync logs more tightly.
- [ ] Simulate more cases and visualize.
- [ ] Reduce rate-limiting and allow more active conn.

---

## Project Structure

- `cmd/` - Contains the main entry point for the Go application
- `frontend/` - Next.js web interface for visualization
- `internal/` - Core logic including:
  - `client/` - Client implementation
  - `harness/` - Testing harness
  - `kv/` - Key-value store implementation
  - `logger/` - Logging utilities
  - `raft/` - Raft consensus algorithm implementation
  - `ws/` - WebSocket handling


## Running the Project

```bash
# running the go ws server.
docker build -t raft-in-motion .
docker run -p 8080:8080 raft-in-motion
```


```bash
# client-side 
cd frontend/
npm install
npm run dev

# For prod, make sure to create a `.env.prod` file in the root dir.
NEXT_PUBLIC_WS_ENDPOINT=wss://localhost:8080/ws?simulate=6
npm run build
```
## Resources to Learn More About Raft

Here are some resources I referenced and learned from while building this project — in no particular order:

- [A Student’s Guide to Raft](https://thesquareplanet.com/blog/students-guide-to-raft/) [more of a guide to understand the paper.]

- [The Secret Lives of Data — Raft Visualization](https://thesecretlivesofdata.com/raft/)  [visualization of raft.]

- [6.824 Distributed Systems Course (YouTube)](https://www.youtube.com/@6.824) [goated distributed sys playlist to get started to and some few labs on Go as well.]

- [Raft Implementation in Go - Phil Eaton](https://notes.eatonphil.com/2023-05-25-raft.html) [raft implementaion in go]

- [HashiCorp's Raft Go Package](https://pkg.go.dev/github.com/hashicorp/raft)  [official go raft pkg]

- [Raft Implementations](http://raft.github.io/#implementations) [there are already many implementation of raft in Go and other languages too.] 

## License

This project is licensed under the CC BY-NC-ND 4.0 License. See the [LICENSE](LICENSE) file for details.

## Contributing

If you have any suggestions or improvements, please create an issue or a pull request. I'll try to respond to all issues and pull requests.
