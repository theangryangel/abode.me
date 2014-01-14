var csv = require('csv'),
fs = require('fs'),
db = require('./db'),
progress = require('progress');

var raw = [],
compressed = {},
final = {};

var sum = function (values)
{
	var i,
	sum = 0,
	len = values.length;
	for (i = 0; i < len; i++)
		sum += values[i];
	return sum;
}

var avg = function (values)
{
	var i,
	sum = 0,
	len = values.length;
	for (i = 0; i < len; i++)
		sum += values[i];
	return sum / len;
}

var median = function(values)
{ 
	values.sort( function(a,b) {return a - b;} );
	var half = Math.floor(values.length/2);
	if(values.length % 2)
		return values[half];
	else
		return (values[half-1] + values[half]) / 2.0;
}

var max = function(values)
{
	return Math.max.apply(Math, values);
}

console.log('      loading');

csv()
.from.stream(fs.createReadStream(__dirname+'/ofcom.csv'))
.on('record', function(row, index)
{
	raw.push(row);
})
.on('end', function()
{
	console.log('      parsing');
	
	for (var i = 0, r = raw[i]; i < raw.length; r = raw[++i])
	{
		var m = r[0].match(/([A-Z]{1,2}\d[A-Z\d]?)(\d[ABD-HJLNP-UW-Z]{2})/);

		if (!m)
			continue;

		var outcode = m[1];

		compressed[outcode] = compressed[outcode] || { avg: [], median: [], max: [], total: [] };

		if (parseFloat(r[3]))
			compressed[outcode].avg.push(parseFloat(r[3]));

		if (parseFloat(r[4]))
			compressed[outcode].median.push(parseFloat(r[4]));

		if (parseFloat(r[5]))
			compressed[outcode].max.push(parseFloat(r[5]));

		if (parseInt(r[7]))
			compressed[outcode].total.push(parseInt(r[7]));
	}

	console.log('  compressing');

	for (var i in compressed)
	{
		var r = compressed[i];
		final[i] = { avg: avg(r.avg), median: median(r.median), max: max(r.max), connections: sum(r.total) };
	}

	console.log('    inserting');

	db.serialize(function()
	{
		db.run("DROP TABLE IF EXISTS broadband_speed;")
		db.run("CREATE TABLE broadband_speed(outcode TEXT, average REAL, median REAL, maximum REAL, connections INTEGER);");
		db.run('CREATE UNIQUE INDEX IF NOT EXISTS outcode_idx ON broadband_speed (outcode);');

		var speed_stmt = db.prepare('insert into broadband_speed (outcode, average, median, maximum, connections) VALUES(?, ?, ?, ?, ?);');

		for (var i in final)
		{
			speed_stmt.run(i, final[i].avg.toFixed(2), final[i].median.toFixed(2), final[i].max.toFixed(2), final[i].connections, function(err)
			{
				if (err)
					console.log(err);
			});
		}

		speed_stmt.finalize();
	});

	db.close();

	console.log('     job done');
});
