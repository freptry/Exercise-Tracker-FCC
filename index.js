const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.DB_URL);

const userSchema = new Schema({
  username: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

const exSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Update to reference User model
  description: String,
  duration: Number,
  date: Date
});

const Exercise = mongoose.model('Exercise', exSchema);

app.use(cors());
app.use(express.static('public'));

app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username'); // Update to select only _id and username
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body; // Destructure username from request body
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json(savedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) {
      res.send("could not find user");
    } else {
      const exObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      });
      const exercise = await exObj.save();
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      });
    }
  } catch (err) {
    console.log(err);
    res.send("error saving ex")
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const { _id } = req.params;
  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send('User not found');
    }
    const query = { user_id: _id };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }
    const exercises = await Exercise.find(query).limit(parseInt(limit) || 0); // Limit to specified number or default to 0
    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
