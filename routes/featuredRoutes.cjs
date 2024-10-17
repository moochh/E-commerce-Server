const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');

/// FEATURED
//> Add
router.post('/featured/:product_id', async (req, res) => {
	const { product_id } = req.params;

	if (!product_id) res.status(400).json({ error: 'Missing required fields!' });

	const query = 'UPDATE products SET is_featured = true WHERE id = $1';
	const values = [product_id];

	try {
		await client.query(query, values);
		res.status(200).json({ message: 'Product featured successfully!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
		console.error(error);
	}
});

//> Delete
router.delete('/featured/:product_id', async (req, res) => {
	const { product_id } = req.params;

	if (!product_id) res.status(400).json({ error: 'Missing required fields!' });

	const query = 'UPDATE products SET is_featured = false WHERE id = $1';
	const values = [product_id];

	try {
		await client.query(query, values);
		res.status(200).json({ message: 'Product unfeatured successfully!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
		console.error(error);
	}
});

module.exports = router;
