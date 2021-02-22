class Kafka {
  constructor() {
  }

  admin() {
    return {
      connect: async () => {
        return null
      },
      listTopics: async () => {
        return ['topicName']
      },
      createTopics: async (topics) => {
        return {}
      },
      deleteTopics: async (topics) => {
        return null
      }
    }
  }
}

module.exports = {
  Kafka
}
