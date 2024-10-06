const express = require('express');
const router = express.Router();
const client = require('../services.cjs');

/// CART                                                                                                                       ///
//> Get
router.get('/cart/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const query = 'SELECT * FROM cart WHERE user_id = $1';
	const values = [user_id];

	try {
		const result = await client.query(query, values);
		res.status(200).json(result.rows);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Add
router.post('/cart/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id, quantity } = req.body;

	if (!user_id || !product_id || !quantity) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query =
			'INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)';
		const values = [user_id, product_id, quantity];

		await client.query(query, values);

		res.status(201).json({ message: 'Product added to cart!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Update
router.put('/cart/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id, quantity } = req.body;

	if (!user_id || !product_id || !quantity) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query =
			'UPDATE cart SET quantity = $3 WHERE user_id = $1 AND product_id = $2';
		const values = [user_id, product_id, quantity];

		await client.query(query, values);

		res.status(200).json({ message: 'Product quantity updated!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Remove
router.delete('/cart/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id } = req.body;

	if (!user_id || !product_id) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query = 'DELETE FROM cart WHERE user_id = $1 AND product_id = $2';
		const values = [user_id, product_id];

		await client.query(query, values);

		res.status(200).json({ message: 'Product removed from cart!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

module.exports = router;
