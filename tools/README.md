# Info
A bunch of bash and other files/commands to do with working/developing/debugging on the platform prod and dev

# Setup
Some aspects are configurable (and required to be confirgured), so some scripts you must configure correct environment variables for it to know where to find certain platform related files/code/etc.
You'll probably have to do `chmod +x` for most of the bash files

# Mirroring a Kafka Instance
## Creating Kafka Connector Topics
Kafka Connect uses a set of topics to store its internal data. These topics should be created with specific settings:

- common parameters
    - $: export CONNECT_BOOTSTRAP_SERVERS=<String: Kafka bootstrap servers>
    - $: export CREATE_CONNECT_TOPIC_COMMAND_CONFIG_PATH=<String: path to command config file>
- platform-connect-status
    - $: ./bin/kafka-topics.sh --create \
        --topic platform-connect-status \
        --partitions 5 \
        --config retention.ms="9223372036854775807" \
        --replication-factor 3 \
        --config cleanup.policy="compact,delete" \
        --bootstrap-server $CONNECT_BOOTSTRAP_SERVERS \
        --command-config $CREATE_CONNECT_TOPIC_COMMAND_CONFIG_PATH
- platform-connect-offsets:
    - $: bin/kafka-topics.sh --create \
        --topic platform-connect-offsets \
        --partitions 25 \
        --config retention.ms="9223372036854775807" \
        --replication-factor 3 \
        --config cleanup.policy="compact,delete" \
        --bootstrap-server $CONNECT_BOOTSTRAP_SERVERS \
        --command-config $CREATE_CONNECT_TOPIC_COMMAND_CONFIG_PATH
- platform-connect-config:
    - $: bin/kafka-topics.sh --create \
        --topic platform-connect-config \
        --partitions 1 \
        --config retention.ms="86400000" \
        --replication-factor 3 \
        --config cleanup.policy="compact,delete" \
        --bootstrap-server $CONNECT_BOOTSTRAP_SERVERS \
        --command-config $CREATE_CONNECT_TOPIC_COMMAND_CONFIG_PATH

## Mirroring
After creating all the topics on the new instance, run:

- $: ./bin/kafka-mirror-maker.sh --consumer.config ./config/source-consumer.properties --producer.config ./config/target-producer.properties --whitelist=".*"