This directory contains the build directory for a Kafka Connect host that is packaged with the Oracle JDBC Thin drivers.

PLEASE NOTE that due to a misconfiguration of the Jesta Oracle DB, we experience "ORA-01882: timezone region not found"
when connecting. To fix this, we set oracle.jdbc.timezoneAsRegion=false in oracle/jdbc/defaultConnectionProperties.properties
of the ojdbc8.jar file.

To build: https://docs.docker.com/get-started/part2/#build-the-app
0. ibmcloud cr login
1. docker build --tag=kafkaconnecthost .
2. docker tag kafkaconnecthost us.icr.io/hrretailplatform/kafkaconnecthost
3. docker push us.icr.io/hrretailplatform/kafkaconnecthost:latest
