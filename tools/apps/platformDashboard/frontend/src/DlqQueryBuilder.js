import { Input, DatePicker, Select } from 'antd';
import { useState } from 'react';
import { useCopyToClipboard } from 'react-use';

export default function DlqQueryBuilder () {
  const [activationId, setActivationId] = useState('')
  const [cloudFunctionName, setCloudFunctionName] = useState('')
  const [topicName, setTopicName] = useState('')
  const [messages, setMessages] = useState([[]])
  const [date, setDate] = useState(null)
  const [dateSelector, setDateSelector] = useState('after')

  const [, copyToClipboard] = useCopyToClipboard()

  const searchByTopicName = topicName
    ? `"messages.topic": "${topicName}"`
    : ''
  const searchByCloudFunctionNameQuery = cloudFunctionName
    ? `"metadata.activationInfo.name": "${cloudFunctionName}"`
    : ''
  const searchByActivationId = activationId
    ? `"metadata.activationInfo.activationId": "${activationId}"`
    : ''
  const searchByKeyValueQuery = messages[0][0] && messages[0][1]
    ? `"messages.value.${messages[0][0]}": "${messages[0][1]}"`
    : ''
  const searchByActivationStartDate = date
    ? `"metadata.activationInfo.start": { ${dateSelector === 'after' ? '"$gt"' : "$lt" }: ${date * 1000} }`
    : ''
  
  const query = `{ ${[
    searchByTopicName,
    searchByCloudFunctionNameQuery,
    searchByKeyValueQuery,
    searchByActivationStartDate,
    searchByActivationId
  ].filter(Boolean).join(', ')} }`

  return (
    <>
      <div>
        <label>Query by <strong>ActivationId</strong> e.g. b8eeabe6-128f-4d30-84bf-defa9a4ea748:</label>
        <Input
          placeholder="activation ID"
          value={activationId}
          onChange={e => setActivationId(e.target.value)}
        />
      </div>
      <br />
      <div>
        <label>Query by <strong>Cloud Function Name</strong> e.g. consume-threshold-message:</label>
        <Input
          placeholder="cloud function name"
          value={cloudFunctionName}
          onChange={e => setCloudFunctionName(e.target.value)}
        />
      </div>
      <br />
      <div>
        <label>Query by <strong>Topic Name</strong> e.g. consume-sale-price-ct:</label>
        <Input
          placeholder="topic name"
          value={topicName}
          onChange={e => setTopicName(e.target.value)}
        />
      </div>
      <br />
      <div>
        <label>Query by <strong>Message key: value</strong> pair e.g. STYLEID: "100":</label>
        <Input
          placeholder={`field`}
          value={messages[0][0]}
          onChange={e => setMessages(prev => [[e.target.value, prev[0][1]]])}
        />
        <Input
          placeholder={`value`}
          value={messages[0][1]}
          onChange={e => setMessages(prev => [[prev[0][0], e.target.value]])}
        />
        <p>Note: If the value is not string e.g. is a boolean or a number, you have to manually set it in the query</p>
      </div>
      <div>
        <label>Query by <strong>Activation Start Date</strong> (Browser Local Time)</label>
        <div>
          <Select style={{ width: 120 }} defaultValue={dateSelector} onChange={setDateSelector}>
            <Select.Option value="before">before</Select.Option>
            <Select.Option value="after">after</Select.Option>
          </Select>
          <DatePicker showTime onChange={setDate} onOk={date => setDate(date.unix())} />
        </div>
      </div>
      <br />
      <div>
        <label htmlFor="filter-query"><strong>Filter </strong></label>
        <button disabled={!query} onClick={() => copyToClipboard(query)}>copy</button>
        <p id="filter-query" style={{ fontFamily: 'monospace' }} contentEditable>{query}</p>
      </div>
    </>
  )
}
