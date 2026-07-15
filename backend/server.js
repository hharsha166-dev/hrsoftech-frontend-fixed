require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors());

// Razorpay webhook needs the raw body for signature verification, so it must
// be mounted BEFORE the json() body parser, with its own raw parser.
app.use('/api/wallet/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

// Uploaded documents are served statically but only after auth in a real deployment
// you'd want a signed-URL or auth-checked route instead of a static folder. This is
// left simple for local testing — tighten before production.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`HRSOFTECH SOLUTION backend running on port ${PORT}`));