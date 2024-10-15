const express = require('express');
const router = express.Router();
const client = require('../services.cjs');

/// CART                                                                                                                       ///
//> Get
router.get('/cart/:user_id', async (req, res) => {
	const { user_id } = req.params;

	// Query to get product IDs and quantities from the cart
	const cartQuery = 'SELECT product_id, quantity FROM cart WHERE user_id = $1';
	const cartValues = [user_id];

	try {
		// Fetch product IDs and quantities from the cart
		const cartResult = await client.query(cartQuery, cartValues);
		const cartItems = cartResult.rows;

		if (cartItems.length === 0) {
			return res.status(200).json([]);
		}

		// Extract the product IDs
		const productIds = cartItems.map((item) => parseInt(item.product_id));

		// Query to get product info from the products table for these product IDs
		const productQuery = 'SELECT * FROM products WHERE id = ANY($1)';
		const productValues = [productIds];

		// Fetch product info for the selected products
		const productResult = await client.query(productQuery, productValues);
		const products = productResult.rows;

		// Combine product info with quantities
		const cartWithProductInfo = cartItems.map((cartItem) => {
			const product = products.find(
				(p) => p.id === parseInt(cartItem.product_id)
			);
			return {
				...product,
				quantity: parseInt(cartItem.quantity)
			};
		});

		// Send the combined data
		res.status(200).json(cartWithProductInfo);
	} catch (error) {
		res.status(500).json({ error: error.stack });
		console.error(error);
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
