const express = require("express");
const router = express.Router();
const { client } = require("../services.cjs");

/// USERS
router.post("/bpi/check-number", async (req, res) => {
  const { mobile_number } = req.body;

  if (!mobile_number) {
    return res.status(400).json({ error: "Missing mobile number" });
  }

  const query = `SELECT * FROM bpi_users WHERE mobile_number = $1`;
  const values = [mobile_number];

  try {
    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      return res.status(400).json({ error: "Mobile number already exists" });
    }

    res.status(200).json({ message: "Mobile number available" });
  } catch (error) {
    res.status(500).json({ error: error.stack });
  }
});

router.post("/bpi/register", async (req, res) => {
  const { mobile_number, name, referral_code } = req.body;

  if (!mobile_number || !name || !referral_code) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const query = `INSERT INTO bpi_users (mobile_number, name, referral_code) VALUES ($1, $2, $3) RETURNING *`;
  const values = [mobile_number, name, referral_code];

  try {
    const result = await client.query(query, values);
    const newUser = result.rows[0];

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.stack });
  }
});

router.post("/bpi/login", async (req, res) => {
  const { referral_code } = req.body;

  if (!referral_code) {
    return res.status(400).json({ error: "Missing required fields!" });
  }

  const query = "SELECT * FROM bpi_users WHERE referral_code = $1";
  const values = [referral_code];

  try {
    const result = await client.query(query, values);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "Invalid referral code!" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.stack });
  }
});

router.get("/bpi/user/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Missing required fields!" });
  }

  const query = "SELECT * FROM bpi_users WHERE id = $1";
  const values = [id];

  try {
    const result = await client.query(query, values);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "Invalid user id!" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.stack });
  }
});

/// CATALOG
const merchants = [
  {
    id: 1,
    name: "SM Gift Pass",
    category: "General",
    locations: 500,
    cities: ["Manila", "Cebu", "Davao"],
    provinces: ["Metro Manila", "Cebu", "Davao del Sur"],
    startingPrice: 100,
  },
  {
    id: 2,
    name: "The SM Store",
    category: "General",
    locations: 80,
    cities: ["Quezon City", "Pasig", "Bacolod"],
    provinces: ["Metro Manila", "Negros Occidental", "Iloilo"],
    startingPrice: 200,
  },
  {
    id: 3,
    name: "Power Mac Center",
    category: "Electronics",
    locations: 50,
    cities: ["Makati", "Cebu", "San Fernando"],
    provinces: ["Metro Manila", "Cebu", "Pampanga"],
    startingPrice: 5000,
  },
  {
    id: 4,
    name: "Krispy Kreme",
    category: "Cafe",
    locations: 100,
    cities: ["Manila", "Cebu", "Baguio"],
    provinces: ["Metro Manila", "Cebu", "Benguet"],
    startingPrice: 50,
  },
  {
    id: 5,
    name: "Jollibee",
    category: "Fast Food",
    locations: 1500,
    cities: ["Manila", "Cebu", "Iloilo"],
    provinces: ["Metro Manila", "Cebu", "Iloilo"],
    startingPrice: 100,
  },
  {
    id: 6,
    name: "Fully Booked",
    category: "Bookstore",
    locations: 30,
    cities: ["Taguig", "Cebu", "Batangas City"],
    provinces: ["Metro Manila", "Cebu", "Batangas"],
    startingPrice: 300,
  },
  {
    id: 7,
    name: "The Coffee Bean & Tea Leaf",
    category: "Cafe",
    locations: 100,
    cities: ["Manila", "Davao", "Baguio"],
    provinces: ["Metro Manila", "Davao del Sur", "Benguet"],
    startingPrice: 150,
  },
  {
    id: 8,
    name: "The Travel Club",
    category: "Specialty Store",
    locations: 20,
    cities: ["Makati", "Cebu", "San Pablo"],
    provinces: ["Metro Manila", "Cebu", "Laguna"],
    startingPrice: 2000,
  },
];

// Get all merchants
router.get("/bpi/merchants", async (req, res) => {
  setTimeout(() => {
    res.status(200).json(merchants);
  }, 3000);
});

// Get merchant by name
router.get("/bpi/merchants/:name", async (req, res) => {
  const { name } = req.params;
  const merchant = merchants.find(
    (merchant) => merchant.name.toLowerCase().replaceAll(" ", "-") === name,
  );

  if (!merchant) {
    return res.status(404).json({ error: "Merchant not found" });
  }

  setTimeout(() => {
    res.status(200).json(merchant);
  }, 3000);
});

/// ORDERS
// Get all orders
router.get("/bpi/orders", async (req, res) => {
  try {
    const orders = await client.query("SELECT * FROM bpi_orders");
    setTimeout(() => {
      res.status(200).json(orders.rows);
    }, 3000);
  } catch (error) {
    res.status(500).json({ error: error.stack });
  }
});

// Get order by ID
router.get("/bpi/orders/:id", async (req, res) => {
  const { id } = req.params;
  const result = await client.query("SELECT * FROM bpi_orders WHERE id = $1", [
    id,
  ]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Order not found" });
  }

  setTimeout(() => {
    res.status(200).json(result.rows[0]);
  }, 3000);
});

// Add order
router.post("/bpi/orders", async (req, res) => {
  const { merchant, credits, quantity, amount, date, status } = req.body;

  if (!merchant || !credits || !quantity || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const order = {
    id: generateOrderId(),
    merchant,
    credits,
    quantity,
    amount,
    date: generateOrderDate(),
    status: "Unredeemed",
  };

  const query = `INSERT INTO bpi_orders (id, merchant, credits, quantity, amount, date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
  const values = [
    order.id,
    order.merchant,
    order.credits,
    order.quantity,
    order.amount,
    order.date,
    order.status,
  ];

  try {
    const result = await client.query(query, values);
    const newOrder = result.rows[0];

    setTimeout(() => {
      res.status(201).json(newOrder);
    }, 3000);
  } catch (error) {
    res.status(500).json({ error: error.stack });
  }
});

function generateOrderId() {
  const orderId = crypto
    .randomUUID()
    .toUpperCase()
    .replaceAll("-", "")
    .slice(0, 8);
  return orderId;
}

function generateOrderDate() {
  return new Date().toISOString().split("T")[0];
}

module.exports = router;
