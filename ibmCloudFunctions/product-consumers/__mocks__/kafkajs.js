class Kafka {
    constructor() {
        this.producer = () => ({
            connect: () => {},
            send: () => {},
            sendBatch: topicMessages => topicMessages
        });
    }
}

const kafkajs = {
    Kafka
}

module.exports = kafkajs;
