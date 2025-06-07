
## raft-in-motion
implementation of [raft paper](https://raft.github.io/raft.pdf) in go + log-based visualization in next.js.

## notes

you can explore the go-only version in the `raft-test` branch (note: it's not optimized).</br>
if the simulation doesn't run or connection feels slow; aws is expensive bruhtherr.

## running the project

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
```

## credits

here are some resources I learned from while building this project — in no particular order:

- [A Student’s Guide to Raft](https://thesquareplanet.com/blog/students-guide-to-raft/) [more of a guide to understand the paper.]

- [The Secret Lives of Data — Raft Visualization](https://thesecretlivesofdata.com/raft/)  [visualization of raft.]

- [6.824 Distributed Systems Course [YouTube]](https://www.youtube.com/@6.824) [goated distributed sys playlist to get started to and some labs on Go as well.]

- [Raft Implementation in Go - Phil Eaton](https://notes.eatonphil.com/2023-05-25-raft.html) [not purely paper based but nice read.]

- [Raft Implementation in Go - Eli Bendersky](https://eli.thegreenplace.net/2020/implementing-raft-part-0-introduction/) [well documentated; easy to follow.]

- [HashiCorp's Raft Go Package](https://pkg.go.dev/github.com/hashicorp/raft)  [official go raft pkg.]
