OFCOM_ZIP = http://d2a9983j4okwzn.cloudfront.net/downloads/ofcom-uk-fixed-broadband-postcode-level-data-2013.zip
OFCOM_MAP = "Postcode Data for Consumers FINAL2.csv"

run:
	node web/app.js

fetch:
	node fetch/zoopla.js

depend:
	npm install
	wget -O ofcom.zip $(OFCOM_ZIP)
	unzip ofcom.zip $(OFCOM_MAP)
	mv $(OFCOM_MAP) fetch/ofcom.csv
	rm ofcom.zip
	node fetch/ofcom.js

clean:
	rm data.db

.PHONY: run fetch depend clean

