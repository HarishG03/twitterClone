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
  console.log(query1)
  const result = await db.get(query1)
  console.log(result)
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
  console.log(arr.value)
  const query3 = `SELECT tweet ,date_time AS dateTime FROM Tweet
  WHERE user_id in (${arr})
  ORDER BY dateTime DESC ;`
  console.log(query3)
  const tweetRes = await db.all(query3)
  console.log(tweetRes)
  response.status(200)
  response.send(tweetRes)
})

app.delete('/delete/:id', async (request, response) => {
  const {id} = request.params
  const query1 = `
  DELETE FROM user 
  WHERE user_id = ${id}`
  await db.run(query1)
  response.send('Deleted')
})

module.exports = app
