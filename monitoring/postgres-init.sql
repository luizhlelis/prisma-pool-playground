-- Enable pg_stat_statements extension for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitoring user for postgres exporter
CREATE USER postgres_exporter WITH PASSWORD 'exporter_password';
GRANT CONNECT ON DATABASE heroes_vs_enemies TO postgres_exporter;
GRANT pg_monitor TO postgres_exporter;

-- Grant necessary permissions for monitoring
GRANT SELECT ON pg_stat_database TO postgres_exporter;
GRANT SELECT ON pg_stat_statements TO postgres_exporter;
GRANT SELECT ON pg_stat_activity TO postgres_exporter;
GRANT SELECT ON pg_locks TO postgres_exporter;

-- Create a view for connection pool monitoring
CREATE OR REPLACE VIEW connection_pool_stats AS
SELECT 
    datname as database_name,
    numbackends as active_connections,
    xact_commit as transactions_committed,
    xact_rollback as transactions_rolled_back,
    blks_read as blocks_read,
    blks_hit as blocks_hit,
    tup_returned as tuples_returned,
    tup_fetched as tuples_fetched,
    tup_inserted as tuples_inserted,
    tup_updated as tuples_updated,
    tup_deleted as tuples_deleted,
    conflicts as conflicts,
    temp_files as temp_files,
    temp_bytes as temp_bytes,
    deadlocks as deadlocks,
    blk_read_time as block_read_time,
    blk_write_time as block_write_time
FROM pg_stat_database
WHERE datname = 'heroes_vs_enemies';

-- Grant access to the monitoring view
GRANT SELECT ON connection_pool_stats TO postgres_exporter;

-- Create function to monitor connection details
CREATE OR REPLACE FUNCTION get_connection_details()
RETURNS TABLE(
    pid int,
    usename text,
    application_name text,
    client_addr inet,
    backend_start timestamp with time zone,
    state text,
    query text,
    wait_event text,
    wait_event_type text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.pid,
        pa.usename,
        pa.application_name,
        pa.client_addr,
        pa.backend_start,
        pa.state,
        pa.query,
        pa.wait_event,
        pa.wait_event_type
    FROM pg_stat_activity pa
    WHERE pa.datname = 'heroes_vs_enemies'
    AND pa.pid != pg_backend_pid();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_connection_details() TO postgres_exporter;