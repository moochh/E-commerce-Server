require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const bodyParser = require('body-parser');

//> Routes
const userRoutes = require('./routes/userRoutes.cjs');
const cartRoutes = require('./routes/cartRoutes.cjs');
const favoritesRoutes = require('./routes/favoritesRoutes.cjs');
const paymentsRoutes = require('./routes/paymentsRoutes.cjs');
const webhookRoutes = require('./routes/webhookRoutes.cjs');
const productsRoutes = require('./routes/productsRoutes.cjs');
const ordersRoutes = require('./routes/ordersRoutes.cjs');
const billingRoutes = require('./routes/billingRoutes.cjs');
const featuredRoutes = require('./routes/featuredRoutes.cjs');
const transactionsRoutes = require('./routes/transactionsRoutes.cjs');
const adminRoutes = require('./routes/adminRoutes.cjs');
const imageRoutes = require('./routes/imageRoutes.cjs');
const reviewsRoutes = require('./routes/reviewsRoutes.cjs');

/// SETUP                                                                                                                      ///
app.use(cors());
app.use(bodyParser.json());

/// ROUTES                                                                                                                     ///
app.use('/', userRoutes);
app.use('/', cartRoutes);
app.use('/', favoritesRoutes);
app.use('/', paymentsRoutes);
app.use('/', webhookRoutes);
app.use('/', productsRoutes);
app.use('/', ordersRoutes);
app.use('/', billingRoutes);
app.use('/', featuredRoutes);
app.use('/', transactionsRoutes);
app.use('/', adminRoutes);
app.use('/', imageRoutes);
app.use('/', reviewsRoutes);

/// RUN                                                                                                                        ///
app.get('/', (req, res) => {
	res.send('Server running...');
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}...`);
});
