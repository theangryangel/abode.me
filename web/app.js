var express = require('express'),
	db = require('../db')
	engine = require('ejs-locals');

var app = express();

app.engine('ejs', engine);

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + "/public"));
app.use(express.bodyParser());
app.use(app.router);

var defaults = function(src, dft)
{
	for (var prop in dft)
	{
		if (src[prop] === void 0) src[prop] = dft[prop];
	}
    
	return src;
};

var pick = function(obj, keys)
{
	var copy = {};

	for (var key in keys)
	{
		if (!obj.hasOwnProperty(key))
			continue;

		copy[key] = obj[key];
	}

	return copy;
};

var without = function(obj, keys)
{
	var copy = {};
	for (var key in obj)
	{
		if (keys.indexOf(key) == -1) copy[key] = obj[key];
	}

	return copy;
}

app.get('/', function(req, res)
{
	db.all("SELECT * FROM property", function(err, rows)
	{
		res.render('index');
	});
});

app.get('/types', function(req, res)
{
	db.all("SELECT DISTINCT property_type FROM property", function(err, rows)
	{
		res.json(rows);
	});
});

app.get('/countries', function(req, res)
{
	db.all("SELECT DISTINCT country FROM property", function(err, rows)
	{
		res.json(rows);
	});
});

app.get('/properties', function(req, res)
{
	var permitted = { keywords: null, page: null, count: null, country: null, property_type: null };
	var params = defaults(pick(req.query, permitted), { page: 0, count: 100 });

	var search = without(params, [ 'page', 'count', 'keywords' ]);

	var where_stmt = [],
		where_params = [];

	for (var s in search)
	{
		var w = s + ' = ?',
			v = [ search[s] ];

		if (Array.isArray(search[s]))
		{
			var t = (new Array( search[s].length + 2 ).join( '?,' ));
			t = t.substring(0, t.length - 3);

			w = s + ' IN (' + t + ')';
			v = search[s];

			where_stmt.push(w);
		}

		for (var i in v)
			where_params.push(v[i]);
	}

	if (params.keywords && params.keywords.length > 0)
	{
		where_stmt.push('description LIKE ?')
		where_params.push('%' + params.keywords + '%')
	}

	var sql = "SELECT p.*, s.average as broadband_average, s.connections as broadband_connections FROM property AS p LEFT JOIN broadband_speed AS s ON p.outcode = s.outcode";

	if (where_stmt.length > 0)
		sql += ' WHERE ' + where_stmt.join(' AND ');
	
	sql += " LIMIT ? OFFSET ?";

	where_params.push(params.count);
	where_params.push(params.page);

	db.all(sql, where_params, function(err, rows)
	{
		if (err)
			console.log(err);

		res.json(rows);
	});
});

app.get('/properties/:id', function(req, res)
{
	db.get("SELECT * FROM property WHERE id = ?", [ req.params.id ], function(err, row)
	{
		res.json(row);
	});
});

app.listen(3000);
