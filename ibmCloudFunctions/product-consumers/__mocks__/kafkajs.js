class Kafka {
    constructor() {
        this.producer = () => ({
            connect: () => {},
            send: () => {}
        });
    }
}

const kafkajs = {
    Kafka
}

module.exports = kafkajs;
