const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');

/// FAVORITES                                                                                                                  ///
//> Get
router.get('/favorites/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const query = 'SELECT * FROM favorites WHERE user_id = $1';
	const values = [user_id];

	try {
		const result = await client.query(query, values);

		// Get product_id only
		const product_ids = result.rows.map((row) => row.product_id);

		const productsQuery = 'SELECT * FROM products WHERE id = ANY($1)';
		const productsValues = [product_ids];

		const productsResult = await client.query(productsQuery, productsValues);

		res.json(productsResult.rows);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Add
router.post('/favorites/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id } = req.body;

	if (!user_id || !product_id) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query = 'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2)';
		const values = [user_id, product_id];

		await client.query(query, values);

		res.status(201).json({ message: 'Product added to favorites!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Remove
router.delete('/favorites/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id } = req.body;

	if (!user_id || !product_id) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query =
			'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2';
		const values = [user_id, product_id];

		await client.query(query, values);

		res.status(200).json({ message: 'Product removed from favorites!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

module.exports = router;
