import { Input, DatePicker, Select } from 'antd';
import { useState } from 'react';
import { useCopyToClipboard } from 'react-use';

export default function DlqQueryBuilder () {
  const [cloudFunctionName, setCloudFunctionName] = useState('')
  const [messages, setMessages] = useState([[]])
  const [date, setDate] = useState(null)
  const [dateSelector, setDateSelector] = useState('after')

  const [, copyToClipboard] = useCopyToClipboard()

  const searchByCloudFunctionNameQuery = cloudFunctionName
    ? `"metadata.activationInfo.name": "${cloudFunctionName}"`
    : ''
  const searchByKeyValueQuery = messages[0][0] && messages[0][1]
    ? `"messages.value.${messages[0][0]}": "${messages[0][1]}"`
    : ''
  const searchByActivationStartDate = date
    ? `"metadata.activationInfo.start": { ${dateSelector === 'after' ? '"$gt"' : "$lt" }: ${date * 1000} }`
    : ''
  const query = `{ ${[
    searchByCloudFunctionNameQuery,
    searchByKeyValueQuery,
    searchByActivationStartDate
  ].filter(Boolean).join(', ')} }`

  return (
    <>
      <div>
        <label>Query by Cloud Function Name e.g. consume-threshold-message:</label>
        <Input
          placeholder="cloud function name"
          value={cloudFunctionName}
          onChange={e => setCloudFunctionName(e.target.value)}
        />
      </div>
      <br />
      <div>
        <label>Query by Message key: value pair e.g. STYLEID: "100":</label>
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
      <br />
      <div>
        <label>Query by Activation Start Date (Browser Local Time)</label>
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
