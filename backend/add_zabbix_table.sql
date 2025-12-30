-- Migration: Add zabbix_servers table
CREATE TABLE IF NOT EXISTS zabbix_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    position INTEGER NOT NULL
);
