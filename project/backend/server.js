const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Initialiseer Express app
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Hallo wereld!');
});

// Route om de status van de server te controleren
app.get('/status', (req, res) => {
    res.json({ status: 'Server draait goed!' });
});






// Start de server
app.listen(port, () => {
    console.log(`Server staat aan op http://localhost:${port}`);
});