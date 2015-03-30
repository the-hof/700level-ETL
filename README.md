700level-ETL
============


Extract posts
=============

curl 'http://localhost:7351/v1/extract?start=1/1/2014&end=12/31/2014&filename=2014.backup&pagesize=10000000'

start and end:  dates in any format that javascript can work with
filename:  the data gets saved into this file
pagesize:  (optional) maximum number of records to get


Extract users
=============

curl 'http://localhost:7351/v1/users/extract?filename=users.json'

filename:  the data gets saved into this file
