import { useEffect, useState } from 'react'
import { Table, Button, Radio } from 'antd';

import './App.css';
import 'antd/dist/antd.css';

const columns = [
  {
    title: 'Connector Name',
    width: 100,
    dataIndex: 'name',
    key: 'name',
    fixed: 'left',
    sorter: (a, b) => a.name.localeCompare(b.name)
  },
  {
    title: 'Task ID',
    width: 100,
    dataIndex: 'taskId',
    key: 'taskId',
    fixed: 'left',
  },
  {
    title: 'Task State',
    width: 100,
    dataIndex: 'taskState',
    key: 'taskState',
    fixed: 'left',
    sorter: (a, b) => a.taskState.localeCompare(b.taskState)
  },
  {
    title: 'Task Worker ID',
    width: 100,
    dataIndex: 'taskWorkerId',
    key: 'taskWorkerId',
    fixed: 'left',
  },
  {
    title: 'Action',
    key: 'operation',
    fixed: 'right',
    width: 100,
    render: ({ taskState }) => <Button disabled={taskState === 'RUNNING' }>Reset</Button>,
  },
];

function getTableData (data) {
  if (data === null) return []
  return data.reduce(function (tableData, { name, tasks }) {
    tasks.forEach(function ({ id, state: taskState, worker_id: workerId }) {
      tableData.push({
        key: `${name}-${id}`,
        name,
        taskId: id,
        taskState,
        taskWorkerId: workerId
      })
    })
    return tableData
  }, [])
}

function App() {
  const [data, setData] = useState(null)
  const [environment, setEnvironment] = useState('development')
  useEffect(() => {
    setData(null)
    fetch(`/api/connectors/${environment}`).then(r => r.json()).then(setData)
  }, [environment, setData])

  return (
    <main>
      <Radio.Group defaultValue={environment} onChange={e => setEnvironment(e.target.value)}>
        <Radio.Button value="development">Development</Radio.Button>
        <Radio.Button value="staging">Staging</Radio.Button>
        <Radio.Button value="production">Production</Radio.Button>
      </Radio.Group>

      <Table
        columns={columns}
        dataSource={getTableData(data)}
        scroll={{ x: 1300 }}
        pagination={{ position: ['bottomCenter'] }}
        loading={data === null}
      />
    </main>
  );
}

export default App;
