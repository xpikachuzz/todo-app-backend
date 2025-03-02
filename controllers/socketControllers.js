const redisClient = require("../redis")



module.exports.initialize = async (io) => {
  // redis update
  const views = await redisClient.get("views")
  let newViews = 1
  if (!views) {
    await redisClient.set("views", 1)
  } else {
    newViews = Number(views)+1
    await redisClient.set("views", Number(views)+1)
  }

  // redis
  io.emit("views", newViews)

  // Get comments:
  const keys = await redisClient.keys("comment:*")
  await keys.forEach(async (key) => {
    io.emit("comments", [await redisClient.get(key), key.split(":").slice(1).join(":")])
  })
}


module.exports.emitComments = async (socket, comment, cb) => {
  socket.broadcast.emit("comments", comment)
}