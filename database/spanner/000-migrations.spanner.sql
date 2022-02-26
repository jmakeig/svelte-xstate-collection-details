DROP TABLE items;
CREATE TABLE items (
  itemid STRING(MAX),
  name STRING(MAX) NOT NULL,
  description STRING(MAX),
  updated TIMESTAMP,
) PRIMARY KEY(itemid);
CREATE UNIQUE NULL_FILTERED INDEX 
  item_name ON items (name);