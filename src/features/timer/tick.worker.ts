// Worker timers are not throttled like background-tab timers, so phase ends stay on time.
setInterval(() => postMessage(0), 250)
