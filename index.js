const express = require('express');
const app = express();

// Library used for geospatial calculations
const d3 = require('d3-geo');

// File contains application configurables
const config = require('./config.json');

// Library for geocoding (and others) features
const googleMapsClient = require('@google/maps').createClient({
    key: config.google_api_key,
    Promise: Promise
});

// Contains list of stores in geoJSON format
const stores = require('./stores_polygon.json');
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));
// using in build expressjs JSON body parser
app.use(express.json());


app.get('/', (req, res) => res.render('index'));

/**
 * Post request handler method for finding store in the address received
 */
app.post('/check-store-in-area', async (req, res, next) => {
    try {
        let address = req.param('address');
        if (!address || !address.trim()) {
            return res.status(400).json({ message: "Invalid request!" })
        }
        address = address.trim();
        // Get geo-coordinates from the address
        const response = await googleMapsClient.geocode({ address: address }).asPromise();

        if (response.json.results.length) {
            let coordinates = response.json.results[0].geometry.location;
            let cordArray = [coordinates.lng, coordinates.lat];
            let geoObject = stores.features.find(val => {

                /**
                 * if geo-coordinates falls in any of the polygon,
                 * return that geoJSON Object
                 */
                if (d3.geoContains(val, cordArray)) {
                    return val;
                }
            });
            if (geoObject) {
                res.status(200).json({ name: geoObject.properties.Name });
            } else {
                res.status(200).json({ message: "Not found!" })
            }
        } else {
            res.status(200).json({ message: "Invalid address format!" });
        }

    } catch (e) {
        next(e);
    }
});

// 404 request handler
app.use((req, res, next) => {
    res.status(404).json({ "message": "URL does not exist" });
});

// Final error handler
app.use((err, req, res, next) => {
    console.log(err);
    let status = err.status || err.code || 500;
    res.status(status).json({ "message": 'Something went wrong, please contain admin!' });
});

// server started
app.listen(config.server_port, () => console.log(`App listening on port ${config.server_port}!`));
