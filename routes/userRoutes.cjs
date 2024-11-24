const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');
const uuid = require('uuid');
const argon = require('argon2');

/// GET USERS                                                                                                                  ///
router.get('/users', async (req, res) => {
	try {
		const rows = await client.query('SELECT * FROM users');
		res.status(200).json(rows.rows);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

/// GET USER BY ID                                                                                                             ///
router.get('/users/:id', async (req, res) => {
	const id = req.params.id;

	if (!id) return res.status(400).json({ message: 'ID is required!' });

	try {
		const rows = await client.query('SELECT * FROM users WHERE id = $1', [id]);
		res.status(200).json(rows.rows[0]);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

/// LOGIN                                                                                                                      ///
router.post('/login', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	const query = 'SELECT id, password_hash FROM users WHERE email = $1';
	const values = [email];

	try {
		const { rows } = await client.query(query, values);

		if (!rows.length) {
			return res.status(401).json({ error: 'Invalid email or password!' });
		}

		const password_hash = rows[0].password_hash;
		const isPasswordCorrect = await argon.verify(password_hash, password);

		if (!isPasswordCorrect) {
			return res.status(401).json({ error: 'Invalid email or password!' });
		}

		res.status(200).json({ id: rows[0].id });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

/// SIGNUP                                                                                                                     ///
router.post('/register', async (req, res) => {
	const { first_name, last_name, email, password } = req.body;

	if (!first_name || !last_name || !email || !password) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	// Check existing emails
	const query = 'SELECT * FROM users WHERE email = $1';
	const values = [email];

	try {
		const { rows } = await client.query(query, values);

		if (rows.length) {
			return res.status(400).json({ error: 'Email already exists!' });
		}

		// Insert to database
		const id = uuid.v4();
		const passwordHash = await argon.hash(password);
		const insertQuery = `INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
		const insertValues = [id, first_name, last_name, email, passwordHash];

		const result = await client.query(insertQuery, insertValues);

		res
			.status(201)
			.json({ message: 'Registration successful!', id: result.rows[0].id });
	} catch (error) {
		res.status(500).json({ error: error.stack });
		console.log(error.stack);
	}
});

//! DELETE USER                                                                                                                ///
router.delete('/users/:email', async (req, res) => {
	const email = req.params.email;

	if (!email) return res.status(400).json({ message: 'Email is required!' });

	try {
		const deleteQuery = `DELETE FROM users WHERE email = $1`;
		const deleteValues = [email];

		await client.query(deleteQuery, deleteValues);

		res.status(200).json({ message: 'User deleted!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

module.exports = router;
