var restler = require('restler'),
	async = require('async'),
	sqlite3 = require('sqlite3').verbose(),
	db = require('../db'),
	progress = require('progress');

var mixin_nested = function(target, source)
{
	source = source || {};
	Object.keys(source).forEach(function(key)
	{
		if (source[key].constructor == Object)
			target[key] = mixin_nested(target[key], source[key]);
		else
			target[key] = source[key];
	});

	return target;
}

var zoopla = restler.service(function(key)
{
	this.defaults.query.api_key = key;
},
{
	query: {},
	baseURL: 'http://api.zoopla.co.uk'
},
{
	property_listings: function(options)
	{
		return this.get('/api/v1/property_listings.js', mixin_nested({ query: options }, this.defaults));
	}
});

db.serialize(function()
{
	db.run("CREATE TABLE IF NOT EXISTS property( \
		image_caption TEXT, status TEXT, num_floors INTEGER, \
		listing_status TEXT, num_bedrooms INTEGER, agent_name TEXT, \
		latitude INTEGER, agent_address TEXT, num_recepts INTEGER, \
		property_type TEXT, country TEXT, longitude REAL, \
		first_published_date DATETIME, displayable_address DATETIME, price_modifier TEXT, \
		street_name TEXT, num_bathrooms INTEGER, thumbnail_url TEXT, \
		description TEXT, post_town TEXT, details_url TEXT, \
		agent_logo TEXT, agent_phone TEXT, outcode TEXT, \
		image_url TEXT, last_published_date DATETIME, new_home BOOLEAN, \
		county TEXT, price TEXT, id INTEGER \
	);");
	db.run('CREATE UNIQUE INDEX IF NOT EXISTS id_idx ON property (id);');
	db.run('CREATE INDEX IF NOT EXISTS outcode_idx ON property(outcode);')
	
	db.run("CREATE TABLE IF NOT EXISTS property_history(status TEXT, listing_status TEXT, price_modifier TEXT, price TEXT, seen DATETIME DEFAULT CURRENT_TIMESTAMP, id INTEGER);");
	db.run('CREATE INDEX IF NOT EXISTS id_idx ON property_history (id);');
});

var config = require('../config.json');

var z = new zoopla(config.api_key);

var criteria = mixin_nested({
	area: '', radius: 0, ordering: 'ascending', include_rented: 0, include_sold: 0,
	minimum_beds: 0, maximum_beds: 0, keywords: [],
	page_size: 100, page_number: 1, summarised: 'yes', maximum_price: 0,
	minimum_price: 0, listing_status: 'sale', property_type: 'houses'
}, config);

var results = [];

z.property_listings(criteria)
.on('complete', function(data)
{
	if (typeof data == 'string')
	{
		console.log(data);
		return;
	}

	results.push.apply(results, data.listing);

	var max = Math.ceil(data.result_count / criteria.page_size);
	var pb = new progress('  downloading [:bar] :current/:total :etas', { total: max, width: 20, complete: '=', incomplete: ' ' });
	pb.tick();

	async.whilst(
		function()
		{
			return criteria.page_number < max;
		},
		function(next)
		{
			z.property_listings(criteria).on('complete', function(data)
			{
				criteria.page_number++;			
				results.push.apply(results, data.listing);
				pb.tick();
				next();
			});
		},
		function(err)
		{
			console.log(results.length);

			pb.terminate();
			pb = new progress('      storing [:bar] :current/:total :etas', { total: results.length, width: 20, complete: '=', incomplete: ' ' });			
		
			db.serialize(function()
			{
				var property_stmt = db.prepare("insert or replace into property( \
					image_caption, status, num_floors, listing_status, num_bedrooms, \
					agent_name, latitude, agent_address, num_recepts, property_type, \
					country, longitude, first_published_date, displayable_address, \
					price_modifier, street_name, num_bathrooms, thumbnail_url, description, \
					post_town, details_url, agent_logo, agent_phone, outcode, \
					image_url, last_published_date, new_home, county, price, id) \
					VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);");
	
				var property_history_stmt = db.prepare("insert into property_history(status, listing_status, price_modifier, price, id) VALUES(?, ?, ?, ?, ?);");
	
				for (var i in results)
				{
					pb.tick();
	
					property_stmt.run(
						results[i].image_caption, results[i].status, results[i].num_floors, 
						results[i].listing_status, results[i].num_bedrooms, results[i].agent_name, 
						results[i].latitude, results[i].agent_address, results[i].num_recepts, 
						results[i].property_type, results[i].country, results[i].longitude, 
						results[i].first_published_date, results[i].displayable_address, results[i].price_modifier, 
						results[i].street_name, results[i].num_bathrooms, results[i].thumbnail_url, 
						results[i].description, results[i].post_town, results[i].details_url, 
						results[i].agent_logo, results[i].agent_phone, results[i].outcode, 
						results[i].image_url, results[i].last_published_date, results[i].new_home, 
						results[i].county, results[i].price, results[i].listing_id
					);
	
					property_history_stmt.run(
						results[i].status, results[i].listing_status, results[i].price_modifier,
						results[i].price, results[i].listing_id
					);
				}
	
				property_stmt.finalize();
				property_history_stmt.finalize();
			});

			pb.terminate();
		
			db.close();

			process.exit();
		}
	);
});
