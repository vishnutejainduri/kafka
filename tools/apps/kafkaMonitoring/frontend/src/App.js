import { useState } from 'react'
import { Tabs } from 'antd';

import './App.css';
import 'antd/dist/antd.css';

import KafkaMonitoring from './KafkaMonitoring';
import DlqQueryBuilder from './DlqQueryBuilder';

function App() {
  const [tabKey, setTabKey] = useState('1')
  return (
    <main>
      <Tabs defaultActiveKey={tabKey} onChange={setTabKey}>
        <Tabs.TabPane tab="Kafka Monitoring" key="1">
          <KafkaMonitoring />
      </Tabs.TabPane>
        <Tabs.TabPane tab="DLQ Query Builder" key="2">
          <DlqQueryBuilder />
        </Tabs.TabPane>
      </Tabs>
    </main>
  );
}

export default App;
