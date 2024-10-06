require('dotenv').config();
const { Client } = require('pg');

//> POSTGRESQL
const client = new Client({
	user: process.env.POSTGRES_USER,
	host: process.env.POSTGRES_HOST,
	database: process.env.POSTGRES_DATABASE,
	password: process.env.POSTGRES_PASSWORD,
	port: 5432,
	ssl: {
		rejectUnauthorized: true
	}
});

client
	.connect()
	.then(() => console.log('Connected to PostgreSQL'))
	.catch((err) => console.error('Connection error', err.stack));

module.exports = client;
