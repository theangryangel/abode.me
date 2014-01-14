var pick = function(obj, keys)
{
	var copy = {};

	for (var key in keys)
	{
		if (!obj.hasOwnProperty(key))
			continue;

		if (keys[key] != null)
		{
			copy[key] = pick(obj[key], keys[key]);
			continue;
		}

		copy[key] = obj[key];
	}

	return copy;
};

console.log(
	pick({ page: 10, count: 12, filter: { countries: ['wales'], arses: null } }, { page: null, filter: { countries: null }})
);

var defaults = function(src, dft)
{
	for (var prop in dft)
	{
		if (src[prop] === void 0) src[prop] = dft[prop];
	}
    
	return src;
};

var iceCream = {flavor: "chocolate"};
console.log(
	defaults(iceCream, {flavor: "vanilla", sprinkles: "lots"})
);

