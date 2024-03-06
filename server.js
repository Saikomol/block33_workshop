const express = require('express')
const app = express()
const pg = require('pg')
const client = new pg.Client(
  process.env.DATABASE_URL || 'postgres://localhost/acme_notes_employees_db'
)
const port = process.env.PORT || 3000

app.use(express.json())
app.use(require('morgan')('dev'))

app.get('/api/departments', async (req, res, next) => {
  try {
    const SQL = `
      SELECT * from departments
    `
    const response = await client.query(SQL)
    res.send(response.rows)
  } catch (ex) {
    next(ex)
  }
})

app.get('/api/notes', async (req, res, next) => {
  try {
    const SQL = `
      SELECT * from notes ORDER BY created_at DESC;
    `
    const response = await client.query(SQL)
    res.send(response.rows)
  } catch (ex) {
    next(ex)
  }
})

app.post('/api/notes', async (req, res, next) => {
  try {
    const SQL = `
      INSERT INTO notes(name, color, departments_id)
      VALUES($1, $2, $3)
      RETURNING *
    `
    const response = await client.query(SQL, [req.body.name,req.body.color, req.body.departments_id])
    res.send(response.rows[0])
  } catch (ex) {
    next(ex)
  }
})

app.put('/api/notes/:id', async (req, res, next) => {
  try {
    const SQL = `
      UPDATE notes
      SET name=$1, ranking=$2, color=$3, departments_id=$4, updated_at= now()
      WHERE id=$5 RETURNING *
    `
    const response = await client.query(SQL, [
      req.body.name,
      req.body.ranking,
      req.body.color,
      req.body.departments_id,
      req.params.id
    ])
    res.send(response.rows[0])
  } catch (ex) {
    next(ex)
  }
})

app.delete('/api/notes/:id', async (req, res, next) => {
  try {
    const SQL = `
      DELETE from notes
      WHERE id = $1
    `
    const response = await client.query(SQL, [req.params.id])
    res.sendStatus(204)
  } catch (ex) {
    next(ex)
  }
})

const init = async () => {
  await client.connect()
  let SQL = `
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS departments;
    CREATE TABLE departments(
      id SERIAL PRIMARY KEY,
      Dname VARCHAR(100)
    );
    CREATE TABLE notes(
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      ranking INTEGER DEFAULT 3 NOT NULL,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(255) NOT NULL,
      departments_id INTEGER REFERENCES departments(id) NOT NULL
    );
  `
  await client.query(SQL)
  console.log('tables created')
  SQL = `
    INSERT INTO departments(Dname) VALUES('WORKER');
    INSERT INTO departments(Dname) VALUES('ENGINEER');
    INSERT INTO departments(Dname) VALUES('LAND WORKER');
    INSERT INTO notes(name, ranking, color, departments_id) VALUES('THOMAS', 5,'BLUE', (SELECT id FROM departments WHERE Dname='WORKER'));
    INSERT INTO notes(name, ranking, color, departments_id) VALUES('Percy', 5, 'GREEN',(SELECT id FROM departments WHERE Dname='WORKER'));
    INSERT INTO notes(name, ranking, color, departments_id) VALUES('James', 4, 'RED',(SELECT id FROM departments WHERE Dname='WORKER'));
    INSERT INTO notes(name, ranking, color, departments_id) VALUES('Cranky', 4, 'WHITE',(SELECT id FROM departments WHERE Dname='LAND WORKER'));
    INSERT INTO notes(name, ranking, color, departments_id) VALUES('Victor', 2, 'BLUE',(SELECT id FROM departments WHERE Dname='ENGINEER'));
  `
  await client.query(SQL)
  console.log('data seeded')
  app.listen(port, () => console.log(`listening on port ${port}`))
  console.log(`curl localhost:${port}/api/notes`);
}

init()