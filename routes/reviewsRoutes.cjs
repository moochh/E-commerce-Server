const express = require('express');
const router = express.Router();
const { client, validateRequiredFields } = require('../services.cjs');

/// Reviews                                                                                                                     ///
//> Get Review of Single Product
router.get('/reviews/:product_id/:user_id', async (req, res) => {
	const { product_id, user_id } = req.params;

	const query = 'SELECT * FROM reviews WHERE product_id = $1';
	const values = [product_id];

	try {
		const result = await client.query(query, values);

		// From user_id in the result, get the user's name
		const userName = result.rows.map((row) => row.user_id);
		const query2 = 'SELECT * FROM users WHERE id = ANY($1)';
		const values2 = [userName];
		const result2 = await client.query(query2, values2);

		// Add the user's name to the result
		result.rows.forEach((row) => {
			if (row.user_id == user_id) {
				row.name = 'You';
			} else {
				const user = result2.rows.find((user) => user.id === row.user_id);
				row.name = `${user.first_name} ${user.last_name}`;
			}
		});

		res.status(200).json(result.rows);
	} catch (error) {
		res.status(500).json({ message: 'Internal server error' });
		console.log(error);
	}
});

//> Add Review
router.post('/add-review/:product_id', async (req, res) => {
	const { product_id } = req.params;
	const { user_id, rating, comment } = req.body;

	const requiredFields = ['user_id', 'rating'];
	const validationError = validateRequiredFields(req.body, requiredFields);
	if (validationError) return res.status(400).json(validationError);

	const query =
		'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES ($1, $2, $3, $4)';
	const values = [user_id, product_id, rating, comment];

	try {
		await client.query(query, values);
		res.status(200).json({ message: 'Review added successfully' });
	} catch (error) {
		res.status(500).json({ message: 'Internal server error' });
		console.log(error);
	}
});

module.exports = router;
