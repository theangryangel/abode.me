# Abode.me
A very quickly hacked together tool to fetch and loads data from the Zoopla API,
for (offline) consumption, and combines (badly) with the ofcom broadband report.

## Running
1. Get an API key from Zoopla
2. Create a config.json
```javascript
{
	"area": "CITY", "radius": 40, "minimum_beds": 2, "maximum_beds": 3,
	"keywords": [ "garage" ],
	"maximum_price": MIN_PRICE, "minimum_price": MAX_PRICE, "listing_status": "sale",
	"property_type": "houses", "api_key": "YOUR_API_KEY"
}
```
3. Run `make depend` to get the ofcom data and install dependencies
4. Run `make fetch` to get the most recent data from Zoopla
5. Run `make run` and browse to http://localhost:3000 with a reasonably modern browser

## Issues
- It's shit
- It's noddy
- I don't care

## TODO
- Make it less shit
