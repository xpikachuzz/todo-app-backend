const { createClient } = require('redis')

const redisClient = new createClient()



module.exports = redisClient