import { useEffect, useMemo, useState } from 'react'
import { Table, Button, Radio, Input } from 'antd';

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

function useFetch (fetchArgs, init = {}, jsonResult = true) {
  const [data, setData] = useState(init.result || null)
  const [error, setError] = useState(init.error || null)
  const [loading, setLoading] = useState(init.loading || true)
  const [_fetchArgs, _setFetchArgs] = useState(fetchArgs)
  
  useEffect(function () {
    if (!_fetchArgs) return
    let stale = false
    setLoading(true)
    setData(null)
    setError(null)
    fetch(..._fetchArgs)
      .then(res => jsonResult ? res.json() : res.text())
      .then(function (data) {
        if (!stale) {
          setData(data);
          setLoading(false);
        }
      })
      .catch(function (error) {
        if (!stale) {
          setError(error);
          setLoading(false);
        }
      })
    return function () { stale = true }
  }, [_fetchArgs, jsonResult])

  return [{
    data,
    loading,
    error
  }, _setFetchArgs]
}

function App() {
  const [environment, setEnvironment] = useState('development')
  const [authorization, setAuthorization] = useState('authorization_key')
  const [result, setFetchArgs] = useFetch(null, { data: null })

  useEffect(function () {
    setFetchArgs([
      `/api/connectors?environment=${environment}`,
      { headers: { authorization } }
    ])
  }, [environment, authorization, setFetchArgs])

  return (
    <main>
      <Input placeholder="authorization" value={authorization} onChange={({ target: { value }}) => setAuthorization(value)} />
      <Radio.Group defaultValue={environment} onChange={e => setEnvironment(e.target.value)}>
        <Radio.Button value="development">Development</Radio.Button>
        <Radio.Button value="staging">Staging</Radio.Button>
        <Radio.Button value="production">Production</Radio.Button>
      </Radio.Group>

      <Table
        columns={columns}
        dataSource={getTableData(result.data)}
        scroll={{ x: 1300 }}
        pagination={{ position: ['bottomCenter'] }}
        loading={!result.data}
      />
    </main>
  );
}

export default App;
