const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const path = require('path')
const app = express()
const jwt = require('jsonwebtoken')
app.use(express.json())
const dbPath = path.join(__dirname, 'twitterClone.db')
let db
const initializeServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running!!!')
    })
  } catch (e) {
    console.log(`DB Error ${e.meddage}`)
    process.exit(-1)
  }
}
initializeServer()

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const query1 = `SELECT * FROM user 
  WHERE username = '${username}';`
  const result = await db.get(query1)
  if (result !== undefined) {
    response.send('User already exists')
    response.status(400)
  } else if (password.length < 6) {
    response.send('Password is too short')
    response.status(400)
  } else {
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log(hashedPassword)
    const query1 = `INSERT INTO user(name,username,password,gender)
    VALUES('${name}','${username}','${hashedPassword}','${gender}');`
    await db.run(query1)
    response.status(200)
    response.send('User created successfully')
  }
})
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const query2 = `
  SELECT * FROM user 
  WHERE username = '${username}';`
  const result2 = await db.get(query2)
  if (result2 === undefined) {
    response.send('Invalid user')
    response.status(400)
  } else {
    const is_passwordMatched = await bcrypt.compare(password, result2.password)
    if (is_passwordMatched !== true) {
      response.status(400)
      response.send('Invalid password')
    } else {
      const payload = {username: username}
      console.log(payload)
      const token = jwt.sign(payload, 'Token_JWT')
      response.send({
        jwtToken: token,
      })
    }
  }
})

const verifyToken = (request, response, next) => {
  let jwtToken
  let authToken = request.headers['authorization']
  if (authToken !== undefined) {
    jwtToken = authToken.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'Token_JWT', (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

app.get('/user/tweets/feed/', verifyToken, async (request, response) => {
  const username = request.username
  let arr = []
  const query1 = `SELECT user_id FROM user
  WHERE username = '${username}';`
  const id_req1 = await db.get(query1)
  const required_user_id = id_req1.user_id
  const query2 = `SELECT following_user_id AS followingIdreq FROM follower
  WHERE follower_user_id =  ${required_user_id};`
  const followingIds_req = await db.all(query2)
  followingIds_req.forEach(obj => {
    arr.push(obj.followingIdreq)
  })
  console.log(arr)
  const query3 = `SELECT username,tweet,date_time as dateTime FROM user INNER JOIN tweet ON user.user_id = tweet.user_id WHERE user.user_id IN (${arr}) ORDER BY date_time DESC LIMIT 4;`
  console.log(query3)
  const tweetRes = await db.all(query3)
  console.log(tweetRes)
  response.status(200)
  response.send(tweetRes)
})

app.get('/user/following/', verifyToken, async (request, response) => {
  const username = request.username
  let arr = []
  const query1 = `SELECT user_id FROM user
  WHERE username = '${username}';`
  const id_req1 = await db.get(query1)
  const required_user_id = id_req1.user_id
  const query2 = `SELECT following_user_id AS followingIdreq FROM follower
  WHERE follower_user_id =  ${required_user_id};`
  const followingIds_req = await db.all(query2)
  followingIds_req.forEach(obj => {
    arr.push(obj.followingIdreq)
  })
  console.log(arr)
  const query3 = `Select name FROM user WHERE user.user_id IN (${arr});`
  const result = await db.all(query3)
  response.send(result)
})

app.get('/user/followers/', verifyToken, async (request, response) => {
  const username = request.username
  let arr = []
  const query1 = `SELECT user_id FROM user
  WHERE username = '${username}';`
  const id_req1 = await db.get(query1)
  const required_user_id = id_req1.user_id
  const query2 = `SELECT follower_user_id AS followerIdreq FROM follower
  WHERE following_user_id =  ${required_user_id};`
  const followingIds_req = await db.all(query2)
  followingIds_req.forEach(obj => {
    arr.push(obj.followerIdreq)
  })
  console.log(arr)
  const query3 = `Select name FROM user WHERE user.user_id IN (${arr});`
  const result = await db.all(query3)
  response.send(result)
})

app.get('/tweets/:tweetId/', verifyToken, async (request, response) => {
  const {tweetId} = request.params
  const username = request.username
  const query1 = `SELECT tweet FROM tweet
  WHERE tweet_id = ${tweetId};`
  const result = await db.get(query1)
  response.send(result)
})
app.get('/tweets/:tweetId/likes/', verifyToken, async (request, response) => {
  const username = request.username
  let arr = []
  const query1 = `SELECT user_id FROM user
  WHERE username = '${username}';`
  const id_req1 = await db.get(query1)
  const required_user_id = id_req1.user_id
  const query2 = `SELECT following_user_id AS followingIdreq FROM follower
  WHERE follower_user_id =  ${required_user_id};`
  const followingIds_req = await db.all(query2)
  followingIds_req.forEach(obj => {
    arr.push(obj.followingIdreq)
  })
  console.log(arr)
  const query3 = `Select user.name FROM USER INNER JOIN like ON user.userId = like.user_id WHERE user.user_id IN (${arr});`
  const result = await db.all(query3)
  response.send(result)
})
app.get('/tweets/:tweetId/replies/', verifyToken, async (request, response) => {
  const username = request.username
  let arr = []
  const query1 = `SELECT user_id FROM user
  WHERE username = '${username}';`
  const id_req1 = await db.get(query1)
  const required_user_id = id_req1.user_id
  const query2 = `SELECT following_user_id AS followingIdreq FROM follower
  WHERE follower_user_id =  ${required_user_id};`
  const followingIds_req = await db.all(query2)
  followingIds_req.forEach(obj => {
    arr.push(obj.followingIdreq)
  })
  console.log(arr)
  const query3 = `Select user.name FROM USER INNER JOIN reply ON user.userId = reply.user_id WHERE user.user_id IN (${arr});`
  const result = await db.all(query3)
  response.send(result)
})
app.get('/user/tweets/', verifyToken, async (request, response) => {
  const username = request.username
  const query1 = `SELECT user_id FROM user WHERE username = '${username}';`
  const userId = await db.get(query1)
  const reqUserId = userId.user_id
  const query2 = `
  SELECT tweet FROM tweet WHERE tweet.user_id = ${reqUserId};`
  const result2 = await db.all(query2)
  response.send(result2)
})

app.post('/user/tweets/', verifyToken, async (request, response) => {
  const username = request.username
  const {tweet} = request.body
  const query1 = `SELECT user_id FROM user WHERE username = '${username}';`
  const userId = await db.get(query1)
  const dateTime = new Date()
  console.log(userId)
  const reqUserId = userId.user_id
  const query2 = `
  INSERT INTO tweet(tweet)
  VALUES('${tweet}');`
  await db.run(query2)
  response.send('Created a Tweet')
})

app.delete('/tweets/:tweetId/', verifyToken, async (request, response) => {
  const {tweetId} = request.params
  const query1 = `
  SELECT * FROM user INNER JOIN tweet ON user.user_id = tweet.user_id
  WHERE tweet.tweet_id = ${tweetId};`
  const result = await db.get(query1)
  if (result === undefined) {
    response.status(401)
    response.send('Invalid Request')
  } else {
    const query2 = `
    DELETE FROM tweet 
  WHERE tweet.tweet_id = ${tweetId};`
    await db.run(query2)
    response.send('Tweet Removed')
  }
})

module.exports = app
