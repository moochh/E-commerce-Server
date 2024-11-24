const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');

/// IMAGES                                                                                                                      ///
//> Update product image
router.post('/update-product-image/:id', async (req, res) => {
	const { id } = req.params;
	const { image } = req.body;

	if (!id || !image)
		res.status(400).json({ error: 'Missing required fields!' });

	try {
		const product = await client.query(
			`UPDATE products SET image_url = $1 WHERE id = $2`,
			[image, id]
		);
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Internal server error!' });
	}

	if (product.rowCount > 0)
		return res.status(200).json({ message: 'Product image updated!' });
	else return res.status(404).json({ error: 'Product not found!' });
});

module.exports = router;
