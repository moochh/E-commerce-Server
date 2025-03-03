const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');

/// BILLING ADDRESS
//> Get
router.get('/billing/:user_id', async (req, res) => {
	const { user_id } = req.params;

	if (!user_id) res.status(400).json({ error: 'Missing required fields!' });

	const query = 'SELECT * from billing_address where user_id = $1';
	const values = [user_id];

	try {
		const result = await client.query(query, values);

		res.status(200).json(result.rows);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Get individual billing address
router.get('/billing/:user_id/:billing_id', async (req, res) => {
	const { user_id, billing_id } = req.params;

	if (!user_id || !billing_id)
		res.status(400).json({ error: 'Missing required fields!' });

	const query = 'SELECT * from billing_address where user_id = $1 and id = $2';
	const values = [user_id, billing_id];

	try {
		const result = await client.query(query, values);

		res.status(200).json(result.rows[0]);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Add
router.post('/billing/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const {
		first_name,
		last_name,
		email,
		phone_number,
		address_line_1,
		address_line_2,
		city,
		postal_code
	} = req.body;

	if (
		!first_name ||
		!last_name ||
		!email ||
		!phone_number ||
		!address_line_1 ||
		!address_line_2 ||
		!city ||
		!postal_code
	)
		res.status(400).json({ error: 'Missing required fields!' });

	const query =
		'INSERT INTO billing_address (user_id, first_name, last_name, email, phone_number, address_line_1, address_line_2, city, postal_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *';
	const values = [
		user_id,
		first_name,
		last_name,
		email,
		phone_number,
		address_line_1,
		address_line_2,
		city,
		postal_code
	];

	try {
		const result = await client.query(query, values);

		res.status(201).json({ message: 'Billing address added successfully!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Update
router.put('/billing/:user_id/:billing_id', async (req, res) => {
	const { user_id, billing_id } = req.params;
	const {
		first_name,
		last_name,
		email,
		phone_number,
		address_line_1,
		address_line_2,
		city,
		postal_code
	} = req.body;

	if (
		!first_name ||
		!last_name ||
		!email ||
		!phone_number ||
		!address_line_1 ||
		!address_line_2 ||
		!city ||
		!postal_code
	)
		res.status(400).json({ error: 'Missing required fields!' });

	const query =
		'UPDATE billing_address SET first_name = $1, last_name = $2, email = $3, phone_number = $4, address_line_1 = $5, address_line_2 = $6, city = $7, postal_code = $8 WHERE user_id = $9 AND id = $10';
	const values = [
		first_name,
		last_name,
		email,
		phone_number,
		address_line_1,
		address_line_2,
		city,
		postal_code,
		user_id,
		billing_id
	];

	try {
		const result = await client.query(query, values);

		res.status(200).json({ message: 'Billing address updated successfully!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Delete
router.delete('/billing/:user_id/:billing_id', async (req, res) => {
	const { user_id, billing_id } = req.params;

	if (!user_id || !billing_id)
		res.status(400).json({ error: 'Missing required fields!' });

	const query = 'DELETE FROM billing_address WHERE user_id = $1 AND id = $2';
	const values = [user_id, billing_id];

	try {
		result = await client.query(query, values);

		res.status(200).json({ message: 'Billing address deleted successfully!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

module.exports = router;
