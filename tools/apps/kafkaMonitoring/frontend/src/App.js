import { useEffect, useState, useRef } from 'react'
import { Table, Button, Radio, Input } from 'antd';

import './App.css';
import 'antd/dist/antd.css';

const connectorColumns = [
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
  }
];

const bindingColumns = [{
  title: 'Group ID',
  width: 100,
  dataIndex: 'groupId',
  key: 'groupId',
  fixed: 'left',
  sorter: (a, b) => a.groupId.localeCompare(b.groupId)
},{
  title: 'Topic Name',
  width: 100,
  dataIndex: 'topic',
  key: 'topic',
  fixed: 'left',
  sorter: (a, b) => a.topic.localeCompare(b.topic)
},{
  title: 'Action Name',
  width: 100,
  dataIndex: 'action',
  key: 'action',
  fixed: 'left',
  sorter: (a, b) => a.action.localeCompare(b.action)
},{
  title: 'Disabled',
  width: 100,
  dataIndex: 'disabled',
  key: 'disabled',
  fixed: 'left',
  sorter: (a, b) => a.disabled.localeCompare(b.disabled)
}]

function getConnectorsTableData (data) {
  if (! Array.isArray(data)) return []
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

function getBindingTableData (consumerGroupIdConfigMapping = {}) {
  return Object.entries(consumerGroupIdConfigMapping).reduce(function (tableData, [groupId, { topicActions, disabledTopics }]) {
    Object.entries(topicActions).forEach(function ([topic, actions]) {
      actions.forEach(action => {
        tableData.push({
          groupId,
          topic,
          action,
          disabled: String(disabledTopics.includes(topic))
        })
      })
    })
    return tableData
  }, [])
}

function useFetch (fetchArgs, init = {}, jsonResult = true) {
  const [data, setData] = useState(init.result || null)
  const [error, setError] = useState(init.error || null)
  const [loading, setLoading] = useState(init.loading || false)
  const [_fetchArgs, _setFetchArgs] = useState(fetchArgs)
  
  useEffect(function () {
    if (!_fetchArgs) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

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

function usePrevious(value) {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = useRef();

  // Store current value in ref
  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current;
}

function App() {
  const [environment, setEnvironment] = useState('development')
  const [authorization, setAuthorization] = useState('authorization_key')
  const [fetchConnectorsResult, setFetchConnectorsArgs] = useFetch(null)
  const [fetchBindingConfigsResult, setFetchBindingConfigsArgs] = useFetch(null)
  const [fetchRestartFailedTasks, setFetchRestartFailedTasks] = useFetch(null)

  const previousRestartFailedTasksLoading = usePrevious(fetchRestartFailedTasks.loading)

  useEffect(function fetchConnectors() {
    setFetchConnectorsArgs([
      `/api/connectors?environment=${environment}`,
      { headers: { authorization } }
    ])
  }, [environment, authorization, setFetchConnectorsArgs])

  useEffect(function fetchConnectors() {
    if (fetchRestartFailedTasks.loading && !previousRestartFailedTasksLoading) {
      setFetchConnectorsArgs()
    } else if (!fetchRestartFailedTasks.loading && previousRestartFailedTasksLoading) {
      setFetchConnectorsArgs([
        `/api/connectors?environment=${environment}`,
        { headers: { authorization } }
      ])
    }
  }, [environment, authorization, setFetchConnectorsArgs,  fetchRestartFailedTasks.loading, previousRestartFailedTasksLoading])

  useEffect(function fetchConnectors() {
    setFetchBindingConfigsArgs([
      `/api/binding/configs?environment=${environment}`,
      { headers: { authorization } }
    ])
  }, [environment, authorization, setFetchBindingConfigsArgs])

  const connectorsTableData = getConnectorsTableData(fetchConnectorsResult.data)

  return (
    <main>
      <div>
        <Input placeholder="authorization" value={authorization} onChange={({ target: { value }}) => setAuthorization(value)} />
      </div>
      <div>
        <Radio.Group defaultValue={environment} onChange={e => setEnvironment(e.target.value)}>
          <Radio.Button value="development">Development</Radio.Button>
          <Radio.Button value="staging">Staging</Radio.Button>
          <Radio.Button value="production">Production</Radio.Button>
        </Radio.Group> 
      </div>
      <div>
        <Button
          disabled={!connectorsTableData.find(({ taskState }) => taskState !== 'RUNNING')}
          onClick={() => {
            setFetchRestartFailedTasks([
              `/api/connectors?operation=restartFailedTasks&environment=${environment}`,
              { method: 'POST', headers: { authorization } }
            ])
          }}
        >
          Restart Failed Tasks
        </Button>
        <Table
          columns={connectorColumns}
          dataSource={connectorsTableData}
          scroll={{ x: 1300 }}
          pagination={{ position: ['bottomCenter'] }}
          loading={!fetchConnectorsResult.data}
        />
      </div>
      <div>
        <Table
          columns={bindingColumns}
          dataSource={fetchBindingConfigsResult.data ? getBindingTableData(fetchBindingConfigsResult.data.consumerGroupIdConfigMapping) : []}
          scroll={{ x: 1300 }}
          pagination={{ position: ['bottomCenter'] }}
          loading={!fetchBindingConfigsResult.data}
        />
      </div>
    </main>
  );
}

export default App;
