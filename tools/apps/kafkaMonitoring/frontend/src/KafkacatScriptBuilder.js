import { Input } from "antd"
import { useState } from "react"
import { useCopyToClipboard } from "react-use"

export default function KafkacatScriptBuilder () {
  const [userName, setUserName] = useState('token')
  const [password, setPassword] = useState()
  const [brokers, setBrokers] = useState()
  let brokersList
  try {
    brokersList = JSON.parse(brokers)
  } catch {}
  const credentials = [
    userName ? `KAFKA_USERNAME=${userName}` : '',
    password ? `KAFKA_PASSWORD=${password}` : '',
    brokers ? `KAFKA_BROKERS=${Array.isArray(brokersList) ? brokersList.join(',') : ''}` : ''
  ].filter(Boolean).join(' && ')

  const [topic, setTopic] = useState('')
  const [offset, setOffset] = useState(0)
  const [outputFile, setOutputFile] = useState('')
  const [, copyToClipboard] = useCopyToClipboard()
  const script = topic && offset >= 0 && outputFile
    ? `kafkacat -C -X bootstrap.servers=$KAFKA_BROKERS -X security.protocol=SASL_SSL -X sasl.mechanisms=PLAIN -X sasl.password=$KAFKA_PASSWORD -X sasl.username=$KAFKA_USERNAME -t ${topic} -o ${offset} > ${outputFile}`
    : '';

  return (
    <div>
      <div>
        <p>1. Set KAFKA_USERNAME, KAFKA_PASSWORD and KAFKA_BROKERS as environmental variables: </p>
        <Input
          placeholder="username e.g. tenant"
          value={userName}
          onChange={e => {
            setUserName(e.target.value);
          }}
        />
        <Input
          placeholder="password e.g. xyz-abc"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
          }}
        />
        <Input
          placeholder='brokers e.g. ["broker-1", "broker-2", ..., "broker-5"]'
          value={brokers}
          onChange={e => {
            setBrokers(e.target.value);
          }}
        />
        <div>
          <br />
          <label htmlFor="credentials-script"><strong>Credentials </strong></label>
          <button disabled={!credentials} onClick={() => { copyToClipboard(credentials); }}>Copy</button>
          <p id="credentials-script" style={{ fontFamily: 'monospace' }} contentEditable>{credentials}</p>
        </div>
      </div>
      <br />
      <div>
        <p>2. Use the script:</p>
        <Input
          placeholder="Topic e.g. kafka-connect-config"
          value={topic}
          onChange={e => {
            setTopic(e.target.value.replace(' ', ''));
          }}
          onBlur={() => {
            if (!outputFile) {
              setOutputFile(`${topic}.log`)
            }
          }}
          required
        />
        <Input
          placeholder="Offset e.g. 0"
          value={offset}
          onChange={e => {
            setOffset(Number(e.target.value));
          }}
          required
        />
        <Input
          placeholder="Output file name e.g. development-kafka-connect-config.log"
          value={outputFile}
          onChange={e => {
            setOutputFile(e.target.value);
          }}
          required
        />
        <div>
          <br />
          <label htmlFor="kafkacat-script"><strong>Script </strong></label>
          <button disabled={!script} onClick={() => { copyToClipboard(script); }}>Copy</button>
          {<p id="kafkacat-script" style={{ fontFamily: 'monospace' }} contentEditable><strong>{script || ''}</strong></p>}
        </div>
      </div>
    </div>
  )
}
