<a href="https://raft-in-motion.vercel.app">
  <img src="./frontend/public/assets/banner.png" alt="raft-in-motion" />
</a>

## Intro...

This simulation is purely based on the [Raft paper](https://raft.github.io/).  
I started off this project just testing the Raft algorithm in Go, and logs were spitting out pretty nicely. But then thought, why not **visualize** the whole thing? So, here's the simulation with visualization.

Feel free to explore the Go-only simulation in the `raft-test` branch, its not well optimized though.

---

## Features so far 

- [x] Spawn servers and hold consensus (eventual elections and all).
- [x] Reliable ping-pong between leader and followers.
- [x] Simple KV client on the application layer (`put` & `get` only for now).
- [x] Kill & respawn leaders and followers working fineeeee.
- [x] Log entries get updated via leader heartbeats.
- [x] ws conn between client-side (Next.js) & ws-server based on log state.
- [x] Logs visualization on the client-side.

---

## Still some features to implement 

- [ ] Add reliable persistent storage.
- [ ] Cross-check against the Raft paper — still fails a few cases like frequent leader disconnects.
- [ ] Sync logs more tightly between leader and followers.
- [ ] More test cases with a larger number of servers.
- [ ] Simulate more cases and send it out to the clientside.
- [ ] Reduce rate-limiting and allow more active connections.

---

## Project Structure

The project is organized into several main components:

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
# Build and run the Docker container
docker build -t raft-in-motion .
docker run -p 8080:8080 raft-in-motion
```


```bash
# Navigate to the frontend directory
cd frontend/

# Install dependencies
npm install

# Run development server
npm run dev

# For production
npm run build
```

```
# For prod, create a `.env.prod` file in the root dir.
NEXT_PUBLIC_WS_ENDPOINT=wss://localhost:8080/ws?simulate=6
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

If you have any suggestions or improvements, please create an issue or a pull request. I'll try to respond to all issues and pull requests.
