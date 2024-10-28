const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');

const adminAccounts = [
	{
		email: 'admin1@email.com',
		password: 'admin1pass'
	},
	{
		email: 'admin2@email.com',
		password: 'admin2pass'
	},
	{
		email: 'admin3@email.com',
		password: 'admin3pass'
	}
];

/// ADMIN                                                                                                                       ///
//> Login
router.post('/admin-login', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password)
		res.status(400).json({ error: 'Missing required fields!' });

	const admin = adminAccounts.find(
		(account) => account.email === email && account.password === password
	);

	if (admin) return res.status(200).json({ message: 'Login successful!' });
	else return res.status(401).json({ error: 'Invalid email or password' });
});
