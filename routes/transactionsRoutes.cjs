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

module.exports = router;
