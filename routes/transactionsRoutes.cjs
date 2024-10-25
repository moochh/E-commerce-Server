const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');

/// TRANSACTIONS
//> Get all transactions
router.get('/transactions', async (req, res) => {
	const query = `SELECT * FROM transactions`;

	try {
		const result = await client.query(query);
		const transactions = result.rows;

		res.status(200).json(transactions);
	} catch (error) {
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

//> Get a transaction
router.get('/transactions/:payment_id', async (req, res) => {
	const { payment_id } = req.params;

	try {
		const query = `SELECT * FROM transactions WHERE payment_id = $1`;
		const values = [payment_id];
		const result = await client.query(query, values);
		const transaction = result.rows[0];

		res.status(200).json(transaction);
	} catch (error) {
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

//> Add
router.post('/transactions/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { payment_id, reference_number, amount, payment_method } = req.body;

	if (!payment_id || !reference_number || !amount || !payment_method) {
		res.status(400).json({ error: 'Missing required fields!' });
		return;
	}

	try {
		const query = `INSERT INTO transactions (user_id, payment_id, reference_number, amount, payment_method) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
		const values = [
			user_id,
			payment_id,
			reference_number,
			amount,
			payment_method
		];
		const result = await client.query(query, values);
		const transaction = result.rows[0];

		res.status(201).json(transaction);
	} catch (error) {
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

module.exports = router;
